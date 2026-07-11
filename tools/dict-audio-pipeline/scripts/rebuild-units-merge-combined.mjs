#!/usr/bin/env node

/**
 * Rebuild specific units and merge into existing combined dict (wang-c5-biscuit).
 * Usage: node rebuild-units-merge-combined.mjs <manifest> 5-09 5-10
 *        node rebuild-units-merge-combined.mjs <manifest> 5-12 --append
 */
import { runBuild } from '../lib/build.mjs'
import { readJson, writeJson } from '../lib/utils.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')

const manifestPath = process.argv[2]
const args = process.argv.slice(3)
const appendMode = args.includes('--append')
const unitIds = args.filter((a) => a !== '--append')

if (!manifestPath || unitIds.length === 0) {
  console.error('Usage: node rebuild-units-merge-combined.mjs <manifest.yaml> 5-09 [5-10 ...] [--append]')
  process.exit(1)
}

const combinedPath = path.join(repoRoot, 'public/dicts/wang-c5-biscuit.json')
const dictTsPath = path.join(repoRoot, 'src/resources/dictionary.ts')

function chapterOffset(chapterLengths, chapterIndex) {
  return chapterLengths.slice(0, chapterIndex).reduce((a, b) => a + b, 0)
}

function readChapterLengthsFromDictTs() {
  const source = fs.readFileSync(dictTsPath, 'utf-8')
  const match = source.match(/id: 'wang-c5-biscuit'[\s\S]*?chapterLengths: \[([^\]]+)\]/)
  if (!match) throw new Error('wang-c5-biscuit chapterLengths not found in dictionary.ts')
  return match[1].split(',').map((n) => Number.parseInt(n.trim(), 10))
}

/** @type {Record<string, number>} unitId -> chapter index (0-based) */
function buildUnitChapterIndex(chapterLengths) {
  const map = {}
  for (let i = 0; i < chapterLengths.length; i++) {
    map[`5-${String(i + 1).padStart(2, '0')}`] = i
  }
  return map
}

async function main() {
  const backup = readJson(combinedPath)
  const dictTsBackup = fs.readFileSync(dictTsPath, 'utf-8')
  let chapterLengths = readChapterLengthsFromDictTs()
  const unitChapterIndex = buildUnitChapterIndex(chapterLengths)
  const rebuilt = new Map()

  for (const unitId of unitIds) {
    console.log(`\n=== Building unit ${unitId} ===`)
    const unitAudioDir = path.join(repoRoot, 'public/audio/wang-c5-audio', `unit${unitId}`)
    if (fs.existsSync(unitAudioDir)) {
      for (const file of fs.readdirSync(unitAudioDir)) {
        if (file.endsWith('.mp3')) fs.unlinkSync(path.join(unitAudioDir, file))
      }
    }
    const { report } = await runBuild(manifestPath, { unitFilter: unitId })
    const unit = report.units.find((u) => u.unitId === unitId && u.status === 'success')
    if (!unit?.entries?.length) {
      console.error(`Build failed for ${unitId}:`, unit?.message ?? 'no entries')
      process.exit(1)
    }
    rebuilt.set(unitId, unit.entries)
    console.log(`OK ${unitId}: ${unit.entries.length} entries`)
    fs.writeFileSync(dictTsPath, dictTsBackup, 'utf-8')
    writeJson(combinedPath, backup)
  }

  let merged = [...backup]
  let newChapterLengths = [...chapterLengths]

  const sorted = [...unitIds].sort((a, b) => {
    const ia = unitChapterIndex[a] ?? newChapterLengths.length
    const ib = unitChapterIndex[b] ?? newChapterLengths.length
    return ib - ia
  })

  for (const unitId of sorted) {
    const entries = rebuilt.get(unitId)
    let chIdx = unitChapterIndex[unitId]

    if (chIdx == null) {
      if (!appendMode) {
        throw new Error(`Unknown unitId ${unitId}; use --append to add a new chapter`)
      }
      chIdx = newChapterLengths.length
      unitChapterIndex[unitId] = chIdx
      merged = [...merged, ...entries]
      newChapterLengths.push(entries.length)
      console.log(`Appended chapter ${chIdx + 1} (${unitId}): ${entries.length} words`)
      continue
    }

    const start = chapterOffset(newChapterLengths, chIdx)
    const oldLen = newChapterLengths[chIdx]
    const newLen = entries.length
    merged = [...merged.slice(0, start), ...entries, ...merged.slice(start + oldLen)]
    newChapterLengths[chIdx] = newLen
    console.log(`Merged chapter ${chIdx + 1} (${unitId}): ${oldLen} -> ${newLen} words at offset ${start}`)
  }

  writeJson(combinedPath, merged)
  console.log(`\nWrote ${combinedPath}: ${merged.length} words`)
  console.log(`chapterLengths: [${newChapterLengths.join(', ')}]`)

  let dictTs = fs.readFileSync(dictTsPath, 'utf-8')
  dictTs = dictTs.replace(/(id: 'wang-c5-biscuit'[\s\S]*?length: )\d+/, `$1${merged.length}`)
  dictTs = dictTs.replace(/(id: 'wang-c5-biscuit'[\s\S]*?chapterLengths: )\[([^\]]+)\]/, `$1[${newChapterLengths.join(', ')}]`)
  fs.writeFileSync(dictTsPath, dictTs, 'utf-8')
  console.log('Updated src/resources/dictionary.ts')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
