/**
 * Fix segment timestamps after MP3 concat drift.
 * Index is built from summed clip durations; concat adds ~2.5% cumulative padding.
 *
 * Usage: node tools/dict-audio-pipeline/scripts/rescale-merged-indexes.mjs
 */
import { getAudioDurationSec } from '../lib/ffmpeg.mjs'
import { readJson, writeJson } from '../lib/utils.mjs'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const audioDir = path.join(root, 'public/audio/wang-c5-audio')
const dictPath = path.join(root, 'public/dicts/wang-c5-biscuit.json')

const scales = new Map()

for (const file of fs
  .readdirSync(audioDir)
  .filter((f) => f.endsWith('.index.json'))
  .sort()) {
  const indexPath = path.join(audioDir, file)
  const index = readJson(indexPath)
  const mp3Path = path.join(audioDir, `${index.unit}.mp3`)
  if (!fs.existsSync(mp3Path)) continue

  const keys = Object.keys(index.segments).sort()
  const indexEnd = index.segments[keys[keys.length - 1]].end
  const fileDuration = await getAudioDurationSec(mp3Path)
  const drift = Math.abs(fileDuration - indexEnd)
  if (drift <= 0.25) {
    console.log(`${index.unit}: drift ${drift.toFixed(3)}s — skip`)
    continue
  }

  const scale = fileDuration / indexEnd
  for (const key of keys) {
    index.segments[key].start = Number((index.segments[key].start * scale).toFixed(4))
    index.segments[key].end = Number((index.segments[key].end * scale).toFixed(4))
  }
  writeJson(indexPath, index)
  scales.set(index.unit, scale)
  console.log(`${index.unit}: scale ${scale.toFixed(6)} (${indexEnd.toFixed(2)}s -> ${fileDuration.toFixed(2)}s)`)
}

if (scales.size > 0 && fs.existsSync(dictPath)) {
  const dict = readJson(dictPath)
  let updated = 0
  for (const word of dict) {
    const seg = word.ukAudio
    if (!seg || typeof seg !== 'object' || !seg.unit) continue
    const scale = scales.get(seg.unit)
    if (!scale) continue
    seg.start = Number((seg.start * scale).toFixed(4))
    seg.end = Number((seg.end * scale).toFixed(4))
    updated++
  }
  writeJson(dictPath, dict)
  console.log(`Updated ${updated} dict entries`)
}
