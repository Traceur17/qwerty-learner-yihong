import type { PronunciationType, Word } from '@/typings'
import {
  type AudioPreloadProgress,
  areWordAudiosPreloaded,
  chapterNeedsAudioPreload,
  preloadWordAudios,
  resetPreloadedAudioCache,
} from '@/utils/chapterAudioPreload'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('chapterAudioPreload', () => {
  afterEach(() => {
    resetPreloadedAudioCache()
    vi.unstubAllGlobals()
  })

  it('detects custom audio chapters', () => {
    const words: Word[] = [{ name: 'a', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/001.mp3' }]
    expect(chapterNeedsAudioPreload(words, 'uk')).toBe(true)
    expect(chapterNeedsAudioPreload([{ name: 'a', trans: [] }], 'uk')).toBe(false)
  })

  it('reports progress while preloading', async () => {
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
    const did = await preloadWordAudios(words, 'uk' as Exclude<PronunciationType, false>, (p) => events.push({ ...p }), 2)
    expect(did).toBe(true)
    expect(events[0]).toEqual({ loaded: 0, total: 2, loadedBytes: 0 })
    expect(events.at(-1)).toEqual({ loaded: 2, total: 2, loadedBytes: 16 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('skips network when urls were already preloaded this session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    })
    vi.stubGlobal('fetch', fetchMock)

    const words: Word[] = [
      { name: 'a', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/001.mp3' },
      { name: 'b', trans: [], ukAudio: '/audio/wang-c4-audio/unit4-04/002.mp3' },
    ]

    expect(areWordAudiosPreloaded(words, 'uk')).toBe(false)
    await preloadWordAudios(words, 'uk')
    expect(areWordAudiosPreloaded(words, 'uk')).toBe(true)

    const second = await preloadWordAudios(words, 'uk')
    expect(second).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
