import { pronunciationConfigAtom } from '@/store'
import { addHowlListener } from '@/utils'
import noop from '@/utils/noop'
import type { PronunciationWordInput } from '@/utils/pronunciation'
import { generateWordSoundSrc } from '@/utils/pronunciation'
import { playSegment, prefetchSegment, stopSegmentPlayback } from '@/utils/segmentAudioPlayer'
import { resolveWordAudioSegment } from '@/utils/wordAudio'
import { playUrl, stopWordAudio } from '@/utils/wordAudioPlayer'
import type { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSound from 'use-sound'
import type { HookOptions } from 'use-sound/dist/types'

export type { PronunciationWordInput } from '@/utils/pronunciation'
export { generateWordSoundSrc, resolvePronunciationWordName } from '@/utils/pronunciation'

function isYoudaoUrl(url: string): boolean {
  return url.includes('dict.youdao.com')
}

export default function usePronunciationSound(word: PronunciationWordInput, isLoop?: boolean) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
  const pronunciationType = pronunciationConfig.type === 'us' ? 'us' : 'uk'

  const segment = useMemo(() => {
    if (typeof word !== 'string') return null
    return resolveWordAudioSegment(word, pronunciationType)
  }, [pronunciationType, word])

  const urlSrc = useMemo(() => {
    if (segment) return ''
    return generateWordSoundSrc(word, pronunciationType)
  }, [segment, word, pronunciationType])

  const useSharedPlayer = Boolean(urlSrc) && !segment && !isYoudaoUrl(urlSrc)
  const howlSrc = useSharedPlayer || segment ? '' : urlSrc

  const [isPlaying, setIsPlaying] = useState(false)
  const [playError, setPlayError] = useState(false)
  const playErrorTimer = useRef(0)

  const [playHowl, { stop: stopHowl, sound }] = useSound(howlSrc, {
    soundEnabled: howlSrc.length > 0,
    html5: true,
    format: ['mp3'],
    loop,
    volume: pronunciationConfig.volume,
    rate: pronunciationConfig.rate,
  } as HookOptions)

  useEffect(() => {
    if (!sound || !howlSrc) return
    sound.loop(loop)
    return noop
  }, [howlSrc, loop, sound])

  useEffect(() => {
    if (!sound || !howlSrc) return
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
  }, [howlSrc, sound])

  useEffect(() => {
    return () => {
      if (playErrorTimer.current) window.clearTimeout(playErrorTimer.current)
    }
  }, [])

  const reportPlayError = useCallback(() => {
    setPlayError(true)
    setIsPlaying(false)
    if (playErrorTimer.current) window.clearTimeout(playErrorTimer.current)
    playErrorTimer.current = window.setTimeout(() => setPlayError(false), 2000)
  }, [])

  const stop = useCallback(() => {
    stopSegmentPlayback()
    stopWordAudio()
    stopHowl()
    setIsPlaying(false)
  }, [stopHowl])

  const play = useCallback(() => {
    stop()
    setPlayError(false)

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

    if (useSharedPlayer) {
      void playUrl(urlSrc, {
        volume: pronunciationConfig.volume,
        rate: pronunciationConfig.rate,
        loop,
        onPlay: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => reportPlayError(),
      })
      return
    }

    if (howlSrc) playHowl()
  }, [
    howlSrc,
    loop,
    playHowl,
    pronunciationConfig.rate,
    pronunciationConfig.volume,
    reportPlayError,
    segment,
    stop,
    urlSrc,
    useSharedPlayer,
  ])

  useEffect(() => {
    // 卸载时只停本实例 Howl，勿 stopWordAudio/stopSegmentPlayback：
    // 侧栏一次挂载上百个图标，关闭抽屉会批量 cleanup，否则会把主区域刚开始的发音掐断。
    return () => {
      stopHowl()
      setIsPlaying(false)
    }
  }, [segment, stopHowl, urlSrc])

  return { play, stop, isPlaying, playError }
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
