import { idDictionaryMap } from '@/resources/dictionary'
import type { Word } from '@/typings'
import { BISCUIT_DICT_IDS } from '@/utils/chapterAudioPreload'
import { COLLECT_BISCUIT_DICT_NAME } from '@/utils/db/collectedWords'
import { findCollectedByNameKey } from '@/utils/db/collectedWordsRepo'
import { wordListFetcher } from '@/utils/wordListFetcher'

const biscuitNameIndexCache = new Map<string, Map<string, string>>()

async function loadDictNameIndex(dictId: string): Promise<Map<string, string>> {
  const cached = biscuitNameIndexCache.get(dictId)
  if (cached) return cached

  const dict = idDictionaryMap[dictId]
  const index = new Map<string, string>()
  if (!dict) {
    biscuitNameIndexCache.set(dictId, index)
    return index
  }
  try {
    const words = await wordListFetcher(dict.url)
    for (const w of words) {
      index.set(w.name.toLowerCase(), dict.name)
    }
  } catch {
    // ignore load failures
  }
  biscuitNameIndexCache.set(dictId, index)
  return index
}

/**
 * Find which dictionaries already contain the word (collect + current + wang biscuit series).
 */
export async function findDuplicateSources(wordName: string, currentDictWords?: Word[], currentDictName?: string): Promise<string[]> {
  const key = wordName.trim().toLowerCase()
  if (!key) return []
  const sources: string[] = []

  const inCollect = await findCollectedByNameKey(key)
  if (inCollect) sources.push(COLLECT_BISCUIT_DICT_NAME)

  if (currentDictWords?.some((w) => w.name.toLowerCase() === key) && currentDictName) {
    if (!sources.includes(currentDictName)) sources.push(currentDictName)
  }

  for (const id of BISCUIT_DICT_IDS) {
    const index = await loadDictNameIndex(id)
    const dictName = index.get(key)
    if (dictName && !sources.includes(dictName)) sources.push(dictName)
  }

  return sources
}

export async function attachDuplicateHints<T extends { name: string }>(
  cards: T[],
  currentDictWords?: Word[],
  currentDictName?: string,
): Promise<Array<T & { duplicateIn?: string[] }>> {
  return Promise.all(
    cards.map(async (card) => {
      const duplicateIn = await findDuplicateSources(card.name, currentDictWords, currentDictName)
      return duplicateIn.length > 0 ? { ...card, duplicateIn } : { ...card }
    }),
  )
}
