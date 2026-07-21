import DictationDiff from '../DictationWord/DictationDiff'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { Word } from '@/typings'
import type { ISheetPass } from '@/utils/db/record'
import { diffPhrase, formatTranslation } from '@/utils/dictationDiff'
import { cn } from '@/utils/ui'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  passes: ISheetPass[]
  title: string
  words: Word[]
  phoneticType: 'us' | 'uk'
  ignoreCase: boolean
  focusPassIndex?: number
  onPlayWord: (word: Word) => void
}

function wordPhonetic(word: Word | undefined, type: 'us' | 'uk'): string {
  if (!word) return ''
  const phone = type === 'us' ? word.usphone : word.ukphone
  if (!phone || phone.length <= 1) return ''
  return `[${phone}]`
}

const PASS_COL_PX = 160
const NUM_COL_PX = 48
const WORD_COL_PX_COMPACT = 200
const WORD_COL_PX_META = 220
const PHONE_COL_PX = 140
const TRANS_COL_PX = 160

const noFocusRing =
  'outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0'

function AnswerChip({ isWrong, className, children }: { isWrong: boolean; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'break-words rounded px-1.5 py-1 font-mono text-[14px] leading-snug',
        isWrong
          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
        className,
      )}
    >
      {children}
    </div>
  )
}

function WrongCellContent({
  typed,
  wordName,
  rowExpanded,
  ignoreCase,
}: {
  typed: string
  wordName: string
  rowExpanded: boolean
  ignoreCase: boolean
}) {
  const trimmed = typed.trim()

  if (!rowExpanded) {
    return <AnswerChip isWrong>{trimmed ? typed : <span className="inline-block min-h-[1.25em]">&nbsp;</span>}</AnswerChip>
  }

  const diff = diffPhrase(typed, wordName, ignoreCase)

  return (
    <div className="space-y-1">
      <AnswerChip isWrong>
        {trimmed ? (
          <DictationDiff
            parts={diff.userLine}
            variant="user"
            fontSize={14}
            quiet
            className="!max-w-full !whitespace-normal !break-words !text-left"
          />
        ) : (
          <span className="inline-block min-h-[1.25em]">&nbsp;</span>
        )}
      </AnswerChip>
      <AnswerChip isWrong={false} className="dark:bg-emerald-950/35 bg-emerald-50/90">
        <DictationDiff
          parts={diff.correctLine}
          variant="correct"
          fontSize={14}
          quiet
          className="!max-w-full !whitespace-normal !break-words !text-left"
        />
      </AnswerChip>
    </div>
  )
}

