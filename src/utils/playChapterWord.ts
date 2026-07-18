import { pronunciationConfigAtom } from '@/store'
import type { Word } from '@/typings'
import { generateWordSoundSrc } from '@/utils/pronunciation'
import { playSegment, stopSegmentPlayback } from '@/utils/segmentAudioPlayer'
import { resolveWordAudioSegment } from '@/utils/wordAudio'
import { playUrl, stopWordAudio } from '@/utils/wordAudioPlayer'
import { getDefaultStore } from 'jotai'

export type PlayChapterWordOptions = {
  onEnd?: () => void
  onError?: () => void
}

/** Stop any in-flight word/segment audio without relying on Howler unload. */
export function stopChapterWordAudio(): void {
  stopSegmentPlayback()
  stopWordAudio()
}

/**
 * Play a chapter word's pronunciation (custom URL / segment / youdao URL via WebAudio when possible).
 * Youdao URLs still go through playUrl after generateWordSoundSrc; non-http empty src is a no-op + onEnd.
 */
export function playChapterWord(word: Word, options: PlayChapterWordOptions = {}): void {
  const store = getDefaultStore()
  const pronunciationConfig = store.get(pronunciationConfigAtom)
  const pronunciationType = pronunciationConfig.type === 'us' ? 'us' : 'uk'
  const volume = pronunciationConfig.volume
  const rate = pronunciationConfig.rate

  const segment = resolveWordAudioSegment(word, pronunciationType)
  if (segment) {
    playSegment(segment, {
      volume,
      rate,
      onEnd: options.onEnd,
    })
    return
  }

  const url = generateWordSoundSrc(word, pronunciationType)
  if (!url) {
    options.onEnd?.()
    return
  }

  void playUrl(url, {
    volume,
    rate,
    onEnd: options.onEnd,
    onError: () => {
      options.onError?.()
      options.onEnd?.()
    },
  })
}
