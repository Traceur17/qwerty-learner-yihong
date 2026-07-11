import { cutAudioSegment } from './ffmpeg.mjs'
import { ensureDir, slugify } from './utils.mjs'
import fs from 'node:fs'
import path from 'node:path'

/**
 * @param {{ audioPath: string, unitId: string, segments: Array<{ index: number, start: number, end: number }>, outputAudioDir: string, paddingMs?: number }} params
 */
export async function cutSegmentsToFiles({ audioPath, unitId, segments, outputAudioDir, paddingMs = 80, trimSilence = false }) {
  const unitDir = path.join(outputAudioDir, `unit${unitId}`)
  ensureDir(unitDir)
  // 清掉旧切片，避免 partial 匹配后残留错误的固定时长文件
  for (const name of fs.readdirSync(unitDir)) {
    if (name.toLowerCase().endsWith('.mp3')) {
      fs.unlinkSync(path.join(unitDir, name))
    }
  }

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
