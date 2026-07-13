import Layout from '../../components/Layout'
import { DictChapterButton } from './components/DictChapterButton'
import PronunciationSwitcher from './components/PronunciationSwitcher'
import ResultScreen from './components/ResultScreen'
import Speed from './components/Speed'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import WordList from './components/WordList'
import WordPanel from './components/WordPanel'
import { useConfetti } from './hooks/useConfetti'
import { useWordList } from './hooks/useWordList'
import { TypingContext, TypingStateActionType, initialState, typingReducer } from './store'
import { DonateCard } from '@/components/DonateCard'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import { formatPreloadBytes, useChapterAudioPreload } from '@/hooks/useChapterAudioPreload'
import { idDictionaryMap } from '@/resources/dictionary'
import {
  currentChapterAtom,
  currentDictIdAtom,
  currentDictInfoAtom,
  isReviewModeAtom,
  randomConfigAtom,
  reviewModeInfoAtom,
  typingResumeAtom,
} from '@/store'
import { IsDesktop, isLegal } from '@/utils'
import { useSaveChapterRecord } from '@/utils/db'
import { useMixPanelChapterLogUploader } from '@/utils/mixpanel'
import { unlockWordAudio } from '@/utils/wordAudioPlayer'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useImmerReducer } from 'use-immer'

const App: React.FC = () => {
  const [state, dispatch] = useImmerReducer(typingReducer, structuredClone(initialState))
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { words, wordList } = useWordList()
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const audioPreload = useChapterAudioPreload(currentDictInfo, currentChapter, words, wordList)

  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const randomConfig = useAtomValue(randomConfigAtom)
  const chapterLogUploader = useMixPanelChapterLogUploader(state)
  const saveChapterRecord = useSaveChapterRecord()

  const reviewModeInfo = useAtomValue(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const typingResume = useAtomValue(typingResumeAtom)
  const setTypingResume = useSetAtom(typingResumeAtom)

  useEffect(() => {
    // 检测用户设备
    if (!IsDesktop()) {
      setTimeout(() => {
        alert(
          ' Qwerty Learner 目的为提高键盘工作者的英语输入效率，目前暂未适配移动端，希望您使用桌面端浏览器访问。如您使用的是 Ipad 等平板电脑设备，可以使用外接键盘使用本软件。',
        )
      }, 500)
    }
  }, [])

  // 在组件挂载和currentDictId改变时，检查当前字典是否存在，如果不存在，则将其重置为默认值
  useEffect(() => {
    const id = currentDictId
    if (!(id in idDictionaryMap)) {
      setCurrentDictId('wang-c3-biscuit')
      setCurrentChapter(0)
      return
    }
  }, [currentDictId, setCurrentChapter, setCurrentDictId])

  const skipWord = useCallback(() => {
    dispatch({ type: TypingStateActionType.SKIP_WORD })
  }, [dispatch])

  useEffect(() => {
    const onBlur = () => {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  useEffect(() => {
    const wordsReady = state.chapterData.words?.length > 0
    setIsLoading(!wordsReady || audioPreload.isBlocking)
  }, [state.chapterData.words, audioPreload.isBlocking])

  useEffect(() => {
    const unlock = () => {
      void unlockWordAudio()
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!state.isTyping) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [state.isTyping, isLoading, dispatch])

  useEffect(() => {
    if (!typingResume) return

    setCurrentChapter(typingResume.chapter)
    dispatch({
      type: TypingStateActionType.SETUP_CHAPTER,
      payload: {
        words: typingResume.words,
        shouldShuffle: false,
        initialIndex: typingResume.index,
      },
    })
    if (typingResume.isTransVisible) {
      dispatch({ type: TypingStateActionType.TOGGLE_TRANS_VISIBLE })
    }
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: typingResume.isTyping })
    setTypingResume(null)
  }, [dispatch, setCurrentChapter, setTypingResume, typingResume])

  useEffect(() => {
    if (typingResume) return
    if (words !== undefined) {
      const initialIndex = isReviewMode && reviewModeInfo.reviewRecord?.index ? reviewModeInfo.reviewRecord.index : 0

      dispatch({
        type: TypingStateActionType.SETUP_CHAPTER,
        payload: { words, shouldShuffle: randomConfig.isOpen, initialIndex },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, typingResume])

  useEffect(() => {
    // 当用户完成章节后且完成 word Record 数据保存，记录 chapter Record 数据,
    if (state.isFinished && !state.isSavingRecord) {
      chapterLogUploader()
      saveChapterRecord(state)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isFinished, state.isSavingRecord])

  useEffect(() => {
    // 启动计时器
    let intervalId: number
    if (state.isTyping) {
      intervalId = window.setInterval(() => {
        dispatch({ type: TypingStateActionType.TICK_TIMER })
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [state.isTyping, dispatch])

  useConfetti(state.isFinished)

  return (
    <TypingContext.Provider value={{ state: state, dispatch }}>
      {state.isFinished && <DonateCard />}
      {state.isFinished && <ResultScreen />}
      <Layout>
        <Header>
          <DictChapterButton />
          <PronunciationSwitcher />
          <Switcher />
          <StartButton isLoading={isLoading} />
          <Tooltip content="跳过该词">
            <button
              className={`${
                state.isShowSkip ? 'bg-orange-400' : 'invisible w-0 bg-gray-300 px-0 opacity-0'
              } my-btn-primary transition-all duration-300 `}
              onClick={skipWord}
            >
              Skip
            </button>
          </Tooltip>
        </Header>
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col px-4 pb-5 xl:px-8">
          <div className="relative flex min-h-0 w-full flex-1 flex-col items-center">
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div
                    className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid  border-indigo-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                    role="status"
                  ></div>
                  {audioPreload.isBlocking && audioPreload.progress.total > 0 && (
                    <div className="flex w-64 flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <p>
                        缓存音频 {audioPreload.progress.loaded}/{audioPreload.progress.total}
                        {audioPreload.progress.loadedBytes > 0 ? `（${formatPreloadBytes(audioPreload.progress.loadedBytes)}）` : ''}
                        {audioPreload.progress.failed > 0 ? ` · 失败 ${audioPreload.progress.failed}` : ''}
                      </p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-indigo-400 transition-all duration-200"
                          style={{
                            width: `${Math.round(
                              ((audioPreload.progress.loaded + audioPreload.progress.failed) / audioPreload.progress.total) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                !state.isFinished && (
                  <>
                    <WordPanel />
                    {audioPreload.failedCount > 0 && (
                      <p className="absolute bottom-8 text-xs text-amber-600 dark:text-amber-400">
                        有 {audioPreload.failedCount} 条音频未能就绪，点击时可能无声
                      </p>
                    )}
                    {audioPreload.backgroundLabel && (
                      <p className="absolute bottom-2 text-xs text-gray-400 dark:text-gray-500">{audioPreload.backgroundLabel}</p>
                    )}
                  </>
                )
              )}
            </div>
            <Speed />
          </div>
        </div>
      </Layout>
      <WordList />
    </TypingContext.Provider>
  )
}

export default App
