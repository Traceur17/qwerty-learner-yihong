import DictationDiff from './DictationDiff'
import Tooltip from '@/components/Tooltip'
import { SoundIcon } from '@/components/WordPronunciationIcon/SoundIcon'
import useKeySounds from '@/hooks/useKeySounds'
import usePronunciationSound from '@/hooks/usePronunciation'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { fontSizeConfigAtom, isIgnoreCaseAtom } from '@/store'
import type { Word } from '@/typings'
import { CTRL, isChineseSymbol } from '@/utils'
import { useSaveWordRecord } from '@/utils/db'
import { diffPhrase, formatTranslation } from '@/utils/dictationDiff'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

type FeedbackState = 'none' | 'correct' | 'wrong'

const CORRECT_DELAY_MS = 1000

export default function DictationWord({ word, onFinish }: { word: Word; onFinish: () => void }) {
  const { state, dispatch } = useContext(TypingContext)!
  const [inputWord, setInputWord] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>('none')
  const inputRef = useRef<HTMLInputElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const saveWordRecord = useSaveWordRecord()
  const [, playBeepSound, playHintSound] = useKeySounds()
  const { play, stop, isPlaying } = usePronunciationSound(word)

  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)
  const fontSizeConfig = useAtomValue(fontSizeConfigAtom)

  const displayWord = word.name
  const translation = useMemo(() => formatTranslation(word.trans), [word.trans])

  const diffResult = useMemo(() => {
    if (feedback !== 'wrong') return null
    return diffPhrase(inputWord, displayWord, isIgnoreCase)
  }, [displayWord, feedback, inputWord, isIgnoreCase])

  const playSound = useCallback(() => {
    stop()
    play()
  }, [play, stop])

  useEffect(() => {
    setInputWord('')
    setIsLocked(false)
    setFeedback('none')
  }, [word])

  useEffect(() => {
    return () => stop()
  }, [word, stop])

  useEffect(() => {
    if (state.isTyping && !isLocked) {
      inputRef.current?.focus()
      const timer = window.setTimeout(() => playSound(), 80)
      return () => clearTimeout(timer)
    }
  }, [state.isTyping, word, isLocked, playSound])

  useEffect(() => {
    if (feedback === 'wrong' && isLocked) {
      feedbackRef.current?.focus()
    }
  }, [feedback, isLocked])

  const isAnswerCorrect = useCallback(
    (input: string) => {
      if (isIgnoreCase) {
        return input.trim().toLowerCase() === displayWord.toLowerCase()
      }
      return input.trim() === displayWord
    },
    [displayWord, isIgnoreCase],
  )

  const handleContinueAfterWrong = useCallback(() => {
    if (feedback !== 'wrong' || !isLocked) return
    onFinish()
  }, [feedback, isLocked, onFinish])

  const handleSubmit = useCallback(() => {
    if (isLocked || !state.isTyping) return

    const trimmed = inputWord.trim()
    if (!trimmed) return

    setIsLocked(true)
    const isCorrect = isAnswerCorrect(inputWord)

    dispatch({ type: TypingStateActionType.SET_IS_SAVING_RECORD, payload: true })

    if (isCorrect) {
      setFeedback('correct')
      playHintSound()
      dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD })
      saveWordRecord({
        word: word.name,
        wrongCount: 0,
        letterTimeArray: [],
        letterMistake: {},
      })
      window.setTimeout(() => onFinish(), CORRECT_DELAY_MS)
    } else {
      setFeedback('wrong')
      playBeepSound()
      dispatch({ type: TypingStateActionType.REPORT_WRONG_WORD, payload: { letterMistake: {} } })
      saveWordRecord({
        word: word.name,
        wrongCount: 1,
        letterTimeArray: [],
        letterMistake: {},
      })
    }
  }, [dispatch, inputWord, isAnswerCorrect, isLocked, onFinish, playBeepSound, playHintSound, saveWordRecord, state.isTyping, word.name])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLDivElement>) => {
      if (isChineseSymbol(e.key)) {
        alert('您正在使用输入法，请关闭输入法。')
        e.preventDefault()
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (feedback === 'wrong' && isLocked) {
          handleContinueAfterWrong()
        } else {
          handleSubmit()
        }
      }
    },
    [feedback, handleContinueAfterWrong, handleSubmit, isLocked],
  )

  useHotkeys(
    'ctrl+j',
    () => {
      if (state.isTyping) {
        playSound()
      }
    },
    [state.isTyping, playSound],
    { enableOnFormTags: true, preventDefault: true },
  )

  useHotkeys(
    'enter',
    () => {
      if (feedback === 'wrong' && isLocked) {
        handleContinueAfterWrong()
      }
    },
    { enableOnFormTags: true, preventDefault: true },
    [feedback, handleContinueAfterWrong, isLocked],
  )

  return (
    <div className="flex flex-col items-center justify-center pb-1 pt-4">
      <div className="mb-6 flex h-9 w-9 items-center justify-center">
        <Tooltip content={`快捷键${CTRL} + J`}>
          <SoundIcon animated={isPlaying} onClick={playSound} className="h-9 w-9 cursor-pointer text-gray-600 dark:text-gray-300" />
        </Tooltip>
      </div>

      <div className="w-full max-w-2xl px-4">
        {feedback === 'wrong' && isLocked && diffResult ? (
          <div
            ref={feedbackRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="w-full border-0 border-b-2 border-gray-400 bg-transparent px-0 py-2 outline-none ring-0 dark:border-gray-500"
          >
            <DictationDiff parts={diffResult.userLine} variant="user" fontSize={fontSizeConfig.foreignFont} />
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={inputWord}
            onChange={(e) => setInputWord(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={isLocked}
            disabled={!state.isTyping}
            className="w-full appearance-none rounded-none border-0 border-b-2 border-gray-400 bg-transparent px-0 py-2 text-center font-mono text-gray-800 shadow-none outline-none ring-0 focus:border-indigo-500 focus:outline-none focus:ring-0 disabled:opacity-70 dark:border-gray-500 dark:text-gray-50 dark:focus:border-indigo-400"
            style={{ fontSize: fontSizeConfig.foreignFont.toString() + 'px' }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="听写输入"
          />
        )}

        {feedback === 'correct' && translation && (
          <p className="mt-3 text-center text-base text-gray-600 dark:text-gray-300">{translation}</p>
        )}

        {feedback === 'wrong' && (
          <>
            {diffResult && (
              <DictationDiff parts={diffResult.correctLine} variant="correct" fontSize={fontSizeConfig.foreignFont} className="mt-3" />
            )}
            {translation && <p className="mt-2 text-center text-base text-gray-600 dark:text-gray-300">{translation}</p>}
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">按 Enter 继续</p>
          </>
        )}
      </div>
    </div>
  )
}
