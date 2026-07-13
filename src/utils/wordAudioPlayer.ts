import { clearWordAudioIdbForTests, matchWordAudio, putWordAudio, resetWordAudioCacheHandle } from '@/utils/audioDiskCache'

/**
 * Shared custom-word audio player.
 * - Disk Cache API: raw MP3 (load-once across refresh/chapter)
 * - Memory AudioBuffer: only current chapter; click prioritizes decode
 */

export type WordAudioPreloadProgress = {
  loaded: number
  total: number
  loadedBytes: number
  failed: number
}

export type PlayUrlOptions = {
  volume?: number
  rate?: number
  loop?: boolean
  onPlay?: () => void
  onEnd?: () => void
  onError?: (error: unknown) => void
}

const bufferCache = new Map<string, AudioBuffer>()
const decodePromises = new Map<string, Promise<AudioBuffer>>()
const byteSizes = new Map<string, number>()
/** Session memory of URLs known to be on disk (Cache API). */
const diskReadyUrls = new Set<string>()

let audioContext: AudioContext | null = null
let unlocked = false
let activeSource: AudioBufferSourceNode | null = null
let activeGain: GainNode | null = null
let activeOnEnd: (() => void) | null = null
let playGeneration = 0

let bgDecodeQueue: string[] = []
let bgDecodeRunning = false
/** When true, pump stops starting new decodes (in-flight one may still finish). */
let bgDecodePaused = false
let bgDecodeConcurrency = 1

export function setWordAudioBgDecodePaused(paused: boolean): void {
  bgDecodePaused = paused
  if (!paused && bgDecodeQueue.length > 0) {
    void pumpBgDecode(bgDecodeConcurrency)
  }
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const globalObj = globalThis as typeof globalThis & {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const Ctx = globalObj.AudioContext || globalObj.webkitAudioContext
    if (!Ctx) throw new Error('AudioContext is not available')
    audioContext = new Ctx()
  }
  return audioContext
}

export function isWordAudioReady(url: string): boolean {
  return bufferCache.has(url)
}

export function isWordAudioOnDisk(url: string): boolean {
  return diskReadyUrls.has(url)
}

export function resetWordAudioPlayerForTests(): void {
  stopWordAudio()
  bufferCache.clear()
  decodePromises.clear()
  byteSizes.clear()
  diskReadyUrls.clear()
  bgDecodeQueue = []
  bgDecodeRunning = false
  bgDecodePaused = false
  unlocked = false
  playGeneration = 0
  resetWordAudioCacheHandle()
  void clearWordAudioIdbForTests()
  if (audioContext) {
    void audioContext.close().catch(() => undefined)
    audioContext = null
  }
}

/** Drop decoded buffers not in keepUrls (e.g. leaving a chapter). */
export function retainDecodedUrls(keepUrls: string[]): void {
  const keep = new Set(keepUrls)
  for (const url of [...bufferCache.keys()]) {
    if (!keep.has(url)) {
      bufferCache.delete(url)
      byteSizes.delete(url)
    }
  }
  bgDecodeQueue = bgDecodeQueue.filter((url) => keep.has(url))
}

export async function unlockWordAudio(): Promise<void> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // ignore
    }
  }
  if (unlocked) return

  try {
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    unlocked = true
  } catch {
    // ignore
  }
}

