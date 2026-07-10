import { clipsToSegmentRefs, mergeExistingUnitDir } from '../lib/merge-unit-audio.mjs'
import { readJson, writeJson } from '../lib/utils.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')

const audioDir = path.join(repoRoot, 'public/audio/wang-c5-audio')
const dictPath = path.join(repoRoot, 'public/dicts/wang-c5-biscuit.json')
const audioPublicId = 'wang-c5-audio'

const chapterLengths = [114, 111, 114, 105, 100, 108, 130, 144, 139, 142, 127]
const unitIds = chapterLengths.map((_, i) => `5-${String(i + 1).padStart(2, '0')}`)

async function main() {
  const dict = readJson(dictPath)
  let offset = 0

  for (let chapterIdx = 0; chapterIdx < unitIds.length; chapterIdx++) {
    const unitId = unitIds[chapterIdx]
    const len = chapterLengths[chapterIdx]
    const unitFolderName = `unit${unitId}`

    console.log(`\n=== Merging ${unitFolderName} (${len} words) ===`)
    const { segments } = await mergeExistingUnitDir({
      unitId,
      outputAudioDir: audioDir,
      audioPublicId,
      cleanupClips: true,
    })

    const chapterEntries = dict.slice(offset, offset + len)
    for (let i = 0; i < chapterEntries.length; i++) {
      const oldAudio = chapterEntries[i].ukAudio
      let key = null
      if (typeof oldAudio === 'string') {
        key = path.basename(oldAudio, '.mp3')
      } else {
        key = `${String(i + 1).padStart(3, '0')}`
      }

      const range = segments[key]
      if (!range) {
        console.warn(`  Missing segment for key ${key} (${chapterEntries[i].name})`)
        continue
      }

      chapterEntries[i].ukAudio = {
        unit: unitFolderName,
        base: audioPublicId,
        start: range.start,
        end: range.end,
      }
    }

    offset += len
    console.log(`  OK: ${unitFolderName}.mp3`)
  }

  writeJson(dictPath, dict)
  console.log(`\nWrote ${dictPath} (${dict.length} words)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
