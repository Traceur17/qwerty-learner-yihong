import DictationDiff from '../DictationWord/DictationDiff'
import ContinuousSheetGuide from './ContinuousSheetGuide'
import Tooltip from '@/components/Tooltip'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import {
  continuousSheetJumpRequestAtom,
  continuousSheetPlayIndexAtom,
  currentDictIdAtom,
  fontSizeConfigAtom,
  isIgnoreCaseAtom,
  listenDictationConfigAtom,
  phoneticConfigAtom,
} from '@/store'
import type { Word } from '@/typings'
import { useSaveWordRecord } from '@/utils/db'
import { getWrongAnswerHistoriesForDict, recordWrongAnswer } from '@/utils/db/wrongAnswerHistory'
import { wrongSeverityDots } from '@/utils/db/wrongAnswerHistoryHelpers'
import { diffPhrase, formatTranslation } from '@/utils/dictationDiff'
import { playChapterWord, stopChapterWordAudio } from '@/utils/playChapterWord'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { type KeyboardEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import IconPin from '~icons/tabler/pin'
import IconPinned from '~icons/tabler/pinned'

type GradeMark = 'ungraded' | 'correct' | 'wrong'

function isAnswerCorrect(input: string, correct: string, ignoreCase: boolean): boolean {
  const a = input.trim()
  const b = correct.trim()
  if (ignoreCase) return a.toLowerCase() === b.toLowerCase()
  return a === b
}

function SeverityDots({
  historyCount,
  wrongAnswers,
  pinned,
  onPin,
  onUnpin,
}: {
  historyCount: number
  wrongAnswers: string[]
  pinned: boolean
  onPin: () => void
  onUnpin: () => void
}) {
  const { count, severity } = wrongSeverityDots(historyCount)
  const [hovered, setHovered] = useState(false)
  const open = pinned || hovered

  useEffect(() => {
    if (count === 0) return
    if (!hovered && !pinned) return
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.key === ' ' || e.code === 'Space') && hovered && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        if (pinned) onUnpin()
        else onPin()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [count, hovered, pinned, onPin, onUnpin])

  if (count === 0) return null
  const color = severity === 'recurring' ? 'bg-red-500' : 'bg-amber-400'
  const label = severity === 'recurring' ? '错误复发' : '轻微错误'

  return (
    <span
      className={`group relative -my-1 -mr-1 inline-flex min-h-[2rem] min-w-[2.25rem] shrink-0 cursor-help items-center justify-center gap-1.5 rounded-md px-2.5 py-2 ${
        pinned
          ? 'bg-indigo-100 ring-1 ring-indigo-300 dark:bg-indigo-950/60 dark:ring-indigo-700'
          : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
      }`}
      title={pinned ? '已钉住 · Esc 关闭' : `${label} · 空格钉住`}
      aria-label={label}
      aria-expanded={open}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      ))}
      {wrongAnswers.length > 0 && open && (
        <span className="absolute right-0 top-full z-30 min-w-[14rem] max-w-[20rem] pt-2">
          <span className="block rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-left shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <span className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-400">历史错答</span>
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded p-1 outline-none transition-colors ${
                  pinned
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-200'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (pinned) onUnpin()
                  else onPin()
                }}
                aria-label={pinned ? '取消钉住' : '钉住'}
                title={pinned ? '取消钉住（Esc）' : '钉住（空格）'}
              >
                {pinned ? <IconPinned className="h-4 w-4" /> : <IconPin className="h-4 w-4" />}
              </button>
            </span>
            <ul className="space-y-1.5 font-mono text-sm leading-snug text-gray-800 dark:text-gray-100">
              {wrongAnswers.map((w, i) => (
                <li key={`${w}-${i}`} className="break-all">
                  {w}
                </li>
              ))}
            </ul>
          </span>
        </span>
      )}
    </span>
  )
}

function wordPhonetic(word: Word, type: 'us' | 'uk'): string {
  const phone = type === 'us' ? word.usphone : word.ukphone
  if (!phone || phone.length <= 1) return ''
  return `[${phone}]`
}

