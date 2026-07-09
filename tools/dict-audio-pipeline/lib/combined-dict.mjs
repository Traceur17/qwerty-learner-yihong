import { writeJson } from './utils.mjs'
import path from 'node:path'

/**
 * @param {{ manifest: any, units: Array<{ unitId: string, label?: string, entries: object[] }> }} params
 */
export function writeCombinedDict({ manifest, units }) {
  const combinedId = manifest.output.combinedDictId ?? manifest.dict.id
  const fileName = `${combinedId}.json`
  const outputPath = path.join(manifest.output.dictDir, fileName)
  const entries = units.flatMap((unit) => unit.entries)
  const chapterLengths = units.map((unit) => unit.entries.length)

  writeJson(outputPath, entries)

  return {
    dictId: combinedId,
    fileName,
    outputPath,
    length: entries.length,
    chapterLengths,
    unitCount: units.length,
  }
}
