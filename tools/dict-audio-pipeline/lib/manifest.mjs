import { resolveFromManifest } from './utils.mjs'
import yaml from 'js-yaml'
import fs from 'node:fs'

const REQUIRED_DICT_FIELDS = ['id', 'name', 'language']
const REQUIRED_UNIT_FIELDS = ['excel']
const REQUIRED_AUDIO_FIELDS = []
const REQUIRED_OUTPUT_FIELDS = ['audioDir', 'dictDir']

/**
 * @typedef {Object} Manifest
 * @property {{ id: string, name: string, description?: string, category?: string, tags?: string[], language: string, languageCategory?: string, accent?: 'uk'|'us', defaultPronIndex?: number }} dict
 * @property {{ excel: string, sheetPattern?: string, nameColumn?: string, transColumn?: string }} units
 * @property {{ pattern: string, manualDir?: string }} audio
 * @property {{ strategy?: string, fallback?: string[], whisper?: { model?: string }, silence?: { noiseDb?: number, minSilenceSec?: number }, fixed?: { skipIntroSec?: number, intervalSec?: number, phraseDurationSec?: number }, paddingMs?: number }} segmentation
 * @property {{ minSimilarity?: number, failOnMismatch?: boolean, minDurationSec?: number, maxDurationSec?: number, verifyTranscript?: boolean }} validation
 * @property {{ audioDir: string, dictDir: string, registerDictionary?: boolean, reportDir?: string }} output
 */

/**
 * @param {string} manifestPath
 * @returns {Manifest}
 */
export function loadManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`)
  }

  const raw = yaml.load(fs.readFileSync(manifestPath, 'utf-8'))
  if (!raw || typeof raw !== 'object') {
    throw new Error('Manifest must be a YAML object')
  }

  validateManifest(raw, manifestPath)
  return normalizeManifest(raw, manifestPath)
}

function validateManifest(raw, manifestPath) {
  const errors = []

  if (!raw.dict || typeof raw.dict !== 'object') {
    errors.push('dict section is required')
  } else {
    for (const field of REQUIRED_DICT_FIELDS) {
      if (!raw.dict[field]) errors.push(`dict.${field} is required`)
    }
  }

  if (!raw.units || typeof raw.units !== 'object') {
    errors.push('units section is required')
  } else {
    for (const field of REQUIRED_UNIT_FIELDS) {
      if (!raw.units[field]) errors.push(`units.${field} is required`)
    }
  }

  if (!raw.audio || typeof raw.audio !== 'object') {
    errors.push('audio section is required')
  } else if (!raw.audio.pattern && !raw.audio.filePattern) {
    errors.push('audio.pattern or audio.filePattern is required')
  } else if (raw.audio.filePattern && !raw.audio.dir && !raw.audio.chapterDirPattern) {
    errors.push('audio.dir or audio.chapterDirPattern is required when using audio.filePattern')
  }

  if (!raw.output || typeof raw.output !== 'object') {
    errors.push('output section is required')
  } else {
    for (const field of REQUIRED_OUTPUT_FIELDS) {
      if (!raw.output[field]) errors.push(`output.${field} is required`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid manifest ${manifestPath}:\n- ${errors.join('\n- ')}`)
  }
}

function deepMerge(base, override) {
  if (!override) return base
  const result = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], value)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * @param {ReturnType<typeof normalizeManifest>} manifest
 * @param {{ unitId: string, chapter?: string, unit?: string }} unit
 */
export function resolveSegmentationForUnit(manifest, unit) {
  const base = manifest.segmentation
  const overrides = base.unitOverrides ?? {}
  const unitKey = unit.unitId
  const shortKey = unit.chapter && unit.unit ? `${unit.chapter}-${Number(unit.unit)}` : null
  const unitOverride = overrides[unitKey] ?? (shortKey ? overrides[shortKey] : undefined) ?? overrides[unit.unit ?? '']

  if (!unitOverride) {
    const { unitOverrides: _ignored, ...segmentation } = base
    return segmentation
  }

  const merged = deepMerge(base, unitOverride)
  delete merged.unitOverrides
  return merged
}

function normalizeManifest(raw, manifestPath) {
  return {
    ...raw,
    dict: {
      category: '国际考试',
      tags: ['IELTS'],
      languageCategory: raw.dict.language,
      accent: 'uk',
      ...raw.dict,
    },
    units: {
      sheetPattern: '*',
      nameColumn: 'name',
      transColumn: 'trans',
      sheetIdRegex: '^(?<chapter>\\d+)\\.[\\d.]+-(?<unit>\\d+)$',
      requireSheetIdMatch: true,
      fixedColumns: null,
      chapterFilter: null,
      ...raw.units,
      excel: resolveFromManifest(manifestPath, raw.units.excel),
    },
    audio: {
      ...raw.audio,
      dir: raw.audio.dir ? resolveFromManifest(manifestPath, raw.audio.dir) : undefined,
      chapterDirPattern: raw.audio.chapterDirPattern ? resolveFromManifest(manifestPath, raw.audio.chapterDirPattern) : undefined,
      manualDir: raw.audio.manualDir ? resolveFromManifest(manifestPath, raw.audio.manualDir) : undefined,
    },
    segmentation: {
      strategy: 'anchor-boundary',
      fallback: ['calibrated-fixed', 'fixed'],
      whisper: { model: 'Xenova/whisper-tiny.en' },
      silence: {
        noiseDb: -38,
        minSilenceSec: 0.45,
        minIntroSec: 12,
        rhythmWindowSize: 5,
        rhythmIntervalMin: 3.5,
        rhythmIntervalMax: 6.5,
        minPhraseSec: 0.25,
        maxPhraseSec: 10,
        introMaxSec: 12,
      },
      anchor: { startPadSec: 0.2, endPadSec: 0.3, tailEndPadSec: 0.45, minGapSec: 0.02 },
      fixed: {
        skipIntroSec: 10,
        intervalSec: 5,
        phraseDurationSec: 4.5,
        skipOutlierIntervals: 2,
        calibrationSamples: 25,
      },
      clusterGapSec: 2.5,
      paddingMs: 150,
      trimSilence: false,
      ...raw.segmentation,
    },
    validation: {
      minSimilarity: 0.85,
      failOnMismatch: true,
      minDurationSec: 0.2,
      maxDurationSec: 15,
      verifyTranscript: true,
      ...raw.validation,
    },
    output: {
      registerDictionary: false,
      reportDir: 'tools/dict-audio-pipeline/output/reports',
      combinedDict: false,
      perUnitDict: true,
      combinedDictId: null,
      ...raw.output,
      audioDir: resolveFromManifest(manifestPath, raw.output.audioDir),
      dictDir: resolveFromManifest(manifestPath, raw.output.dictDir),
      reportDir: resolveFromManifest(manifestPath, raw.output?.reportDir ?? 'tools/dict-audio-pipeline/output/reports'),
    },
    manifestPath,
  }
}
