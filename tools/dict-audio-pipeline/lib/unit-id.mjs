/**
 * Parse Excel sheet name like "5.3-1" → chapter 5, unit 1
 * @param {string} sheetName
 * @param {{ sheetIdRegex?: string }} options
 */
export function parseSheetUnit(sheetName, options = {}) {
  const sheetIdRegex = options.sheetIdRegex ?? '^(?<chapter>\\d+)\\.[\\d.]+-(?<unit>\\d+)$'
  const match = sheetName.match(new RegExp(sheetIdRegex))
  if (match?.groups?.chapter && match?.groups?.unit) {
    const chapter = String(match.groups.chapter)
    const unit = String(match.groups.unit)
    return {
      chapter,
      unit,
      unitId: `${chapter}-${unit.padStart(2, '0')}`,
      sheetName,
      label: `第${chapter}章第${Number(unit)}单元`,
    }
  }

  const fallback = sheetName.match(/(\d+)/)
  const index = fallback ? fallback[1].padStart(2, '0') : '01'
  return {
    chapter: '',
    unit: index,
    unitId: index,
    sheetName,
    label: `unit${index}`,
  }
}

/**
 * @param {string | undefined} filter
 * - "5" → 第5章全部单元
 * - "5-1" / "5-01" → 第5章第1单元
 * @returns {{ type: 'chapter', chapter: string } | { type: 'unit', unitId: string } | null}
 */
export function parseUnitFilter(filter) {
  if (!filter) return null
  const trimmed = filter.trim()
  const chapterUnit = trimmed.match(/^(\d+)\s*[-_]\s*(\d+)$/)
  if (chapterUnit) {
    return {
      type: 'unit',
      unitId: `${chapterUnit[1]}-${chapterUnit[2].padStart(2, '0')}`,
    }
  }
  if (/^\d+$/.test(trimmed)) {
    return { type: 'chapter', chapter: trimmed }
  }
  return { type: 'unit', unitId: trimmed }
}

/**
 * @param {string | undefined} filter
 * @returns {string | null} exact unitId for legacy callers
 */
export function normalizeUnitFilter(filter) {
  const parsed = parseUnitFilter(filter)
  if (!parsed) return null
  return parsed.type === 'unit' ? parsed.unitId : null
}

export function unitMatchesFilter(unit, filter) {
  const parsed = parseUnitFilter(filter)
  if (!parsed) return true
  if (parsed.type === 'chapter') {
    return unit.chapter === parsed.chapter
  }
  return unit.unitId === parsed.unitId
}

export function filterUnitsByChapter(units, chapterFilter) {
  if (!chapterFilter) return units
  const chapters = Array.isArray(chapterFilter) ? chapterFilter.map(String) : [String(chapterFilter)]
  return units.filter((unit) => chapters.includes(unit.chapter))
}
