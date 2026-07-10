import { getAudioDurationSec, runCommand } from './ffmpeg.mjs'
import { ensureDir, writeJson } from './utils.mjs'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/**
 * Merge per-word clips in unit{unitId}/ into unit{unitId}.mp3 + index.json
 * @param {{ unitId: string, outputAudioDir: string, audioPublicId: string, clips: Array<{ filename: string, outputPath: string }>, cleanupClips?: boolean }} params
 */
export async function mergeUnitAudio({ unitId, outputAudioDir, audioPublicId, clips, cleanupClips = true }) {
  const unitFolderName = `unit${unitId}`
  const unitDir = path.join(outputAudioDir, unitFolderName)
  const mergedFilename = `${unitFolderName}.mp3`
  const mergedPath = path.join(outputAudioDir, mergedFilename)
  const indexPath = path.join(outputAudioDir, `${unitFolderName}.index.json`)

  const sortedClips = [...clips].sort((a, b) => a.filename.localeCompare(b.filename))
  const segments = {}
  let cursor = 0

  for (const clip of sortedClips) {
    const duration = await getAudioDurationSec(clip.outputPath)
    const key = clip.filename.replace(/\.mp3$/i, '')
    segments[key] = {
      start: Number(cursor.toFixed(4)),
      end: Number((cursor + duration).toFixed(4)),
    }
    cursor += duration
  }

  await concatMp3Files(
    sortedClips.map((clip) => clip.outputPath),
    mergedPath,
  )

  const mergedDuration = await getAudioDurationSec(mergedPath)
  if (cursor > 0 && Math.abs(mergedDuration - cursor) > 0.25) {
    const scale = mergedDuration / cursor
    for (const key of Object.keys(segments)) {
      segments[key].start = Number((segments[key].start * scale).toFixed(4))
      segments[key].end = Number((segments[key].end * scale).toFixed(4))
    }
    console.warn(
      `[merge] ${unitFolderName}: scaled segment times by ${scale.toFixed(6)} (${cursor.toFixed(2)}s -> ${mergedDuration.toFixed(2)}s)`,
    )
  }

  const index = {
    version: 1,
    unit: unitFolderName,
    audio: `/audio/${audioPublicId}/${mergedFilename}`,
    segments,
  }
  writeJson(indexPath, index)

  if (cleanupClips) {
    for (const clip of sortedClips) {
      if (fs.existsSync(clip.outputPath)) fs.unlinkSync(clip.outputPath)
    }
    if (fs.existsSync(unitDir) && fs.readdirSync(unitDir).length === 0) {
      fs.rmdirSync(unitDir)
    }
  }

  return { mergedPath, indexPath, segments, unitFolderName, mergedPublicPath: index.audio }
}

async function concatMp3Files(inputPaths, outputPath) {
  if (inputPaths.length === 0) throw new Error('concatMp3Files: no inputs')
  ensureDir(path.dirname(outputPath))

  const listFile = path.join(os.tmpdir(), `dict-audio-concat-${Date.now()}.txt`)
  const listContent = inputPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(listFile, listContent, 'utf-8')

  try {
    await runCommand('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listFile,
      '-c:a',
      'libmp3lame',
      '-b:a',
      '128k',
      outputPath,
    ])
  } finally {
    fs.unlinkSync(listFile)
  }
}

/**
 * Build dict audio segment refs from merge result
 */
export function clipsToSegmentRefs(clips, segments, unitFolderName, audioPublicId) {
  const sortedClips = [...clips].sort((a, b) => a.filename.localeCompare(b.filename))
  return sortedClips.map((clip) => {
    const key = clip.filename.replace(/\.mp3$/i, '')
    const range = segments[key]
    return {
      unit: unitFolderName,
      base: audioPublicId,
      start: range.start,
      end: range.end,
    }
  })
}

/**
 * Merge existing clip directory on disk (offline migration)
 */
export async function mergeExistingUnitDir({ unitId, outputAudioDir, audioPublicId, cleanupClips = true }) {
  const unitFolderName = `unit${unitId}`
  const unitDir = path.join(outputAudioDir, unitFolderName)
  if (!fs.existsSync(unitDir)) {
    throw new Error(`Unit directory not found: ${unitDir}`)
  }

  const files = fs
    .readdirSync(unitDir)
    .filter((f) => f.endsWith('.mp3'))
    .sort()

  const clips = files.map((filename) => ({
    filename,
    outputPath: path.join(unitDir, filename),
  }))

  return mergeUnitAudio({ unitId, outputAudioDir, audioPublicId, clips, cleanupClips })
}
