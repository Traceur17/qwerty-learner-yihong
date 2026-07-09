#!/usr/bin/env node
import { runBuild } from './lib/build.mjs'
import { checkAllDeps, printDepsStatus } from './lib/utils.mjs'

function printUsage() {
  console.log(`Usage:
  node tools/dict-audio-pipeline/index.mjs check-deps
  node tools/dict-audio-pipeline/index.mjs build <manifest.yaml> [--unit 5] [--unit 5-1] [--dry-run]
`)
}

function parseArgs(argv) {
  const [command, manifestPath, ...rest] = argv
  const options = { dryRun: false }
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--dry-run') options.dryRun = true
    if (rest[i] === '--unit') options.unitFilter = rest[i + 1]
  }
  return { command, manifestPath, options }
}

async function main() {
  const { command, manifestPath, options } = parseArgs(process.argv.slice(2))

  if (!command || command === '--help' || command === '-h') {
    printUsage()
    return
  }

  if (command === 'check-deps') {
    const status = await checkAllDeps()
    printDepsStatus(status)
    return
  }

  if (command !== 'build') {
    console.error(`Unknown command: ${command}`)
    printUsage()
    process.exitCode = 1
    return
  }

  if (!manifestPath) {
    console.error('Missing manifest path')
    printUsage()
    process.exitCode = 1
    return
  }

  const deps = await checkAllDeps()
  if (!deps.ok) {
    printDepsStatus(deps)
    return
  }

  const { report, reportPaths } = await runBuild(manifestPath, options)
  console.log(`Build finished: ${report.summary.successCount}/${report.summary.totalUnits} units succeeded`)
  if (report.summary.skippedCount > 0) {
    console.log(`Skipped (no audio): ${report.summary.skippedCount}`)
  }
  console.log(`Report JSON: ${reportPaths.jsonPath}`)
  console.log(`Report HTML: ${reportPaths.htmlPath}`)

  if (report.summary.failedCount > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
