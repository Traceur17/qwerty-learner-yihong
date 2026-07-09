import { runBuild } from './lib/build.mjs'
import { checkFfmpeg } from './lib/utils.mjs'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sampleManifest = path.join(__dirname, 'fixtures', 'sample', 'manifest.yaml')
const sampleExcel = path.join(__dirname, 'fixtures', 'sample', 'vocab.xlsx')

describe('pipeline integration', () => {
  beforeAll(() => {
    if (!fs.existsSync(sampleExcel)) {
      spawnSync(process.execPath, [path.join(__dirname, 'scripts', 'generate-fixtures.mjs')], { stdio: 'inherit' })
    }
  })

  it('builds fixture unit with manual strategy in dry-run', async () => {
    const { report } = await runBuild(sampleManifest, { unitFilter: '01', dryRun: true })
    expect(report.summary.totalUnits).toBe(1)
    expect(report.units[0].status).toBe('success')
    expect(report.units[0].clips).toHaveLength(3)
  })

  it.skipIf(!checkFfmpeg())('builds fixture unit with manual strategy and writes outputs', async () => {
    const { report, registered } = await runBuild(sampleManifest, { unitFilter: '01', dryRun: false })
    expect(report.summary.successCount).toBe(1)
    expect(registered[0].length).toBe(3)
  })
})
