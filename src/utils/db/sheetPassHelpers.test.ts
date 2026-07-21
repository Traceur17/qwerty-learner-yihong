import { isSheetRoundSealable, planSheetPassUpsert, summarizeSheetGrades } from './sheetPassHelpers'
import { describe, expect, it } from 'vitest'

describe('sheetPassHelpers', () => {
  const fullGrades = ['correct', 'wrong', 'correct'] as const

  it('is sealable only when last word played, revealed, and all graded', () => {
    expect(
      isSheetRoundSealable({
        wordCount: 3,
        maxPlayedIndex: 2,
        revealed: true,
        grades: [...fullGrades],
      }),
    ).toBe(true)

    expect(
      isSheetRoundSealable({
        wordCount: 3,
        maxPlayedIndex: 1,
        revealed: true,
        grades: [...fullGrades],
      }),
    ).toBe(false)

    expect(
      isSheetRoundSealable({
        wordCount: 3,
        maxPlayedIndex: 2,
        revealed: false,
        grades: [...fullGrades],
      }),
    ).toBe(false)

    expect(
      isSheetRoundSealable({
        wordCount: 3,
        maxPlayedIndex: 2,
        revealed: true,
        grades: ['correct', 'wrong', 'ungraded'],
      }),
    ).toBe(false)
  })

  it('summarizes accuracy from graded rows', () => {
    expect(summarizeSheetGrades(['correct', 'wrong', 'correct', 'ungraded'])).toEqual({
      correctCount: 2,
      wrongCount: 1,
      totalGraded: 3,
      accuracy: 67,
    })
  })

  it('plans skip for mid-chapter and update when linked', () => {
    expect(planSheetPassUpsert({ sealable: false })).toEqual({ action: 'skip' })
    expect(planSheetPassUpsert({ sealable: true })).toEqual({ action: 'insert' })
    expect(planSheetPassUpsert({ sealable: true, linkedPassId: 9 })).toEqual({ action: 'update', id: 9 })
  })
})
