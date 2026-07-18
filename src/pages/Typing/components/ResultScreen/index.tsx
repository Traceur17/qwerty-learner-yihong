import { TypingContext, TypingStateActionType } from '../../store'
import ShareButton from '../ShareButton'
import TalentStamp from '../TalentStamp'
import { AuthorButton } from './AuthorButton'
import ConclusionBar from './ConclusionBar'
import RemarkRing from './RemarkRing'
import WordChip from './WordChip'
import styles from './index.module.css'
import Tooltip from '@/components/Tooltip'
import {
  currentChapterAtom,
  currentDictIdAtom,
  currentDictInfoAtom,
  infoPanelStateAtom,
  isReviewModeAtom,
  listenDictationConfigAtom,
  randomConfigAtom,
  reviewModeInfoAtom,
  wordDictationConfigAtom,
} from '@/store'
import type { InfoPanelType } from '@/typings'
import { recordOpenInfoPanelAction } from '@/utils'
import { fetchChapterErrorWordData, startChapterErrorReview } from '@/utils/chapterErrorReview'
import { getAccuracyLevel } from '@/utils/talentCelebration'
import { Transition } from '@headlessui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'
import IexportWords from '~icons/icon-park-outline/excel'
import IconCoffee from '~icons/mdi/coffee'
import IconXiaoHongShu from '~icons/my-icons/xiaohongshu'
import IconGithub from '~icons/simple-icons/github'
import IconWechat from '~icons/simple-icons/wechat'
import IconX from '~icons/tabler/x'

