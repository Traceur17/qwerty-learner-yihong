import { getUTCUnixTimestamp } from '../index'
import { db } from './index'
import type { IWrongAnswerHistory } from './record'
import { prependWrongAnswer, truncateWrongAnswers } from './wrongAnswerHistoryHelpers'

export { MAX_WRONG_ANSWER_HISTORY, prependWrongAnswer, truncateWrongAnswers } from './wrongAnswerHistoryHelpers'

export async function getWrongAnswerHistory(dict: string, word: string): Promise<string[]> {
  const row = await db.wrongAnswerHistories.where({ dict, word }).first()
  return row?.wrongAnswers ?? []
}

export async function getWrongAnswerHistoriesForDict(dict: string): Promise<Map<string, string[]>> {
  const rows = await db.wrongAnswerHistories.where({ dict }).toArray()
  const map = new Map<string, string[]>()
  for (const row of rows) {
    map.set(row.word, row.wrongAnswers ?? [])
  }
  return map
}

export async function saveWrongAnswerHistory(dict: string, word: string, wrongAnswers: string[]): Promise<void> {
  const truncated = truncateWrongAnswers(wrongAnswers)
  const existing = await db.wrongAnswerHistories.where({ dict, word }).first()
  const payload: IWrongAnswerHistory = {
    dict,
    word,
    wrongAnswers: truncated,
    updatedAt: getUTCUnixTimestamp(),
  }
  if (existing?.id != null) {
    await db.wrongAnswerHistories.update(existing.id, payload)
  } else {
    await db.wrongAnswerHistories.add(payload)
  }
}

export async function recordWrongAnswer(dict: string, word: string, wrongAnswer: string): Promise<string[]> {
  const existing = await getWrongAnswerHistory(dict, word)
  const next = prependWrongAnswer(existing, wrongAnswer)
  await saveWrongAnswerHistory(dict, word, next)
  return next
}
