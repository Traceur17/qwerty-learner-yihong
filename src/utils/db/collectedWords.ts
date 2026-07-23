import type { Word } from '@/typings'

export const COLLECT_BISCUIT_DICT_ID = 'collect-biscuit'
export const COLLECT_BISCUIT_DICT_URL = 'dexie://collect-biscuit'
export const COLLECT_BISCUIT_DICT_NAME = '小饼干罐'

/** Fixed chapters: 0 = 听力, 1 = 阅读 */
export type CollectSection = 'listening' | 'reading'
export const COLLECT_SECTION_LISTENING: CollectSection = 'listening'
export const COLLECT_SECTION_READING: CollectSection = 'reading'
export const COLLECT_BISCUIT_CHAPTER_COUNT = 2
export const COLLECT_BISCUIT_CHAPTER_TITLES = ['听力', '阅读'] as const

export function getCollectBiscuitChapterTitle(index: number): string {
  return COLLECT_BISCUIT_CHAPTER_TITLES[index] ?? `第 ${index + 1} 章`
}

/** Display title for a chapter; collect-biscuit uses 听力/阅读. */
export function getDictChapterTitle(dictId: string, index: number): string {
  if (dictId === COLLECT_BISCUIT_DICT_ID) return getCollectBiscuitChapterTitle(index)
  return `第 ${index + 1} 章`
}

export function normalizeCollectSection(value: unknown): CollectSection {
  return value === COLLECT_SECTION_READING ? COLLECT_SECTION_READING : COLLECT_SECTION_LISTENING
}

export type ICollectedWord = Word & {
  id?: number
  createdAt: number
  /** lowercase name for duplicate lookup */
  nameKey: string
  /** 听力 / 阅读；缺省视为听力 */
  section: CollectSection
}

export function toCollectedWord(
  word: Pick<Word, 'name' | 'trans' | 'usphone' | 'ukphone'> & { section?: CollectSection },
): Omit<ICollectedWord, 'id'> {
  const name = word.name.trim()
  return {
    name,
    nameKey: name.toLowerCase(),
    trans: Array.isArray(word.trans) ? word.trans : [String(word.trans ?? '')],
    usphone: word.usphone ?? '',
    ukphone: word.ukphone ?? '',
    section: normalizeCollectSection(word.section),
    createdAt: Date.now(),
  }
}
