import { publicUrl } from '@/utils/publicUrl'
import type { WordAudioSegment } from '@/utils/wordAudio'
import { resolveSegmentAudioUrl } from '@/utils/wordAudio'

const MAX_CACHE_SIZE = 2

const bufferCache = new Map<string, AudioBuffer>()
const decodePromises = new Map<string, Promise<AudioBuffer>>()
const lruKeys: string[] = []

let audioContext: AudioContext | null = null
let activeStop: (() => void) | null = null
let activeSource: AudioBufferSourceNode | null = null
let activeGain: GainNode | null = null
let activeEndTimer = 0

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function touchLru(key: string) {
  const idx = lruKeys.indexOf(key)
  if (idx >= 0) lruKeys.splice(idx, 1)
  lruKeys.push(key)
  while (lruKeys.length > MAX_CACHE_SIZE) {
    const evict = lruKeys.shift()
    if (!evict) break
    bufferCache.delete(evict)
    decodePromises.delete(evict)
  }
}

async function fetchAndDecode(url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(url)
  if (cached) {
    touchLru(url)
    return cached
  }

  const pending = decodePromises.get(url)
  if (pending) return pending

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`)
      return res.arrayBuffer()
    })
    .then((arrayBuffer) => getAudioContext().decodeAudioData(arrayBuffer))
    .then((buffer) => {
      bufferCache.set(url, buffer)
      decodePromises.delete(url)
      touchLru(url)
      return buffer
    })
    .catch((err) => {
      decodePromises.delete(url)
      throw err
    })

  decodePromises.set(url, promise)
  return promise
}

export type PlaySegmentOptions = {
  volume?: number
  rate?: number
  loop?: boolean
  onPlay?: () => void
  onEnd?: () => void
}

function clearActiveNodes() {
  if (activeEndTimer) {
    clearTimeout(activeEndTimer)
    activeEndTimer = 0
  }
  if (activeSource) {
    try {
      activeSource.stop()
    } catch {
      // already stopped
    }
    activeSource.disconnect()
    activeSource = null
  }
  if (activeGain) {
    activeGain.disconnect()
    activeGain = null
  }
}

export function stopSegmentPlayback() {
  clearActiveNodes()
  activeStop?.()
  activeStop = null
}

export function playSegment(segment: WordAudioSegment, options: PlaySegmentOptions = {}): () => void {
  stopSegmentPlayback()

  const url = publicUrl(resolveSegmentAudioUrl(segment))
  const rate = options.rate ?? 1
  const volume = options.volume ?? 1
  const loop = options.loop ?? false
  const start = Math.max(0, segment.start)
  const duration = Math.max(0.05, segment.end - start)
  let stopped = false

  const stop = () => {
    if (stopped) return
    stopped = true
    clearActiveNodes()
    if (activeStop === stop) activeStop = null
    options.onEnd?.()
  }

  activeStop = stop

  void (async () => {
    try {
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const buffer = await fetchAndDecode(url)
      if (stopped) return

      const playSlice = () => {
        if (stopped) return

        const source = ctx.createBufferSource()
        const gain = ctx.createGain()
        source.buffer = buffer
        source.playbackRate.value = rate
        gain.gain.value = volume
        source.connect(gain)
        gain.connect(ctx.destination)

        activeSource = source
        activeGain = gain

        source.onended = () => {
          if (stopped) return
          if (loop) {
            playSlice()
            return
          }
          stop()
        }

        source.start(0, start, duration)
        options.onPlay?.()

        activeEndTimer = window.setTimeout(() => {
          activeEndTimer = 0
          if (!loop) stop()
        }, (duration / rate) * 1000 + 200)
      }

      playSlice()
    } catch {
      stop()
    }
  })()

  return stop
}

export function prefetchSegment(segment: WordAudioSegment) {
  const url = publicUrl(resolveSegmentAudioUrl(segment))
  void fetchAndDecode(url).catch(() => undefined)
}
