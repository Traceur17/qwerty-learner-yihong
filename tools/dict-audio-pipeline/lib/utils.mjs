import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function getRepoRoot() {
  // lib/ → dict-audio-pipeline/ → tools/ → repo root
  return path.resolve(__dirname, '..', '..', '..')
}

export function commandExists(command) {
  const checker = process.platform === 'win32' ? 'where' : 'which'
  const result = spawnSync(checker, [command], { stdio: 'pipe', shell: true })
  return result.status === 0
}

export function checkFfmpeg() {
  return commandExists('ffmpeg') && commandExists('ffprobe')
}

export async function checkSttRuntime() {
  try {
    await import('@xenova/transformers')
    return true
  } catch {
    return false
  }
}

export async function checkAllDeps() {
  const ffmpeg = checkFfmpeg()
  const stt = await checkSttRuntime()
  return { ffmpeg, stt, ok: ffmpeg }
}

export function printDepsStatus(status) {
  console.log(`ffmpeg/ffprobe: ${status.ffmpeg ? 'ok' : 'missing (install ffmpeg and add to PATH)'}`)
  console.log(`@xenova/transformers (STT): ${status.stt ? 'ok' : 'optional — skip on Windows if sharp fails; use silence strategy'}`)
  if (!status.ok) {
    console.error('\nRequired dependency missing: ffmpeg')
    process.exitCode = 1
  }
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`, 'utf-8')
}

export function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'clip'
  )
}

export function padUnit(unit) {
  const numeric = String(unit).replace(/\D/g, '')
  return numeric.padStart(2, '0')
}

export function resolveFromManifest(manifestPath, targetPath) {
  if (path.isAbsolute(targetPath)) return targetPath
  return path.resolve(path.dirname(manifestPath), targetPath)
}
