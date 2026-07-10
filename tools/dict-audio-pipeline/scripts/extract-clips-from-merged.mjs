/**
 * Restore per-word clip files from merged unit MP3 + index.json, update combined dict.
 *
 * Usage: node tools/dict-audio-pipeline/scripts/extract-clips-from-merged.mjs
 */
import { runCommand } from '../lib/ffmpeg.mjs'
import { ensureDir, readJson, writeJson } from '../lib/utils.mjs'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const audioDir = path.join(root, 'public/audio/wang-c5-audio')
const dictPath = path.join(root, 'public/dicts/wang-c5-biscuit.json')

async function extractClip(mergedPath, outputPath, start, end) {
  ensureDir(path.dirname(outputPath))
  const duration = Math.max(0.05, end - start)
  await runCommand('ffmpeg', [
    '-y',
    '-ss',
    String(start),
    '-t',
    String(duration),
    '-i',
    mergedPath,
    '-acodec',
    'libmp3lame',
    '-q:a',
    '2',
    outputPath,
  ])
}

const dict = readJson(dictPath)
const wordsByUnit = new Map()

for (const word of dict) {
  const audio = word.ukAudio
  if (!audio || typeof audio !== 'object' || !audio.unit) continue
  if (!wordsByUnit.has(audio.unit)) wordsByUnit.set(audio.unit, [])
  wordsByUnit.get(audio.unit).push(word)
}

const indexFiles = fs.readdirSync(audioDir).filter((f) => f.endsWith('.index.json')).sort()
let clipCount = 0

for (const indexFile of indexFiles) {
  const index = readJson(path.join(audioDir, indexFile))
  const unit = index.unit
  const mergedPath = path.join(audioDir, `${unit}.mp3`)
  if (!fs.existsSync(mergedPath)) {
    console.warn(`Skip ${unit}: missing ${mergedPath}`)
    continue
  }

  const unitDir = path.join(audioDir, unit)
  ensureDir(unitDir)
  const keys = Object.keys(index.segments).sort()
  const unitWords = wordsByUnit.get(unit) ?? []

  if (unitWords.length !== keys.length) {
    console.warn(`${unit}: dict ${unitWords.length} vs index ${keys.length}`)
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const { start, end } = index.segments[key]
    const filename = `${key}.mp3`
    const outputPath = path.join(unitDir, filename)
    const publicPath = `/audio/wang-c5-audio/${unit}/${filename}`

    await extractClip(mergedPath, outputPath, start, end)
    clipCount++

    if (unitWords[i]) {
      unitWords[i].ukAudio = publicPath
    }
  }

  console.log(`${unit}: ${keys.length} clips`)
}

writeJson(dictPath, dict)
console.log(`Dict updated: ${dictPath}`)
console.log(`Total clips: ${clipCount}`)

const removeMerged = process.argv.includes('--remove-merged')
if (removeMerged) {
  for (const indexFile of indexFiles) {
    const index = readJson(path.join(audioDir, indexFile))
    const indexPath = path.join(audioDir, indexFile)
    const mp3 = path.join(audioDir, `${index.unit}.mp3`)
    if (fs.existsSync(mp3)) fs.unlinkSync(mp3)
    if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath)
    console.log(`Removed merged: ${index.unit}`)
  }
} else {
  console.log('Merged files kept. Pass --remove-merged to delete unit5-XX.mp3 and .index.json')
}
