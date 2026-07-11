import { parseSheetUnit } from './unit-id.mjs'
import XLSX from 'xlsx'

/**
 * @typedef {{ unitId: string, chapter: string, unit: string, label: string, sheetName: string, rows: Array<{ index: number, name: string, trans: string[], usphone: string, ukphone: string }> }} UnitData
 */

/**
 * @param {string} excelPath
 * @param {object} options
 * @returns {UnitData[]}
 */
export function readExcelUnits(excelPath, options = {}) {
  const workbook = XLSX.readFile(excelPath)
  const sheetPattern = options.sheetPattern ?? '*'
  const matcher = globToRegExp(sheetPattern)
  const sheetIdRegex = options.sheetIdRegex ?? '^(?<chapter>\\d+)\\.[\\d.]+-(?<unit>\\d+)$'

  const regexSheets = workbook.SheetNames.filter((name) => {
    if (!matcher.test(name)) return false
    if (options.requireSheetIdMatch !== false) {
      return new RegExp(sheetIdRegex).test(name)
    }
    return true
  })

  const includedSheetNames = []
  for (const item of options.includeSheets ?? []) {
    const name = typeof item === 'string' ? item : item.name
    if (!workbook.SheetNames.includes(name)) continue
    if (regexSheets.includes(name)) continue
    includedSheetNames.push(name)
  }

  const sheets = [...regexSheets, ...includedSheetNames]

  if (sheets.length === 0) {
    throw new Error(`No unit sheets matched (pattern="${sheetPattern}", sheetIdRegex="${sheetIdRegex}") in ${excelPath}`)
  }

  return sheets.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const includeMeta = (options.includeSheets ?? []).find((item) => (typeof item === 'string' ? item : item.name) === sheetName)
    const parsed =
      includeMeta && typeof includeMeta !== 'string'
        ? {
            chapter: String(includeMeta.chapter),
            unit: String(includeMeta.unit),
            unitId: includeMeta.unitId ?? `${includeMeta.chapter}-${String(includeMeta.unit).padStart(2, '0')}`,
            sheetName,
            label: includeMeta.label ?? `第${includeMeta.chapter}章第${Number(includeMeta.unit)}单元`,
          }
        : parseSheetUnit(sheetName, options)
    const rowLayout =
      includeMeta && typeof includeMeta !== 'string' && includeMeta.fixedColumns ? includeMeta.fixedColumns : options.fixedColumns
    const rows = rowLayout ? readFixedColumnRows(sheet, rowLayout) : readNamedColumnRows(sheet, options)

    return { ...parsed, rows }
  })
}

/**
 * Read by 1-based row/column positions (wang 教材格式：第2行起，列1序号/列2单词/列3音标/列4释义)
 * @param {import('xlsx').WorkSheet} sheet
 * @param {{ startRow?: number, seq?: number, name: number, phone?: number, trans: number }} layout
 */
function readFixedColumnRows(sheet, layout) {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const startRow = layout.startRow ?? 2
  const rows = []

  for (let rowIndex = startRow - 1; rowIndex < matrix.length; rowIndex++) {
    const line = matrix[rowIndex]
    if (!Array.isArray(line)) continue

    const seqCol = (layout.seq ?? 1) - 1
    const nameCol = layout.name - 1
    const phoneCol = (layout.phone ?? 3) - 1
    const transCol = layout.trans - 1

    const name = cellToString(line[nameCol])
    if (!name || isHeaderLike(name)) continue

    const seqRaw = cellToString(line[seqCol])
    const index = Number.parseInt(seqRaw, 10) || rows.length + 1
    const phone = cellToString(line[phoneCol])
    const trans = splitTrans(cellToString(line[transCol]))

    rows.push({
      index,
      name,
      trans,
      usphone: phone,
      ukphone: phone,
    })
  }

  return rows
}

function readNamedColumnRows(sheet, options) {
  const nameColumn = options.nameColumn ?? 'name'
  const transColumn = options.transColumn ?? 'trans'
  const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return jsonRows.map((row, index) => rowToEntry(row, index + 1, nameColumn, transColumn)).filter((row) => row.name)
}

function rowToEntry(row, index, nameColumn, transColumn) {
  const name = String(row[nameColumn] ?? row.name ?? row.Name ?? row['词组'] ?? row['英文'] ?? '').trim()
  const transRaw = row[transColumn] ?? row.trans ?? row['中文'] ?? row['释义'] ?? ''
  const trans = splitTrans(transRaw)

  return {
    index,
    name,
    trans,
    usphone: String(row.usphone ?? row.usPhone ?? ''),
    ukphone: String(row.ukphone ?? row.ukPhone ?? ''),
  }
}

function cellToString(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function splitTrans(transRaw) {
  if (Array.isArray(transRaw)) {
    return transRaw.map(String).filter(Boolean)
  }
  return String(transRaw)
    .split(/[;；|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isHeaderLike(name) {
  const lower = name.toLowerCase()
  return ['序号', '单词', '词组', 'name', 'word', '英文'].includes(name) || lower === 'name'
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}
