import {
  WORD_AUDIO_CACHE_NAME,
  clearRuntimeCaches,
  matchWordAudio,
  pruneWordAudioCacheForPrefix,
  putWordAudio,
} from '@/utils/audioDiskCache'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type FakeCache = {
  store: Map<string, Response>
  match: (request: string) => Promise<Response | undefined>
  put: (request: string, response: Response) => Promise<void>
  keys: () => Promise<Request[]>
  delete: (request: Request | string) => Promise<boolean>
}

function installFakeCaches() {
  const buckets = new Map<string, FakeCache>()

  const open = async (name: string): Promise<FakeCache> => {
    let bucket = buckets.get(name)
    if (!bucket) {
      const store = new Map<string, Response>()
      const resolveKey = (url: string) => {
        if (store.has(url)) return url
        try {
          const abs = new URL(url, 'http://localhost').href
          if (store.has(abs)) return abs
          const path = new URL(url, 'http://localhost').pathname + new URL(url, 'http://localhost').search
          if (store.has(path)) return path
          for (const key of store.keys()) {
            if (key === path || key.endsWith(path) || path.endsWith(key.replace(/^https?:\/\/[^/]+/, ''))) return key
          }
        } catch {
          // ignore
        }
        return url
      }
      bucket = {
        store,
        match: async (url: string) => store.get(resolveKey(url)),
        put: async (url: string, response: Response) => {
          store.set(url, response)
        },
        keys: async () => [...store.keys()].map((url) => new Request(new URL(url, 'http://localhost').href)),
        delete: async (request: Request | string) => {
          const url = typeof request === 'string' ? request : request.url
          const key = resolveKey(url)
          if (store.delete(key)) return true
          if (store.delete(url)) return true
          for (const k of [...store.keys()]) {
            if (url === k || url.endsWith(k) || url.includes(k)) {
              store.delete(k)
              return true
            }
          }
          return false
        },
      }
      buckets.set(name, bucket)
    }
    return bucket
  }

  vi.stubGlobal('caches', {
    open,
    keys: async () => [...buckets.keys()],
    delete: async (name: string) => buckets.delete(name),
    __buckets: buckets,
  })

  return buckets
}

describe('audioDiskCache', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('puts and matches in the stable bucket', async () => {
    installFakeCaches()
    const url = '/audio/wang-c5-audio/unit5-01/001.mp3?av=20260713-c5'
    await putWordAudio(url, new Response(new ArrayBuffer(4), { status: 200 }))
    const hit = await matchWordAudio(url)
    expect(hit).not.toBeNull()
    expect(WORD_AUDIO_CACHE_NAME).toBe('qwerty-word-audio-v2')
  })

  it('prunes only stale av entries for a dict prefix', async () => {
    installFakeCaches()
    const prefix = '/audio/wang-c5-audio/'
    await putWordAudio(`${prefix}a.mp3?av=old`, new Response('o'))
    await putWordAudio(`${prefix}b.mp3?av=20260713-c5`, new Response('n'))
    await putWordAudio(`/audio/wang-c3-audio/x.mp3?av=old`, new Response('c3'))

    const deleted = await pruneWordAudioCacheForPrefix(prefix, '20260713-c5')
    expect(deleted).toBeGreaterThanOrEqual(1)
    expect(await matchWordAudio(`${prefix}b.mp3?av=20260713-c5`)).not.toBeNull()
    expect(await matchWordAudio(`/audio/wang-c3-audio/x.mp3?av=old`)).not.toBeNull()
  })

  it('clearRuntimeCaches can preserve word-audio bucket', async () => {
    const buckets = installFakeCaches()
    await caches.open('other-cache')
    await caches.open(WORD_AUDIO_CACHE_NAME)
    await clearRuntimeCaches({ preserveCurrentWordAudio: true })
    expect(buckets.has(WORD_AUDIO_CACHE_NAME)).toBe(true)
    expect(buckets.has('other-cache')).toBe(false)
  })

  it('degrades when caches API missing', async () => {
    vi.stubGlobal('caches', undefined)
    await expect(putWordAudio('/a.mp3', new Response(''))).resolves.toBeUndefined()
    await expect(matchWordAudio('/a.mp3')).resolves.toBeNull()
  })
})
