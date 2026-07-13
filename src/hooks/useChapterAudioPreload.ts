import { pronunciationConfigAtom } from '@/store'
import type { Dictionary, Word } from '@/typings'
import { getChapterRange } from '@/utils'
import {
  type AudioPreloadProgress,
  activateChapterAudio,
  areWordAudiosOnDisk,
  chapterNeedsAudioPreload,
  ensureChapterMp3OnDisk,
  formatPreloadBytes,
} from '@/utils/chapterAudioPreload'
import { retainDecodedUrls } from '@/utils/wordAudioPlayer'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export type ChapterAudioPreloadState = {
  /** 当前章有缺失 MP3，正在从网络下载（磁盘已有则不会 true） */
  isBlocking: boolean
  progress: AudioPreloadProgress
  failedCount: number
  /** 后台正在从网络拉取后续章 MP3 时的提示（仅校验磁盘不显示） */
  backgroundLabel: string | null
}

const idleProgress: AudioPreloadProgress = { loaded: 0, total: 0, loadedBytes: 0, failed: 0 }

/**
 * 进章：磁盘已缓存则立刻可练；仅缺文件时阻塞并显示「缓存音频」。
 * 后台 decode 本章；后续章只暖磁盘且已缓存时静默。
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
  const [failedCount, setFailedCount] = useState(0)
  const [backgroundLabel, setBackgroundLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!chapterNeedsAudioPreload(chapterWords, pronunciation)) {
        setIsBlocking(false)
        setProgress(idleProgress)
        setFailedCount(0)
        setBackgroundLabel(null)
        return
      }

      setFailedCount(0)
      setProgress(idleProgress)
      // 默认不阻塞；只有真正要下网时才弹进度
      setIsBlocking(false)

      if (areWordAudiosOnDisk(chapterWords, pronunciation)) {
        if (!cancelled) activateChapterAudio(chapterWords, pronunciation)
      } else {
        const { failed } = await ensureChapterMp3OnDisk(
          chapterWords,
          pronunciation,
          (p) => {
            if (!cancelled) {
              setProgress(p)
            }
          },
          undefined,
          (missCount) => {
            if (!cancelled) {
              setIsBlocking(true)
              setProgress({ loaded: 0, total: missCount, loadedBytes: 0, failed: 0 })
            }
          },
        )

        if (cancelled) return
        setFailedCount(failed)
        setIsBlocking(false)
        setProgress(idleProgress)
        activateChapterAudio(chapterWords, pronunciation)
      }

      if (!fullWordList || fullWordList.length === 0) return

      const laterChapters: Word[] = []
      for (let chapter = currentChapter + 1; chapter < dictInfo.chapterCount; chapter++) {
        const { start, end } = getChapterRange(dictInfo, chapter)
        laterChapters.push(...fullWordList.slice(start, end))
      }
      if (laterChapters.length === 0 || areWordAudiosOnDisk(laterChapters, pronunciation)) {
        if (!cancelled) setBackgroundLabel(null)
        return
      }

      // 静默校验 / 仅缺文件时提示后台下载
      await ensureChapterMp3OnDisk(laterChapters, pronunciation, undefined, undefined, () => {
        if (!cancelled) setBackgroundLabel('后台缓存后续章节音频…')
      })
      if (!cancelled) setBackgroundLabel(null)
    }

    void run()
    return () => {
      cancelled = true
      // 离开本章 / 卸载：丢掉 decode 缓冲，磁盘 MP3 仍保留
      retainDecodedUrls([])
    }
  }, [chapterWords, currentChapter, dictInfo, fullWordList, pronunciation])

  return { isBlocking, progress, failedCount, backgroundLabel }
}

export { formatPreloadBytes }
