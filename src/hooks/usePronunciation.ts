import { pronunciationConfigAtom } from '@/store'
import { addHowlListener } from '@/utils'
import noop from '@/utils/noop'
import type { PronunciationWordInput } from '@/utils/pronunciation'
import { generateWordSoundSrc, resolvePronunciationWordName, shouldPreferBrowserTts, toBrowserSpeechText } from '@/utils/pronunciation'
import { playSegment, prefetchSegment, stopSegmentPlayback } from '@/utils/segmentAudioPlayer'
import { resolveWordAudioSegment } from '@/utils/wordAudio'
import { playUrl, stopWordAudio } from '@/utils/wordAudioPlayer'
import type { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSound from 'use-sound'
import type { HookOptions } from 'use-sound/dist/types'

export type { PronunciationWordInput } from '@/utils/pronunciation'
export { generateWordSoundSrc, resolvePronunciationWordName, shouldPreferBrowserTts, toBrowserSpeechText } from '@/utils/pronunciation'

function isYoudaoUrl(url: string): boolean {
  return url.includes('dict.youdao.com')
}

function pickBrowserVoice(accent: 'us' | 'uk'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const wantLang = accent === 'uk' ? 'en-GB' : 'en-US'
  const wantRegion = accent === 'uk' ? /en-GB|en_GB|British|UK/i : /en-US|en_US|American|US/i
  return (
    voices.find((v) => v.lang === wantLang) ||
    voices.find((v) => wantRegion.test(`${v.lang} ${v.name}`)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    null
  )
}

function speakWithBrowser(
  text: string,
  accent: 'us' | 'uk',
  rate: number,
  handlers: { onPlay: () => void; onEnd: () => void; onError: () => void },
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    handlers.onError()
    return
  }
  window.speechSynthesis.cancel()

  const speakNow = () => {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = accent === 'uk' ? 'en-GB' : 'en-US'
    const voice = pickBrowserVoice(accent)
    if (voice) utter.voice = voice
    utter.rate = Math.min(Math.max(rate, 0.7), 1.4)
    utter.onstart = () => handlers.onPlay()
    utter.onend = () => handlers.onEnd()
    utter.onerror = () => handlers.onError()
    window.speechSynthesis.speak(utter)
  }

  // Chrome often loads voices asynchronously
  if (window.speechSynthesis.getVoices().length === 0) {
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      speakNow()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    window.setTimeout(speakNow, 250)
    return
  }
  speakNow()
}

export default function usePronunciationSound(word: PronunciationWordInput, isLoop?: boolean) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
  const pronunciationType = pronunciationConfig.type === 'us' ? 'us' : 'uk'

  // Segment audio only on Word objects (custom biscuit clips), not bare name strings.
  const segment = useMemo(() => {
    if (typeof word === 'string') return null
    return resolveWordAudioSegment(word, pronunciationType)
  }, [pronunciationType, word])

  const urlSrc = useMemo(() => {
    if (segment) return ''
    return generateWordSoundSrc(word, pronunciationType)
  }, [segment, word, pronunciationType])

  const useSharedPlayer = Boolean(urlSrc) && !segment && !isYoudaoUrl(urlSrc)
  const howlSrc = useSharedPlayer || segment ? '' : urlSrc
  const spokenName = useMemo(() => resolvePronunciationWordName(word), [word])
  const isYoudao = Boolean(howlSrc) && isYoudaoUrl(howlSrc)

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

  const reportPlayError = useCallback(() => {
    setPlayError(true)
    setIsPlaying(false)
    if (playErrorTimer.current) window.clearTimeout(playErrorTimer.current)
    playErrorTimer.current = window.setTimeout(() => setPlayError(false), 2000)
  }, [])

  const speakFallback = useCallback(() => {
    speakWithBrowser(toBrowserSpeechText(spokenName), pronunciationType, pronunciationConfig.rate, {
      onPlay: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => reportPlayError(),
    })
  }, [pronunciationConfig.rate, pronunciationType, reportPlayError, spokenName])

  useEffect(() => {
    if (!sound || !howlSrc) return
    const unListens: Array<() => void> = []
    unListens.push(addHowlListener(sound, 'play', () => setIsPlaying(true)))
    unListens.push(addHowlListener(sound, 'end', () => setIsPlaying(false)))
    unListens.push(addHowlListener(sound, 'pause', () => setIsPlaying(false)))
    unListens.push(
      addHowlListener(sound, 'playerror', () => {
        setIsPlaying(false)
        // Youdao often 500s on made-up / proper-noun phrases → browser TTS fallback
        if (isYoudaoUrl(howlSrc)) speakFallback()
        else reportPlayError()
      }),
    )
    unListens.push(
      addHowlListener(sound, 'loaderror', () => {
        setIsPlaying(false)
        if (isYoudaoUrl(howlSrc)) speakFallback()
        else reportPlayError()
      }),
    )
    return () => {
      setIsPlaying(false)
      unListens.forEach((unListen) => unListen())
      ;(sound as Howl).unload()
    }
  }, [howlSrc, reportPlayError, sound, speakFallback])

  useEffect(() => {
    return () => {
      if (playErrorTimer.current) window.clearTimeout(playErrorTimer.current)
    }
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
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

    if (howlSrc) {
      // Spaced / hyphenated tokens often 500 on Youdao — browser TTS without changing stored name.
      if (isYoudao && shouldPreferBrowserTts(spokenName)) {
        speakFallback()
        return
      }
      playHowl()
      return
    }

    // No URL at all → still try browser TTS
    speakFallback()
  }, [
    howlSrc,
    isYoudao,
    loop,
    playHowl,
    pronunciationConfig.rate,
    pronunciationConfig.volume,
    reportPlayError,
    segment,
    speakFallback,
    spokenName,
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
