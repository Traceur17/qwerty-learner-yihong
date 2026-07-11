import { transcribeShortClip } from './ffmpeg.mjs'
import { phraseSimilarity } from './similarity.mjs'

/**
 * @param {{ rows: Array<{ name: string }>, segments: Array<{ index: number, start: number, end: number, outputPath?: string }>, validation: any, segmentation: any }} params
 */
export async function validateUnit({ rows, segments, validation, segmentation }) {
  const issues = []
  const allowPartial = segmentation?.allowPartial === true

  if (segments.length !== rows.length) {
    if (allowPartial && segments.length > 0 && segments.length < rows.length) {
      issues.push({
        type: 'partial-match',
        message: `Partial match: ${segments.length}/${rows.length} phrases have audio (${rows.length - segments.length} missing)`,
      })
    } else {
      issues.push({
        type: 'count-mismatch',
        message: `Expected ${rows.length} segments, got ${segments.length}`,
      })
      return { ok: false, issues }
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const row = rows[i]
    const segment = segments[i]
    const duration = segment.end - segment.start

    if (duration < (validation.minDurationSec ?? 0.2)) {
      issues.push({ type: 'duration-too-short', index: i + 1, message: `Segment ${i + 1} too short (${duration.toFixed(2)}s)` })
    }
    if (duration > (validation.maxDurationSec ?? 15)) {
      issues.push({ type: 'duration-too-long', index: i + 1, message: `Segment ${i + 1} too long (${duration.toFixed(2)}s)` })
    }

    if (validation.verifyTranscript && segment.outputPath) {
      try {
        const transcript = await transcribeShortClip(segment.outputPath, segmentation.whisper?.model)
        const score = phraseSimilarity(row.name, transcript)
        if (score < (validation.minSimilarity ?? 0.85)) {
          issues.push({
            type: 'similarity-low',
            index: i + 1,
            expected: row.name,
            actual: transcript,
            score,
            message: `Segment ${i + 1} similarity ${score.toFixed(2)} < ${validation.minSimilarity}`,
          })
        }
      } catch (error) {
        issues.push({
          type: 'verify-failed',
          index: i + 1,
          message: `Segment ${i + 1} verify failed: ${error.message}`,
        })
      }
    }
  }

  const blocking = issues.filter((issue) => issue.type !== 'partial-match')
  return { ok: blocking.length === 0, issues }
}