export default function SheetPassHistoryOverlay({
  open,
  onOpenChange,
  passes,
  title,
  words,
  phoneticType,
  ignoreCase,
  focusPassIndex,
  onPlayWord,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const colRefs = useRef<Array<HTMLTableCellElement | null>>([])
  const [highlightCol, setHighlightCol] = useState<number | null>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [showMeta, setShowMeta] = useState(true)

  const wordByName = useMemo(() => {
    const map = new Map<string, Word>()
    for (const w of words) map.set(w.name, w)
    return map
  }, [words])

  const rowWords = useMemo(() => {
    const names: string[] = []
    const seen = new Set<string>()
    for (const pass of passes) {
      for (const name of pass.wordNames) {
        if (seen.has(name)) continue
        seen.add(name)
        names.push(name)
      }
    }
    if (names.length === 0) {
      for (const w of words) names.push(w.name)
    }
    return names
  }, [passes, words])

  const wordColPx = showMeta ? WORD_COL_PX_META : WORD_COL_PX_COMPACT
  const phoneLeft = NUM_COL_PX + wordColPx
  const transLeft = phoneLeft + PHONE_COL_PX
  const frozenWidth = showMeta ? NUM_COL_PX + wordColPx + PHONE_COL_PX + TRANS_COL_PX : NUM_COL_PX + wordColPx
  const tableWidth = frozenWidth + passes.length * PASS_COL_PX

  useEffect(() => {
    if (!open) {
      setExpandedRow(null)
      return
    }
    const idx = focusPassIndex ?? passes.length - 1
    if (idx < 0) return
    setHighlightCol(idx)
    const el = colRefs.current[idx]
    const scroller = scrollerRef.current
    if (!el || !scroller) return
    scroller.scrollLeft = Math.max(0, el.offsetLeft - frozenWidth - 24)
  }, [focusPassIndex, frozenWidth, open, passes.length])

  useEffect(() => {
    if (!open) return
    const onWheel = (e: WheelEvent) => {
      const panel = panelRef.current
      const scroller = scrollerRef.current
      if (!panel || !scroller || !panel.contains(e.target as Node)) return

      const horizontalIntent = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)
      if (!horizontalIntent) return

      const delta = e.shiftKey ? (e.deltaY !== 0 ? e.deltaY : e.deltaX) : e.deltaX
      if (delta === 0) return

      e.preventDefault()
      scroller.scrollLeft += delta
    }
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => window.removeEventListener('wheel', onWheel, { capture: true })
  }, [open])

  // 点表格外才收起；表格内点另一行直接切换，避免先失焦导致行高收缩点空
  useEffect(() => {
    if (expandedRow == null) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-history-grid]')) return
      setExpandedRow(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [expandedRow])

  const stickyBgClass = (row: number | 'head') => {
    if (row === 'head') return 'bg-slate-50 dark:bg-slate-900'
    return row % 2 === 1 ? 'bg-indigo-50 dark:bg-indigo-950' : 'bg-white dark:bg-slate-950'
  }

  const zebraPass = (row: number) => (row % 2 === 1 ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : 'bg-white dark:bg-slate-950')

  const highlightPass = (col: number, row: number) => (highlightCol === col ? 'bg-indigo-100 dark:bg-indigo-900/50' : zebraPass(row))

  const playRow = (row: number, word: Word | undefined) => {
    setExpandedRow(row)
    if (word) onPlayWord(word)
  }

  const toggleRow = (row: number) => {
    setExpandedRow((prev) => (prev === row ? null : row))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className={cn(
          'fixed inset-3 left-3 top-3 z-50 flex h-[calc(100vh-1.5rem)] max-h-none w-[calc(100vw-1.5rem)] max-w-none',
          'translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 shadow-2xl',
          'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-[0.985] data-[state=open]:zoom-in-[0.985]',
          'data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0',
          'data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0',
          'dark:border-slate-700 dark:bg-slate-950 sm:rounded-xl [&>button]:hidden',
          noFocusRing,
          '[&_*:focus-visible]:outline-none [&_*:focus]:outline-none [&_*]:outline-none',
        )}
      >
        <div ref={panelRef} className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-semibold sm:text-xl">{title}</DialogTitle>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                tabIndex={-1}
                className={cn(
                  'rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
                  noFocusRing,
                )}
                onClick={() => setShowMeta((v) => !v)}
              >
                {showMeta ? '隐藏音标释义' : '显示音标释义'}
              </button>
              <button
                type="button"
                tabIndex={-1}
                className={cn(
                  'rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                  noFocusRing,
                )}
                aria-label="关闭"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {passes.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-base text-slate-500">暂无已封存的听写记录</div>
          ) : (
            <div data-history-grid className="relative min-h-0 flex-1">
              {/* 固定列右侧 / 表头底侧衔接阴影（随滚动区相对定位） */}
              <div className="pointer-events-none absolute bottom-0 top-0 z-40 w-3" style={{ left: frozenWidth }} aria-hidden>
                <div className="from-slate-900/12 dark:via-black/12 h-full w-full bg-gradient-to-r via-slate-900/5 to-transparent dark:from-black/30" />
              </div>

              <div ref={scrollerRef} className={cn('h-full min-h-0 overflow-auto overscroll-contain', noFocusRing)}>
                <table className="border-separate border-spacing-0 text-base" style={{ tableLayout: 'fixed', width: tableWidth }}>
                  <colgroup>
                    <col style={{ width: NUM_COL_PX }} />
                    <col style={{ width: wordColPx }} />
                    {showMeta ? (
                      <>
                        <col style={{ width: PHONE_COL_PX }} />
                        <col style={{ width: TRANS_COL_PX }} />
                      </>
                    ) : null}
                    {passes.map((_, i) => (
                      <col key={i} style={{ width: PASS_COL_PX }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-20">
                    <tr>
                      <th
                        className={cn(
                          'sticky left-0 z-30 border-b border-r border-slate-200 px-1 py-3 text-center text-sm font-medium',
                          stickyBgClass('head'),
                        )}
                        style={{
                          width: NUM_COL_PX,
                          left: 0,
                          boxShadow: '0 3px 8px -4px rgba(15,23,42,0.18)',
                        }}
                      >
                        #
                      </th>
                      <th
                        className={cn(
                          'sticky z-30 border-b border-r border-slate-200 px-3 py-3 text-left text-sm font-medium',
                          stickyBgClass('head'),
                        )}
                        style={{
                          width: wordColPx,
                          left: NUM_COL_PX,
                          boxShadow: '0 3px 8px -4px rgba(15,23,42,0.18)',
                        }}
                      >
                        单词
                      </th>
                      {showMeta ? (
                        <>
                          <th
                            className={cn(
                              'sticky z-30 border-b border-r border-slate-200 px-3 py-3 text-left text-sm font-medium',
                              stickyBgClass('head'),
                            )}
                            style={{
                              width: PHONE_COL_PX,
                              left: phoneLeft,
                              boxShadow: '0 3px 8px -4px rgba(15,23,42,0.18)',
                            }}
                          >
                            音标
                          </th>
                          <th
                            className={cn(
                              'sticky z-30 border-b border-r border-slate-200 px-3 py-3 text-left text-sm font-medium',
                              stickyBgClass('head'),
                            )}
                            style={{
                              width: TRANS_COL_PX,
                              left: transLeft,
                              boxShadow: '3px 3px 8px -4px rgba(15,23,42,0.18)',
                            }}
                          >
                            释义
                          </th>
                        </>
                      ) : null}
                      {passes.map((pass, col) => (
                        <th
                          key={pass.id ?? col}
                          ref={(el) => {
                            colRefs.current[col] = el
                          }}
                          className={cn(
                            'border-b border-slate-200 px-2 py-3 text-center text-sm font-medium dark:border-slate-700',
                            highlightCol === col ? 'bg-indigo-100 dark:bg-indigo-950' : 'bg-slate-50 dark:bg-slate-900',
                          )}
                          style={{
                            width: PASS_COL_PX,
                            boxShadow: '0 3px 8px -4px rgba(15,23,42,0.18)',
                          }}
                        >
                          <div>第{col + 1}遍</div>
                          <div className="text-xs font-normal text-slate-500">{dayjs.unix(pass.timeStamp).format('MM-DD HH:mm')}</div>
                          <div className="text-xs font-normal text-indigo-600 dark:text-indigo-300">{pass.accuracy}%</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rowWords.map((wordName, row) => {
                      const word = wordByName.get(wordName)
                      const phone = wordPhonetic(word, phoneticType)
                      const trans = word ? formatTranslation(word.trans) : ''
                      const rowExpanded = expandedRow === row
                      return (
                        <tr
                          key={wordName}
                          data-history-row={row}
                          className={cn('align-top', rowExpanded && 'bg-indigo-50/40 dark:bg-indigo-950/25')}
                        >
                          <td
                            className={cn(
                              'sticky z-10 cursor-pointer border-b border-r border-slate-200 px-1 py-2.5 text-center text-slate-500 dark:border-slate-700',
                              stickyBgClass(row),
                            )}
                            style={{ left: 0, width: NUM_COL_PX }}
                            title="点击发音"
                            onClick={() => playRow(row, word)}
                          >
                            {row + 1}
                          </td>
                          <td
                            className={cn(
                              'sticky z-10 cursor-pointer border-b border-r border-slate-200 px-2 py-2.5 dark:border-slate-700',
                              stickyBgClass(row),
                            )}
                            style={{
                              left: NUM_COL_PX,
                              width: wordColPx,
                              ...(!showMeta ? { boxShadow: '3px 0 8px -4px rgba(15,23,42,0.18)' } : null),
                            }}
                            title="点击发音"
                            onClick={() => playRow(row, word)}
                          >
                            <span className="break-words font-mono text-[16px] font-medium leading-snug text-slate-800 dark:text-slate-100">
                              {wordName}
                            </span>
                          </td>
                          {showMeta ? (
                            <>
                              <td
                                className={cn(
                                  'sticky z-10 cursor-pointer border-b border-r border-slate-200 px-3 py-2.5 text-[14px] leading-snug text-slate-500 dark:border-slate-700 dark:text-slate-400',
                                  stickyBgClass(row),
                                )}
                                style={{ left: phoneLeft, width: PHONE_COL_PX }}
                                title="点击发音"
                                onClick={() => playRow(row, word)}
                              >
                                <span className="break-words">{phone || '—'}</span>
                              </td>
                              <td
                                className={cn(
                                  'sticky z-10 cursor-pointer border-b border-r border-slate-200 px-3 py-2.5 text-[14px] leading-snug text-slate-600 dark:border-slate-700 dark:text-slate-300',
                                  stickyBgClass(row),
                                )}
                                style={{
                                  left: transLeft,
                                  width: TRANS_COL_PX,
                                  boxShadow: '3px 0 8px -4px rgba(15,23,42,0.18)',
                                }}
                                title="点击发音"
                                onClick={() => playRow(row, word)}
                              >
                                <span className="break-words">{trans || '—'}</span>
                              </td>
                            </>
                          ) : null}
                          {passes.map((pass, col) => {
                            const idx = pass.wordNames.indexOf(wordName)
                            if (idx < 0) {
                              return (
                                <td
                                  key={`${pass.id ?? col}-${wordName}`}
                                  className={cn(
                                    'cursor-pointer border-b border-slate-100 px-2 py-2.5 text-center text-slate-300 dark:border-slate-800',
                                    highlightPass(col, row),
                                  )}
                                  style={{ width: PASS_COL_PX, maxWidth: PASS_COL_PX }}
                                  onClick={() => toggleRow(row)}
                                >
                                  —
                                </td>
                              )
                            }
                            const grade = pass.grades[idx]
                            const typed = pass.answers[idx] ?? ''
                            const isWrong = grade === 'wrong'
                            return (
                              <td
                                key={`${pass.id ?? col}-${wordName}`}
                                className={cn(
                                  'cursor-pointer border-b border-slate-100 px-2 py-2.5 align-top dark:border-slate-800',
                                  highlightPass(col, row),
                                )}
                                style={{ width: PASS_COL_PX, maxWidth: PASS_COL_PX }}
                                onClick={() => toggleRow(row)}
                              >
                                {isWrong ? (
                                  <WrongCellContent typed={typed} wordName={wordName} rowExpanded={rowExpanded} ignoreCase={ignoreCase} />
                                ) : (
                                  <AnswerChip isWrong={false}>{typed.trim() || '✓'}</AnswerChip>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
