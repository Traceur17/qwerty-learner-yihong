import { TypingContext, TypingStateActionType } from '../../store'
import type { TypingState } from '../../store/type'
import PrevAndNextWord from '../PrevAndNextWord'
import Progress from '../Progress'
import ContinuousDictationSheet from './components/ContinuousDictationSheet'
import DictationWord from './components/DictationWord'
import Phonetic from './components/Phonetic'
import TalentBadgeOverlay from './components/TalentBadgeOverlay'
import Translation from './components/Translation'
import WordComponent from './components/Word'
import { usePrefetchPronunciationSound } from '@/hooks/usePronunciation'
import {
  currentChapterAtom,
  currentDictIdAtom,
  isReviewModeAtom,
  isShowPrevAndNextWordAtom,
  listenDictationConfigAtom,
  loopWordConfigAtom,
  phoneticConfigAtom,
  reviewModeInfoAtom,
} from '@/store'
import type { Word } from '@/typings'
import type { TalentLevel } from '@/utils/talentCelebration'
import { getStreakLevel, preloadTalentImages } from '@/utils/talentCelebration'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

export default function WordPanel() {
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const listenDictationConfig = useAtomValue(listenDictationConfigAtom)
  const isShowPrevAndNextWord = useAtomValue(isShowPrevAndNextWordAtom)
  const [wordComponentKey, setWordComponentKey] = useState(0)
  const [currentWordExerciseCount, setCurrentWordExerciseCount] = useState(0)
  const { times: loopWordTimes } = useAtomValue(loopWordConfigAtom)
  const currentWord = state.chapterData.words[state.chapterData.index]
  const nextWord = state.chapterData.words[state.chapterData.index + 1] as Word | undefined

  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const currentDictId = useAtomValue(currentDictIdAtom)

  // 展示我的天分：连对计数（跨词存活）与当前弹出的徽章
  const streakRef = useRef(0)
  const badgeSeqRef = useRef(0)
  const [talentBadge, setTalentBadge] = useState<{ level: TalentLevel; seq: number } | null>(null)
  const isTalentEnabled = listenDictationConfig.isOpen && listenDictationConfig.talentCelebration

  useEffect(() => {
    if (isTalentEnabled) preloadTalentImages()
  }, [isTalentEnabled])

  useEffect(() => {
    // 换章 / 换词典 / 进出错词复习 / 切换听写开关时归零
    streakRef.current = 0
  }, [currentChapter, currentDictId, isReviewMode, listenDictationConfig.isOpen])

  const onDictationResult = useCallback(
    (isCorrect: boolean) => {
      if (!isCorrect) {
        streakRef.current = 0
        return
      }
      streakRef.current += 1
      if (!isTalentEnabled) return
      const level = getStreakLevel(streakRef.current)
      if (level) {
        badgeSeqRef.current += 1
        setTalentBadge({ level, seq: badgeSeqRef.current })
      }
    },
    [isTalentEnabled],
  )

  const prevIndex = useMemo(() => {
    const newIndex = state.chapterData.index - 1
    return newIndex < 0 ? 0 : newIndex
  }, [state.chapterData.index])
  const nextIndex = useMemo(() => {
    const newIndex = state.chapterData.index + 1
    return newIndex > state.chapterData.words.length - 1 ? state.chapterData.words.length - 1 : newIndex
  }, [state.chapterData.index, state.chapterData.words.length])

  usePrefetchPronunciationSound(nextWord)

  const reloadCurrentWordComponent = useCallback(() => {
    setWordComponentKey((old) => old + 1)
  }, [])

  useEffect(() => {
    reloadCurrentWordComponent()
  }, [listenDictationConfig.isOpen, reloadCurrentWordComponent])

  const updateReviewRecord = useCallback(
    (state: TypingState) => {
      setReviewModeInfo((old) => ({
        ...old,
        reviewRecord: old.reviewRecord ? { ...old.reviewRecord, index: state.chapterData.index } : undefined,
      }))
    },
    [setReviewModeInfo],
  )

  const onFinish = useCallback(() => {
    if (state.chapterData.index < state.chapterData.words.length - 1 || currentWordExerciseCount < loopWordTimes - 1) {
      // 用户完成当前单词
      if (currentWordExerciseCount < loopWordTimes - 1) {
        setCurrentWordExerciseCount((old) => old + 1)
        dispatch({ type: TypingStateActionType.LOOP_CURRENT_WORD })
        reloadCurrentWordComponent()
      } else {
        setCurrentWordExerciseCount(0)
        if (isReviewMode) {
          dispatch({
            type: TypingStateActionType.NEXT_WORD,
            payload: {
              updateReviewRecord,
            },
          })
        } else {
          dispatch({ type: TypingStateActionType.NEXT_WORD })
        }
      }
    } else {
      // 用户完成当前章节
      dispatch({ type: TypingStateActionType.FINISH_CHAPTER })
      if (isReviewMode) {
        setReviewModeInfo((old) => ({ ...old, reviewRecord: old.reviewRecord ? { ...old.reviewRecord, isFinished: true } : undefined }))
      }
    }
  }, [
    state.chapterData.index,
    state.chapterData.words.length,
    currentWordExerciseCount,
    loopWordTimes,
    dispatch,
    reloadCurrentWordComponent,
    isReviewMode,
    updateReviewRecord,
    setReviewModeInfo,
  ])

  const onSkipWord = useCallback(
    (type: 'prev' | 'next') => {
      if (type === 'prev') {
        dispatch({ type: TypingStateActionType.SKIP_2_WORD_INDEX, newIndex: prevIndex })
      }

      if (type === 'next') {
        dispatch({ type: TypingStateActionType.SKIP_2_WORD_INDEX, newIndex: nextIndex })
      }
    },
    [dispatch, prevIndex, nextIndex],
  )

  useHotkeys(
    'Ctrl + Shift + ArrowLeft',
    (e) => {
      e.preventDefault()
      onSkipWord('prev')
    },
    { preventDefault: true },
  )

  useHotkeys(
    'Ctrl + Shift + ArrowRight',
    (e) => {
      e.preventDefault()
      onSkipWord('next')
    },
    { preventDefault: true },
  )
  const [isShowTranslation, setIsHoveringTranslation] = useState(false)

  const handleShowTranslation = useCallback((checked: boolean) => {
    setIsHoveringTranslation(checked)
  }, [])

  const isSheetMode = listenDictationConfig.isOpen && listenDictationConfig.sheetMode

  useHotkeys(
    'tab',
    () => {
      handleShowTranslation(true)
    },
    { enableOnFormTags: true, preventDefault: true, enabled: !isSheetMode },
    [isSheetMode],
  )

  useHotkeys(
    'tab',
    () => {
      handleShowTranslation(false)
    },
    { enableOnFormTags: true, keyup: true, preventDefault: true, enabled: !isSheetMode },
    [isSheetMode],
  )

  const shouldShowTranslation = useMemo(() => {
    return isShowTranslation || state.isTransVisible
  }, [isShowTranslation, state.isTransVisible])

  const chapterWords = state.chapterData.words

  return (
    <div className="container flex h-full min-h-0 w-full flex-col items-center justify-center">
      {!isSheetMode && (
        <div className="flex h-16 w-full max-w-5xl shrink-0 grow-0 items-center justify-between px-2 pt-6 md:h-20 md:px-6 md:pt-8 xl:px-10">
          {state.isTyping && listenDictationConfig.isOpen && listenDictationConfig.showPrevWord && (
            <PrevAndNextWord type="prev" showTrans={listenDictationConfig.showTranslation} />
          )}
          {!listenDictationConfig.isOpen && isShowPrevAndNextWord && state.isTyping && (
            <>
              <PrevAndNextWord type="prev" />
              <PrevAndNextWord type="next" />
            </>
          )}
        </div>
      )}
      <div
        className={`flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center px-2 md:px-6 xl:px-10 ${
          isSheetMode ? 'justify-stretch pt-4' : 'justify-center'
        }`}
      >
        {isSheetMode ? (
          <div className="relative flex h-full min-h-0 w-full flex-1 justify-center">
            <ContinuousDictationSheet words={chapterWords} />
          </div>
        ) : (
          currentWord && (
            <div className="relative flex w-full justify-center">
              {!state.isTyping && (
                <div className="absolute flex h-full w-full justify-center">
                  <div className="z-10 flex w-full items-center backdrop-blur-sm">
                    <p className="w-full select-none text-center text-xl text-gray-600 dark:text-gray-50">
                      按任意键{state.timerData.time ? '继续' : '开始'}
                    </p>
                  </div>
                </div>
              )}
              <div className="relative">
                {listenDictationConfig.isOpen ? (
                  <>
                    <DictationWord word={currentWord} onFinish={onFinish} onResult={onDictationResult} key={wordComponentKey} />
                    {listenDictationConfig.showPhonetic && <Phonetic word={currentWord} />}
                    {listenDictationConfig.showTranslation && <Translation trans={currentWord.trans.join('；')} showTrans={true} />}
                  </>
                ) : (
                  <>
                    <WordComponent word={currentWord} onFinish={onFinish} key={wordComponentKey} />
                    {phoneticConfig.isOpen && <Phonetic word={currentWord} />}
                    <Translation
                      trans={currentWord.trans.join('；')}
                      showTrans={shouldShowTranslation}
                      onMouseEnter={() => handleShowTranslation(true)}
                      onMouseLeave={() => handleShowTranslation(false)}
                    />
                  </>
                )}
              </div>
            </div>
          )
        )}
      </div>
      {!isSheetMode && <Progress className={`mb-10 mt-auto ${state.isTyping ? 'opacity-100' : 'opacity-0'}`} />}
      {talentBadge && <TalentBadgeOverlay key={talentBadge.seq} level={talentBadge.level} onDone={() => setTalentBadge(null)} />}
    </div>
  )
}
