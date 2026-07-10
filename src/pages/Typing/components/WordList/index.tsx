import { TypingContext, TypingStateActionType } from '../../store'
import WordCard from './WordCard'
import Drawer from '@/components/Drawer'
import Tooltip from '@/components/Tooltip'
import { Button } from '@/components/ui/button'
import { currentChapterAtom, currentDictInfoAtom, isReviewModeAtom } from '@/store'
import { Dialog } from '@headlessui/react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { atom, useAtomValue } from 'jotai'
import { useCallback, useContext, useState } from 'react'
import ListIcon from '~icons/tabler/list'
import IconX from '~icons/tabler/x'

const currentDictTitle = atom((get) => {
  const isReviewMode = get(isReviewModeAtom)

  if (isReviewMode) {
    return `${get(currentDictInfoAtom).name} 错题复习`
  } else {
    return `${get(currentDictInfoAtom).name} 第 ${get(currentChapterAtom) + 1} 章`
  }
})

export default function WordList() {
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!

  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const currentDictTitleValue = useAtomValue(currentDictTitle)
  const currentLanguage = useAtomValue(currentDictInfoAtom).language

  function closeModal() {
    setIsOpen(false)
    setSelectedIndex(null)
  }

  function openModal() {
    setIsOpen(true)
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
  }

  const handleSelectWord = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const handleStartFromSelected = useCallback(() => {
    if (selectedIndex === null) return

    dispatch({ type: TypingStateActionType.SKIP_2_WORD_INDEX, newIndex: selectedIndex })
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
    setIsOpen(false)
    setSelectedIndex(null)
  }, [dispatch, selectedIndex])

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
          <div className="min-w-0">
            <p className="truncate">{currentDictTitleValue}</p>
            <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">点击单词选择起始位置</p>
          </div>
          <IconX onClick={closeModal} className="shrink-0 cursor-pointer" />
        </Dialog.Title>
        <ScrollArea.Root className="flex-1 overflow-hidden">
          <ScrollArea.Viewport className="h-full w-full px-3">
            <div className="flex w-full flex-col gap-1 pb-3 pr-2">
              {state.chapterData.words?.map((word, index) => {
                return (
                  <WordCard
                    word={word}
                    index={index}
                    key={`${word.name}_${index}`}
                    isActive={state.chapterData.index === index}
                    isSelected={selectedIndex === index}
                    onSelect={handleSelectWord}
                  />
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
        {selectedIndex !== null && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <Button type="button" className="w-full" disabled={selectedIndex === state.chapterData.index} onClick={handleStartFromSelected}>
              {selectedIndex === state.chapterData.index ? '已是当前词' : `从「${selectedWordLabel}」开始练习`}
            </Button>
          </div>
        )}
      </Drawer>
    </>
  )
}
