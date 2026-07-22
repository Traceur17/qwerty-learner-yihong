import { WordPronunciationIcon } from '@/components/WordPronunciationIcon'
import { currentDictInfoAtom } from '@/store'
import { attachDuplicateHints } from '@/utils/collectWordDuplicates'
import type { CollectCardDraft } from '@/utils/collectWordEnrichment'
import { draftToWord, recognizeAndEnrich } from '@/utils/collectWordEnrichment'
import { COLLECT_BISCUIT_DICT_URL } from '@/utils/db/collectedWords'
import { addCollectedWords } from '@/utils/db/collectedWordsRepo'
import { GeminiKeyMissingError } from '@/utils/gemini'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { Dialog, Transition } from '@headlessui/react'
import { useAtomValue } from 'jotai'
import { type ChangeEvent, type ClipboardEvent, Fragment, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import IconX from '~icons/tabler/x'

type CollectBiscuitOverlayProps = {
  open: boolean
  onClose: () => void
  /** Called after successful save (triggers center jar animation). */
  onSaved?: (addedCount: number) => void
  title?: string
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

export default function CollectBiscuitOverlay({ open, onClose, onSaved, title = '收集小饼干' }: CollectBiscuitOverlayProps) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [cards, setCards] = useState<CollectCardDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const { mutate } = useSWRConfig()
  const { data: currentWords } = useSWR(currentDictInfo.url, wordListFetcher)

  const resetForm = useCallback(() => {
    setCards([])
    setText('')
    setImages([])
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) return
    // Fresh open: always clear leftover draft from a previous cancel
    resetForm()
    const t = window.setTimeout(() => textareaRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open, resetForm])

  const handleClose = useCallback(() => {
    if (saving) return
    resetForm()
    onClose()
  }, [onClose, resetForm, saving])
  const appendImages = useCallback((dataUrls: string[]) => {
    if (!dataUrls.length) return
    setImages((prev) => {
      const next = [...prev]
      for (const url of dataUrls) {
        if (!next.includes(url)) next.push(url)
      }
      return next
    })
  }, [])

  const runRecognize = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const drafts = await recognizeAndEnrich({
        text: text.trim() || undefined,
        imageDataUrls: images.length ? images : undefined,
      })
      if (drafts.length === 0) {
        setCards([])
        setError('没有识别到英文单词，请换一张图或补充文本')
        return
      }
      const withDup = await attachDuplicateHints(drafts, currentWords, currentDictInfo.name)
      setCards(withDup)
    } catch (e) {
      if (e instanceof GeminiKeyMissingError) {
        setError('请先在「设置 → AI 设置」中配置 Gemini API Key')
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setLoading(false)
    }
  }, [text, images, currentWords, currentDictInfo.name])

  const onPaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      if (!files.length) return
      e.preventDefault()
      const urls = await Promise.all(files.map(readFileAsDataUrl))
      appendImages(urls)
    },
    [appendImages],
  )

  const onFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      e.target.value = ''
      if (!files.length) return
      const urls = await Promise.all(files.map(readFileAsDataUrl))
      appendImages(urls)
    },
    [appendImages],
  )

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!loading) void runRecognize()
      }
    },
    [loading, runRecognize],
  )

  const updateCard = useCallback((index: number, patch: Partial<CollectCardDraft>) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }, [])

  const onSave = useCallback(async () => {
    const selected = cards.filter((c) => c.selected)
    if (selected.length === 0) {
      setError('请至少勾选一个单词')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const added = await addCollectedWords(selected.map(draftToWord))
      await mutate(COLLECT_BISCUIT_DICT_URL)
      resetForm()
      setSaving(false)
      onClose()
      // Fire jar animation after dialog closes
      window.setTimeout(() => onSaved?.(added), 80)
    } catch (e) {
      setSaving(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [cards, mutate, onClose, onSaved, resetForm])

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-5 text-left shadow-xl transition-all dark:bg-gray-800">
                <div className="mb-3 flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold text-amber-700 dark:text-amber-300">🍪 {title}</Dialog.Title>
                  <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600" title="关闭">
                    <IconX className="h-5 w-5" />
                  </button>
                </div>

                {images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {images.map((src, index) => (
                      <div key={`${index}-${src.slice(0, 32)}`} className="group relative">
                        <img
                          src={src}
                          alt={`截图 ${index + 1}`}
                          className="h-16 w-16 rounded-lg border border-amber-100 object-cover shadow-sm dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          disabled={loading}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-[10px] text-white opacity-80 hover:opacity-100 disabled:pointer-events-none"
                          title="移除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={(e) => void onPaste(e)}
                  onKeyDown={onKeyDown}
                  rows={3}
                  placeholder="输入或粘贴截图，按Enter识别"
                  className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-amber-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600"
                  >
                    选择图片
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFile(e)} />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void runRecognize()}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-400 disabled:opacity-60"
                  >
                    {loading && (
                      <span
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent"
                        aria-hidden
                      />
                    )}
                    {cards.length ? '重新识别' : '识别'}
                  </button>
                </div>

                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

                {cards.length > 0 && (
                  <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                    {cards.map((card, index) => (
                      <div
                        key={`${card.name}-${index}`}
                        className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <input
                          type="checkbox"
                          checked={card.selected}
                          onChange={(e) => updateCard(index, { selected: e.target.checked })}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{card.name}</span>
                            <WordPronunciationIcon word={draftToWord(card)} lang="en" className="h-6 w-6" />
                          </div>
                          <p className="text-xs text-gray-500">
                            US /{card.usphone || '—'}/ · UK /{card.ukphone || '—'}/
                          </p>
                          {card.duplicateIn && card.duplicateIn.length > 0 && (
                            <p className="text-xs text-amber-600">已在：{card.duplicateIn.join('、')}（可取消勾选跳过）</p>
                          )}
                          <input
                            value={card.trans.join('；')}
                            onChange={(e) =>
                              updateCard(index, {
                                trans: e.target.value
                                  .split(new RegExp('[；;]'))
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="mt-1 w-full rounded border border-transparent bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-amber-300 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                            placeholder="释义（可编辑）"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {cards.length > 0 && (
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={handleClose} className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100">
                      取消
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void onSave()}
                      className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
                    >
                      {saving ? '保存中…' : `确认保存（${cards.filter((c) => c.selected).length}）`}
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
