import { pronunciationConfigAtom } from '@/store'
import type { Dictionary, Word } from '@/typings'
import { getChapterRange } from '@/utils'
import { type AudioPreloadProgress, chapterNeedsAudioPreload, formatPreloadBytes, preloadWordAudios } from '@/utils/chapterAudioPreload'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export type ChapterAudioPreloadState = {
  /** 当前章自定义音频尚未就绪 */
  isBlocking: boolean
  progress: AudioPreloadProgress
  /** 后台缓加载后续章时的提示，可为空 */
  backgroundLabel: string | null
}

const idleProgress: AudioPreloadProgress = { loaded: 0, total: 0, loadedBytes: 0 }

/**
 * 进入练习：先阻塞预加载当前章自定义音频，再后台预加载后续章。
 */
export function useChapterAudioPreload(
  dictInfo: Dictionary,
  currentChapter: number,
  chapterWords: Word[],
  fullWordList: Word[] | undefined,
): ChapterAudioPreloadState {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const pronunciation = pronunciationConfig.type === false ? 'uk' : pronunciationConfig.type === 'us' ? 'us' : 'uk'

  const [isBlocking, setIsBlocking] = useState(false)
  const [progress, setProgress] = useState<AudioPreloadProgress>(idleProgress)
  const [backgroundLabel, setBackgroundLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!chapterNeedsAudioPreload(chapterWords, pronunciation)) {
        setIsBlocking(false)
        setProgress(idleProgress)
        setBackgroundLabel(null)
        return
      }

      setIsBlocking(true)
      setProgress({ loaded: 0, total: 0, loadedBytes: 0 })
      setBackgroundLabel(null)

      await preloadWordAudios(chapterWords, pronunciation, (p) => {
        if (!cancelled) setProgress(p)
      })

      if (cancelled) return
      setIsBlocking(false)

      if (!fullWordList || fullWordList.length === 0) return

      const laterChapters: Word[] = []
      for (let chapter = currentChapter + 1; chapter < dictInfo.chapterCount; chapter++) {
        const { start, end } = getChapterRange(dictInfo, chapter)
        laterChapters.push(...fullWordList.slice(start, end))
      }
      if (laterChapters.length === 0) return

      setBackgroundLabel('后台缓存后续章节音频…')
      await preloadWordAudios(laterChapters, pronunciation)
      if (!cancelled) setBackgroundLabel(null)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [chapterWords, currentChapter, dictInfo, fullWordList, pronunciation])

  return { isBlocking, progress, backgroundLabel }
}

export { formatPreloadBytes }
