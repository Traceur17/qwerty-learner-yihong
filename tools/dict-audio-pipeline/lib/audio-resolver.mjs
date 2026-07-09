import { padUnit, resolveFromManifest } from './utils.mjs'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Legacy pattern resolver: unit{unit:02d}.mp3
 */
export function resolveAudioPath(pattern, unitId, manifestDir) {
  const padded = padUnit(unitId)
  const resolvedPattern = pattern
    .replace(/\{unit:02d\}/g, padded)
    .replace(/\{unit\}/g, unitId)
    .replace(/\{chapter\}/g, unitId.split('-')[0] ?? unitId)
    .replace(/\{unit:\d+d\}/g, padded)

  const audioPath = path.isAbsolute(resolvedPattern) ? resolvedPattern : path.resolve(manifestDir, resolvedPattern)

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found for unit ${unitId}: ${audioPath}`)
  }

  return audioPath
}

function listMp3Files(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.mp3$/i.test(entry.name))
    .map((entry) => entry.name)
}

/**
 * @param {{ chapter: string, unit: string, unitId: string }} unit
 * @param {{ dir?: string, filePattern?: string, chapterDirPattern?: string }} audioConfig
 * @param {string} manifestPath
 * @returns {string | null}
 */
export function resolveAudioByPattern(unit, audioConfig, manifestPath) {
  const manifestDir = path.dirname(manifestPath)
  const fileRegex = new RegExp(audioConfig.filePattern, 'i')
  const unitNumber = Number.parseInt(unit.unit, 10)

  const searchDirs = []
  if (audioConfig.chapterDirPattern && unit.chapter) {
    const chapterDir = audioConfig.chapterDirPattern
      .replace(/\{chapter\}/g, unit.chapter)
      .replace(/\{chapter:02d\}/g, unit.chapter.padStart(2, '0'))
    searchDirs.push(path.isAbsolute(chapterDir) ? chapterDir : path.resolve(manifestDir, chapterDir))
  }

  const baseDir = audioConfig.dir ? (path.isAbsolute(audioConfig.dir) ? audioConfig.dir : path.resolve(manifestDir, audioConfig.dir)) : null
  if (baseDir) searchDirs.push(baseDir)

  if (searchDirs.length === 0) {
    throw new Error('audio.dir is required when using audio.filePattern')
  }

  const tried = []
  for (const dir of searchDirs) {
    tried.push(dir)
    const files = listMp3Files(dir)
    const matched = files.filter((fileName) => {
      const match = fileName.match(fileRegex)
      if (!match?.groups?.unit) return false
      return Number.parseInt(match.groups.unit, 10) === unitNumber
    })

    if (matched.length === 1) {
      return path.join(dir, matched[0])
    }
    if (matched.length > 1) {
      throw new Error(`Multiple audio files match chapter ${unit.chapter} unit ${unit.unit} in ${dir}: ${matched.join(', ')}`)
    }
  }

  return null
}

function formatMissingAudioError(unit, tried) {
  return `No audio found for ${unit.label ?? unit.unitId} (Test ${unit.unit}) in: ${tried.join('; ')}`
}

/**
 * @param {{ chapter: string, unit: string, unitId: string }} unit
 * @param {object} audioConfig
 * @param {string} manifestPath
 */
export function resolveUnitAudio(unit, audioConfig, manifestPath) {
  if (audioConfig.filePattern) {
    const manifestDir = path.dirname(manifestPath)
    const searchDirs = []
    if (audioConfig.chapterDirPattern && unit.chapter) {
      const chapterDir = audioConfig.chapterDirPattern
        .replace(/\{chapter\}/g, unit.chapter)
        .replace(/\{chapter:02d\}/g, unit.chapter.padStart(2, '0'))
      searchDirs.push(path.isAbsolute(chapterDir) ? chapterDir : path.resolve(manifestDir, chapterDir))
    }
    if (audioConfig.dir) {
      searchDirs.push(path.isAbsolute(audioConfig.dir) ? audioConfig.dir : path.resolve(manifestDir, audioConfig.dir))
    }

    const audioPath = resolveAudioByPattern(unit, audioConfig, manifestPath)
    if (audioPath) {
      return { audioPath, audioError: null }
    }
    return { audioPath: null, audioError: formatMissingAudioError(unit, searchDirs) }
  }

  if (!audioConfig.pattern) {
    throw new Error('audio.pattern or audio.filePattern must be configured')
  }

  const manifestDir = path.dirname(manifestPath)
  try {
    const audioPath = resolveAudioPath(
      audioConfig.pattern.replace(/\{chapter\}/g, unit.chapter ?? '').replace(/\{unit\}/g, unit.unit ?? unit.unitId),
      unit.unitId,
      manifestDir,
    )
    return { audioPath, audioError: null }
  } catch (error) {
    return { audioPath: null, audioError: error.message }
  }
}

export function mapUnitsToAudio(units, audioConfig, manifestPath) {
  return units.map((unit) => {
    const { audioPath, audioError } = resolveUnitAudio(unit, audioConfig, manifestPath)
    return { ...unit, audioPath, audioError }
  })
}

/**
 * @param {Array<{ unitId: string, audioPath: string | null, audioError?: string | null }>} units
 * @param {{ skipMissingAudio?: boolean }} audioConfig
 */
export function partitionUnitsByAudio(units, audioConfig = {}) {
  const ready = units.filter((unit) => unit.audioPath)
  const missing = units.filter((unit) => !unit.audioPath)

  if (ready.length === 0) {
    const details = missing.map((unit) => `${unit.unitId}: ${unit.audioError ?? 'missing'}`).join('; ')
    throw new Error(`No units have matching audio files. ${details}`)
  }

  if (missing.length > 0 && !audioConfig.skipMissingAudio) {
    const details = missing.map((unit) => `${unit.unitId}: ${unit.audioError ?? 'missing'}`).join('; ')
    throw new Error(`Missing audio for ${missing.length} unit(s). ${details}`)
  }

  return { ready, missing }
}

/**
 * @param {Array<{ unitId: string, audioPath: string }>} units
 */
export function validateUnitAudioCounts(units) {
  if (units.length === 0) {
    throw new Error('No units found to process')
  }
}
