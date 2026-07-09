import { pronunciationConfigAtom } from '@/store'
import { addHowlListener } from '@/utils'
import noop from '@/utils/noop'
import type { PronunciationWordInput } from '@/utils/pronunciation'
import { generateWordSoundSrc } from '@/utils/pronunciation'
import type { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useEffect, useMemo, useState } from 'react'
import useSound from 'use-sound'
import type { HookOptions } from 'use-sound/dist/types'

export type { PronunciationWordInput } from '@/utils/pronunciation'
export { generateWordSoundSrc, resolvePronunciationWordName } from '@/utils/pronunciation'

export default function usePronunciationSound(word: PronunciationWordInput, isLoop?: boolean) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
  const [isPlaying, setIsPlaying] = useState(false)
  const soundSrc = useMemo(() => generateWordSoundSrc(word, pronunciationConfig.type), [word, pronunciationConfig.type])

  const [play, { stop, sound }] = useSound(soundSrc, {
    html5: true,
    format: ['mp3'],
    loop,
    volume: pronunciationConfig.volume,
    rate: pronunciationConfig.rate,
  } as HookOptions)

  useEffect(() => {
    if (!sound) return
    sound.loop(loop)
    return noop
  }, [loop, sound])

  useEffect(() => {
    if (!sound) return
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
  }, [sound])

  return { play, stop, isPlaying }
}

export function usePrefetchPronunciationSound(word: PronunciationWordInput | undefined) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)

  useEffect(() => {
    if (!word) return

    const soundUrl = generateWordSoundSrc(word, pronunciationConfig.type)
    if (soundUrl === '') return

    const head = document.head
    const isPrefetch = (Array.from(head.querySelectorAll('link[href]')) as HTMLLinkElement[]).some((el) => el.href === soundUrl)

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
  }, [pronunciationConfig.type, word])
}
