import type { PronunciationType, Word } from '@/typings'
import {
  type AudioPreloadProgress,
  areWordAudiosOnDisk,
  buildBiscuitFollowupDictIds,
  buildOtherChapterIndexes,
  chapterNeedsAudioPreload,
  ensureChapterMp3OnDisk,
  isBiscuitDictId,
  resetPreloadedAudioCache,
} from '@/utils/chapterAudioPreload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function installMockAudioContext() {
  class MockAudioContext {
    state: AudioContextState = 'running'
    destination = {}
    resume = vi.fn(async () => {
      this.state = 'running'
    })
    close = vi.fn(async () => undefined)
    createBuffer = vi.fn(() => ({} as AudioBuffer))
    createBufferSource = vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      playbackRate: { value: 1 },
    }))
    createGain = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1 } }))
    decodeAudioData = vi.fn(async (ab: ArrayBuffer) => {
      return { duration: 1, byteLength: ab.byteLength } as unknown as AudioBuffer
    })
  }

  vi.stubGlobal(
    'AudioContext',
    vi.fn(() => new MockAudioContext()),
  )
}

function installFakeCaches() {
  const store = new Map<string, Response>()
  vi.stubGlobal('caches', {
    open: async () => ({
      match: async (url: string) => store.get(url),
      put: async (url: string, response: Response) => {
        store.set(url, response)
      },
      keys: async () => [...store.keys()].map((u) => new Request(new URL(u, 'http://localhost').href)),
      delete: async () => true,
    }),
    keys: async () => ['qwerty-word-audio-v2'],
    delete: async () => true,
  })
  return store
}

describe('chapterAudioPreload', () => {
  beforeEach(() => {
    installMockAudioContext()
    installFakeCaches()
  })

  afterEach(() => {
    resetPreloadedAudioCache()
    vi.unstubAllGlobals()
  })

  it('detects custom audio chapters', () => {
    const words: Word[] = [{ name: 'a', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/001.mp3' }]
    expect(chapterNeedsAudioPreload(words, 'uk')).toBe(true)
    expect(chapterNeedsAudioPreload([{ name: 'a', trans: [] }], 'uk')).toBe(false)
  })

  it('reports progress while ensuring mp3 on disk', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })
    vi.stubGlobal('fetch', fetchMock)

    const words: Word[] = [
      { name: 'a', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/001.mp3' },
      { name: 'b', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/002.mp3' },
    ]
    const events: AudioPreloadProgress[] = []
    let networkStarted = false
    const result = await ensureChapterMp3OnDisk(
      words,
      'uk' as Exclude<PronunciationType, false>,
      (p) => events.push({ ...p }),
      2,
      () => {
        networkStarted = true
      },
    )
    expect(result.didFetch).toBe(true)
    expect(networkStarted).toBe(true)
    expect(events.at(-1)).toMatchObject({ loaded: 2, total: 2, failed: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(areWordAudiosOnDisk(words, 'uk')).toBe(true)
  })

  it('skips network when urls already on disk this session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    })
    vi.stubGlobal('fetch', fetchMock)

    const words: Word[] = [
      { name: 'a', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/001.mp3' },
      { name: 'b', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/002.mp3' },
    ]

    await ensureChapterMp3OnDisk(words, 'uk')
    const second = await ensureChapterMp3OnDisk(words, 'uk')
    expect(second.didFetch).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rehydrates from Cache index without network after session reset', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    })
    vi.stubGlobal('fetch', fetchMock)

    const words: Word[] = [{ name: 'a', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/001.mp3' }]
    await ensureChapterMp3OnDisk(words, 'uk')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resetPreloadedAudioCache()
    installMockAudioContext()
    // caches stub is still the same Map from beforeEach — but reset clears diskReady
    // re-install same store by ensuring put survived; open cache still has entry
    const events: AudioPreloadProgress[] = []
    let networkStarted = false
    const again = await ensureChapterMp3OnDisk(
      words,
      'uk',
      (p) => events.push({ ...p }),
      2,
      () => {
        networkStarted = true
      },
    )
    expect(again.didFetch).toBe(false)
    expect(networkStarted).toBe(false)
    expect(events).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(areWordAudiosOnDisk(words, 'uk')).toBe(true)
  })

  it('orders other chapters later-first then earlier', () => {
    expect(buildOtherChapterIndexes(5, 2)).toEqual([3, 4, 0, 1])
    expect(buildOtherChapterIndexes(3, 0)).toEqual([1, 2])
  })

  it('queues biscuit follow-up dicts C3→C4→C5→C11 skipping current', () => {
    expect(isBiscuitDictId('wang-c5-biscuit')).toBe(true)
    expect(buildBiscuitFollowupDictIds('wang-c5-biscuit')).toEqual(['wang-c3-biscuit', 'wang-c4-biscuit', 'wang-c11-biscuit'])
    expect(buildBiscuitFollowupDictIds('cet4')).toEqual([])
  })

  it('stops ensuring when abort signal fires', async () => {
    let resolveFetch: ((v: unknown) => void) | undefined
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const words: Word[] = [
      { name: 'a', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/001.mp3' },
      { name: 'b', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/002.mp3' },
      { name: 'c', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/003.mp3' },
    ]
    const abort = new AbortController()
    const pending = ensureChapterMp3OnDisk(words, 'uk', undefined, 1, undefined, abort.signal)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    abort.abort()
    resolveFetch?.({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })
    const result = await pending
    expect(result.aborted).toBe(true)
  })
})
