import { LoadingWordUI } from './LoadingWordUI'
import useGetWord from './hooks/useGetWord'
import { currentRowDetailAtom } from './store'
import type { groupedWordRecords } from './type'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { idDictionaryMap } from '@/resources/dictionary'
import { recordErrorBookAction } from '@/utils'
import { useSetAtom } from 'jotai'
import { type Ref, forwardRef, useCallback } from 'react'
import DeleteIcon from '~icons/weui/delete-filled'

type IErrorRowProps = {
  record: groupedWordRecords
  onDelete: () => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  hideDictColumn?: boolean
  checkboxRef?: Ref<HTMLSpanElement>
  mastered?: boolean
}

const ErrorRow = forwardRef<HTMLLIElement, IErrorRowProps>(
  (
    { record, onDelete, selectable = false, selected = false, onToggleSelect, hideDictColumn = false, checkboxRef, mastered = false },
    ref,
  ) => {
    const setCurrentRowDetail = useSetAtom(currentRowDetailAtom)
    const dictInfo = idDictionaryMap[record.dict]
    const { word, isLoading, hasError } = useGetWord(record.word, dictInfo)

    const onClick = useCallback(() => {
      setCurrentRowDetail(record)
      recordErrorBookAction('detail')
    }, [record, setCurrentRowDetail])

    return (
      <li
        ref={ref}
        className={`flex w-full cursor-pointer items-center justify-between rounded-lg bg-white px-6 py-3 text-black shadow-md dark:bg-gray-800 dark:text-white ${
          mastered ? 'opacity-50' : 'opacity-85'
        }`}
        onClick={onClick}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {selectable && (
            <span ref={checkboxRef} className="w-8 shrink-0" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-indigo-500"
                checked={selected}
                onChange={onToggleSelect}
                aria-label={`选择 ${record.word}`}
              />
            </span>
          )}
          <span className="shrink-0 basis-2/12 break-normal">
            {record.word}
            {mastered && (
              <span className="ml-2 whitespace-nowrap rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/60 dark:text-green-300">
                ✓已掌握
              </span>
            )}
          </span>
          <span className="line-clamp-2 min-w-0 basis-4/12 break-normal">
            {word ? word.trans.join('；') : <LoadingWordUI isLoading={isLoading} hasError={hasError} />}
          </span>
          <span className="shrink-0 basis-2/12 break-normal text-center tabular-nums">{record.wrongCount}</span>
          {!hideDictColumn && <span className="shrink-0 basis-1/12 break-normal">{dictInfo?.name}</span>}
        </div>
        <span
          className="ml-4 shrink-0 basis-8 break-normal"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DeleteIcon />
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Records</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      </li>
    )
  },
)

ErrorRow.displayName = 'ErrorRow'

export default ErrorRow
