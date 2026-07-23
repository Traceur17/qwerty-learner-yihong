import {
  COLLECT_BISCUIT_CHAPTER_COUNT,
  COLLECT_BISCUIT_DICT_ID,
  type CollectSection,
  type ICollectedWord,
  normalizeCollectSection,
  toCollectedWord,
} from './collectedWords'
import { db } from './index'
import { dictionaries, idDictionaryMap } from '@/resources/dictionary'
import type { Word } from '@/typings'

export type CollectDictMeta = {
  length: number
  chapterLengths: [number, number]
}

export async function getCollectDictMeta(): Promise<CollectDictMeta> {
  const rows = await db.collectedWords.toArray()
  let listening = 0
  let reading = 0
  for (const row of rows) {
    if (normalizeCollectSection(row.section) === 'reading') reading += 1
    else listening += 1
  }
  return { length: listening + reading, chapterLengths: [listening, reading] }
}

/** Listening words first, then reading — matches chapterLengths slicing. */
export async function listCollectedWords(): Promise<Word[]> {
  const rows = await db.collectedWords.orderBy('createdAt').toArray()
  const listening: Word[] = []
  const reading: Word[] = []
  for (const row of rows) {
    const word = { name: row.name, trans: row.trans, usphone: row.usphone, ukphone: row.ukphone }
    if (normalizeCollectSection(row.section) === 'reading') reading.push(word)
    else listening.push(word)
  }
  return [...listening, ...reading]
}

export async function countCollectedWords(): Promise<number> {
  return db.collectedWords.count()
}

export async function findCollectedByNameKey(nameKey: string): Promise<ICollectedWord | undefined> {
  return db.collectedWords.where('nameKey').equals(nameKey.toLowerCase()).first()
}

export async function addCollectedWords(
  words: Array<Pick<Word, 'name' | 'trans' | 'usphone' | 'ukphone'> & { section?: CollectSection }>,
): Promise<number> {
  if (words.length === 0) return 0
  const rows = words.map((w) => toCollectedWord(w))
  await db.collectedWords.bulkAdd(rows)
  await syncCollectBiscuitDictMeta()
  return rows.length
}

/** Keep static dictionary map length/chapterCount in sync with Dexie. */
export async function syncCollectBiscuitDictMeta(): Promise<CollectDictMeta> {
  const meta = await getCollectDictMeta()
  const { length, chapterLengths } = meta
  const dict = idDictionaryMap[COLLECT_BISCUIT_DICT_ID]
  if (dict) {
    dict.length = length
    dict.chapterCount = COLLECT_BISCUIT_CHAPTER_COUNT
    dict.chapterLengths = [...chapterLengths]
  }
  const listed = dictionaries.find((d) => d.id === COLLECT_BISCUIT_DICT_ID)
  if (listed) {
    listed.length = length
    listed.chapterCount = COLLECT_BISCUIT_CHAPTER_COUNT
    listed.chapterLengths = [...chapterLengths]
  }
  return meta
}

export { COLLECT_BISCUIT_DICT_ID }
