import { cutAudioSegment } from './ffmpeg.mjs'
import { ensureDir, slugify } from './utils.mjs'
import path from 'node:path'

/**
 * @param {{ audioPath: string, unitId: string, segments: Array<{ index: number, start: number, end: number }>, outputAudioDir: string, paddingMs?: number }} params
 */
export async function cutSegmentsToFiles({ audioPath, unitId, segments, outputAudioDir, paddingMs = 80, trimSilence = false }) {
  const unitDir = path.join(outputAudioDir, `unit${unitId}`)
  ensureDir(unitDir)

  const cutOptions = { paddingMs, trimSilence }
  const clips = []
  for (const segment of segments) {
    const filename = `${String(segment.index).padStart(3, '0')}_${slugify(segment.text ?? `clip-${segment.index}`)}.mp3`
    const outputPath = path.join(unitDir, filename)
    await cutAudioSegment(audioPath, outputPath, segment.start, segment.end, cutOptions)
    clips.push({
      ...segment,
      filename,
      outputPath,
      publicPath: toPublicAudioPath(outputPath),
      durationSec: Number((segment.end - segment.start).toFixed(2)),
    })
  }

  return clips
}

function toPublicAudioPath(absoluteOutputPath) {
  const normalized = absoluteOutputPath.replace(/\\/g, '/')
  const publicIndex = normalized.lastIndexOf('/public/')
  if (publicIndex >= 0) {
    return normalized.slice(publicIndex + '/public'.length)
  }
  return normalized
}
