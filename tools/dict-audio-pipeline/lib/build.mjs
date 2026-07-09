import { mapUnitsToAudio, partitionUnitsByAudio } from './audio-resolver.mjs'
import { writeCombinedDict } from './combined-dict.mjs'
import { cutSegmentsToFiles } from './cutter.mjs'
import { readExcelUnits } from './excel.mjs'
import { loadManifest, resolveSegmentationForUnit } from './manifest.mjs'
import { registerDictionaryEntries } from './register-dict.mjs'
import { createBuildReport, writeBuildReports } from './report.mjs'
import { findManualCsv } from './strategies/index.mjs'
import { segmentUnit } from './strategies/index.mjs'
import { unitMatchesFilter, filterUnitsByChapter } from './unit-id.mjs'
import { getRepoRoot } from './utils.mjs'
import { validateUnit } from './validator.mjs'
import { buildDictEntries, writeUnitDict } from './writer.mjs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

/**
 * @param {string} manifestPath
 * @param {{ unitFilter?: string, dryRun?: boolean }} options
 */
export async function runBuild(manifestPath, options = {}) {
  const manifest = loadManifest(manifestPath)
  const startedAt = new Date().toISOString()
  const units = readExcelUnits(manifest.units.excel, manifest.units)
  const chapterScoped = filterUnitsByChapter(units, manifest.units.chapterFilter)
  const filteredUnits = options.unitFilter ? chapterScoped.filter((unit) => unitMatchesFilter(unit, options.unitFilter)) : chapterScoped

  if (filteredUnits.length === 0) {
    const scope = manifest.units.chapterFilter ? `chapter ${manifest.units.chapterFilter}, ` : ''
    throw new Error(
      `No units matched ${scope}filter: ${options.unitFilter ?? '(none)'} (use 5 for chapter 5 all units, 5-1 for chapter 5 unit 1)`,
    )
  }

  const mappedUnits = mapUnitsToAudio(filteredUnits, manifest.audio, manifest.manifestPath)
  const { ready: unitsToBuild, missing: skippedAudioUnits } = partitionUnitsByAudio(mappedUnits, manifest.audio)

  if (skippedAudioUnits.length > 0) {
    console.warn(`Skipping ${skippedAudioUnits.length} unit(s) without audio: ${skippedAudioUnits.map((unit) => unit.unitId).join(', ')}`)
  }

  const results = skippedAudioUnits.map((unit) => ({
    unitId: unit.unitId,
    sheetName: unit.sheetName,
    status: 'skipped',
    message: unit.audioError ?? 'No matching audio file',
    rows: unit.rows,
  }))
  const registered = []

  const audioPublicId = path.basename(manifest.output.audioDir)

  for (const unit of unitsToBuild) {
    const manualCsv = findManualCsv(manifest.audio.manualDir, unit.unitId)
    const segmentation = resolveSegmentationForUnit(manifest, unit)
    try {
      const segments = await segmentUnit({
        audioPath: unit.audioPath,
        rows: unit.rows,
        segmentation,
        manualCsv,
      })

      const clips = options.dryRun
        ? segments.map((segment, idx) => ({
            ...segment,
            durationSec: Number((segment.end - segment.start).toFixed(2)),
            outputPath: path.join(manifest.output.audioDir, `unit${unit.unitId}`, `${String(idx + 1).padStart(3, '0')}.mp3`),
            publicPath: `/audio/${audioPublicId}/unit${unit.unitId}/${String(idx + 1).padStart(3, '0')}.mp3`,
          }))
        : await cutSegmentsToFiles({
            audioPath: unit.audioPath,
            unitId: unit.unitId,
            segments,
            outputAudioDir: manifest.output.audioDir,
            paddingMs: segmentation.paddingMs,
            trimSilence: segmentation.trimSilence === true,
          })

      const clipsWithMeta = clips.map((clip, idx) => ({
        ...clip,
        expectedName: unit.rows[idx]?.name ?? clip.text,
        trans: (unit.rows[idx]?.trans ?? []).join(' / '),
      }))

      const validation = await validateUnit({
        rows: unit.rows,
        segments: clipsWithMeta,
        validation: manifest.validation,
        segmentation,
      })

      if (!validation.ok) {
        const message = validation.issues.map((issue) => issue.message).join('; ')
        if (manifest.validation.failOnMismatch) {
          results.push({
            unitId: unit.unitId,
            sheetName: unit.sheetName,
            status: 'failed',
            strategy: segments[0]?.strategy,
            message,
            issues: validation.issues,
            rows: unit.rows,
            clips: clipsWithMeta,
          })
          continue
        }
      }

      const entries = buildDictEntries({ manifest, unit, clips: clipsWithMeta })
      const dictMeta =
        manifest.output.combinedDict && !manifest.output.perUnitDict
          ? { dictId: null, fileName: null, outputPath: null, length: entries.length, unitId: unit.unitId, label: unit.label, entries }
          : writeUnitDict({ manifest, unit, entries, dryRun: options.dryRun })

      if (manifest.output.combinedDict && !manifest.output.perUnitDict) {
        // defer single combined dict registration
      } else {
        registered.push(dictMeta)
      }

      results.push({
        unitId: unit.unitId,
        sheetName: unit.sheetName,
        status: 'success',
        strategy: segments[0]?.strategy,
        message:
          manifest.output.combinedDict && !manifest.output.perUnitDict
            ? `Built ${entries.length} entries`
            : `Wrote ${entries.length} entries`,
        dictMeta: dictMeta.dictId ? dictMeta : undefined,
        entries: manifest.output.combinedDict ? entries : undefined,
        rows: unit.rows,
        clips: clipsWithMeta,
      })
    } catch (error) {
      results.push({
        unitId: unit.unitId,
        sheetName: unit.sheetName,
        status: 'failed',
        message: error.message,
        rows: unit.rows,
      })
    }
  }

  const report = createBuildReport({ manifest, results, startedAt })
  const reportPaths = writeBuildReports(report, manifest.output.reportDir)

  const successfulUnits = results.filter((item) => item.status === 'success' && item.entries?.length)
  let combinedMeta = null

  if (manifest.output.combinedDict && successfulUnits.length > 0 && !options.dryRun) {
    combinedMeta = writeCombinedDict({
      manifest,
      units: successfulUnits.map((item) => ({
        unitId: item.unitId,
        label: item.sheetName,
        entries: item.entries,
      })),
    })
    registered.length = 0
    registered.push(combinedMeta)
  }

  if (manifest.output.registerDictionary && !options.dryRun && registered.length > 0) {
    registerDictionaryEntries({ manifest, unitResults: registered, combinedMeta })
    updateDictSizes()
  }

  return { report, reportPaths, registered, combinedMeta }
}

function updateDictSizes() {
  const scriptPath = path.join(getRepoRoot(), 'scripts', 'update-dict-size.js')
  spawnSync(process.execPath, [scriptPath], { stdio: 'inherit' })
}