const NETWORK_FETCH_RETRIES = 2

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadMp3Bytes(url: string): Promise<ArrayBuffer> {
  const cachedResponse = await matchWordAudio(url)
  if (cachedResponse) {
    const bytes = await cachedResponse.arrayBuffer()
    // Re-store because body was consumed
    await putWordAudio(
      url,
      new Response(bytes.slice(0), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      }),
    )
    diskReadyUrls.add(url)
    return bytes
  }

  let lastError: unknown
  for (let attempt = 0; attempt <= NETWORK_FETCH_RETRIES; attempt++) {
    try {
      const response = await fetch(url, { cache: 'no-cache' })
      if (!response.ok) throw new Error(`preload failed: ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      await putWordAudio(
        url,
        new Response(arrayBuffer.slice(0), {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        }),
      )
      diskReadyUrls.add(url)
      return arrayBuffer
    } catch (error) {
      lastError = error
      if (attempt < NETWORK_FETCH_RETRIES) {
        await delay(150 * (attempt + 1))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export type EnsureMp3OnDiskResult = {
  ready: string[]
  failed: string[]
  /** How many URLs needed a network fetch (0 = already on disk / session). */
  fetched: number
}

/**
 * Ensure MP3 bytes exist in Cache API (no decode).
 * Disk hits are verified with silent cache.match — no blocking UI.
 * Progress callbacks only fire while actually downloading misses.
 */
export async function ensureMp3OnDisk(
  urls: string[],
  options: {
    onProgress?: (progress: WordAudioPreloadProgress) => void
    /** Called once when at least one URL must be fetched from network. */
    onNetworkStart?: (missCount: number) => void
    concurrency?: number
    signal?: AbortSignal
  } = {},
): Promise<EnsureMp3OnDiskResult> {
  const concurrency = options.concurrency ?? 6
  const signal = options.signal
  const unique = [...new Set(urls.filter(Boolean))]
  const ready: string[] = []
  const failed: string[] = []

  if (unique.length === 0) {
    return { ready, failed, fetched: 0 }
  }

  if (signal?.aborted) {
    return { ready, failed, fetched: 0 }
  }

  if (unique.every((url) => diskReadyUrls.has(url))) {
    return { ready: unique, failed: [], fetched: 0 }
  }

  // Silent existence check via Cache.match (more reliable than keys() alone)
  const pendingCheck = unique.filter((url) => !diskReadyUrls.has(url))
  const misses: string[] = []
  const checkConcurrency = Math.min(12, Math.max(1, pendingCheck.length))
  let checkCursor = 0
  await Promise.all(
    Array.from({ length: checkConcurrency }, async () => {
      while (checkCursor < pendingCheck.length) {
        if (signal?.aborted) return
        const url = pendingCheck[checkCursor++]
        try {
          const hit = await matchWordAudio(url)
          if (hit) {
            diskReadyUrls.add(url)
            ready.push(url)
          } else {
            misses.push(url)
          }
        } catch {
          misses.push(url)
        }
      }
    }),
  )

  if (signal?.aborted) {
    return { ready, failed, fetched: 0 }
  }

  // Also accept anything already marked during parallel check
  for (const url of unique) {
    if (diskReadyUrls.has(url) && !ready.includes(url) && !misses.includes(url)) {
      ready.push(url)
    }
  }

  if (misses.length === 0) {
    return { ready, failed, fetched: 0 }
  }

  options.onNetworkStart?.(misses.length)

  let loaded = 0
  let loadedBytes = 0
  let failedCount = 0
  options.onProgress?.({ loaded: 0, total: misses.length, loadedBytes: 0, failed: 0 })

  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, misses.length) }, async () => {
    while (cursor < misses.length) {
      if (signal?.aborted) return
      const indexInMiss = cursor++
      const url = misses[indexInMiss]
      try {
        const buf = await loadMp3Bytes(url)
        if (signal?.aborted) return
        loadedBytes += buf.byteLength
        loaded += 1
        ready.push(url)
      } catch {
        failedCount += 1
        failed.push(url)
      }
      options.onProgress?.({ loaded: loaded + failedCount, total: misses.length, loadedBytes, failed: failedCount })
    }
  })

  await Promise.all(workers)
  return { ready, failed, fetched: misses.length }
}

async function fetchAndDecode(url: string): Promise<{ buffer: AudioBuffer; bytes: number }> {
  const cached = bufferCache.get(url)
  if (cached) return { buffer: cached, bytes: byteSizes.get(url) ?? 0 }

  const pending = decodePromises.get(url)
  if (pending) {
    const buffer = await pending
    return { buffer, bytes: byteSizes.get(url) ?? 0 }
  }

  const promise = (async () => {
    const arrayBuffer = await loadMp3Bytes(url)
    byteSizes.set(url, arrayBuffer.byteLength)
    const buffer = await getAudioContext().decodeAudioData(arrayBuffer.slice(0))
    bufferCache.set(url, buffer)
    return buffer
  })()

  decodePromises.set(url, promise)
  try {
    const buffer = await promise
    return { buffer, bytes: byteSizes.get(url) ?? 0 }
  } finally {
    decodePromises.delete(url)
  }
}

/** Background-decode chapter URLs; skips already decoded / in-flight. Click path uses fetchAndDecode directly (priority). */
export function scheduleDecodeUrls(urls: string[], concurrency = 1): void {
  bgDecodeConcurrency = concurrency
  for (const url of urls) {
    if (!url || bufferCache.has(url) || decodePromises.has(url)) continue
    if (!bgDecodeQueue.includes(url)) bgDecodeQueue.push(url)
  }
  if (!bgDecodePaused) void pumpBgDecode(concurrency)
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 80 })
    } else {
      setTimeout(resolve, 16)
    }
  })
}

async function pumpBgDecode(concurrency: number): Promise<void> {
  if (bgDecodeRunning || bgDecodePaused) return
  bgDecodeRunning = true
  try {
    while (bgDecodeQueue.length > 0) {
      if (bgDecodePaused) break
      const batch: string[] = []
      while (batch.length < concurrency && bgDecodeQueue.length > 0) {
        const url = bgDecodeQueue.shift()!
        if (bufferCache.has(url) || decodePromises.has(url)) continue
        batch.push(url)
      }
      if (batch.length === 0) continue
      await Promise.all(batch.map((url) => fetchAndDecode(url).catch(() => undefined)))
      // decodeAudioData is heavy — yield so Drawer / list open stays responsive
      await yieldToMain()
    }
  } finally {
    bgDecodeRunning = false
    if (!bgDecodePaused && bgDecodeQueue.length > 0) void pumpBgDecode(concurrency)
  }
}

export type PreloadUrlsResult = {
  ready: string[]
  failed: string[]
}

/** @deprecated Prefer ensureMp3OnDisk + scheduleDecodeUrls. Kept for tests that decode-preload. */
export async function preloadUrls(
  urls: string[],
  options: {
    onProgress?: (progress: WordAudioPreloadProgress) => void
    concurrency?: number
  } = {},
): Promise<PreloadUrlsResult> {
  const concurrency = options.concurrency ?? 6
  const unique = [...new Set(urls.filter(Boolean))]
  const alreadyReady = unique.filter((url) => bufferCache.has(url))
  const pending = unique.filter((url) => !bufferCache.has(url))
  const ready: string[] = [...alreadyReady]
  const failed: string[] = []

  if (pending.length === 0) {
    options.onProgress?.({ loaded: ready.length, total: unique.length, loadedBytes: 0, failed: 0 })
    return { ready: unique, failed: [] }
  }

  let loaded = alreadyReady.length
  let loadedBytes = 0
  let failedCount = 0
  options.onProgress?.({ loaded, total: unique.length, loadedBytes: 0, failed: 0 })

  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
    while (cursor < pending.length) {
      const index = cursor++
      const url = pending[index]
      try {
        const { bytes } = await fetchAndDecode(url)
        loadedBytes += bytes
        loaded += 1
        ready.push(url)
      } catch {
        failedCount += 1
        failed.push(url)
      }
      options.onProgress?.({ loaded, total: unique.length, loadedBytes, failed: failedCount })
    }
  })

  await Promise.all(workers)
  return { ready, failed }
}

function clearActiveNodes() {
  if (activeSource) {
    try {
      activeSource.onended = null
      activeSource.stop()
    } catch {
      // already stopped
    }
    try {
      activeSource.disconnect()
    } catch {
      // ignore
    }
    activeSource = null
  }
  if (activeGain) {
    try {
      activeGain.disconnect()
    } catch {
      // ignore
    }
    activeGain = null
  }
}

export function stopWordAudio(): void {
  playGeneration += 1
  const ended = activeOnEnd
  activeOnEnd = null
  clearActiveNodes()
  ended?.()
}

async function playBufferOnce(url: string, options: PlayUrlOptions, generation: number): Promise<void> {
  await unlockWordAudio()
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  // Remove from bg queue so click wins
  bgDecodeQueue = bgDecodeQueue.filter((u) => u !== url)

  let buffer = bufferCache.get(url)
  if (!buffer) {
    buffer = (await fetchAndDecode(url)).buffer
  }
  if (generation !== playGeneration) return

  await new Promise<void>((resolve, reject) => {
    if (generation !== playGeneration) {
      resolve()
      return
    }

    clearActiveNodes()

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer!
    source.playbackRate.value = options.rate ?? 1
    source.loop = options.loop ?? false
    gain.gain.value = options.volume ?? 1
    source.connect(gain)
    gain.connect(ctx.destination)

    let settled = false
    const finishOk = () => {
      if (settled) return
      settled = true
      if (activeSource === source) {
        activeSource = null
        activeGain = null
        activeOnEnd = null
      }
      options.onEnd?.()
      resolve()
    }

    activeSource = source
    activeGain = gain
    activeOnEnd = () => finishOk()

    source.onended = () => {
      if (generation !== playGeneration) {
        resolve()
        return
      }
      if (options.loop) return
      finishOk()
    }

    try {
      source.start(0)
      options.onPlay?.()
    } catch (error) {
      if (settled) return
      settled = true
      clearActiveNodes()
      activeOnEnd = null
      reject(error)
    }
  })
}

/**
 * Play a URL: decode-on-demand with click priority over background chapter decode.
 */
export async function playUrl(url: string, options: PlayUrlOptions = {}): Promise<void> {
  if (!url) return

  stopWordAudio()
  const generation = playGeneration

  const attempt = () => playBufferOnce(url, options, generation)

  try {
    await attempt()
  } catch (firstError) {
    if (generation !== playGeneration) return
    try {
      await attempt()
    } catch (secondError) {
      if (generation !== playGeneration) return
      options.onError?.(secondError ?? firstError)
      options.onEnd?.()
    }
  }
}
