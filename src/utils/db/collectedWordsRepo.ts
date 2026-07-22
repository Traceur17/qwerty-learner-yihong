import { COLLECT_BISCUIT_DICT_ID, type ICollectedWord, toCollectedWord } from './collectedWords'
import { db } from './index'
import { dictionaries, idDictionaryMap } from '@/resources/dictionary'
import type { Word } from '@/typings'
import { calcChapterCount } from '@/utils'

export async function listCollectedWords(): Promise<Word[]> {
  const rows = await db.collectedWords.orderBy('createdAt').toArray()
  return rows.map(({ name, trans, usphone, ukphone }) => ({ name, trans, usphone, ukphone }))
}

export async function countCollectedWords(): Promise<number> {
  return db.collectedWords.count()
}

export async function findCollectedByNameKey(nameKey: string): Promise<ICollectedWord | undefined> {
  return db.collectedWords.where('nameKey').equals(nameKey.toLowerCase()).first()
}

export async function addCollectedWords(words: Array<Pick<Word, 'name' | 'trans' | 'usphone' | 'ukphone'>>): Promise<number> {
  if (words.length === 0) return 0
  const rows = words.map((w) => toCollectedWord(w))
  await db.collectedWords.bulkAdd(rows)
  await syncCollectBiscuitDictMeta()
  return rows.length
}

/** Keep static dictionary map length/chapterCount in sync with Dexie. */
export async function syncCollectBiscuitDictMeta(): Promise<number> {
  const length = await countCollectedWords()
  const chapterCount = Math.max(1, calcChapterCount(length))
  const dict = idDictionaryMap[COLLECT_BISCUIT_DICT_ID]
  if (dict) {
    dict.length = length
    dict.chapterCount = chapterCount
  }
  const listed = dictionaries.find((d) => d.id === COLLECT_BISCUIT_DICT_ID)
  if (listed) {
    listed.length = length
    listed.chapterCount = chapterCount
  }
  return length
}

export { COLLECT_BISCUIT_DICT_ID }
