/**
 * Split a pasted/typed word list into entries.
 *
 * Rules (same for text input and screenshot OCR instructions):
 * - Split by lines first
 * - Within a line: no comma → the whole line is ONE word/phrase (spaces kept)
 * - Within a line: comma-separated → each segment is a separate word/phrase
 * - Empty lines / empty segments are dropped
 */
export function splitWordListByLineAndComma(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const result: string[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    // English/Chinese commas only — spaces alone must NOT split
    const parts = /[,，]/.test(trimmedLine)
      ? trimmedLine
          .split(/[,，]/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [trimmedLine]

    for (const part of parts) {
      const key = part.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(part)
    }
  }

  return result
}

/** Prompt fragment shared by image/text Gemini extraction. */
export const WORD_SPLIT_RULES_PROMPT = `切分规则（必须严格遵守，对文本和截图同样适用）：
1. 先按「行」区分候选
2. 同一行里如果没有逗号（, 或 ，），整行是一个词或词组，即使中间有空格也不得拆开（例如 "take place" 算一项）
3. 同一行里如果有逗号隔开，才拆成多个词/词组
4. 多行才产生多个词/词组（每行按上面 2/3 处理）
5. 跳过页码、题号、Directions、纯数字等杂质
错误示例：把 "take place" 拆成 take 和 place —— 禁止
正确示例：
- 一行 "take place" → ["take place"]
- 一行 "abandon, abandon ship" → ["abandon", "abandon ship"]
- 两行分别是 take place / look after → ["take place", "look after"]`
