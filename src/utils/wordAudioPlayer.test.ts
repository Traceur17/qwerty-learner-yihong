import {
  ensureMp3OnDisk,
  isWordAudioOnDisk,
  isWordAudioReady,
  playUrl,
  preloadUrls,
  resetWordAudioPlayerForTests,
  retainDecodedUrls,
  scheduleDecodeUrls,
  stopWordAudio,
  unlockWordAudio,
} from '@/utils/wordAudioPlayer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function installMockAudioContext(options?: { failStartOnce?: boolean }) {
  let failStart = options?.failStartOnce ?? false

  class MockAudioBufferSourceNode {
    buffer: AudioBuffer | null = null
    loop = false
    playbackRate = { value: 1 }
    onended: ((ev?: Event) => void) | null = null
    connect = vi.fn()
    disconnect = vi.fn()
    start = vi.fn(() => {
      if (failStart) {
        failStart = false
        throw new Error('play start failed')
      }
      queueMicrotask(() => this.onended?.(new Event('ended')))
    })
    stop = vi.fn()
  }

  class MockGainNode {
    gain = { value: 1 }
    connect = vi.fn()
    disconnect = vi.fn()
  }

  class MockAudioContext {
    state: AudioContextState = 'running'
    destination = {}
    resume = vi.fn(async () => {
      this.state = 'running'
    })
    close = vi.fn(async () => undefined)
    createBuffer = vi.fn(() => ({} as AudioBuffer))
    createBufferSource = vi.fn(() => new MockAudioBufferSourceNode())
    createGain = vi.fn(() => new MockGainNode())
    decodeAudioData = vi.fn(async (ab: ArrayBuffer) => {
      return { duration: 1, byteLength: ab.byteLength } as unknown as AudioBuffer
    })
  }

  const ctx = new MockAudioContext()
  vi.stubGlobal(
    'AudioContext',
    vi.fn(() => ctx),
  )
  return ctx
}

function installFakeCaches() {
  const buckets = new Map<
    string,
    {
      store: Map<string, Response>
      match: (u: string) => Promise<Response | undefined>
      put: (u: string, r: Response) => Promise<void>
      keys: () => Promise<Request[]>
    }
  >()
  vi.stubGlobal('caches', {
    open: async (name: string) => {
      let bucket = buckets.get(name)
      if (!bucket) {
        const store = new Map<string, Response>()
        bucket = {
          store,
          match: async (url: string) => store.get(url),
          put: async (url: string, response: Response) => {
            store.set(url, response)
          },
          keys: async () => [...store.keys()].map((url) => new Request(new URL(url, 'http://localhost').href)),
        }
        buckets.set(name, bucket)
      }
      return bucket
    },
    keys: async () => [...buckets.keys()],
    delete: async (name: string) => buckets.delete(name),
  })
}

