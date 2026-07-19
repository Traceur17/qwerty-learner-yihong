/**
 * 错题「最新状态」口径的纯函数部分：
 * 一个词（dict + word）是否已掌握，由其时间最新的一条练习记录决定
 * （timeStamp 相同时以自增 id 更大者为准）。
 */

export type ErrorStatusRecord = {
  dict: string
  word: string
  timeStamp: number
  wrongCount: number
  id?: number
}

export function errorWordKey(dict: string, word: string): string {
  return `${dict}\u0000${word}`
}

function isNewer(a: ErrorStatusRecord, b: ErrorStatusRecord): boolean {
  if (a.timeStamp !== b.timeStamp) return a.timeStamp > b.timeStamp
  return (a.id ?? 0) > (b.id ?? 0)
}

/**
 * 从记录集合中计算"已掌握"的 dict+word 键集合：
 * 每组最新一条记录 wrongCount === 0 即为已掌握。
 * 记录来源不限（正常章节、错词复习 chapter=-1、卷面判分）。
 */
export function computeMasteredKeys(records: ErrorStatusRecord[]): Set<string> {
  const latestByKey = new Map<string, ErrorStatusRecord>()
  for (const record of records) {
    const key = errorWordKey(record.dict, record.word)
    const current = latestByKey.get(key)
    if (!current || isNewer(record, current)) {
      latestByKey.set(key, record)
    }
  }

  const mastered = new Set<string>()
  for (const [key, record] of latestByKey) {
    if (record.wrongCount === 0) mastered.add(key)
  }
  return mastered
}
