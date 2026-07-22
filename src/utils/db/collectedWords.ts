import type { Word } from '@/typings'

export const COLLECT_BISCUIT_DICT_ID = 'collect-biscuit'
export const COLLECT_BISCUIT_DICT_URL = 'dexie://collect-biscuit'
export const COLLECT_BISCUIT_DICT_NAME = '小饼干罐'

export type ICollectedWord = Word & {
  id?: number
  createdAt: number
  /** lowercase name for duplicate lookup */
  nameKey: string
}

export function toCollectedWord(word: Pick<Word, 'name' | 'trans' | 'usphone' | 'ukphone'>): Omit<ICollectedWord, 'id'> {
  const name = word.name.trim()
  return {
    name,
    nameKey: name.toLowerCase(),
    trans: Array.isArray(word.trans) ? word.trans : [String(word.trans ?? '')],
    usphone: word.usphone ?? '',
    ukphone: word.ukphone ?? '',
    createdAt: Date.now(),
  }
}
