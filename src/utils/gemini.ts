import { geminiApiKeyAtom } from '@/store'
import { WORD_SPLIT_RULES_PROMPT, splitWordListByLineAndComma } from '@/utils/wordListSplit'
import { getDefaultStore } from 'jotai'

/** Prefer current Flash for new AI Studio keys (older Flash-Lite may 404 for new users). */
export const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export class GeminiKeyMissingError extends Error {
  constructor() {
    super('请先在设置中配置 Gemini API Key')
    this.name = 'GeminiKeyMissingError'
  }
}

export function getGeminiApiKey(): string {
  return (getDefaultStore().get(geminiApiKeyAtom) || '').trim()
}

type GeminiPart = { text?: string } | { inlineData: { mimeType: string; data: string } }

/** User-facing tip: roughly when free-tier feels “too many”. */
export const GEMINI_QUOTA_TIP =
  '免费档大致约每分钟十几次、每天约千次请求（以 AI Studio 显示为准）。本功能每次识别通常 1 次调用（多图合并一次）；若释义不全可能再调 1 次。一天里连着识别几十次词表一般够用；短时间狂点或截很多屏再连点，更容易 429。遇到 429 可等 1～2 分钟再试，或次日再试（日额度按太平洋时间重置）。'

function formatGeminiHttpError(status: number, body: string): string {
  if (status === 429) {
    return (
      'Gemini 请求过于频繁或当日额度用尽（429）。' +
      '可等 1～2 分钟后点「识别」重试；若仍失败，多半是日额度到了，次日再试或在 AI Studio 换项目/Key。' +
      '建议：多张截图一次贴齐再识别，少连点。详情：https://ai.google.dev/gemini-api/docs/rate-limits'
    )
  }
  if (status === 400 && /location is not supported|FAILED_PRECONDITION/i.test(body)) {
    return (
      '当前网络所在地区不支持直接调用 Gemini API（400）。' +
      '这与 Key 是否正确无关，是 Google 按访问 IP 做的地区限制（内地网络常见）。' +
      '处理：识别时用可访问 Gemini 的网络（如支持地区的代理/VPN）再试；或让华仔配一台支持地区的中转后再用。'
    )
  }
  const short = body.slice(0, 180).replace(/\s+/g, ' ')
  return `Gemini 请求失败 (${status}): ${short || '未知错误'}`
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export type GeminiProgressStage = 'prepare' | 'recognize' | 'retry' | 'enrich' | 'phonetics' | 'done'

export type GeminiProgress = {
  stage: GeminiProgressStage
  /** Short Chinese status for UI */
  message: string
  imageCount?: number
  wordCount?: number
}

async function generateContent(
  parts: GeminiPart[],
  options?: {
    apiKey?: string
    onProgress?: (p: GeminiProgress) => void
    /** One automatic retry on 429 */
    retryOn429?: boolean
  },
): Promise<string> {
  const apiKey = (options?.apiKey ?? getGeminiApiKey()).trim()
  if (!apiKey) throw new GeminiKeyMissingError()

  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  })

  const attempt = async (): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

  let res = await attempt()
  if (!res.ok && res.status === 429 && options?.retryOn429 !== false) {
    options?.onProgress?.({
      stage: 'retry',
      message: '额度紧张（429），约 8 秒后自动重试一次…',
    })
    await sleep(8000)
    res = await attempt()
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(formatGeminiHttpError(res.status, errBody))
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) throw new Error('Gemini 返回为空')
  return text
}

export async function testGeminiConnectivity(apiKey: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const text = await generateContent([{ text: 'Reply with JSON: {"ok":true}' }], {
      apiKey: apiKey.trim(),
      retryOn429: false,
    })
    JSON.parse(text)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}

/** Parse model JSON that may be an array or `{ words: [...] }` / `{ data: [...] }`. */
export function parseJsonList(text: string): unknown[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const match = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('无法解析 Gemini JSON')
    parsed = JSON.parse(match[0])
  }

  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    for (const key of ['words', 'data', 'items', 'results', 'entries']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[]
    }
  }
  throw new Error('识别结果不是数组')
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(new RegExp('[,，;；\\n]'))
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export type EnrichedWordFields = {
  name: string
  usphone: string
  ukphone: string
  trans: string[]
}

/** Normalize one model item that may use alternate field names. */
export function normalizeEnrichedItem(item: unknown): EnrichedWordFields | null {
  if (typeof item === 'string') {
    const name = item.trim()
    if (!name || name === '[object Object]') return null
    return { name, usphone: '', ukphone: '', trans: [] }
  }
  if (!item || typeof item !== 'object') return null

  const row = item as Record<string, unknown>
  const name = String(row.name ?? row.word ?? row.headword ?? row.lemma ?? '').trim()
  if (!name || name === '[object Object]') return null

  const phonetic = String(row.phonetic ?? row.ipa ?? row.pronunciation ?? '').replace(/^\/|\/$/g, '')
  const usphone = String(row.usphone ?? row.us ?? row.usPhonetic ?? phonetic ?? '').replace(/^\/|\/$/g, '')
  const ukphone = String(row.ukphone ?? row.uk ?? row.ukPhonetic ?? phonetic ?? '').replace(/^\/|\/$/g, '')
  const trans = asStringList(
    row.trans ?? row.translation ?? row.translations ?? row.definition ?? row.definitions ?? row.meaning ?? row.meanings,
  )

  return { name, usphone, ukphone, trans }
}

