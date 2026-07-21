import type { SheetPassGrade } from './record'

export type SealableRoundInput = {
  wordCount: number
  maxPlayedIndex: number
  revealed: boolean
  grades: SheetPassGrade[]
}

export function isSheetRoundSealable({ wordCount, maxPlayedIndex, revealed, grades }: SealableRoundInput): boolean {
  if (wordCount <= 0) return false
  const lastIndex = wordCount - 1
  if (maxPlayedIndex < lastIndex) return false
  if (!revealed) return false
  for (let i = 0; i <= lastIndex; i++) {
    const g = grades[i]
    if (g !== 'correct' && g !== 'wrong') return false
  }
  return true
}

export function summarizeSheetGrades(grades: SheetPassGrade[]): {
  correctCount: number
  wrongCount: number
  totalGraded: number
  accuracy: number
} {
  let correctCount = 0
  let wrongCount = 0
  for (const g of grades) {
    if (g === 'correct') correctCount += 1
    else if (g === 'wrong') wrongCount += 1
  }
  const totalGraded = correctCount + wrongCount
  const accuracy = totalGraded === 0 ? 0 : Math.round((correctCount / totalGraded) * 100)
  return { correctCount, wrongCount, totalGraded, accuracy }
}

/** Pure upsert planner: mid-chapter must not create; linked id updates same row. */
export function planSheetPassUpsert(args: {
  sealable: boolean
  linkedPassId?: number
}): { action: 'skip' } | { action: 'insert' } | { action: 'update'; id: number } {
  if (!args.sealable) return { action: 'skip' }
  if (args.linkedPassId != null) return { action: 'update', id: args.linkedPassId }
  return { action: 'insert' }
}
