import Tooltip from '@/components/Tooltip'
import { SoundIcon } from '@/components/WordPronunciationIcon/SoundIcon'
import useKeySounds from '@/hooks/useKeySounds'
import usePronunciationSound from '@/hooks/usePronunciation'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { fontSizeConfigAtom, isIgnoreCaseAtom } from '@/store'
import type { Word } from '@/typings'
import { CTRL, isChineseSymbol } from '@/utils'
import { useSaveWordRecord } from '@/utils/db'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import IconCheck from '~icons/tabler/check'
import IconX from '~icons/tabler/x'

type FeedbackState = 'none' | 'correct' | 'wrong'

const CORRECT_DELAY_MS = 1000
const WRONG_DELAY_MS = 1500

export default function DictationWord({ word, onFinish }: { word: Word; onFinish: () => void }) {
  const { state, dispatch } = useContext(TypingContext)!
  const [inputWord, setInputWord] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>('none')
  const inputRef = useRef<HTMLInputElement>(null)
  const saveWordRecord = useSaveWordRecord()
  const [, playBeepSound, playHintSound] = useKeySounds()
  const { play, stop, isPlaying } = usePronunciationSound(word)

  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)
  const fontSizeConfig = useAtomValue(fontSizeConfigAtom)

  const displayWord = word.name

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

  const isAnswerCorrect = useCallback(
    (input: string) => {
      if (isIgnoreCase) {
        return input.trim().toLowerCase() === displayWord.toLowerCase()
      }
      return input.trim() === displayWord
    },
    [displayWord, isIgnoreCase],
  )

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
      window.setTimeout(() => onFinish(), WRONG_DELAY_MS)
    }
  }, [dispatch, inputWord, isAnswerCorrect, isLocked, onFinish, playBeepSound, playHintSound, saveWordRecord, state.isTyping, word.name])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isChineseSymbol(e.key)) {
        alert('您正在使用输入法，请关闭输入法。')
        e.preventDefault()
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        handleSubmit()
      }
    },
    [handleSubmit],
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

  return (
    <div className="flex flex-col items-center justify-center pb-1 pt-4">
      <div className="mb-6 flex h-9 w-9 items-center justify-center">
        <Tooltip content={`快捷键${CTRL} + J`}>
          <SoundIcon animated={isPlaying} onClick={playSound} className="h-9 w-9 cursor-pointer text-gray-600 dark:text-gray-300" />
        </Tooltip>
      </div>

      <div className="w-full max-w-2xl px-4">
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
      </div>

      {feedback !== 'none' && (
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          {feedback === 'correct' ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <IconCheck className="h-6 w-6" />
              <span className="text-lg font-medium">正确</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <IconX className="h-6 w-6" />
                <span className="text-lg font-medium">错误</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                你的输入：<span className="font-mono">{inputWord.trim()}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                正确答案：<span className="font-mono text-green-600 dark:text-green-400">{displayWord}</span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
