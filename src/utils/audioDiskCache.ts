/**
 * Persist raw custom-word MP3s across refresh.
 * Primary: IndexedDB (Dexie) — reliable across reloads.
 * Fallback: Cache API (tests / environments without IDB).
 * Invalidation is per-URL via `av=` query (per-dict epoch).
 */
import Dexie, { type Table } from 'dexie'

export const WORD_AUDIO_CACHE_NAME = 'qwerty-word-audio-v2'

type WordAudioClipRow = {
  urlKey: string
  data: ArrayBuffer
}

class WordAudioDB extends Dexie {
  clips!: Table<WordAudioClipRow, string>

  constructor() {
    super('QwertyWordAudioDB')
    this.version(1).stores({
      clips: 'urlKey',
    })
  }
}

const audioDb = new WordAudioDB()

let openCachePromise: Promise<Cache | null> | null = null

function canUseCaches(): boolean {
  return typeof caches !== 'undefined' && typeof caches.open === 'function'
}

function canUseIdb(): boolean {
  return typeof indexedDB !== 'undefined'
}

/** Normalize absolute/relative URLs to pathname+search for stable keys. */
export function normalizeWordAudioCacheUrl(url: string): string {
  try {
    if (/^https?:\/\//i.test(url)) {
      const u = new URL(url)
      return `${u.pathname}${u.search}`
    }
  } catch {
    // ignore
  }
  return url
}

export function toCacheRequestUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  const base = typeof globalThis.location?.href === 'string' ? globalThis.location.href : ''
  if (base) {
    try {
      return new URL(url, base).href
    } catch {
      // fall through
    }
  }
  return url
}

export function toWordAudioUrlKey(url: string): string {
  return normalizeWordAudioCacheUrl(toCacheRequestUrl(url))
}

export async function openWordAudioCache(): Promise<Cache | null> {
  if (!canUseCaches()) return null
  if (!openCachePromise) {
    openCachePromise = caches.open(WORD_AUDIO_CACHE_NAME).catch(() => null)
  }
  return openCachePromise
}

export function resetWordAudioCacheHandle(): void {
  openCachePromise = null
}

/** @deprecated Prefer IDB primaryKeys; kept for callers that want a Set of path keys. */
export async function getWordAudioCacheUrlIndex(): Promise<Set<string>> {
  const index = new Set<string>()
  if (canUseIdb()) {
    try {
      const keys = await audioDb.clips.toCollection().primaryKeys()
      for (const key of keys) index.add(key)
    } catch {
      // ignore
    }
  }
  if (index.size > 0) return index

  const cache = await openWordAudioCache()
  if (!cache) return index
  try {
    const requests = await cache.keys()
    for (const request of requests) {
      index.add(normalizeWordAudioCacheUrl(request.url))
    }
  } catch {
    // ignore
  }
  return index
}

async function matchFromCacheApi(url: string): Promise<Response | null> {
  const cache = await openWordAudioCache()
  if (!cache) return null
  const absolute = toCacheRequestUrl(url)
  try {
    const primary = (await cache.match(absolute)) ?? null
    if (primary) return primary
    if (absolute !== url) {
      return (await cache.match(url)) ?? null
    }
    return null
  } catch {
    return null
  }
}

async function putToCacheApi(url: string, response: Response): Promise<void> {
  const cache = await openWordAudioCache()
  if (!cache) return
  const key = toCacheRequestUrl(url)
  try {
    await cache.put(key, response)
  } catch {
    // quota / private mode
  }
}

/** Read a stored MP3 response for url; null on miss or unavailable. */
export async function matchWordAudio(url: string): Promise<Response | null> {
  const key = toWordAudioUrlKey(url)

  if (canUseIdb()) {
    try {
      const row = await audioDb.clips.get(key)
      if (row?.data) {
        return new Response(row.data.slice(0), {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        })
      }
    } catch {
      // fall through to Cache API
    }
  }

  const fromCache = await matchFromCacheApi(url)
  if (!fromCache) return null

  // One-time migrate Cache → IDB so refresh uses IndexedDB next time
  if (canUseIdb()) {
    try {
      const bytes = await fromCache.arrayBuffer()
      await audioDb.clips.put({ urlKey: key, data: bytes.slice(0) })
      return new Response(bytes.slice(0), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      })
    } catch {
      return fromCache
    }
  }

  return fromCache
}

/** Persist a successful MP3 response. Failures (quota etc.) are ignored. */
export async function putWordAudio(url: string, response: Response): Promise<void> {
  const key = toWordAudioUrlKey(url)
  let data: ArrayBuffer
  try {
    data = await response.arrayBuffer()
  } catch {
    return
  }

  if (canUseIdb()) {
    try {
      await audioDb.clips.put({ urlKey: key, data })
      return
    } catch {
      // fall through to Cache API
    }
  }

  await putToCacheApi(
    url,
    new Response(data.slice(0), {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    }),
  )
}

/**
 * Delete cached entries under pathPrefix whose URL key does not contain current av token.
 */
export async function pruneWordAudioCacheForPrefix(pathPrefix: string, currentEpoch: string): Promise<number> {
  const avToken = `av=${encodeURIComponent(currentEpoch)}`
  let deleted = 0

  if (canUseIdb()) {
    try {
      const keys = await audioDb.clips.toCollection().primaryKeys()
      const stale = keys.filter((key) => key.includes(pathPrefix) && !key.includes(avToken))
      if (stale.length > 0) {
        await audioDb.clips.bulkDelete(stale)
        deleted += stale.length
      }
    } catch {
      // ignore
    }
  }

  const cache = await openWordAudioCache()
  if (cache) {
    try {
      const requests = await cache.keys()
      await Promise.all(
        requests.map(async (request) => {
          const href = request.url
          if (!href.includes(pathPrefix)) return
          if (href.includes(avToken)) return
          const ok = await cache.delete(request)
          if (ok) deleted += 1
        }),
      )
    } catch {
      // ignore
    }
  }

  return deleted
}

/** Remove legacy epoch-named Cache buckets from older builds. */
export async function deleteLegacyWordAudioBuckets(): Promise<void> {
  if (!canUseCaches()) return
  try {
    const keys = await caches.keys()
    await Promise.all(
      keys.filter((name) => name.startsWith('qwerty-word-audio-') && name !== WORD_AUDIO_CACHE_NAME).map((name) => caches.delete(name)),
    )
  } catch {
    // ignore
  }
}

/**
 * Delete Cache Storage entries, optionally keeping the word-audio Cache bucket.
 * When not preserving, also clears IndexedDB audio clips.
 */
export async function clearRuntimeCaches(options?: { preserveCurrentWordAudio?: boolean }): Promise<void> {
  if (!options?.preserveCurrentWordAudio && canUseIdb()) {
    try {
      await audioDb.clips.clear()
    } catch {
      // ignore
    }
  }

  if (!canUseCaches()) return
  try {
    const keep = options?.preserveCurrentWordAudio ? WORD_AUDIO_CACHE_NAME : null
    const keys = await caches.keys()
    await Promise.all(keys.filter((name) => name !== keep).map((name) => caches.delete(name)))
    if (!keep) resetWordAudioCacheHandle()
  } catch {
    // ignore
  }
}

/** Test helper: wipe IDB audio table when available. */
export async function clearWordAudioIdbForTests(): Promise<void> {
  if (!canUseIdb()) return
  try {
    await audioDb.clips.clear()
  } catch {
    // ignore
  }
}
