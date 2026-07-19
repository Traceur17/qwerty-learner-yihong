import type { ErrorStatusRecord } from './errorWordStatusHelpers'
import { computeMasteredKeys, errorWordKey } from './errorWordStatusHelpers'
import { describe, expect, it } from 'vitest'

function rec(partial: Partial<ErrorStatusRecord> & Pick<ErrorStatusRecord, 'word' | 'timeStamp' | 'wrongCount'>): ErrorStatusRecord {
  return { dict: 'ielts', ...partial }
}

describe('computeMasteredKeys（最新状态口径）', () => {
  it('最新一条为错 → 未掌握', () => {
    const mastered = computeMasteredKeys([
      rec({ word: 'syrup', timeStamp: 100, wrongCount: 0, id: 1 }),
      rec({ word: 'syrup', timeStamp: 200, wrongCount: 1, id: 2 }),
    ])
    expect(mastered.has(errorWordKey('ielts', 'syrup'))).toBe(false)
  })

  it('练对移出：最新一条为对 → 已掌握（历史错误不影响判定）', () => {
    const mastered = computeMasteredKeys([
      rec({ word: 'syrup', timeStamp: 100, wrongCount: 1, id: 1 }),
      rec({ word: 'syrup', timeStamp: 150, wrongCount: 2, id: 2 }),
      rec({ word: 'syrup', timeStamp: 200, wrongCount: 0, id: 3 }),
    ])
    expect(mastered.has(errorWordKey('ielts', 'syrup'))).toBe(true)
  })

  it('再错回归：掌握后又错 → 重新变为未掌握', () => {
    const mastered = computeMasteredKeys([
      rec({ word: 'syrup', timeStamp: 100, wrongCount: 1, id: 1 }),
      rec({ word: 'syrup', timeStamp: 200, wrongCount: 0, id: 2 }),
      rec({ word: 'syrup', timeStamp: 300, wrongCount: 1, id: 3 }),
    ])
    expect(mastered.has(errorWordKey('ielts', 'syrup'))).toBe(false)
  })

  it('跨来源统一：错词复习（chapter=-1 的记录）答对同样判定为掌握', () => {
    // computeMasteredKeys 不关心 chapter，任何来源的最新记录一视同仁
    const mastered = computeMasteredKeys([
      rec({ word: 'occasion', timeStamp: 100, wrongCount: 1, id: 1 }),
      rec({ word: 'occasion', timeStamp: 200, wrongCount: 0, id: 2 }),
    ])
    expect(mastered.has(errorWordKey('ielts', 'occasion'))).toBe(true)
  })

  it('同秒并列以 id 兜底：id 更大的记录为最新', () => {
    const wrongLast = computeMasteredKeys([
      rec({ word: 'tablet', timeStamp: 100, wrongCount: 0, id: 1 }),
      rec({ word: 'tablet', timeStamp: 100, wrongCount: 1, id: 2 }),
    ])
    expect(wrongLast.has(errorWordKey('ielts', 'tablet'))).toBe(false)

    const correctLast = computeMasteredKeys([
      rec({ word: 'tablet', timeStamp: 100, wrongCount: 1, id: 1 }),
      rec({ word: 'tablet', timeStamp: 100, wrongCount: 0, id: 2 }),
    ])
    expect(correctLast.has(errorWordKey('ielts', 'tablet'))).toBe(true)
  })

  it('不同词典的同名词互不影响', () => {
    const mastered = computeMasteredKeys([
      rec({ word: 'syrup', timeStamp: 200, wrongCount: 0, id: 1, dict: 'ielts' }),
      rec({ word: 'syrup', timeStamp: 200, wrongCount: 1, id: 2, dict: 'cet4' }),
    ])
    expect(mastered.has(errorWordKey('ielts', 'syrup'))).toBe(true)
    expect(mastered.has(errorWordKey('cet4', 'syrup'))).toBe(false)
  })

  it('空输入返回空集合', () => {
    expect(computeMasteredKeys([]).size).toBe(0)
  })
})
