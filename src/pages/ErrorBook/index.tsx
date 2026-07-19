import ChapterErrorBookGuide from './ChapterErrorBookGuide'
import DropdownExport from './DropdownExport'
import ErrorRow from './ErrorRow'
import type { ISortType } from './HeadWrongNumber'
import HeadWrongNumber from './HeadWrongNumber'
import Pagination, { ITEM_PER_PAGE } from './Pagination'
import RowDetail from './RowDetail'
import { currentRowDetailAtom } from './store'
import type { groupedWordRecords } from './type'
import { idDictionaryMap } from '@/resources/dictionary'
import { currentChapterAtom, currentDictIdAtom, errorBookFilterAtom, reviewModeInfoAtom } from '@/store'
import { groupedRecordsToErrorData, startChapterErrorReview } from '@/utils/chapterErrorReview'
import { db, useDeleteWordRecord } from '@/utils/db'
import { errorWordKey, getMasteredKeys } from '@/utils/db/errorWordStatus'
import type { WordRecord } from '@/utils/db/record'
import { wordListFetcher } from '@/utils/wordListFetcher'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import IconX from '~icons/tabler/x'

function recordKey(record: groupedWordRecords) {
  return `${record.dict}-${record.word}`
}

type ErrorBookView = 'latest' | 'all'