describe('wordAudioPlayer', () => {
  beforeEach(() => {
    resetWordAudioPlayerForTests()
    installFakeCaches()
  })

  afterEach(() => {
    resetWordAudioPlayerForTests()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('marks url ready only after successful preload decode', async () => {
    installMockAudioContext()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })
    vi.stubGlobal('fetch', fetchMock)

    expect(isWordAudioReady('/a.mp3')).toBe(false)
    const events: Array<{ loaded: number; failed: number; total: number }> = []
    const result = await preloadUrls(['/a.mp3', '/b.mp3'], {
      concurrency: 2,
      onProgress: (p) => events.push({ loaded: p.loaded, failed: p.failed, total: p.total }),
    })

    expect(result.ready).toEqual(['/a.mp3', '/b.mp3'])
    expect(result.failed).toEqual([])
    expect(isWordAudioReady('/a.mp3')).toBe(true)
    expect(isWordAudioReady('/b.mp3')).toBe(true)
    expect(events.at(-1)).toEqual({ loaded: 2, failed: 0, total: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not mark failed urls as ready', async () => {
    installMockAudioContext()
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('bad')) {
        return { ok: false, status: 404 }
      }
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) }
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await preloadUrls(['/ok.mp3', '/bad.mp3'], { concurrency: 1 })
    expect(result.ready).toEqual(['/ok.mp3'])
    expect(result.failed).toEqual(['/bad.mp3'])
    expect(isWordAudioReady('/ok.mp3')).toBe(true)
    expect(isWordAudioReady('/bad.mp3')).toBe(false)
  })

  it('retries network fetch before marking failed', async () => {
    installMockAudioContext()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await ensureMp3OnDisk(['/flaky.mp3'], { concurrency: 1 })
    expect(result.failed).toEqual([])
    expect(result.ready).toContain('/flaky.mp3')
    expect(isWordAudioOnDisk('/flaky.mp3')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('retries play once on start failure then reports error', async () => {
    installMockAudioContext({ failStartOnce: true })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    )
    await preloadUrls(['/x.mp3'])

    const onError = vi.fn()
    const onPlay = vi.fn()
    // First attempt fails start, second succeeds — onError should not fire
    await playUrl('/x.mp3', { onPlay, onError })
    expect(onPlay).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('calls onError after two failed play attempts', async () => {
    const ctx = installMockAudioContext()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    )
    await preloadUrls(['/y.mp3'])

    // Always fail start
    ctx.createBufferSource = vi.fn(() => {
      const node = {
        buffer: null as AudioBuffer | null,
        loop: false,
        playbackRate: { value: 1 },
        onended: null as ((ev?: Event) => void) | null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(() => {
          throw new Error('always fail')
        }),
        stop: vi.fn(),
      }
      return node
    })

    const onError = vi.fn()
    await playUrl('/y.mp3', { onError })
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('stop cancels in-flight play without onError', async () => {
    installMockAudioContext()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 30))
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) }
      }),
    )

    const onError = vi.fn()
    const onPlay = vi.fn()
    const pending = playUrl('/slow.mp3', { onPlay, onError })
    stopWordAudio()
    await pending
    expect(onError).not.toHaveBeenCalled()
  })

  it('unlock resumes suspended context', async () => {
    const ctx = installMockAudioContext()
    ctx.state = 'suspended'
    await unlockWordAudio()
    expect(ctx.resume).toHaveBeenCalled()
  })

  it('second preload hits disk cache and skips network', async () => {
    installMockAudioContext()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })
    vi.stubGlobal('fetch', fetchMock)

    await preloadUrls(['/cached.mp3'])
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resetWordAudioPlayerForTests()
    installMockAudioContext()
    expect(isWordAudioReady('/cached.mp3')).toBe(false)

    await preloadUrls(['/cached.mp3'])
    expect(isWordAudioReady('/cached.mp3')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('ensureMp3OnDisk marks disk ready without decoding', async () => {
    const ctx = installMockAudioContext()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    )

    const result = await ensureMp3OnDisk(['/disk-only.mp3'])
    expect(result.ready).toEqual(['/disk-only.mp3'])
    expect(isWordAudioOnDisk('/disk-only.mp3')).toBe(true)
    expect(isWordAudioReady('/disk-only.mp3')).toBe(false)
    expect(ctx.decodeAudioData).not.toHaveBeenCalled()
  })

  it('retainDecodedUrls drops buffers outside the keep set', async () => {
    installMockAudioContext()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    )
    await preloadUrls(['/keep.mp3', '/drop.mp3'])
    expect(isWordAudioReady('/keep.mp3')).toBe(true)
    expect(isWordAudioReady('/drop.mp3')).toBe(true)

    retainDecodedUrls(['/keep.mp3'])
    expect(isWordAudioReady('/keep.mp3')).toBe(true)
    expect(isWordAudioReady('/drop.mp3')).toBe(false)
  })

  it('playUrl can decode on demand without prior preload', async () => {
    installMockAudioContext()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    )
    const onPlay = vi.fn()
    await playUrl('/ondemand.mp3', { onPlay })
    expect(onPlay).toHaveBeenCalled()
    expect(isWordAudioReady('/ondemand.mp3')).toBe(true)
  })

  it('scheduleDecodeUrls eventually marks buffers ready', async () => {
    installMockAudioContext()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    )
    scheduleDecodeUrls(['/bg.mp3'])
    await vi.waitFor(() => expect(isWordAudioReady('/bg.mp3')).toBe(true))
  })

  it('stop invokes previous onEnd so UI can clear playing state', async () => {
    installMockAudioContext()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    )
    await preloadUrls(['/a.mp3', '/b.mp3'])

    const onEndA = vi.fn()
    const onPlayA = vi.fn()
    const pendingA = playUrl('/a.mp3', { onPlay: onPlayA, onEnd: onEndA })
    await vi.waitFor(() => expect(onPlayA).toHaveBeenCalled())

    const onPlayB = vi.fn()
    const onEndB = vi.fn()
    await playUrl('/b.mp3', { onPlay: onPlayB, onEnd: onEndB })
    await pendingA

    expect(onEndA).toHaveBeenCalled()
    expect(onPlayB).toHaveBeenCalled()
  })
})
