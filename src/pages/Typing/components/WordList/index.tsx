import { TypingContext, TypingStateActionType } from '../../store'
import WordCard from './WordCard'
import Drawer from '@/components/Drawer'
import Tooltip from '@/components/Tooltip'
import { Button } from '@/components/ui/button'
import {
  continuousSheetJumpRequestAtom,
  continuousSheetPlayIndexAtom,
  currentChapterAtom,
  currentDictInfoAtom,
  isReviewModeAtom,
  listenDictationConfigAtom,
} from '@/store'
import { getDictChapterTitle } from '@/utils/db/collectedWords'
import range from '@/utils/range'
import { stopSegmentPlayback } from '@/utils/segmentAudioPlayer'
import { stopWordAudio } from '@/utils/wordAudioPlayer'
import { Dialog, Listbox, Transition } from '@headlessui/react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import IconCheck from '~icons/tabler/check'
import IconChevronDown from '~icons/tabler/chevron-down'
import IconCurrentLocation from '~icons/tabler/current-location'
import ListIcon from '~icons/tabler/list'
import IconX from '~icons/tabler/x'

export default function WordList() {
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!

  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const listenDictationConfig = useAtomValue(listenDictationConfigAtom)
  const sheetPlayIndex = useAtomValue(continuousSheetPlayIndexAtom)
  const setSheetJumpRequest = useSetAtom(continuousSheetJumpRequestAtom)
  const currentLanguage = currentDictInfo.language
  const chapterCount = currentDictInfo.chapterCount
  const viewportRef = useRef<HTMLDivElement>(null)

  const isSheetMode = listenDictationConfig.isOpen && listenDictationConfig.sheetMode
  const activeIndex = useMemo(() => {
    if (isSheetMode) return sheetPlayIndex
    return state.chapterData.index
  }, [isSheetMode, sheetPlayIndex, state.chapterData.index])

  useEffect(() => {
    setSelectedIndex(null)
  }, [currentChapter])

  function closeModal() {
    setIsOpen(false)
    setSelectedIndex(null)
  }

  function openModal() {
    setIsOpen(true)
    // 卷面模式下 isTyping=false 会联动暂停连播，方便在抽屉里点选
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
  }

  const handleSelectWord = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const handleChapterChange = useCallback(
    (chapter: number) => {
      setCurrentChapter(chapter)
      setSelectedIndex(null)
    },
    [setCurrentChapter],
  )

  const handleStartFromSelected = useCallback(() => {
    if (selectedIndex === null) return

    // 停掉侧栏预听
    stopWordAudio()
    stopSegmentPlayback()
    if (isSheetMode) {
      // 卷面模式：通知卷面从该题起播
      setSheetJumpRequest({ index: selectedIndex, ts: Date.now() })
    } else {
      // 跳词后保持暂停，显示「按任意键继续」，勿立刻 isTyping+自动播
      dispatch({ type: TypingStateActionType.SKIP_2_WORD_INDEX, newIndex: selectedIndex })
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }
    setIsOpen(false)
    setSelectedIndex(null)
  }, [dispatch, isSheetMode, selectedIndex, setSheetJumpRequest])

  const scrollToCurrentWord = useCallback(() => {
    const el = document.getElementById(`word-list-item-${activeIndex}`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  useEffect(() => {
    if (!isOpen) return
    const timer = window.setTimeout(() => scrollToCurrentWord(), 80)
    return () => window.clearTimeout(timer)
  }, [isOpen, scrollToCurrentWord])

  const selectedWord = selectedIndex !== null ? state.chapterData.words[selectedIndex] : undefined
  const selectedWordLabel = selectedWord && ['romaji', 'hapin'].includes(currentLanguage) ? selectedWord.notation : selectedWord?.name

  return (
    <>
      <Tooltip content="List" placement="top" className="!absolute left-5 top-[50%] z-20">
        <button
          type="button"
          onClick={openModal}
          className="fixed left-0 top-[50%] z-20 rounded-lg rounded-l-none bg-indigo-50 px-2 py-3 text-lg hover:bg-indigo-200 focus:outline-none dark:bg-indigo-900 dark:hover:bg-indigo-800"
        >
          <ListIcon className="h-6 w-6 text-lg text-indigo-500 dark:text-white" />
        </button>
      </Tooltip>

      <Drawer open={isOpen} onClose={closeModal} classNames="bg-stone-50 dark:bg-gray-900">
        <Dialog.Title as="h3" className="flex items-center justify-between gap-2 p-4 text-lg font-medium leading-6 dark:text-gray-50">
          <div className="min-w-0 flex-1">
            {isReviewMode ? (
              <p className="truncate">{currentDictInfo.name} 错题复习</p>
            ) : (
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate">{currentDictInfo.name}</p>
                <Listbox value={currentChapter} onChange={handleChapterChange}>
                  <div className="relative shrink-0">
                    <Listbox.Button className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-lg font-medium hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300">
                      {getDictChapterTitle(currentDictInfo.id, currentChapter)}
                      <IconChevronDown className="h-4 w-4 opacity-60" />
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                      <Listbox.Options className="absolute left-0 z-20 mt-1 max-h-60 w-28 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-white/10">
                        {range(0, chapterCount, 1).map((index) => (
                          <Listbox.Option
                            key={index}
                            value={index}
                            className={({ active }) =>
                              `relative cursor-pointer select-none px-3 py-1.5 ${
                                active
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                                  : 'text-gray-700 dark:text-gray-200'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <div className="flex items-center justify-between gap-2">
                                <span>{getDictChapterTitle(currentDictInfo.id, index)}</span>
                                {selected ? <IconCheck className="h-4 w-4 text-indigo-500" /> : null}
                              </div>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </div>
            )}
            <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">点击单词选择起始位置</p>
          </div>
          <IconX onClick={closeModal} className="shrink-0 cursor-pointer" />
        </Dialog.Title>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea.Root className="flex-1 overflow-hidden">
            <ScrollArea.Viewport ref={viewportRef} className="h-full w-full px-3">
              <div className="flex w-full flex-col gap-1 pb-3 pr-2">
                {state.chapterData.words?.map((word, index) => {
                  return (
                    <div key={`${word.name}_${index}`} id={`word-list-item-${index}`}>
                      <WordCard
                        word={word}
                        index={index}
                        isActive={activeIndex === index}
                        isSelected={selectedIndex === index}
                        onSelect={handleSelectWord}
                      />
                    </div>
                  )
                })}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="flex w-3 touch-none select-none bg-gray-100/80 p-0.5 transition-colors hover:bg-gray-200/90 dark:bg-gray-800/80 dark:hover:bg-gray-700/90"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="relative min-h-[3rem] flex-1 rounded-full bg-indigo-400/80 hover:bg-indigo-500 dark:bg-indigo-500/80 dark:hover:bg-indigo-400" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          <Tooltip content="定位到当前词" placement="left">
            <button
              type="button"
              onClick={scrollToCurrentWord}
              className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 focus:outline-none dark:bg-indigo-600 dark:hover:bg-indigo-500"
              aria-label="定位到当前词"
            >
              <IconCurrentLocation className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>
        {selectedIndex !== null && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <Button
              type="button"
              className="w-full"
              disabled={!isSheetMode && selectedIndex === activeIndex}
              onClick={handleStartFromSelected}
            >
              {isSheetMode
                ? `从「${selectedWordLabel}」起播`
                : selectedIndex === activeIndex
                ? '已是当前词'
                : `从「${selectedWordLabel}」开始练习`}
            </Button>
          </div>
        )}
      </Drawer>
    </>
  )
}
