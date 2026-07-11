#!/usr/bin/env node

/**
 * Patch wang-c5.xlsx:
 * - 5.3-9: remove "recruiting method"
 * - 5.3-10: move "spinose plants" after "sports shoes"
 */
import { readExcelUnits } from '../lib/excel.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const excelPath = path.join(repoRoot, 'manifests/source/wang-c5.xlsx')

const unitOptions = {
  chapterFilter: '5',
  sheetPattern: '*',
  sheetIdRegex: '^(?<chapter>\\d+)\\.[\\d.]+-(?<unit>\\d+)$',
  requireSheetIdMatch: true,
  fixedColumns: { startRow: 2, seq: 1, name: 2, phone: 3, trans: 4 },
}

function cellName(row) {
  return String(row?.[1] ?? '').trim()
}

function renumberSeq(matrix, fromIndex) {
  let seq = 1
  for (let i = 1; i < matrix.length; i++) {
    const name = cellName(matrix[i])
    if (!name) continue
    if (i >= fromIndex || seq >= fromIndex) {
      matrix[i][0] = seq
    }
    seq++
  }
  // simpler: renumber all data rows from start
  seq = 1
  for (let i = 1; i < matrix.length; i++) {
    const name = cellName(matrix[i])
    if (!name) continue
    matrix[i][0] = seq++
  }
}

function patchSheet9(matrix) {
  const idx = matrix.findIndex((row, i) => i >= 1 && cellName(row) === 'recruiting method')
  if (idx < 0) throw new Error('5.3-9: recruiting method row not found')
  matrix.splice(idx, 1)
  renumberSeq(matrix, 1)
  console.log(`5.3-9: removed recruiting method at row ${idx + 1}`)
}

function patchSheet10(matrix) {
  const spinoseIdx = matrix.findIndex((row, i) => i >= 1 && cellName(row) === 'spinose plants')
  const shoesIdx = matrix.findIndex((row, i) => i >= 1 && cellName(row) === 'sports shoes')
  if (spinoseIdx < 0) throw new Error('5.3-10: spinose plants not found')
  if (shoesIdx < 0) throw new Error('5.3-10: sports shoes not found')

  const [spinoseRow] = matrix.splice(spinoseIdx, 1)
  const shoesIdxAfter = matrix.findIndex((row, i) => i >= 1 && cellName(row) === 'sports shoes')
  matrix.splice(shoesIdxAfter + 1, 0, spinoseRow)
  renumberSeq(matrix, 1)
  console.log(`5.3-10: moved spinose plants to after sports shoes (was row ${spinoseIdx + 1})`)
}

function main() {
  const backupPath = `${excelPath}.bak-${new Date().toISOString().slice(0, 10)}`
  if (!fs.existsSync(excelPath)) throw new Error(`Missing ${excelPath}`)
  fs.copyFileSync(excelPath, backupPath)
  console.log(`Backup: ${backupPath}`)

  const workbook = XLSX.readFile(excelPath)
  const sheet9 = XLSX.utils.sheet_to_json(workbook.Sheets['5.3-9'], { header: 1, defval: '' })
  const sheet10 = XLSX.utils.sheet_to_json(workbook.Sheets['5.3-10'], { header: 1, defval: '' })

  patchSheet9(sheet9)
  patchSheet10(sheet10)

  workbook.Sheets['5.3-9'] = XLSX.utils.aoa_to_sheet(sheet9)
  workbook.Sheets['5.3-10'] = XLSX.utils.aoa_to_sheet(sheet10)

  const outPath = excelPath
  const altPath = excelPath.replace(/\.xlsx$/i, '-patched.xlsx')
  try {
    XLSX.writeFile(workbook, outPath)
    console.log(`Saved: ${outPath}`)
  } catch (error) {
    if (error?.code !== 'EBUSY') throw error
    XLSX.writeFile(workbook, altPath)
    console.warn(`Original locked (close Excel). Saved: ${altPath}`)
    console.warn('Build will use -patched.xlsx via WANG_C5_EXCEL env or manifest override.')
  }

  const readPath = fs.existsSync(outPath) ? outPath : altPath
  const units = readExcelUnits(readPath, unitOptions)
  const u9 = units.find((u) => u.unitId === '5-09')
  const u10 = units.find((u) => u.unitId === '5-10')
  console.log(`Verify 5-09: ${u9?.rows.length} rows, recruiting@${u9?.rows.findIndex((r) => r.name === 'recruiting method') + 1}`)
  const names10 = u10?.rows.map((r) => r.name) ?? []
  console.log(
    `Verify 5-10: ${names10.length} rows, spinose@${names10.indexOf('spinose plants') + 1}, shoes@${names10.indexOf('sports shoes') + 1}`,
  )
  console.log('5.3-10 order 39-49:', names10.slice(38, 49).join(' | '))
}

main()
