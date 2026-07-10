import type { TErrorWordData } from '@/pages/Gallery-N/hooks/useErrorWords'
import type { TypingResumeSnapshot } from '@/store/errorBookFilterAtom'
import type { TReviewInfoAtomData } from '@/store/reviewInfoAtom'
import type { Dictionary, Word } from '@/typings'
import { db } from '@/utils/db'
import type { WordRecord } from '@/utils/db/record'
import { generateNewWordReviewRecord } from '@/utils/db/review-record'

export async function fetchChapterErrorWordData(dict: Dictionary, chapter: number, wordList: Word[]): Promise<TErrorWordData[]> {
  const records = await db.wordRecords
    .where('[dict+chapter]')
    .equals([dict.id, chapter])
    .filter((record) => record.wrongCount > 0)
    .toArray()

  const groupRecords: { word: string; records: WordRecord[] }[] = []

  records.forEach((record) => {
    const typed = record as WordRecord
    let group = groupRecords.find((g) => g.word === typed.word)
    if (!group) {
      group = { word: typed.word, records: [] }
      groupRecords.push(group)
    }
    group.records.push(typed)
  })

  const result: TErrorWordData[] = []

  groupRecords.forEach((groupRecord) => {
    const errorLetters = {} as Record<string, number>
    groupRecord.records.forEach((record) => {
      for (const index in record.mistakes) {
        const mistakes = record.mistakes[index]
        if (mistakes.length > 0) {
          errorLetters[index] = (errorLetters[index] ?? 0) + mistakes.length
        }
      }
    })

    const word = wordList.find((item) => item.name === groupRecord.word)
    if (!word) return

    result.push({
      word: groupRecord.word,
      originData: word,
      errorCount: groupRecord.records.reduce((acc, cur) => acc + cur.wrongCount, 0),
      errorLetters,
      errorChar: Object.entries(errorLetters)
        .sort((a, b) => b[1] - a[1])
        .map(([index]) => groupRecord.word[Number(index)]),
      latestErrorTime: groupRecord.records.reduce((acc, cur) => Math.max(acc, cur.timeStamp), 0),
    })
  })

  return result
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
