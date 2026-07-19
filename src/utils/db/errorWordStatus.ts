import type { ErrorStatusRecord } from './errorWordStatusHelpers'
import { computeMasteredKeys, errorWordKey } from './errorWordStatusHelpers'
import { db } from './index'

export { computeMasteredKeys, errorWordKey } from './errorWordStatusHelpers'
export type { ErrorStatusRecord } from './errorWordStatusHelpers'

/**
 * 查询一批候选词（dict + word）的「已掌握」键集合。
 * 用 word 索引批量取回候选词的全部记录（含其他章节与错词复习 chapter=-1 的记录），
 * 内存中按 dict+word 分组取最新一条判定。开销与候选词的记录数成正比。
 */
export async function getMasteredKeys(candidates: { dict: string; word: string }[]): Promise<Set<string>> {
  if (candidates.length === 0) return new Set()

  const wordNames = [...new Set(candidates.map((c) => c.word))]
  const candidateKeys = new Set(candidates.map((c) => errorWordKey(c.dict, c.word)))

  const records = (await db.wordRecords.where('word').anyOf(wordNames).toArray()) as unknown as (ErrorStatusRecord & { id?: number })[]
  const relevant = records.filter((record) => candidateKeys.has(errorWordKey(record.dict, record.word)))

  return computeMasteredKeys(relevant)
}
