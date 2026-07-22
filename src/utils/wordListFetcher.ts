import type { Word } from '@/typings'
import { withCacheBust } from '@/utils/cacheBust'
import { COLLECT_BISCUIT_DICT_URL } from '@/utils/db/collectedWords'
import { listCollectedWords } from '@/utils/db/collectedWordsRepo'
import { publicUrl } from '@/utils/publicUrl'

export async function wordListFetcher(url: string): Promise<Word[]> {
  if (url === COLLECT_BISCUIT_DICT_URL || url.startsWith('dexie://')) {
    return listCollectedWords()
  }
  const response = await fetch(withCacheBust(publicUrl(url)))
  const words: Word[] = await response.json()
  return words
}