const ResultScreen = () => {
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!

  const setWordDictationConfig = useSetAtom(wordDictationConfigAtom)
  const listenDictationConfig = useAtomValue(listenDictationConfigAtom)
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const setCurrentDictId = useSetAtom(currentDictIdAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const setInfoPanelState = useSetAtom(infoPanelStateAtom)
  const randomConfig = useAtomValue(randomConfigAtom)
  const navigate = useNavigate()

  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const [chapterErrorCount, setChapterErrorCount] = useState(0)
  const [isStartingChapterErrors, setIsStartingChapterErrors] = useState(false)

  useEffect(() => {
    // tick a zero timer to calc the stats
    dispatch({ type: TypingStateActionType.TICK_TIMER, addTime: 0 })
  }, [dispatch])

  useEffect(() => {
    if (isReviewMode) {
      setChapterErrorCount(0)
      return
    }

    let cancelled = false
    void (async () => {
      const errorData = await fetchChapterErrorWordData(currentDictInfo, currentChapter, state.chapterData.words)
      if (!cancelled) setChapterErrorCount(errorData.length)
    })()

    return () => {
      cancelled = true
    }
  }, [currentChapter, currentDictInfo, isReviewMode, state.chapterData.words])

  const exportWords = useCallback(() => {
    const { words, userInputLogs } = state.chapterData
    const exportData = userInputLogs.map((log) => {
      const word = words[log.index]
      const wordName = word.name
      return {
        ...word,
        trans: word.trans.join(';'),
        correctCount: log.correctCount,
        wrongCount: log.wrongCount,
        wrongLetters: Object.entries(log.LetterMistakes)
          .map(([key, mistakes]) => `${wordName[Number(key)]}:${mistakes.length}`)
          .join(';'),
      }
    })

    import('xlsx')
      .then(({ utils, writeFileXLSX }) => {
        const ws = utils.json_to_sheet(exportData)
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Data')
        writeFileXLSX(wb, `${currentDictInfo.name}第${currentChapter + 1}章.xlsx`)
      })
      .catch(() => {
        console.log('写入 xlsx 模块导入失败')
      })
  }, [currentChapter, currentDictInfo.name, state.chapterData])

  const wrongWords = useMemo(() => {
    return state.chapterData.userInputLogs
      .filter((log) => log.wrongCount > 0)
      .map((log) => state.chapterData.words[log.index])
      .filter((word) => word !== undefined)
  }, [state.chapterData.userInputLogs, state.chapterData.words])

  const isLastChapter = useMemo(() => {
    return currentChapter >= currentDictInfo.chapterCount - 1
  }, [currentChapter, currentDictInfo])

  const correctRate = useMemo(() => {
    const chapterLength = state.chapterData.words.length
    const correctCount = chapterLength - wrongWords.length
    return Math.floor((correctCount / chapterLength) * 100)
  }, [state.chapterData.words.length, wrongWords.length])

  const talentLevel = useMemo(() => {
    if (!listenDictationConfig.isOpen || !listenDictationConfig.talentCelebration) return null
    const total = state.chapterData.words.length
    return getAccuracyLevel(total - wrongWords.length, total)
  }, [listenDictationConfig.isOpen, listenDictationConfig.talentCelebration, state.chapterData.words.length, wrongWords.length])

  const mistakeLevel = useMemo(() => {
    if (correctRate >= 85) {
      return 0
    } else if (correctRate >= 70) {
      return 1
    } else {
      return 2
    }
  }, [correctRate])

  const timeString = useMemo(() => {
    const seconds = state.timerData.time
    const minutes = Math.floor(seconds / 60)
    const minuteString = minutes < 10 ? '0' + minutes : minutes + ''
    const restSeconds = seconds % 60
    const secondString = restSeconds < 10 ? '0' + restSeconds : restSeconds + ''
    return `${minuteString}:${secondString}`
  }, [state.timerData.time])

  const repeatButtonHandler = useCallback(async () => {
    if (isReviewMode) {
      return
    }

    setWordDictationConfig((old) => {
      if (old.isOpen) {
        if (old.openBy === 'auto') {
          return { ...old, isOpen: false }
        }
      }
      return old
    })
    dispatch({ type: TypingStateActionType.REPEAT_CHAPTER, shouldShuffle: randomConfig.isOpen })
  }, [isReviewMode, setWordDictationConfig, dispatch, randomConfig.isOpen])

  const practiceChapterErrorsHandler = useCallback(async () => {
    if (isReviewMode || isStartingChapterErrors || chapterErrorCount === 0) return

    setIsStartingChapterErrors(true)
    try {
      const errorData = await fetchChapterErrorWordData(currentDictInfo, currentChapter, state.chapterData.words)
      if (errorData.length === 0) {
        setChapterErrorCount(0)
        return
      }

      await startChapterErrorReview({
        dict: currentDictInfo,
        chapter: currentChapter,
        errorData,
        chapterErrorReturn: {
          chapter: currentChapter,
          dictId: currentDictInfo.id,
          index: 0,
          words: state.chapterData.words,
          isTyping: false,
          isTransVisible: state.isTransVisible,
        },
        setReviewModeInfo,
        setCurrentDictId,
        setCurrentChapter,
      })
    } finally {
      setIsStartingChapterErrors(false)
    }
  }, [
    chapterErrorCount,
    currentChapter,
    currentDictInfo,
    isReviewMode,
    isStartingChapterErrors,
    setCurrentChapter,
    setCurrentDictId,
    setReviewModeInfo,
    state.chapterData.words,
    state.isTransVisible,
  ])

  const nextButtonHandler = useCallback(() => {
    if (isReviewMode) {
      return
    }

    setWordDictationConfig((old) => {
      if (old.isOpen) {
        if (old.openBy === 'auto') {
          return { ...old, isOpen: false }
        }
      }
      return old
    })
    if (!isLastChapter) {
      setCurrentChapter((old) => old + 1)
      dispatch({ type: TypingStateActionType.NEXT_CHAPTER })
    }
  }, [dispatch, isLastChapter, isReviewMode, setCurrentChapter, setWordDictationConfig])

  const exitButtonHandler = useCallback(() => {
    if (isReviewMode) {
      setCurrentChapter(0)
      setReviewModeInfo((old) => ({ ...old, isReviewMode: false }))
    } else {
      dispatch({ type: TypingStateActionType.REPEAT_CHAPTER, shouldShuffle: false })
    }
  }, [dispatch, isReviewMode, setCurrentChapter, setReviewModeInfo])

  const onNavigateToGallery = useCallback(() => {
    setCurrentChapter(0)
    setReviewModeInfo((old) => ({ ...old, isReviewMode: false }))
    navigate('/gallery')
  }, [navigate, setCurrentChapter, setReviewModeInfo])

  useHotkeys(
    'enter',
    () => {
      nextButtonHandler()
    },
    { preventDefault: true },
  )

  useHotkeys(
    'space',
    (e) => {
      // 火狐浏览器的阻止事件无效，会导致按空格键后 再次输入正确的第一个字母会报错
      e.stopPropagation()
      repeatButtonHandler()
    },
    { preventDefault: true },
  )

  const handleOpenInfoPanel = useCallback(
    (modalType: InfoPanelType) => {
      recordOpenInfoPanelAction(modalType, 'resultScreen')
      setInfoPanelState((state) => ({ ...state, [modalType]: true }))
    },
    [setInfoPanelState],
  )

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-300 opacity-80 dark:bg-gray-600"></div>
      <Transition
        show={true}
        enter="ease-in duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-out duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="flex h-screen items-center justify-center">
          <div className="my-card fixed flex w-[92vw] max-w-6xl flex-col overflow-hidden rounded-3xl bg-white pb-14 pl-6 pr-5 pt-10 shadow-lg dark:bg-gray-800 md:w-[88vw] md:pl-10 xl:max-w-5xl">
            <div className="text-center font-sans text-xl font-normal text-gray-900 dark:text-gray-400 md:text-2xl">
              {`${currentDictInfo.name} ${isReviewMode ? '错题复习' : '第' + (currentChapter + 1) + '章'}`}
            </div>
            <button className="absolute right-7 top-5" onClick={exitButtonHandler}>
              <IconX className="text-gray-400" />
            </button>
            {talentLevel && (
              <div className="pointer-events-none absolute left-8 top-4 z-30 md:left-12">
                <TalentStamp level={talentLevel} className="w-44 md:w-56" />
              </div>
            )}
            <div className="mt-10 flex flex-row gap-2 overflow-hidden">
              <div className="flex flex-shrink-0 flex-grow-0 flex-col gap-3 px-4 sm:px-1 md:px-2 lg:px-4">
                <RemarkRing remark={`${state.timerData.accuracy}%`} caption="正确率" percentage={state.timerData.accuracy} />
                <RemarkRing remark={timeString} caption="章节耗时" />
                <RemarkRing remark={state.timerData.wpm + ''} caption="WPM" />
              </div>
              <div className="z-10 ml-6 flex-1 overflow-visible rounded-xl bg-indigo-50 dark:bg-gray-700">
                <div className="customized-scrollbar z-20 ml-8 mr-1 flex h-80 flex-row flex-wrap content-start gap-4 overflow-y-auto overflow-x-hidden pr-7 pt-9">
                  {wrongWords.map((word, index) => (
                    <WordChip key={`${index}-${word.name}`} word={word} />
                  ))}
                </div>
                <div className="align-center flex w-full flex-row justify-start rounded-b-xl bg-indigo-200 px-4 dark:bg-indigo-400">
                  <ConclusionBar mistakeLevel={mistakeLevel} mistakeCount={wrongWords.length} />
                </div>
              </div>
              <div className="ml-2 flex flex-col items-center justify-end gap-3 text-xl">
                <AuthorButton />
                {!isReviewMode && (
                  <>
                    <ShareButton />
                    <IexportWords fontSize={18} className="cursor-pointer text-gray-500" onClick={exportWords}></IexportWords>
                  </>
                )}
                <IconXiaoHongShu
                  fontSize={15}
                  className="cursor-pointer text-gray-500 hover:text-red-500 focus:outline-none"
                  onClick={(e) => {
                    handleOpenInfoPanel('redBook')
                    e.currentTarget.blur()
                  }}
                />

                <button
                  onClick={(e) => {
                    handleOpenInfoPanel('donate')
                    e.currentTarget.blur()
                  }}
                  className="cursor-pointer"
                  type="button"
                  title="捐赠我们的项目"
                >
                  <IconCoffee fontSize={17} className={`text-gray-500 hover:text-amber-500  focus:outline-none ${styles.imgShake}`} />
                </button>

                <button
                  onClick={(e) => {
                    handleOpenInfoPanel('community')
                    e.currentTarget.blur()
                  }}
                  className="cursor-pointer text-gray-500 dark:text-gray-400"
                  type="button"
                  title="加入我们的社区"
                >
                  <IconWechat fontSize={16} className="text-gray-500 hover:text-green-500 focus:outline-none" />
                </button>

                <a href="https://github.com/Kaiyiwing/qwerty-learner" target="_blank" rel="noreferrer" className="leading-[0px]">
                  <IconGithub fontSize={16} className="text-gray-500 hover:text-green-800 focus:outline-none" />
                </a>
              </div>
            </div>
            <div className="mt-10 flex w-full justify-center gap-5 px-5 text-xl">
              {!isReviewMode && (
                <>
                  <Tooltip content={chapterErrorCount === 0 ? '本章暂无错词' : `练习本章累计 ${chapterErrorCount} 个错词`}>
                    <button
                      className="my-btn-primary h-12 bg-rose-500 text-base font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-500"
                      type="button"
                      onClick={practiceChapterErrorsHandler}
                      disabled={chapterErrorCount === 0 || isStartingChapterErrors}
                      title={chapterErrorCount === 0 ? '本章暂无错词' : '再练本章错词'}
                    >
                      {isStartingChapterErrors ? '启动中...' : '再练本章错词'}
                    </button>
                  </Tooltip>
                  <Tooltip content="快捷键：space">
                    <button
                      className="my-btn-primary h-12 border-2 border-solid border-gray-300 bg-white text-base text-gray-700 dark:border-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700"
                      type="button"
                      onClick={repeatButtonHandler}
                      title="重复本章节"
                    >
                      重复本章节
                    </button>
                  </Tooltip>
                </>
              )}
              {!isLastChapter && !isReviewMode && (
                <Tooltip content="快捷键：enter">
                  <button
                    className={`{ isLastChapter ? 'cursor-not-allowed opacity-50' : ''} my-btn-primary h-12 text-base font-bold `}
                    type="button"
                    onClick={nextButtonHandler}
                    title="下一章节"
                  >
                    下一章节
                  </button>
                </Tooltip>
              )}

              {isReviewMode && (
                <button
                  className="my-btn-primary h-12 text-base font-bold"
                  type="button"
                  onClick={onNavigateToGallery}
                  title="练习其他章节"
                >
                  练习其他章节
                </button>
              )}
            </div>
          </div>
        </div>
      </Transition>
    </div>
  )
}

export default ResultScreen
