import type { WordRecord } from '@/utils/db/record'

export type groupedWordRecords = {
  word: string
  dict: string
  records: WordRecord[]
  wrongCount: number
  /** 最新状态口径：最新一条练习记录已答对 */
  isMastered?: boolean
}