export function ErrorBook() {
  const [groupedRecords, setGroupedRecords] = useState<groupedWordRecords[]>([])
  const [view, setView] = useState<ErrorBookView>('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortType, setSortType] = useState<ISortType>('asc')
  const navigate = useNavigate()
  const currentRowDetail = useAtomValue(currentRowDetailAtom)
  const { deleteWordRecord } = useDeleteWordRecord()
  const [reload, setReload] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [isPracticing, setIsPracticing] = useState(false)

  const selectHeaderRef = useRef<HTMLSpanElement>(null)
  const firstCheckboxRef = useRef<HTMLSpanElement>(null)
  const practiceButtonRef = useRef<HTMLButtonElement>(null)
  const firstRowRef = useRef<HTMLLIElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const errorBookFilter = useAtomValue(errorBookFilterAtom)
  const setErrorBookFilter = useSetAtom(errorBookFilterAtom)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const setCurrentDictId = useSetAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)

  const isChapterMode = errorBookFilter != null
  const chapterDict = isChapterMode ? idDictionaryMap[errorBookFilter.dictId] : undefined
  const { data: chapterWordList } = useSWR(isChapterMode && chapterDict ? chapterDict.url : null, wordListFetcher)

  const onBack = useCallback(() => {
    setErrorBookFilter(null)
    navigate('/')
  }, [navigate, setErrorBookFilter])

  const latestCount = useMemo(() => groupedRecords.filter((record) => !record.isMastered).length, [groupedRecords])

  const visibleRecords = useMemo(() => {
    if (view === 'all') return groupedRecords
    return groupedRecords.filter((record) => !record.isMastered)
  }, [groupedRecords, view])

  const totalPages = useMemo(() => Math.ceil(visibleRecords.length / ITEM_PER_PAGE), [visibleRecords.length])

  const setPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return
      setCurrentPage(page)
    },
    [totalPages],
  )

  const setSort = useCallback(
    (sortType: ISortType) => {
      setSortType(sortType)
      setPage(1)
    },
    [setPage],
  )

  const sortedRecords = useMemo(() => {
    if (sortType === 'none') return visibleRecords
    return [...visibleRecords].sort((a, b) => {
      if (sortType === 'asc') {
        return a.wrongCount - b.wrongCount
      } else {
        return b.wrongCount - a.wrongCount
      }
    })
  }, [visibleRecords, sortType])

  const switchView = useCallback((nextView: ErrorBookView) => {
    setView(nextView)
    setCurrentPage(1)
    setSelectedKeys(new Set())
  }, [])

  const renderRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEM_PER_PAGE
    const end = start + ITEM_PER_PAGE
    return sortedRecords.slice(start, end)
  }, [currentPage, sortedRecords])

  useEffect(() => {
    if (isChapterMode && errorBookFilter) {
      db.wordRecords
        .where('[dict+chapter]')
        .equals([errorBookFilter.dictId, errorBookFilter.chapter])
        .filter((record) => record.wrongCount > 0)
        .toArray()
        .then(async (records) => {
          const groups: groupedWordRecords[] = []
          records.forEach((record) => {
            let group = groups.find((g) => g.word === record.word)
            if (!group) {
              group = { word: record.word, dict: record.dict, records: [], wrongCount: 0 }
              groups.push(group)
            }
            group.records.push(record as WordRecord)
          })
          const masteredKeys = await getMasteredKeys(groups.map((g) => ({ dict: g.dict, word: g.word })))
          groups.forEach((group) => {
            group.wrongCount = group.records.reduce((acc, cur) => acc + cur.wrongCount, 0)
            group.isMastered = masteredKeys.has(errorWordKey(group.dict, group.word))
          })
          setGroupedRecords(groups)
          setSelectedKeys(new Set())
        })
      return
    }

    db.wordRecords
      .where('wrongCount')
      .above(0)
      .toArray()
      .then(async (records) => {
        const groups: groupedWordRecords[] = []

        records.forEach((record) => {
          let group = groups.find((g) => g.word === record.word && g.dict === record.dict)
          if (!group) {
            group = { word: record.word, dict: record.dict, records: [], wrongCount: 0 }
            groups.push(group)
          }
          group.records.push(record as WordRecord)
        })

        const masteredKeys = await getMasteredKeys(groups.map((g) => ({ dict: g.dict, word: g.word })))

        groups.forEach((group) => {
          group.wrongCount = group.records.reduce((acc, cur) => {
            acc += cur.wrongCount
            return acc
          }, 0)
          group.isMastered = masteredKeys.has(errorWordKey(group.dict, group.word))
        })

        setGroupedRecords(groups)
      })
  }, [reload, isChapterMode, errorBookFilter])

  const handleDelete = async (word: string, dict: string) => {
    await deleteWordRecord(word, dict)
    setReload((prev) => !prev)
  }

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // 表头复选框：全选/取消全选当前页
  const pageKeys = useMemo(() => renderRecords.map(recordKey), [renderRecords])
  const isPageAllSelected = pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.has(key))
  const isPagePartiallySelected = !isPageAllSelected && pageKeys.some((key) => selectedKeys.has(key))

  const togglePageSelect = useCallback(() => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (pageKeys.length > 0 && pageKeys.every((key) => prev.has(key))) {
        pageKeys.forEach((key) => next.delete(key))
      } else {
        pageKeys.forEach((key) => next.add(key))
      }
      return next
    })
  }, [pageKeys])

  const practiceCount = useMemo(() => {
    if (selectedKeys.size > 0) return selectedKeys.size
    return sortedRecords.length
  }, [selectedKeys.size, sortedRecords.length])

  const handlePractice = useCallback(async () => {
    if (!isChapterMode || !errorBookFilter || !chapterDict || !chapterWordList || practiceCount === 0 || isPracticing) return

    const targetGroups = selectedKeys.size > 0 ? sortedRecords.filter((record) => selectedKeys.has(recordKey(record))) : sortedRecords

    const errorData = groupedRecordsToErrorData(targetGroups, chapterWordList)
    if (errorData.length === 0) return

    setIsPracticing(true)
    try {
      await startChapterErrorReview({
        dict: chapterDict,
        chapter: errorBookFilter.chapter,
        errorData,
        chapterErrorReturn: errorBookFilter.resume,
        setReviewModeInfo,
        setCurrentDictId,
        setCurrentChapter,
      })
      setErrorBookFilter(null)
      navigate('/')
    } finally {
      setIsPracticing(false)
    }
  }, [
    chapterDict,
    chapterWordList,
    errorBookFilter,
    isChapterMode,
    isPracticing,
    navigate,
    practiceCount,
    selectedKeys,
    setCurrentChapter,
    setCurrentDictId,
    setErrorBookFilter,
    setReviewModeInfo,
    sortedRecords,
  ])

  return (
    <>
      <div className={`relative flex h-screen w-full flex-col items-center pb-4 ease-in ${currentRowDetail && 'blur-sm'}`}>
        <div className="mr-8 mt-4 flex w-auto items-center justify-center self-end">
          <h1 className="font-lighter mr-4 w-auto self-end text-gray-500 opacity-70">
            {isChapterMode && chapterDict
              ? `${chapterDict.name} 第 ${errorBookFilter.chapter + 1} 章错词 · 勾选后练习已选，否则练习全部`
              : 'Tip: 点击错误单词查看详细信息'}
          </h1>
          <button type="button" ref={closeButtonRef} onClick={onBack} aria-label="返回">
            <IconX className="h-7 w-7 cursor-pointer text-gray-400" />
          </button>
        </div>

        <div className="flex w-full flex-1 select-text items-start justify-center overflow-hidden">
          <div className="flex h-full w-5/6 flex-col pt-10">
            <div className="mb-3 flex items-center gap-1 self-start rounded-lg bg-white p-1 shadow dark:bg-gray-800">
              <button
                type="button"
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  view === 'latest'
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                onClick={() => switchView('latest')}
              >
                最新错题 ({latestCount})
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  view === 'all' ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                onClick={() => switchView('all')}
              >
                全部错题 ({groupedRecords.length})
              </button>
            </div>
            <div className="flex w-full items-center justify-between rounded-lg bg-white px-6 py-5 text-lg text-black shadow-lg dark:bg-gray-800 dark:text-white">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {isChapterMode && (
                  <span ref={selectHeaderRef} className="flex w-8 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-indigo-500"
                      checked={isPageAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPagePartiallySelected
                      }}
                      disabled={pageKeys.length === 0}
                      onChange={togglePageSelect}
                      aria-label="全选当前页"
                      title="全选当前页"
                    />
                  </span>
                )}
                <span className="shrink-0 basis-2/12">单词</span>
                <span className="min-w-0 basis-4/12">释义</span>
                <HeadWrongNumber className="shrink-0 basis-2/12 pr-4" sortType={sortType} setSortType={setSort} />
                {!isChapterMode && <span className="shrink-0 basis-1/12">词典</span>}
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-3">
                <DropdownExport renderRecords={sortedRecords} />
                {isChapterMode && (
                  <button
                    ref={practiceButtonRef}
                    type="button"
                    className="my-btn-primary h-8 shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={practiceCount === 0 || isPracticing || !chapterWordList}
                    onClick={handlePractice}
                  >
                    {isPracticing
                      ? '启动中...'
                      : selectedKeys.size > 0
                      ? `练习已选 (${selectedKeys.size})`
                      : `练习全部 (${sortedRecords.length})`}
                  </button>
                )}
              </div>
            </div>
            <ScrollArea.Root className="flex-1 overflow-y-auto pt-5">
              <ScrollArea.Viewport className="h-full">
                <div className="flex flex-col gap-3">
                  {renderRecords.map((record, index) => (
                    <ErrorRow
                      key={`${record.dict}-${record.word}`}
                      ref={index === 0 ? firstRowRef : undefined}
                      checkboxRef={index === 0 ? firstCheckboxRef : undefined}
                      record={record}
                      onDelete={() => handleDelete(record.word, record.dict)}
                      selectable={isChapterMode}
                      selected={selectedKeys.has(recordKey(record))}
                      onToggleSelect={() => toggleSelect(recordKey(record))}
                      hideDictColumn={isChapterMode}
                      mastered={!!record.isMastered}
                    />
                  ))}
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent" orientation="vertical"></ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
        </div>
        <Pagination className="pt-3" page={currentPage} setPage={setPage} totalPages={totalPages} />
      </div>
      {isChapterMode && (
        <ChapterErrorBookGuide
          hasRows={renderRecords.length > 0}
          targets={{
            selectRef: renderRecords.length > 0 ? firstCheckboxRef : selectHeaderRef,
            practiceRef: practiceButtonRef,
            rowRef: firstRowRef,
            closeRef: closeButtonRef,
          }}
        />
      )}
      {currentRowDetail && <RowDetail currentRowDetail={currentRowDetail} allRecords={sortedRecords} />}
    </>
  )
}
