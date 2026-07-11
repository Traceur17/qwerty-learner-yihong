import type { WordPronunciationIconRef } from '@/components/WordPronunciationIcon'
import { WordPronunciationIcon } from '@/components/WordPronunciationIcon'
import { currentDictInfoAtom } from '@/store'
import type { Word } from '@/typings'
import { useAtomValue } from 'jotai'
import { type MouseEvent, useCallback, useRef } from 'react'

export default function WordCard({
  word,
  index,
  isActive,
  isSelected,
  onSelect,
}: {
  word: Word
  index: number
  isActive: boolean
  isSelected: boolean
  onSelect: (index: number) => void
}) {
  const wordPronunciationIconRef = useRef<WordPronunciationIconRef>(null)
  const currentLanguage = useAtomValue(currentDictInfoAtom).language

  const handlePlay = useCallback(() => {
    wordPronunciationIconRef.current?.play()
  }, [])

  const handleCardClick = useCallback(() => {
    onSelect(index)
    if (!word.audioMissing) handlePlay()
  }, [handlePlay, index, onSelect, word.audioMissing])

  const handlePlayClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      handlePlay()
    },
    [handlePlay],
  )

  return (
    <div
      className={`mb-2 flex cursor-pointer select-text items-center rounded-xl p-4 shadow focus:outline-none ${
        isSelected
          ? 'bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-800 dark:bg-opacity-30'
          : isActive
          ? 'bg-indigo-50 dark:bg-indigo-800 dark:bg-opacity-20'
          : 'bg-white dark:bg-gray-700 dark:bg-opacity-20'
      }   `}
      key={word.name}
      onClick={handleCardClick}
    >
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="select-all font-mono text-xl font-normal leading-6 dark:text-gray-50">
            {['romaji', 'hapin'].includes(currentLanguage) ? word.notation : word.name}
          </p>
          {word.audioMissing && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
              无音频
            </span>
          )}
        </div>
        <div className="mt-2 max-w-sm font-sans text-sm text-gray-400">{word.trans.join('；')}</div>
      </div>
      {!word.audioMissing && (
        <button
          type="button"
          onClick={handlePlayClick}
          className="shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <WordPronunciationIcon word={word} lang={currentLanguage} className="h-8 w-8" ref={wordPronunciationIconRef} />
        </button>
      )}
    </div>
  )
}