export default function ContinuousDictationSheet({ words }: { words: Word[] }) {
  const { state, dispatch } = useContext(TypingContext)!
  const listenConfig = useAtomValue(listenDictationConfigAtom)
  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)
  const fontSizeConfig = useAtomValue(fontSizeConfigAtom)
  const phoneticConfig = useAtomValue(phoneticConfigAtom)
  const dictId = useAtomValue(currentDictIdAtom)
  const setSheetPlayIndex = useSetAtom(continuousSheetPlayIndexAtom)
  const [jumpRequest, setJumpRequest] = useAtom(continuousSheetJumpRequestAtom)
  const gapMs = listenConfig.gapMs
  const answerFontSize = Math.max(18, Math.round(fontSizeConfig.foreignFont * 0.55))
  const bodyFontSize = Math.max(15, Math.round(fontSizeConfig.translateFont))
  const metaFontSize = Math.max(13, bodyFontSize - 2)

  const [answers, setAnswers] = useState<string[]>(() => words.map(() => ''))
  const [playIndex, setPlayIndex] = useState(0)
  const [maxPlayedIndex, setMaxPlayedIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [grades, setGrades] = useState<GradeMark[]>(() => words.map(() => 'ungraded'))
  const [histories, setHistories] = useState<Record<string, string[]>>({})
  const [pinnedHistoryIndex, setPinnedHistoryIndex] = useState<number | null>(null)

  const saveWordRecord = useSaveWordRecord()
  // 重复判分去重：只为判定发生变化的行写入新记录
  const lastWrittenGradesRef = useRef<Map<number, GradeMark>>(new Map())

  const rowRefs = useRef<Array<HTMLDivElement | null>>([])
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const guideNumberRef = useRef<HTMLButtonElement | null>(null)
  const guideInputRef = useRef<HTMLInputElement | null>(null)
  const guideGradeRef = useRef<HTMLButtonElement | null>(null)
  const playIndexRef = useRef(0)
  const isRunningRef = useRef(false)
  const ignoreEndRef = useRef(false)
  const gapTimerRef = useRef<number>(0)
  const wordsRef = useRef(words)

  playIndexRef.current = playIndex
  isRunningRef.current = isRunning
  wordsRef.current = words

  useEffect(() => {
    setSheetPlayIndex(playIndex)
  }, [playIndex, setSheetPlayIndex])

  useEffect(() => {
    setAnswers(words.map(() => ''))
    setPlayIndex(0)
    setMaxPlayedIndex(0)
    setIsRunning(false)
    setRevealed(false)
    setGrades(words.map(() => 'ungraded'))
    setSheetPlayIndex(0)
    setPinnedHistoryIndex(null)
    lastWrittenGradesRef.current = new Map()
    ignoreEndRef.current = true
    stopChapterWordAudio()
    if (gapTimerRef.current) window.clearTimeout(gapTimerRef.current)
    ignoreEndRef.current = false
  }, [words, setSheetPlayIndex])

  useEffect(() => {
    let cancelled = false
    void getWrongAnswerHistoriesForDict(dictId).then((map) => {
      if (cancelled) return
      const obj: Record<string, string[]> = {}
      map.forEach((v, k) => {
        obj[k] = v
      })
      setHistories(obj)
    })
    return () => {
      cancelled = true
    }
  }, [dictId, words])

  useEffect(() => {
    return () => {
      ignoreEndRef.current = true
      stopChapterWordAudio()
      if (gapTimerRef.current) window.clearTimeout(gapTimerRef.current)
    }
  }, [])

  const scrollRowToCenter = useCallback((index: number) => {
    const row = rowRefs.current[index]
    if (!row) return
    row.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }, [])

  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current) {
      window.clearTimeout(gapTimerRef.current)
      gapTimerRef.current = 0
    }
  }, [])

  const playAt = useCallback(
    (index: number) => {
      const list = wordsRef.current
      if (index < 0 || index >= list.length) return

      clearGapTimer()
      ignoreEndRef.current = true
      stopChapterWordAudio()

      setPlayIndex(index)
      playIndexRef.current = index
      setMaxPlayedIndex((prev) => Math.max(prev, index))

      const word = list[index]
      ignoreEndRef.current = false

      playChapterWord(word, {
        onEnd: () => {
          if (ignoreEndRef.current) return
          if (!isRunningRef.current) return

          clearGapTimer()
          gapTimerRef.current = window.setTimeout(() => {
            if (!isRunningRef.current) return
            const next = playIndexRef.current + 1
            if (next >= wordsRef.current.length) {
              setIsRunning(false)
              isRunningRef.current = false
              return
            }
            playAt(next)
          }, Math.max(0, gapMs))
        },
      })
    },
    [clearGapTimer, gapMs],
  )

  const handlePause = useCallback(() => {
    isRunningRef.current = false
    setIsRunning(false)
    clearGapTimer()
    ignoreEndRef.current = true
    stopChapterWordAudio()
    ignoreEndRef.current = false
  }, [clearGapTimer])

  const focusRow = useCallback(
    (index: number) => {
      // 最多聚焦到「当前播放词 + 1」，便于输完后进下一格等待
      const maxFocus = Math.min(playIndexRef.current + 1, Math.max(0, wordsRef.current.length - 1))
      const clamped = Math.max(0, Math.min(index, maxFocus))
      window.requestAnimationFrame(() => {
        inputRefs.current[clamped]?.focus()
        scrollRowToCenter(clamped)
      })
    },
    [scrollRowToCenter],
  )

  const handlePlay = useCallback(() => {
    isRunningRef.current = true
    setIsRunning(true)
    const idx = playIndexRef.current
    playAt(idx)
    focusRow(idx)
  }, [focusRow, playAt])

  const handleNumberClick = useCallback(
    (index: number) => {
      // 点当前播放题：播放中→暂停；已暂停→继续。点其他题：从该题起播
      if (index === playIndexRef.current && isRunningRef.current) {
        handlePause()
        return
      }
      isRunningRef.current = true
      setIsRunning(true)
      playAt(index)
      focusRow(index)
    },
    [focusRow, handlePause, playAt],
  )

  // 计时器与播放联动：播放即计时，暂停即停表（卷面模式无「按任意键继续」遮罩）
  useEffect(() => {
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: isRunning })
  }, [dispatch, isRunning])

  // 外部 isTyping 与连播双向联动：置 false（抽屉/设置打开、窗口失焦等）→暂停；置 true（顶栏 Start）→播放
  useEffect(() => {
    if (!state.isTyping && isRunningRef.current) handlePause()
    else if (state.isTyping && !isRunningRef.current) handlePlay()
  }, [handlePause, handlePlay, state.isTyping])

  // 响应侧栏「从 xx 开始」：直接从该题起播
  useEffect(() => {
    if (!jumpRequest) return
    setJumpRequest(null)
    const { index } = jumpRequest
    if (index < 0 || index >= wordsRef.current.length) return
    isRunningRef.current = true
    setIsRunning(true)
    playAt(index)
    focusRow(index)
  }, [focusRow, jumpRequest, playAt, setJumpRequest])

  const handleHideReveal = useCallback(() => {
    setRevealed(false)
    setPinnedHistoryIndex(null)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      // Ctrl/Cmd+Space：输入法常占用 Ctrl+Space，同时支持 Ctrl+Shift+Space 作为兜底
      const isSpace = e.key === ' ' || e.code === 'Space'
      if (isSpace && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        e.stopPropagation()
        if (isRunningRef.current) handlePause()
        else handlePlay()
        return
      }

      if (e.key === 'Escape') {
        if (pinnedHistoryIndex !== null) {
          e.preventDefault()
          setPinnedHistoryIndex(null)
          return
        }
        if (isRunningRef.current) {
          e.preventDefault()
          handlePause()
          return
        }
        if (revealed) {
          e.preventDefault()
          handleHideReveal()
        }
        return
      }

      if (isSpace) {
        const el = e.target
        if (el instanceof HTMLElement) {
          const tag = el.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || el.isContentEditable) return
        }
        e.preventDefault()
        if (isRunningRef.current) handlePause()
        else handlePlay()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [handleHideReveal, handlePause, handlePlay, pinnedHistoryIndex, revealed])

  const onAnswerKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault()
          focusRow(index - 1)
          return
        }
        e.preventDefault()
        focusRow(index + 1)
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        focusRow(index - 1)
      }
    },
    [focusRow],
  )

  const handleGrade = useCallback(async () => {
    handlePause()

    const playedThrough = maxPlayedIndex
    const nextGrades: GradeMark[] = words.map((_, i) => {
      if (i > playedThrough) return 'ungraded'
      const ok = isAnswerCorrect(answers[i] ?? '', words[i].name, isIgnoreCase)
      return ok ? 'correct' : 'wrong'
    })
    setGrades(nextGrades)
    setRevealed(true)

    const historyUpdates: Record<string, string[]> = { ...histories }
    for (let i = 0; i <= playedThrough; i++) {
      if (nextGrades[i] !== 'wrong') continue
      const typed = (answers[i] ?? '').trim()
      if (!typed) continue
      const updated = await recordWrongAnswer(dictId, words[i].name, typed)
      historyUpdates[words[i].name] = updated
    }
    setHistories(historyUpdates)

    // 判分结果写入练习记录（进入错题与统计体系）；同一行判定未变化时不重复写
    for (let i = 0; i <= playedThrough; i++) {
      const grade = nextGrades[i]
      if (grade === 'ungraded') continue
      if (lastWrittenGradesRef.current.get(i) === grade) continue
      lastWrittenGradesRef.current.set(i, grade)
      await saveWordRecord({
        word: words[i].name,
        wrongCount: grade === 'wrong' ? 1 : 0,
        letterTimeArray: [],
        letterMistake: {},
      })
    }
  }, [answers, dictId, handlePause, histories, isIgnoreCase, maxPlayedIndex, saveWordRecord, words])

  const gapLabel = useMemo(() => `${(gapMs / 1000).toFixed(1)}s`, [gapMs])
  const timeLabel = useMemo(() => {
    const minutes = Math.floor(state.timerData.time / 60)
    const seconds = state.timerData.time % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [state.timerData.time])
  const phoneticType = phoneticConfig.type === 'us' ? 'us' : 'uk'

  return (
    <div className="flex h-full min-h-0 w-full max-w-3xl flex-col">
      <div className="min-h-0 flex-1 space-y-1 overflow-auto px-1 pb-2">
        {words.map((word, index) => {
          const isPlayRow = index === playIndex
          const focusCeiling = Math.min(playIndex + 1, words.length - 1)
          const canFocus = index <= focusCeiling
          const graded = revealed && index <= maxPlayedIndex
          const grade = grades[index]
          const wrongs = histories[word.name] ?? []
          const emptyWrong = graded && grade === 'wrong' && !(answers[index] ?? '').trim()
          const historyCountForDots = emptyWrong ? Math.max(1, wrongs.length) : wrongs.length
          const isWrong = graded && grade === 'wrong'
          const isCorrect = graded && grade === 'correct'
          const showUserDiff = isWrong && !emptyWrong
          const userDiff = showUserDiff ? diffPhrase(answers[index] ?? '', word.name, isIgnoreCase) : null
          const correctDiff = isWrong ? diffPhrase(answers[index] ?? '', word.name, isIgnoreCase) : null
          const phone = wordPhonetic(word, phoneticType)
          const trans = formatTranslation(word.trans)

          return (
            <div
              key={`${word.name}-${index}`}
              ref={(el) => {
                rowRefs.current[index] = el
              }}
              className={`rounded-md px-2 py-2 transition-colors ${
                isWrong
                  ? 'border border-red-200/90 bg-red-50/90 shadow-sm dark:border-red-900/60 dark:bg-red-950/40'
                  : isCorrect
                  ? 'border border-transparent bg-transparent opacity-80'
                  : isPlayRow
                  ? 'dark:bg-indigo-950/35 border border-transparent bg-indigo-50/90'
                  : 'border border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  ref={index === 0 ? guideNumberRef : undefined}
                  className={`w-8 shrink-0 pt-1 text-left font-mono tabular-nums ${
                    isWrong
                      ? 'font-semibold text-red-500 dark:text-red-400'
                      : isCorrect
                      ? 'text-emerald-500/80 dark:text-emerald-400/80'
                      : isPlayRow
                      ? 'font-bold text-indigo-600 dark:text-indigo-300'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  style={{ fontSize: `${bodyFontSize}px` }}
                  onClick={() => handleNumberClick(index)}
                  title={isPlayRow && isRunning ? '暂停' : isPlayRow ? '继续播放' : '从该题起播'}
                >
                  {isPlayRow ? `${isRunning ? '⏸' : '▶'}${index + 1}` : index + 1}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      {showUserDiff && userDiff ? (
                        <div
                          className="w-full border-0 border-b border-red-200 bg-transparent py-0.5 font-mono leading-none dark:border-red-800"
                          style={{ fontSize: `${answerFontSize}px` }}
                        >
                          <DictationDiff
                            parts={userDiff.userLine}
                            variant="user"
                            fontSize={answerFontSize}
                            className="!text-left !leading-none"
                          />
                        </div>
                      ) : emptyWrong ? (
                        <div
                          className="w-full border-0 border-b border-red-200 py-0.5 font-mono text-red-300 dark:border-red-800 dark:text-red-400/70"
                          style={{ fontSize: `${answerFontSize}px` }}
                        >
                          （空）
                        </div>
                      ) : (
                        <input
                          ref={(el) => {
                            inputRefs.current[index] = el
                            if (index === 0) guideInputRef.current = el
                          }}
                          type="text"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          disabled={!canFocus}
                          readOnly={isCorrect}
                          value={answers[index] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setAnswers((prev) => {
                              const next = [...prev]
                              next[index] = value
                              return next
                            })
                          }}
                          onFocus={() => scrollRowToCenter(index)}
                          onKeyDown={(e) => onAnswerKeyDown(index, e)}
                          className={`w-full appearance-none rounded-none border-0 border-b bg-transparent px-0 py-0.5 font-mono leading-none outline-none ring-0 focus:border-indigo-500 focus:outline-none focus:ring-0 dark:focus:border-indigo-400 ${
                            isCorrect
                              ? 'border-emerald-300/80 text-emerald-800 dark:border-emerald-700 dark:text-emerald-200'
                              : canFocus
                              ? 'border-gray-300 text-gray-800 dark:border-gray-600 dark:text-gray-50'
                              : 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700'
                          }`}
                          style={{ fontSize: `${answerFontSize}px` }}
                          aria-label={`第 ${index + 1} 题作答`}
                        />
                      )}
                    </div>
                    {isCorrect && (
                      <span className="shrink-0 text-3xl font-bold leading-none text-emerald-500 dark:text-emerald-400">✓</span>
                    )}
                    {isWrong && (
                      <SeverityDots
                        historyCount={historyCountForDots}
                        wrongAnswers={wrongs}
                        pinned={pinnedHistoryIndex === index}
                        onPin={() => setPinnedHistoryIndex(index)}
                        onUnpin={() => setPinnedHistoryIndex(null)}
                      />
                    )}
                  </div>

                  {isWrong && (
                    <div className="mt-1.5 space-y-0.5 border-t border-red-100 pt-1.5 dark:border-red-900/50">
                      <div className="font-mono leading-none text-gray-800 dark:text-gray-100" style={{ fontSize: `${answerFontSize}px` }}>
                        {correctDiff ? (
                          <DictationDiff
                            parts={correctDiff.correctLine}
                            variant="correct"
                            fontSize={answerFontSize}
                            className="!text-left !leading-none"
                          />
                        ) : (
                          <span>{word.name}</span>
                        )}
                      </div>
                      {(phone || trans) && (
                        <div
                          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-gray-500 dark:text-gray-400"
                          style={{ fontSize: `${metaFontSize}px` }}
                        >
                          {phone ? <span className="shrink-0">{phone}</span> : null}
                          {trans ? <span className="min-w-0">{trans}</span> : null}
                        </div>
                      )}
                    </div>
                  )}

                  {isCorrect && (phone || trans) && (
                    <div
                      className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-emerald-700/70 dark:text-emerald-300/70"
                      style={{ fontSize: `${metaFontSize}px` }}
                    >
                      {phone ? <span className="shrink-0">{phone}</span> : null}
                      {trans ? <span className="min-w-0">{trans}</span> : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-0 z-20 shrink-0 border-t border-gray-200 bg-white/95 px-2 py-3 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <div className="grid grid-cols-3 items-center">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <Tooltip content="快捷键：Ctrl+Shift+空格" placement="top">
                <button
                  type="button"
                  className="flex items-center justify-center rounded-lg border border-amber-400 bg-amber-50 px-4 py-1 text-base font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  onClick={handlePause}
                >
                  ⏸ 暂停
                </button>
              </Tooltip>
            ) : (
              <Tooltip content="快捷键：Ctrl+Shift+空格" placement="top">
                <button type="button" className="my-btn-primary px-4 py-1 text-base" onClick={handlePlay}>
                  ▶ 播放
                </button>
              </Tooltip>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">间隔 {gapLabel}</span>
          </div>

          <div className="text-center">
            <span className="font-mono text-2xl font-medium tabular-nums text-gray-600 dark:text-gray-300" title="练习时间">
              {timeLabel}
            </span>
          </div>

          <div className="flex justify-end">
            {revealed ? (
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-1 text-base text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                onClick={handleHideReveal}
                title="Esc"
              >
                收起答案
              </button>
            ) : (
              <button type="button" ref={guideGradeRef} className="my-btn-primary px-4 py-1 text-base" onClick={() => void handleGrade()}>
                对答案
              </button>
            )}
          </div>
        </div>
      </div>

      <ContinuousSheetGuide targets={{ numberRef: guideNumberRef, inputRef: guideInputRef, gradeRef: guideGradeRef }} />
    </div>
  )
}
