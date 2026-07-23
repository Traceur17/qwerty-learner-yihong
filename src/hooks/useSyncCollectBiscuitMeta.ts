import { collectedChapterLengthsAtom, collectedWordCountAtom } from '@/store'
import { db } from '@/utils/db'
import { syncCollectBiscuitDictMeta } from '@/utils/db/collectedWordsRepo'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'

/** Keeps jotai + dictionary map length/chapterLengths in sync with Dexie collected words. */
export function useSyncCollectBiscuitMeta(): number {
  const setCount = useSetAtom(collectedWordCountAtom)
  const setChapterLengths = useSetAtom(collectedChapterLengthsAtom)
  const count = useLiveQuery(() => db.collectedWords.count(), [], 0) ?? 0

  useEffect(() => {
    setCount(count)
    void syncCollectBiscuitDictMeta().then((meta) => {
      setChapterLengths(meta.chapterLengths)
    })
  }, [count, setCount, setChapterLengths])

  return count
}
