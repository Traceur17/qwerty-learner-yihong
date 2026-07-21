import type { TErrorWordData } from '@/pages/Gallery-N/hooks/useErrorWords'
import type { TypingResumeSnapshot } from '@/store/errorBookFilterAtom'
import type { TReviewInfoAtomData } from '@/store/reviewInfoAtom'
import type { Dictionary, Word } from '@/typings'
import { db } from '@/utils/db'
import { errorWordKey, getMasteredKeys } from '@/utils/db/errorWordStatus'
import type { WordRecord } from '@/utils/db/record'
import { generateNewWordReviewRecord } from '@/utils/db/review-record'

/** 本章曾错过的词；错误次数 / 明细与全局错题本一致（该 dict+word 全部错误记录） */
export async function fetchChapterScopedErrorGroups(
  dictId: string,
  chapter: number,
): Promise<{ word: string; dict: string; records: WordRecord[]; wrongCount: number }[]> {
  const chapterWrong = await db.wordRecords
    .where('[dict+chapter]')
    .equals([dictId, chapter])
    .filter((record) => record.wrongCount > 0)
    .toArray()

  const words = [...new Set(chapterWrong.map((record) => record.word))]
  if (words.length === 0) return []

  const allWrong = (await db.wordRecords
    .where('word')
    .anyOf(words)
    .filter((record) => record.dict === dictId && record.wrongCount > 0)
    .toArray()) as WordRecord[]

  return words.map((word) => {
    const records = allWrong.filter((record) => record.word === word)
    return {
      word,
      dict: dictId,
      records,
      wrongCount: records.reduce((acc, cur) => acc + cur.wrongCount, 0),
    }
  })
}

export async function fetchChapterErrorWordData(dict: Dictionary, chapter: number, wordList: Word[]): Promise<TErrorWordData[]> {
  let groups = await fetchChapterScopedErrorGroups(dict.id, chapter)

  const masteredKeys = await getMasteredKeys(groups.map((g) => ({ dict: g.dict, word: g.word })))
  groups = groups.filter((g) => !masteredKeys.has(errorWordKey(g.dict, g.word)))

  return groupedRecordsToErrorData(groups, wordList)
}

type StartChapterErrorReviewParams = {
  dict: Dictionary
  chapter: number
  errorData: TErrorWordData[]
  chapterErrorReturn?: TypingResumeSnapshot
  setReviewModeInfo: (value: TReviewInfoAtomData) => void
  setCurrentDictId: (id: string) => void
  setCurrentChapter: (chapter: number) => void
}

export function groupedRecordsToErrorData(
  groups: { word: string; records: WordRecord[]; wrongCount: number }[],
  wordList: Word[],
): TErrorWordData[] {
  return groups
    .map((group) => {
      const word = wordList.find((item) => item.name === group.word)
      if (!word) return null

      const errorLetters = {} as Record<string, number>
      group.records.forEach((record) => {
        for (const index in record.mistakes) {
          const mistakes = record.mistakes[index]
          if (mistakes.length > 0) {
            errorLetters[index] = (errorLetters[index] ?? 0) + mistakes.length
          }
        }
      })

      return {
        word: group.word,
        originData: word,
        errorCount: group.wrongCount,
        errorLetters,
        errorChar: Object.entries(errorLetters)
          .sort((a, b) => b[1] - a[1])
          .map(([index]) => group.word[Number(index)]),
        latestErrorTime: group.records.reduce((acc, cur) => Math.max(acc, cur.timeStamp), 0),
      } satisfies TErrorWordData
    })
    .filter((item): item is TErrorWordData => item != null)
}

export async function startChapterErrorReview({
  dict,
  chapter,
  errorData,
  chapterErrorReturn,
  setReviewModeInfo,
  setCurrentDictId,
  setCurrentChapter,
}: StartChapterErrorReviewParams) {
  if (errorData.length === 0) return

  const record = await generateNewWordReviewRecord(dict.id, errorData)
  setCurrentDictId(dict.id)
  setCurrentChapter(chapter)
  setReviewModeInfo({
    isReviewMode: true,
    reviewRecord: record,
    chapterErrorReturn,
  })
}

export function exitChapterErrorReview(
  chapterErrorReturn: TypingResumeSnapshot,
  setReviewModeInfo: (value: TReviewInfoAtomData) => void,
  setTypingResume: (value: TypingResumeSnapshot) => void,
) {
  setReviewModeInfo({ isReviewMode: false, reviewRecord: undefined, chapterErrorReturn: undefined })
  setTypingResume(chapterErrorReturn)
}
