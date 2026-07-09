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
