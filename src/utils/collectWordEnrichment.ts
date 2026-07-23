import type { Word } from '@/typings'
import { COLLECT_SECTION_LISTENING, type CollectSection } from '@/utils/db/collectedWords'
import { type EnrichedWordFields, type GeminiProgress, extractAndEnrichFromTextOrImage } from '@/utils/gemini'

type FreeDictPhonetic = { text?: string; audio?: string }
type FreeDictEntry = {
  word?: string
  phonetic?: string
  phonetics?: FreeDictPhonetic[]
}

async function lookupFreeDictionary(word: string): Promise<{ usphone: string; ukphone: string } | null> {
  try {
    // Phrases often 404 on free dictionary; skip multi-word to save requests.
    if (/\s/.test(word.trim())) return null
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (!res.ok) return null
    const data = (await res.json()) as FreeDictEntry[]
    const entry = data[0]
    if (!entry) return null

    let usphone = ''
    let ukphone = ''
    for (const p of entry.phonetics ?? []) {
      const text = (p.text || '').replace(/^\/|\/$/g, '')
      if (!text) continue
      const audio = p.audio || ''
      if (/us/i.test(audio) && !usphone) usphone = text
      else if (/uk|gb/i.test(audio) && !ukphone) ukphone = text
    }
    const fallback = (entry.phonetic || '').replace(/^\/|\/$/g, '')
    if (!usphone) usphone = fallback
    if (!ukphone) ukphone = fallback || usphone
    return { usphone, ukphone }
  } catch {
    // CORS / network — ignore, Gemini fields remain
    return null
  }
}

export type CollectCardDraft = EnrichedWordFields & {
  selected: boolean
  /** 听力 / 阅读；识别结果默认听力 */
  section: CollectSection
  duplicateIn?: string[]
}

/**
 * Extract + enrich in one Gemini pass; Free Dictionary only fills missing phonetics.
 */
export async function recognizeAndEnrich(input: {
  text?: string
  imageDataUrl?: string
  imageDataUrls?: string[]
  onProgress?: (p: GeminiProgress) => void
}): Promise<CollectCardDraft[]> {
  const rows = await extractAndEnrichFromTextOrImage(input)
  if (rows.length === 0) return []

  const needPhonetics = rows.some((row) => !row.usphone || !row.ukphone)
  if (needPhonetics) {
    input.onProgress?.({
      stage: 'phonetics',
      message: `核对音标…（${rows.length} 个词）`,
      wordCount: rows.length,
    })
  }

  const phoneticMap = new Map<string, { usphone: string; ukphone: string }>()
  await Promise.all(
    rows.map(async (row) => {
      if (row.usphone && row.ukphone) return
      const hit = await lookupFreeDictionary(row.name)
      if (hit) phoneticMap.set(row.name.toLowerCase(), hit)
    }),
  )

  input.onProgress?.({
    stage: 'done',
    message: `完成（${rows.length} 个词）`,
    wordCount: rows.length,
  })

  return rows.map((row) => {
    const ph = phoneticMap.get(row.name.toLowerCase())
    return {
      name: row.name,
      usphone: row.usphone || ph?.usphone || '',
      ukphone: row.ukphone || ph?.ukphone || '',
      trans: row.trans,
      selected: true,
      section: COLLECT_SECTION_LISTENING,
    }
  })
}

export function draftToWord(d: CollectCardDraft): Word {
  return {
    name: d.name,
    trans: d.trans,
    usphone: d.usphone,
    ukphone: d.ukphone,
  }
}

export function draftToCollectedInput(d: CollectCardDraft) {
  return {
    ...draftToWord(d),
    section: d.section,
  }
}
