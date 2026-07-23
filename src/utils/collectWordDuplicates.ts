import { idDictionaryMap } from '@/resources/dictionary'
import type { Dictionary, Word } from '@/typings'
import { getChapterRange, resolveChapterCount } from '@/utils'
import { BISCUIT_DICT_IDS } from '@/utils/chapterAudioPreload'
import { COLLECT_BISCUIT_DICT_ID, COLLECT_BISCUIT_DICT_NAME, getDictChapterTitle, normalizeCollectSection } from '@/utils/db/collectedWords'
import { findCollectedByNameKey } from '@/utils/db/collectedWordsRepo'
import { wordListFetcher } from '@/utils/wordListFetcher'

export type DuplicateDictContext = Pick<Dictionary, 'id' | 'name' | 'length' | 'chapterLengths'>

/** nameKey → word index in dict word list */
const biscuitWordIndexCache = new Map<string, Map<string, number>>()

async function loadDictWordIndex(dictId: string): Promise<Map<string, number>> {
  const cached = biscuitWordIndexCache.get(dictId)
  if (cached) return cached

  const dict = idDictionaryMap[dictId]
  const index = new Map<string, number>()
  if (!dict) {
    biscuitWordIndexCache.set(dictId, index)
    return index
  }
  try {
    const words = await wordListFetcher(dict.url)
    words.forEach((w, i) => {
      const key = w.name.toLowerCase()
      if (!index.has(key)) index.set(key, i)
    })
  } catch {
    // ignore load failures
  }
  biscuitWordIndexCache.set(dictId, index)
  return index
}

function formatDictChapterLabel(dict: DuplicateDictContext, wordIndex: number): string {
  const chapterCount = resolveChapterCount(dict)
  for (let c = 0; c < chapterCount; c++) {
    const { start, end } = getChapterRange(dict, c)
    if (wordIndex >= start && wordIndex < end) {
      return `${dict.name}·${getDictChapterTitle(dict.id, c)}`
    }
  }
  return dict.name
}

function findWordChapterLabel(dict: DuplicateDictContext, words: Word[], wordKey: string): string | null {
  const idx = words.findIndex((w) => w.name.toLowerCase() === wordKey)
  if (idx < 0) return null
  return formatDictChapterLabel(dict, idx)
}

/**
 * Find which dictionaries already contain the word (collect + current + wang biscuit series),
 * with chapter when resolvable.
 */
export async function findDuplicateSources(
  wordName: string,
  currentDictWords?: Word[],
  currentDict?: DuplicateDictContext,
): Promise<string[]> {
  const key = wordName.trim().toLowerCase()
  if (!key) return []
  const sources: string[] = []
  const seenDictIds = new Set<string>()

  const inCollect = await findCollectedByNameKey(key)
  if (inCollect) {
    const chapter = getDictChapterTitle(COLLECT_BISCUIT_DICT_ID, normalizeCollectSection(inCollect.section) === 'reading' ? 1 : 0)
    sources.push(`${COLLECT_BISCUIT_DICT_NAME}·${chapter}`)
    seenDictIds.add(COLLECT_BISCUIT_DICT_ID)
  }

  if (currentDict && currentDictWords && !seenDictIds.has(currentDict.id)) {
    const label = findWordChapterLabel(currentDict, currentDictWords, key)
    if (label) {
      sources.push(label)
      seenDictIds.add(currentDict.id)
    }
  }

  for (const id of BISCUIT_DICT_IDS) {
    if (seenDictIds.has(id)) continue
    const dict = idDictionaryMap[id]
    if (!dict) continue
    const index = await loadDictWordIndex(id)
    const wordIndex = index.get(key)
    if (wordIndex === undefined) continue
    sources.push(formatDictChapterLabel(dict, wordIndex))
    seenDictIds.add(id)
  }

  return sources
}

export async function attachDuplicateHints<T extends { name: string }>(
  cards: T[],
  currentDictWords?: Word[],
  currentDict?: DuplicateDictContext,
): Promise<Array<T & { duplicateIn?: string[] }>> {
  return Promise.all(
    cards.map(async (card) => {
      const duplicateIn = await findDuplicateSources(card.name, currentDictWords, currentDict)
      return duplicateIn.length > 0 ? { ...card, duplicateIn } : { ...card }
    }),
  )
}