/**
 * One-shot: extract English words from text/image AND fill us/uk phonetics + Chinese defs.
 * Text: local line/comma split then Gemini enrich (deterministic split).
 * Image: Gemini OCR with the same split rules in the prompt.
 */
export async function extractAndEnrichFromTextOrImage(input: {
  text?: string
  imageDataUrl?: string
  imageDataUrls?: string[]
  onProgress?: (p: GeminiProgress) => void
}): Promise<EnrichedWordFields[]> {
  const onProgress = input.onProgress
  const text = input.text?.trim()
  const images = [...(input.imageDataUrls ?? []), ...(input.imageDataUrl ? [input.imageDataUrl] : [])].filter(Boolean)
  const uniqueImages = Array.from(new Set(images))
  const hasImage = uniqueImages.length > 0
  const imageCount = uniqueImages.length

  // Text-only: split locally so spaces never break phrases; Gemini only fills fields.
  if (text && !hasImage) {
    const names = splitWordListByLineAndComma(text)
    if (names.length === 0) {
      throw new Error('没有识别到有效单词，请按行输入；同一行无逗号则整行算一个词组')
    }
    onProgress?.({
      stage: 'enrich',
      message: `补全音标释义…（${names.length} 个词）`,
      wordCount: names.length,
    })
    return enrichWordsWithGemini(names, onProgress)
  }

  onProgress?.({
    stage: 'prepare',
    message: imageCount > 1 ? `准备 ${imageCount} 张截图…` : '准备截图…',
    imageCount,
  })

  const parts: GeminiPart[] = []
  const instruction = `你是英语学习助手。从用户提供的雅思听力/阅读词表（文本或截图，可能多张）中提取英文单词或短语，并为每个词补全音标与中文释义。
严格返回 JSON 数组（不要 markdown），每项必须包含：
{"name":"英文原词或词组","usphone":"美式音标不要斜杠","ukphone":"英式音标不要斜杠","trans":["中文释义，可含词性"]}

${WORD_SPLIT_RULES_PROMPT}

其它规则：
- 多张截图时合并去重后输出
- name 保持原文拼写与空格
- usphone / ukphone 用 IPA，不要包 /
- trans 必须是中文释义字符串数组，至少一项
- 不要只返回单词字符串`

  parts.push({ text: instruction })
  if (text) {
    parts.push({ text: `文本内容（请按切分规则处理）：\n${text}` })
  }
  for (let index = 0; index < uniqueImages.length; index++) {
    const dataUrl = uniqueImages[index]
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!m) throw new Error('图片格式无效，请粘贴或选择常见图片')
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } })
    parts.push({
      text: `以上是第 ${index + 1}/${
        uniqueImages.length
      } 张截图：请按视觉行读出英文，再严格按「切分规则」纳入最终 JSON 数组。同一视觉行且无逗号时，整行作为一个 name。`,
    })
  }
  if (parts.length < 2) throw new Error('请输入文本或粘贴图片')

  onProgress?.({
    stage: 'recognize',
    message: imageCount > 1 ? `识别中…（${imageCount} 张图合并一次请求，稍等）` : '识别截图中…',
    imageCount,
  })

  const raw = await generateContent(parts, { onProgress })
  const list = parseJsonList(raw)
  const words: EnrichedWordFields[] = []
  const seen = new Set<string>()

  for (const item of list) {
    const normalized = normalizeEnrichedItem(item)
    if (!normalized) continue
    const key = normalized.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    words.push(normalized)
  }

  if (words.length === 0) {
    throw new Error('没有识别到有效单词，请换一张更清晰的词表截图或补充文本')
  }

  // If model only returned bare names, ask once more to fill phonetics + Chinese.
  const needsEnrich = words.some((w) => !w.usphone && !w.ukphone && w.trans.length === 0)
  if (needsEnrich) {
    onProgress?.({
      stage: 'enrich',
      message: `补全音标释义…（${words.length} 个词）`,
      wordCount: words.length,
      imageCount,
    })
    const filled = await enrichWordsWithGemini(
      words.map((w) => w.name),
      onProgress,
    )
    const byName = new Map(filled.map((r) => [r.name.toLowerCase(), r]))
    return words.map((w) => {
      const g = byName.get(w.name.toLowerCase())
      if (!g) return w
      return {
        name: g.name || w.name,
        usphone: w.usphone || g.usphone,
        ukphone: w.ukphone || g.ukphone,
        trans: w.trans.length ? w.trans : g.trans,
      }
    })
  }

  return words
}

export async function enrichWordsWithGemini(names: string[], onProgress?: (p: GeminiProgress) => void): Promise<EnrichedWordFields[]> {
  if (names.length === 0) return []
  const prompt = `为下列英语单词/短语补全美式音标 usphone、英式音标 ukphone、中文释义 trans（字符串数组，可含词性）。
严格返回 JSON 数组，每项必须是对象：
{"name":"...","usphone":"IPA不要斜杠","ukphone":"IPA不要斜杠","trans":["中文释义"]}
单词列表: ${JSON.stringify(names)}
不要 markdown，不要只返回字符串。`

  const raw = await generateContent([{ text: prompt }], { onProgress })
  const list = parseJsonList(raw)
  return list.map(normalizeEnrichedItem).filter((x): x is EnrichedWordFields => x !== null)
}

/** @deprecated prefer extractAndEnrichFromTextOrImage */
export async function extractWordsFromTextOrImage(input: { text?: string; imageDataUrl?: string }): Promise<string[]> {
  const rows = await extractAndEnrichFromTextOrImage(input)
  return rows.map((r) => r.name)
}
