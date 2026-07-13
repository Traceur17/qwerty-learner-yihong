/**
 * 仅重切某单元词条 MP3，不改写 combined dict JSON（避免 --unit 局部 build 覆盖整库）。
 *
 * Usage:
 *   node tools/dict-audio-pipeline/scripts/recut-unit-audio-only.mjs manifests/wang-c4-audio.yaml 4-04
 */
import { mapUnitsToAudio, partitionUnitsByAudio } from '../lib/audio-resolver.mjs'
import { cutSegmentsToFiles } from '../lib/cutter.mjs'
import { readExcelUnits } from '../lib/excel.mjs'
import { loadManifest, resolveSegmentationForUnit } from '../lib/manifest.mjs'
import { applyExcludeWords } from '../lib/segment-align.mjs'
import { findManualCsv, segmentUnit } from '../lib/strategies/index.mjs'
import { filterUnitsByChapter, unitMatchesFilter } from '../lib/unit-id.mjs'

async function main() {
  const [, , manifestPath, unitFilter] = process.argv
  if (!manifestPath || !unitFilter) {
    console.error('Usage: node recut-unit-audio-only.mjs <manifest.yaml> <unitFilter>')
    process.exitCode = 1
    return
  }

  const manifest = loadManifest(manifestPath)
  const units = readExcelUnits(manifest.units.excel, manifest.units)
  const chapterScoped = filterUnitsByChapter(units, manifest.units.chapterFilter)
  const filtered = chapterScoped.filter((unit) => unitMatchesFilter(unit, unitFilter))
  if (filtered.length === 0) {
    throw new Error(`No units matched filter: ${unitFilter}`)
  }

  const mapped = mapUnitsToAudio(filtered, manifest.audio, manifest.manifestPath)
  const { ready } = partitionUnitsByAudio(mapped, manifest.audio)

  for (const unit of ready) {
    const manualCsv = findManualCsv(manifest.audio.manualDir, unit.unitId)
    const segmentation = resolveSegmentationForUnit(manifest, unit)
    unit.rows = applyExcludeWords(unit.rows, segmentation.excludeWords)
    const segments = await segmentUnit({
      audioPath: unit.audioPath,
      rows: unit.rows,
      segmentation,
      manualCsv,
    })

    const clips = await cutSegmentsToFiles({
      audioPath: unit.audioPath,
      unitId: unit.unitId,
      segments,
      outputAudioDir: manifest.output.audioDir,
      paddingMs: segmentation.paddingMs,
      trimSilence: segmentation.trimSilence === true,
    })

    console.log(`Recut unit${unit.unitId}: ${clips.length} clips → ${manifest.output.audioDir}/unit${unit.unitId}`)
    for (const clip of clips.slice(0, 5)) {
      console.log(`  ${clip.filename}  ${clip.start.toFixed(3)}-${clip.end.toFixed(3)}`)
    }
    if (clips.length > 5) console.log(`  ... +${clips.length - 5} more`)
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
