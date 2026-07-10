import { writeJson } from './utils.mjs'
import path from 'node:path'

/**
 * @param {{ manifest: any, unit: any, clips: Array<{ publicPath: string }>, segmentRefs?: Array<object> }} params
 */
export function buildDictEntries({ manifest, unit, clips, segmentRefs }) {
  const accent = manifest.dict.accent ?? 'uk'
  const audioField = accent === 'us' ? 'usAudio' : 'ukAudio'

  return unit.rows.map((row, idx) => {
    const clip = clips[idx]
    const entry = {
      name: row.name,
      trans: row.trans,
      usphone: row.usphone ?? '',
      ukphone: row.ukphone ?? '',
    }
    if (segmentRefs?.[idx]) {
      entry[audioField] = segmentRefs[idx]
    } else {
      entry[audioField] = clip.publicPath
    }
    return entry
  })
}

export function writeUnitDict({ manifest, unit, entries, dryRun = false }) {
  const dictId = `${manifest.dict.id}-unit${unit.unitId}`
  const fileName = `${dictId}.json`
  const outputPath = path.join(manifest.output.dictDir, fileName)
  if (!dryRun) {
    writeJson(outputPath, entries)
  }
  return { dictId, fileName, outputPath, length: entries.length, unitId: unit.unitId, label: unit.label }
}
