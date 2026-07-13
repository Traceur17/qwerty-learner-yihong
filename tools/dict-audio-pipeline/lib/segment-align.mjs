/**
 * Align raw speech segments from silence detection to expected phrase count.
 * Drops leading intro block(s) and overly long/short segments.
 */
export function alignSpeechSegmentsToRows(speechSegments, rowCount, options = {}) {
  const minPhraseSec = options.minPhraseSec ?? 0.2
  const maxPhraseSec = options.maxPhraseSec ?? 8
  const introMaxSec = options.introMaxSec ?? 15

  let segments = speechSegments
    .map((segment) => ({
      ...segment,
      duration: segment.end - segment.start,
    }))
    .filter((segment) => segment.duration >= minPhraseSec)

  // Drop leading intro: long speech before the first phrase block
  while (segments.length > 0 && segments[0].duration >= introMaxSec) {
    segments = segments.slice(1)
  }

  // Drop segments that are too long to be a single phrase
  segments = segments.filter((segment) => segment.duration <= maxPhraseSec)

  if (segments.length > rowCount) {
    // 多余片段多在末尾（噪声），保留前 N 条与 Excel 对齐
    segments = segments.slice(0, rowCount)
  }

  if (segments.length !== rowCount) {
    throw new Error(`Silence align: expected ${rowCount} segments after intro trim, got ${segments.length} (raw=${speechSegments.length})`)
  }

  return segments
}

/**
 * 词表连续，但源音频在某词之后多出若干朗读段时，从 speech 序列中丢掉这些段再对齐。
 *
 * @param {Array<{ start: number, end: number }>} speechSegments
 * @param {Array<{ name: string }>} rows
 * @param {Array<{ afterWord?: string, afterIndex?: number, skipCount: number }>} skips
 *   afterWord: 词表中的词名（大小写不敏感）；afterIndex: 1-based 词序；skipCount: 丢掉随后几段 speech
 */
export function applySpeechSkips(speechSegments, rows, skips) {
  if (!Array.isArray(skips) || skips.length === 0) return speechSegments

  const rules = skips
    .map((rule) => {
      let rowIdx = -1
      if (rule.afterWord) {
        const needle = String(rule.afterWord).trim().toLowerCase()
        rowIdx = rows.findIndex(
          (row) =>
            String(row.name ?? '')
              .trim()
              .toLowerCase() === needle,
        )
      } else if (rule.afterIndex != null) {
        rowIdx = Number(rule.afterIndex) - 1
      }
      const skipCount = Number(rule.skipCount ?? 0)
      return { rowIdx, skipCount, raw: rule }
    })
    .filter((rule) => rule.skipCount > 0)
    .sort((a, b) => a.rowIdx - b.rowIdx)

  let speech = [...speechSegments]
  for (const rule of rules) {
    if (rule.rowIdx < 0 || rule.rowIdx >= rows.length) {
      throw new Error(`speechSkips: cannot resolve afterWord/afterIndex ${JSON.stringify(rule.raw)} in ${rows.length} rows`)
    }
    if (rule.rowIdx >= speech.length) {
      throw new Error(`speechSkips: row ${rule.rowIdx + 1} beyond speech length ${speech.length}`)
    }
    const dropFrom = rule.rowIdx + 1
    const dropTo = dropFrom + rule.skipCount
    if (dropTo > speech.length) {
      throw new Error(
        `speechSkips: after "${rows[rule.rowIdx].name}" need ${rule.skipCount} spare segments, only ${speech.length - dropFrom} left`,
      )
    }
    speech = [...speech.slice(0, dropFrom), ...speech.slice(dropTo)]
  }
  return speech
}

/**
 * 构建前从词表排除指定词（大小写不敏感）。
 * @param {Array<{ name: string }>} rows
 * @param {string[] | undefined} excludeWords
 */
export function applyExcludeWords(rows, excludeWords) {
  if (!Array.isArray(excludeWords) || excludeWords.length === 0) return rows
  const blocked = new Set(excludeWords.map((word) => String(word).trim().toLowerCase()).filter(Boolean))
  return rows.filter(
    (row) =>
      !blocked.has(
        String(row.name ?? '')
          .trim()
          .toLowerCase(),
      ),
  )
}
