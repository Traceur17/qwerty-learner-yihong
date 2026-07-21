import { getUTCUnixTimestamp } from '../index'
import { db } from './index'
import type { ISheetPass, ISheetPassDraft, SheetPassGrade } from './record'
import { isSheetRoundSealable, planSheetPassUpsert, summarizeSheetGrades } from './sheetPassHelpers'

export { isSheetRoundSealable, planSheetPassUpsert, summarizeSheetGrades } from './sheetPassHelpers'

export async function getSheetPassDraft(dict: string, chapter: number): Promise<ISheetPassDraft | undefined> {
  return db.sheetPassDrafts.where({ dict, chapter }).first()
}

export async function saveSheetPassDraft(
  draft: Omit<ISheetPassDraft, 'id' | 'updatedAt'> & { id?: number; updatedAt?: number },
): Promise<number> {
  const payload: ISheetPassDraft = {
    ...draft,
    updatedAt: getUTCUnixTimestamp(),
  }
  const existing = draft.id != null ? await db.sheetPassDrafts.get(draft.id) : await getSheetPassDraft(draft.dict, draft.chapter)
  if (existing?.id != null) {
    await db.sheetPassDrafts.update(existing.id, payload)
    return existing.id
  }
  return db.sheetPassDrafts.add(payload)
}

export async function clearSheetPassDraft(dict: string, chapter: number): Promise<void> {
  await db.sheetPassDrafts.where({ dict, chapter }).delete()
}

export async function listSheetPasses(dict: string, chapter: number): Promise<ISheetPass[]> {
  const rows = await db.sheetPasses.where({ dict, chapter }).toArray()
  return rows.sort((a, b) => a.timeStamp - b.timeStamp || (a.id ?? 0) - (b.id ?? 0))
}

export type UpsertSheetPassInput = {
  dict: string
  chapter: number
  wordNames: string[]
  answers: string[]
  grades: SheetPassGrade[]
  maxPlayedIndex: number
  revealed: boolean
  linkedPassId?: number
}

/**
 * Sealable rounds upsert one history row; mid-chapter returns null without writing.
 * Returns the pass id when written/updated.
 */
export async function upsertSealedSheetPass(input: UpsertSheetPassInput): Promise<number | null> {
  const sealable = isSheetRoundSealable({
    wordCount: input.wordNames.length,
    maxPlayedIndex: input.maxPlayedIndex,
    revealed: input.revealed,
    grades: input.grades,
  })
  const plan = planSheetPassUpsert({ sealable, linkedPassId: input.linkedPassId })
  if (plan.action === 'skip') return null

  const sealedGrades = input.grades.map((g) => (g === 'correct' || g === 'wrong' ? g : 'wrong')) as Array<'correct' | 'wrong'>
  const summary = summarizeSheetGrades(input.grades)
  const timeStamp = getUTCUnixTimestamp()
  const body: Omit<ISheetPass, 'id'> = {
    dict: input.dict,
    chapter: input.chapter,
    timeStamp,
    accuracy: summary.accuracy,
    correctCount: summary.correctCount,
    wrongCount: summary.wrongCount,
    totalGraded: summary.totalGraded,
    answers: input.answers,
    grades: sealedGrades,
    wordNames: input.wordNames,
  }

  if (plan.action === 'update') {
    await db.sheetPasses.update(plan.id, body)
    return plan.id
  }
  return db.sheetPasses.add(body)
}
