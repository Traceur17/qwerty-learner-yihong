import { ensureDir, writeJson } from './utils.mjs'
import fs from 'node:fs'
import path from 'node:path'

export function createBuildReport({ manifest, results, startedAt }) {
  const successCount = results.filter((item) => item.status === 'success').length
  const failedCount = results.filter((item) => item.status === 'failed').length
  const skippedCount = results.filter((item) => item.status === 'skipped').length
  return {
    dictId: manifest.dict.id,
    manifestPath: manifest.manifestPath,
    startedAt,
    finishedAt: new Date().toISOString(),
    summary: {
      totalUnits: results.length,
      successCount,
      failedCount,
      skippedCount,
    },
    units: results,
  }
}

export function writeBuildReports(report, reportDir) {
  ensureDir(reportDir)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = path.join(reportDir, `build-report-${stamp}.json`)
  const htmlPath = path.join(reportDir, `build-report-${stamp}.html`)
  writeJson(jsonPath, report)
  fs.writeFileSync(htmlPath, renderHtmlReport(report), 'utf-8')
  return { jsonPath, htmlPath }
}

function renderHtmlReport(report) {
  const sections = report.units.map((unit) => renderUnitSection(unit)).join('\n')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>Dict Audio Build Report — ${escapeHtml(report.dictId)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 1.4rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; }
    .meta { color: #555; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; vertical-align: middle; }
    th { background: #f5f5f5; text-align: left; white-space: nowrap; }
    tr:nth-child(even) { background: #fafafa; }
    .idx { width: 48px; text-align: center; color: #666; }
    .name { font-weight: 600; min-width: 180px; }
    .trans { color: #444; min-width: 120px; }
    .dur { width: 72px; text-align: center; color: #666; }
    audio { width: 280px; height: 32px; }
    .status-ok { color: #0a7; }
    .status-skip { color: #a70; }
    .status-fail { color: #c33; }
    .empty { color: #999; font-style: italic; }
  </style>
</head>
<body>
  <h1>Build Report: ${escapeHtml(report.dictId)}</h1>
  <p class="meta">Success: ${report.summary.successCount} / ${report.summary.totalUnits}</p>
  ${sections}
</body>
</html>`
}

function renderUnitSection(unit) {
  const statusClass = unit.status === 'success' ? 'status-ok' : unit.status === 'skipped' ? 'status-skip' : 'status-fail'
  const rowCount = unit.rows?.length ?? 0
  const clipCount = unit.clips?.length ?? 0
  const pairs = buildPairs(unit)

  const tableRows = pairs
    .map(
      (pair) => `<tr>
  <td class="idx">${pair.index}</td>
  <td class="name">${escapeHtml(pair.name)}</td>
  <td class="trans">${escapeHtml(pair.trans)}</td>
  <td class="dur">${pair.duration}</td>
  <td>${pair.audioHtml}</td>
</tr>`,
    )
    .join('\n')

  return `<section>
  <h2>Unit ${escapeHtml(unit.unitId)} <span class="${statusClass}">(${escapeHtml(unit.status)})</span></h2>
  <p class="meta">Sheet: ${escapeHtml(unit.sheetName ?? '')} · Strategy: ${escapeHtml(
    unit.strategy ?? '',
  )} · Rows: ${rowCount} · Clips: ${clipCount}</p>
  <p>${escapeHtml(unit.message ?? '')}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>词组 (Excel)</th>
        <th>释义</th>
        <th>时长</th>
        <th>音频</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="5" class="empty">无数据</td></tr>'}
    </tbody>
  </table>
</section>`
}

function buildPairs(unit) {
  const rows = unit.rows ?? []
  const clips = unit.clips ?? []
  const count = Math.max(rows.length, clips.length)

  return Array.from({ length: count }, (_, idx) => {
    const row = rows[idx]
    const clip = clips[idx] ?? clips.find((item) => item.index === idx + 1)
    const audioPath = clip?.outputPath?.replace(/\\/g, '/')
    const audioHtml = audioPath ? `<audio controls preload="none" src="file:///${audioPath}"></audio>` : '<span class="empty">—</span>'

    return {
      index: idx + 1,
      name: row?.name ?? clip?.expectedName ?? clip?.text ?? '—',
      trans: (row?.trans ?? []).join(' / ') || clip?.trans || '—',
      duration: clip?.durationSec != null ? `${clip.durationSec}s` : clip ? `${Number((clip.end - clip.start).toFixed(2))}s` : '—',
      audioHtml,
    }
  })
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
