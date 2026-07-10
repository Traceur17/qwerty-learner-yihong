import type { Word } from '@/typings'
import { withCacheBust } from '@/utils/cacheBust'
import { publicUrl } from '@/utils/publicUrl'

export async function wordListFetcher(url: string): Promise<Word[]> {
  const response = await fetch(withCacheBust(publicUrl(url)))
  const words: Word[] = await response.json()
  return words
}
