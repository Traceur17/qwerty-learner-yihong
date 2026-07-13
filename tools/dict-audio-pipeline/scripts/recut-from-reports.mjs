/**
 * 按历史 build report 的起止时间，从源音频重新 HQ 裁切（不改词库 JSON）。
 * 用于修复 Git 把 MP3 当文本提交导致的二进制损坏。
 *
 * Usage:
 *   node tools/dict-audio-pipeline/scripts/recut-from-reports.mjs
 */
import { mapUnitsToAudio, partitionUnitsByAudio } from '../lib/audio-resolver.mjs'
import { cutSegmentsToFiles } from '../lib/cutter.mjs'
import { readExcelUnits } from '../lib/excel.mjs'
import { loadManifest, resolveSegmentationForUnit } from '../lib/manifest.mjs'
import { filterUnitsByChapter } from '../lib/unit-id.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

/** @type {Array<{ manifest: string, reports: string[], unitIds?: string[] }>} */
const JOBS = [
  {
    manifest: 'manifests/wang-c3-audio.yaml',
    reports: ['output/reports/build-report-2026-07-10T14-09-53-556Z.json'],
  },
  {
    manifest: 'manifests/wang-c4-audio.yaml',
    reports: ['output/reports/build-report-2026-07-10T14-11-28-571Z.json'],
  },
  {
    manifest: 'manifests/wang-c5-audio.yaml',
    reports: ['output/reports/build-report-2026-07-09T13-21-35-846Z.json', 'output/reports/build-report-2026-07-10T14-12-54-793Z.json'],
  },
  {
    manifest: 'manifests/wang-c11-audio.yaml',
    reports: ['output/reports/build-report-2026-07-10T14-27-36-919Z.json', 'output/reports/build-report-2026-07-12T09-22-24-407Z.json'],
    // 10T14-27 的 11-04 是旧 916 词表；以 12 号报告的 595 为准覆盖
    preferLaterUnitIds: ['11-04'],
  },
]

function loadReportUnits(reportRel) {
  const full = path.join(ROOT, reportRel)
  const report = JSON.parse(fs.readFileSync(full, 'utf8'))
  return (report.units || []).filter((u) => (u.clips || []).length > 0)
}

async function recutJob(job) {
  const manifestPath = path.join(ROOT, job.manifest)
  const manifest = loadManifest(manifestPath)
  const excelUnits = readExcelUnits(manifest.units.excel, manifest.units)
  const chapterScoped = filterUnitsByChapter(excelUnits, manifest.units.chapterFilter)
  const mapped = mapUnitsToAudio(chapterScoped, manifest.audio, manifest.manifestPath)
  const { ready } = partitionUnitsByAudio(mapped, manifest.audio)
  const audioByUnitId = new Map(ready.map((u) => [u.unitId, u.audioPath]))

  /** @type {Map<string, any>} */
  const unitClips = new Map()
  for (const reportRel of job.reports) {
    for (const unit of loadReportUnits(reportRel)) {
      const prefer = job.preferLaterUnitIds?.includes(unit.unitId)
      if (unitClips.has(unit.unitId) && !prefer) continue
      unitClips.set(unit.unitId, unit)
    }
  }

  let total = 0
  for (const [unitId, unit] of unitClips) {
    const audioPath = audioByUnitId.get(unitId)
    if (!audioPath) {
      console.warn(`SKIP ${unitId}: no source audio`)
      continue
    }
    const excelUnit = ready.find((u) => u.unitId === unitId)
    const segmentation = resolveSegmentationForUnit(
      manifest,
      excelUnit || { unitId, chapter: unitId.split('-')[0], unit: unitId.split('-')[1] },
    )
    const segments = unit.clips.map((c) => ({
      index: c.index,
      start: c.start,
      end: c.end,
      text: c.text || c.expectedName,
      strategy: c.strategy || 'report',
    }))

    console.log(`Recutting ${manifest.dict?.id || job.manifest} unit${unitId}: ${segments.length} clips from ${path.basename(audioPath)}`)
    const clips = await cutSegmentsToFiles({
      audioPath,
      unitId,
      segments,
      outputAudioDir: manifest.output.audioDir,
      paddingMs: segmentation.paddingMs,
      trimSilence: segmentation.trimSilence === true,
    })
    total += clips.length
    console.log(`  → ${clips.length} files`)
  }
  return total
}

async function main() {
  let grand = 0
  for (const job of JOBS) {
    grand += await recutJob(job)
  }
  console.log(`Done. Recut ${grand} clips total.`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
