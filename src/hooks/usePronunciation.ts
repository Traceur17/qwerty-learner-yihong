import { pronunciationConfigAtom } from '@/store'
import { addHowlListener } from '@/utils'
import noop from '@/utils/noop'
import type { PronunciationWordInput } from '@/utils/pronunciation'
import { generateWordSoundSrc } from '@/utils/pronunciation'
import { playSegment, prefetchSegment, stopSegmentPlayback } from '@/utils/segmentAudioPlayer'
import { resolveWordAudioSegment } from '@/utils/wordAudio'
import type { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useSound from 'use-sound'
import type { HookOptions } from 'use-sound/dist/types'

export type { PronunciationWordInput } from '@/utils/pronunciation'
export { generateWordSoundSrc, resolvePronunciationWordName } from '@/utils/pronunciation'

export default function usePronunciationSound(word: PronunciationWordInput, isLoop?: boolean) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
  const pronunciationType = pronunciationConfig.type === 'us' ? 'us' : 'uk'

  const segment = useMemo(() => {
    if (typeof word === 'string') return null
    return resolveWordAudioSegment(word, pronunciationType)
  }, [pronunciationType, word])

  const urlSrc = useMemo(() => {
    if (segment) return ''
    return generateWordSoundSrc(word, pronunciationType)
  }, [segment, word, pronunciationType])

  const [isPlaying, setIsPlaying] = useState(false)

  const [playUrl, { stop: stopUrl, sound }] = useSound(urlSrc, {
    soundEnabled: !segment && urlSrc.length > 0,
    html5: true,
    format: ['mp3'],
    loop,
    volume: pronunciationConfig.volume,
    rate: pronunciationConfig.rate,
  } as HookOptions)

  useEffect(() => {
    if (!sound || segment) return
    sound.loop(loop)
    return noop
  }, [loop, segment, sound])

  useEffect(() => {
    if (!sound || segment) return
    const unListens: Array<() => void> = []
    unListens.push(addHowlListener(sound, 'play', () => setIsPlaying(true)))
    unListens.push(addHowlListener(sound, 'end', () => setIsPlaying(false)))
    unListens.push(addHowlListener(sound, 'pause', () => setIsPlaying(false)))
    unListens.push(addHowlListener(sound, 'playerror', () => setIsPlaying(false)))
    return () => {
      setIsPlaying(false)
      unListens.forEach((unListen) => unListen())
      ;(sound as Howl).unload()
    }
  }, [segment, sound])

  const stop = useCallback(() => {
    stopSegmentPlayback()
    stopUrl()
    setIsPlaying(false)
  }, [stopUrl])

  const play = useCallback(() => {
    stop()
    if (segment) {
      playSegment(segment, {
        volume: pronunciationConfig.volume,
        rate: pronunciationConfig.rate,
        loop,
        onPlay: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
      })
      return
    }
    playUrl()
  }, [loop, playUrl, pronunciationConfig.rate, pronunciationConfig.volume, segment, stop])

  useEffect(() => {
    return () => stop()
  }, [segment, stop])

  return { play, stop, isPlaying }
}

export function usePrefetchPronunciationSound(word: PronunciationWordInput | undefined) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const pronunciationType = pronunciationConfig.type === 'us' ? 'us' : 'uk'

  useEffect(() => {
    if (!word) return

    if (typeof word !== 'string') {
      const seg = resolveWordAudioSegment(word, pronunciationType)
      if (seg) {
        prefetchSegment(seg)
        return
      }
    }

    const soundUrl = generateWordSoundSrc(word, pronunciationConfig.type)
    if (!soundUrl) return

    const head = document.head
    const isPrefetch = (Array.from(head.querySelectorAll('audio[src]')) as HTMLAudioElement[]).some((el) => el.src.includes(soundUrl))

    if (!isPrefetch) {
      const audio = new Audio()
      audio.src = soundUrl
      audio.preload = 'auto'
      audio.crossOrigin = 'anonymous'
      audio.style.display = 'none'
      head.appendChild(audio)

      return () => {
        head.removeChild(audio)
      }
    }
  }, [pronunciationConfig.type, pronunciationType, word])
}
