import { idDictionaryMap } from '@/resources/dictionary'
import { pronunciationConfigAtom } from '@/store'
import type { Dictionary, Word } from '@/typings'
import { getChapterRange } from '@/utils'
import {
  type AudioPreloadProgress,
  BACKGROUND_AUDIO_CONCURRENCY,
  activateChapterAudio,
  areWordAudiosOnDisk,
  biscuitDictShortLabel,
  buildBiscuitFollowupDictIds,
  buildOtherChapterIndexes,
  chapterNeedsAudioPreload,
  ensureChapterMp3OnDisk,
  formatPreloadBytes,
  isBiscuitDictId,
} from '@/utils/chapterAudioPreload'
import { retainDecodedUrls } from '@/utils/wordAudioPlayer'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export type ChapterAudioPreloadState = {
  /** 当前章有缺失 MP3，正在从网络下载（磁盘已有则不会 true） */
  isBlocking: boolean
  progress: AudioPreloadProgress
  failedCount: number
  /** 后台正在从网络拉取后续章 / 其它饼干词库 MP3 时的提示 */
  backgroundLabel: string | null
}

const idleProgress: AudioPreloadProgress = { loaded: 0, total: 0, loadedBytes: 0, failed: 0 }

function wordsForChapter(dict: Dictionary, fullWordList: Word[], chapter: number): Word[] {
  const { start, end } = getChapterRange(dict, chapter)
  return fullWordList.slice(start, end)
}

/**
 * 进章：磁盘已缓存则立刻可练；仅缺文件时阻塞并显示「缓存音频」。
 * 饼干词库：本章 → 本库其它章 → C3→C4→C5→C11；切章中止后台并优先新章。
 * 底部保留 backgroundLabel 小字。
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
    const abort = new AbortController()
    const { signal } = abort

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
      setIsBlocking(false)
      setBackgroundLabel(null)

      if (areWordAudiosOnDisk(chapterWords, pronunciation)) {
        if (!signal.aborted) activateChapterAudio(chapterWords, pronunciation)
      } else {
        const { failed, aborted } = await ensureChapterMp3OnDisk(
          chapterWords,
          pronunciation,
          (p) => {
            if (!signal.aborted) setProgress(p)
          },
          undefined,
          (missCount) => {
            if (!signal.aborted) {
              setIsBlocking(true)
              setProgress({ loaded: 0, total: missCount, loadedBytes: 0, failed: 0 })
            }
          },
          signal,
        )

        if (aborted || signal.aborted) return
        setFailedCount(failed)
        setIsBlocking(false)
        setProgress(idleProgress)
        activateChapterAudio(chapterWords, pronunciation)
      }

      if (signal.aborted || !fullWordList || fullWordList.length === 0) return

      // —— 本词库其它章（先后续、再更早）——
      const otherIndexes = buildOtherChapterIndexes(dictInfo.chapterCount, currentChapter)
      const otherWords: Word[] = []
      for (const chapter of otherIndexes) {
        otherWords.push(...wordsForChapter(dictInfo, fullWordList, chapter))
      }

      if (otherWords.length > 0 && !areWordAudiosOnDisk(otherWords, pronunciation)) {
        const { aborted } = await ensureChapterMp3OnDisk(
          otherWords,
          pronunciation,
          undefined,
          BACKGROUND_AUDIO_CONCURRENCY,
          () => {
            if (!signal.aborted) setBackgroundLabel('后台缓存后续章节音频…')
          },
          signal,
        )
        if (aborted || signal.aborted) return
      }

      if (signal.aborted) return
      setBackgroundLabel(null)

      // —— 其它饼干词库：C3→C4→C5→C11 ——
      if (!isBiscuitDictId(dictInfo.id)) return

      for (const followId of buildBiscuitFollowupDictIds(dictInfo.id)) {
        if (signal.aborted) return
        const followDict = idDictionaryMap[followId]
        if (!followDict) continue

        let followWords: Word[]
        try {
          followWords = await wordListFetcher(followDict.url)
        } catch {
          continue
        }
        if (signal.aborted) return
        if (!chapterNeedsAudioPreload(followWords, pronunciation)) continue
        if (areWordAudiosOnDisk(followWords, pronunciation)) continue

        const label = `后台缓存 ${biscuitDictShortLabel(followId)} 词库音频…`
        const { aborted } = await ensureChapterMp3OnDisk(
          followWords,
          pronunciation,
          undefined,
          BACKGROUND_AUDIO_CONCURRENCY,
          () => {
            if (!signal.aborted) setBackgroundLabel(label)
          },
          signal,
        )
        if (aborted || signal.aborted) return
        if (!signal.aborted) setBackgroundLabel(null)
      }

      if (!signal.aborted) setBackgroundLabel(null)
    }

    void run()
    return () => {
      abort.abort()
      // 离开本章 / 卸载：丢掉 decode 缓冲，磁盘 MP3 仍保留
      retainDecodedUrls([])
    }
  }, [chapterWords, currentChapter, dictInfo, fullWordList, pronunciation])

  return { isBlocking, progress, failedCount, backgroundLabel }
}

export { formatPreloadBytes }
