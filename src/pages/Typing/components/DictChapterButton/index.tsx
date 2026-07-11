import Tooltip from '@/components/Tooltip'
import { currentChapterAtom, currentDictInfoAtom, isReviewModeAtom, reviewModeInfoAtom, typingResumeAtom } from '@/store'
import { exitChapterErrorReview } from '@/utils/chapterErrorReview'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { NavLink } from 'react-router-dom'

export const DictChapterButton = () => {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const reviewModeInfo = useAtomValue(reviewModeInfoAtom)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const setTypingResume = useSetAtom(typingResumeAtom)

  const isChapterErrorReview = isReviewMode && reviewModeInfo.chapterErrorReturn != null

  const handleExitChapterErrorReview = useCallback(() => {
    const snapshot = reviewModeInfo.chapterErrorReturn
    if (!snapshot) return
    exitChapterErrorReview(snapshot, setReviewModeInfo, setTypingResume)
    setCurrentChapter(snapshot.chapter)
  }, [reviewModeInfo.chapterErrorReturn, setCurrentChapter, setReviewModeInfo, setTypingResume])

  return (
    <>
      <Tooltip content="词典切换">
        <NavLink
          className="block rounded-lg px-3 py-1 text-lg transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-white dark:text-opacity-60 dark:hover:text-opacity-100"
          to="/gallery"
        >
          {currentDictInfo.name}
          {isReviewMode && (isChapterErrorReview ? ' 本章错词练习' : ' 错题复习')}
          {!isReviewMode && ` · 第 ${currentChapter + 1} 章`}
        </NavLink>
      </Tooltip>
      {isChapterErrorReview && (
        <Tooltip content="退出错题练习，回到进入错题本前的章节进度">
          <button
            type="button"
            onClick={handleExitChapterErrorReview}
            className="rounded-lg border border-indigo-300 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
          >
            返回本章练习
          </button>
        </Tooltip>
      )}
    </>
  )
}
