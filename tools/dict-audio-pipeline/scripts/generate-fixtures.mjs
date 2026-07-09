import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtureDir = path.join(__dirname, '..', 'fixtures', 'sample')

fs.mkdirSync(path.join(fixtureDir, 'audio'), { recursive: true })
fs.mkdirSync(path.join(fixtureDir, 'manual'), { recursive: true })

const rows = [
  { name: 'alpha', trans: '阿尔法' },
  { name: 'beta', trans: '贝塔' },
  { name: 'gamma', trans: '伽马' },
]

const sheet = XLSX.utils.json_to_sheet(rows)
const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, sheet, 'Unit01')
XLSX.writeFile(workbook, path.join(fixtureDir, 'vocab.xlsx'))

const manualCsv = `index,start,end,text
1,0.0,1.0,alpha
2,1.2,2.2,beta
3,2.4,3.4,gamma
`
fs.writeFileSync(path.join(fixtureDir, 'manual', 'unit01.csv'), manualCsv, 'utf-8')

const audioPath = path.join(fixtureDir, 'audio', 'unit01.mp3')
const wangAudioPath = path.join(fixtureDir, 'audio', '01 Test 1-fixture.mp3')
const ffmpeg = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '4', '-q:a', '9', audioPath], {
  stdio: 'ignore',
  shell: true,
})

if (ffmpeg.status !== 0) {
  console.warn('ffmpeg not available; fixture audio not generated')
  const placeholder = Buffer.alloc(128, 0)
  fs.writeFileSync(audioPath, placeholder)
  fs.writeFileSync(wangAudioPath, placeholder)
} else {
  console.log(`Generated fixture audio: ${audioPath}`)
  fs.copyFileSync(audioPath, wangAudioPath)
}

console.log('Fixture files ready in tools/dict-audio-pipeline/fixtures/sample')
