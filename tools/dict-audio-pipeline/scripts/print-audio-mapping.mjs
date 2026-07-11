/**
 * Print Excel sheet ↔ audio file mapping for IELTS-wang manifests.
 *
 * Usage: node tools/dict-audio-pipeline/scripts/print-audio-mapping.mjs [3|4|5|all]
 */
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const root = process.cwd()
const excelPath = path.join(root, 'manifests/source/IETS-wang.xlsx')
const sheetIdRegex = /^(?<chapter>\d+)\.[\d.]+-(?<unit>\d+)$/

const chapterConfigs = {
  3: {
    audioDir: path.join(root, 'manifests/source/audio/C3'),
    filePattern: /^(?<order>\d+)\s+Test\s+(?<unit>\d+)-.+\.mp3$/i,
    introSec: (unit) => (unit === 1 ? 47 : 22),
  },
  4: {
    audioDir: path.join(root, 'manifests/source/audio/C4'),
    filePattern: /^(?<order>\d+)\s+.+?\s+Test\s+(?<unit>\d+)-.+\.mp3$/i,
    introSec: (unit) => (unit === 1 ? 54 : 22),
  },
  5: {
    audioDir: path.join(root, 'manifests/source/audio/C5'),
    filePattern: /^(?<order>\d+)\s+Test\s+(?<unit>\d+)-.+\.mp3$/i,
    introSec: (unit) => (unit === 1 ? 40 : 12),
  },
}

function listMp3(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /\.mp3$/i.test(f))
    .sort()
}

function matchAudio(files, unitNum, pattern) {
  return files.filter((fileName) => {
    const match = fileName.match(pattern)
    if (!match?.groups?.unit) return false
    return Number.parseInt(match.groups.unit, 10) === unitNum
  })
}

function printChapter(chapter, workbook) {
  const cfg = chapterConfigs[chapter]
  const files = listMp3(cfg.audioDir)
  const sheets = workbook.SheetNames.filter((name) => {
    const match = name.match(sheetIdRegex)
    return match?.groups?.chapter === chapter
  }).sort((a, b) => {
    const ua = Number.parseInt(a.match(sheetIdRegex).groups.unit, 10)
    const ub = Number.parseInt(b.match(sheetIdRegex).groups.unit, 10)
    return ua - ub
  })

  console.log(`\n## C${chapter}  (音频目录: manifests/source/audio/C${chapter})`)
  console.log('| Test | Excel Sheet | unitId | 词数 | 音频文件 | 介绍时长 | 状态 |')
  console.log('|------|-------------|--------|------|----------|----------|------|')

  const used = new Set()
  for (const sheetName of sheets) {
    const { unit } = sheetName.match(sheetIdRegex).groups
    const unitNum = Number.parseInt(unit, 10)
    const unitId = `${chapter}-${unit.padStart(2, '0')}`
    const matched = matchAudio(files, unitNum, cfg.filePattern)
    matched.forEach((f) => used.add(f))

    const sheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    let wordCount = 0
    for (let i = 1; i < matrix.length; i++) {
      const name = String(matrix[i][1] ?? '').trim()
      if (name && !/单词|word/i.test(name)) wordCount++
    }

    const audio = matched.length === 1 ? matched[0] : matched.length === 0 ? '—' : matched.join(' / ')
    const status = matched.length === 1 ? '✅' : matched.length === 0 ? '❌ 缺音频' : '⚠️ 多个匹配'
    console.log(`| ${unitNum} | ${sheetName} | ${unitId} | ${wordCount} | ${audio} | ${cfg.introSec(unitNum)}s | ${status} |`)
  }

  const orphan = files.filter((f) => !used.has(f))
  if (orphan.length) {
    console.log('\n未匹配到 Sheet 的音频:')
    for (const file of orphan) console.log(`- ${file}`)
  }
}

const arg = process.argv[2] ?? 'all'
const workbook = XLSX.readFile(excelPath)
const chapters = arg === 'all' ? ['3', '4', '5'] : [arg]
console.log(`Excel: manifests/source/IETS-wang.xlsx`)
for (const chapter of chapters) {
  printChapter(chapter, workbook)
}
