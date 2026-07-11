import {
  buildAnchorBoundarySegments,
  buildCalibratedFixedSegments,
  buildPhraseClusters,
  detectSilenceSegments,
  findContentStart,
  findContentStartByRhythm,
} from '../ffmpeg.mjs'
import { alignSpeechSegmentsToRows } from '../segment-align.mjs'
import fs from 'node:fs'
import path from 'node:path'

/**
 * @typedef {{ index: number, start: number, end: number, text?: string, strategy: string }} Segment
 */

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((item) => item.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((item) => item.trim())
    return Object.fromEntries(headers.map((header, idx) => [header, values[idx] ?? '']))
  })
}

/**
 * @param {string} csvPath
 * @returns {Segment[]}
 */
export function loadManualSegments(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parseCsv(content)
  return records.map((record, idx) => ({
    index: Number(record.index ?? idx + 1),
    start: Number(record.start ?? record.startSec),
    end: Number(record.end ?? record.endSec),
    text: record.text,
    strategy: 'manual',
  }))
}

export function findManualCsv(manualDir, unitId) {
  if (!manualDir) return null
  const candidates = [
    path.join(manualDir, `${unitId}.csv`),
    path.join(manualDir, `unit${unitId}.csv`),
    path.join(manualDir, `unit${Number(unitId)}.csv`),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

/**
 * @param {{ audioPath: string, rows: Array<{ name: string }>, segmentation: any, manualCsv?: string | null }} input
 * @returns {Promise<Segment[]>}
 */
export async function segmentFixed({ audioPath, rows, segmentation }) {
  const fixed = segmentation.fixed ?? {}
  const contentStart =
    fixed.skipIntroSec != null && fixed.skipIntroSec > 0
      ? fixed.skipIntroSec
      : await findContentStart(audioPath, segmentation.silence ?? {})
  const { intervalSec = 6, phraseDurationSec = 4.2 } = fixed
  const segments = rows.map((row, idx) => {
    const start = contentStart + idx * intervalSec
    const end = start + phraseDurationSec
    return { index: idx + 1, start, end, text: row.name, strategy: 'fixed' }
  })
  return segments
}

async function resolveContentStart(audioPath, silenceOpts, speechSegments) {
  if (silenceOpts.contentStartSec != null && silenceOpts.contentStartSec > 0) {
    return silenceOpts.contentStartSec
  }
  const rhythmStart = findContentStartByRhythm(speechSegments, silenceOpts)
  if (rhythmStart > 0) {
    return rhythmStart
  }
  return findContentStart(audioPath, silenceOpts)
}

function speechAfterIntro(speechSegments, contentStart) {
  return speechSegments.filter((segment) => segment.start >= contentStart - 0.05)
}

/**
 * @param {{ audioPath: string, rows: Array<{ name: string }>, segmentation: any }} input
 * @returns {Promise<Segment[]>}
 */
export async function segmentAnchorBoundary({ audioPath, rows, segmentation }) {
  const silenceOpts = segmentation.silence ?? {}
  const speechSegments = await detectSilenceSegments(audioPath, silenceOpts)
  const contentStart = await resolveContentStart(audioPath, silenceOpts, speechSegments)
  const afterIntro = speechAfterIntro(speechSegments, contentStart)
  const anchorOpts = {
    ...(segmentation.anchor ?? {}),
    allowPartial: segmentation.allowPartial === true,
  }

  return buildAnchorBoundarySegments(rows, afterIntro, anchorOpts)
}

/**
 * @param {{ audioPath: string, rows: Array<{ name: string }>, segmentation: any }} input
 * @returns {Promise<Segment[]>}
 */
export async function segmentCalibratedFixed({ audioPath, rows, segmentation }) {
  const silenceOpts = segmentation.silence ?? {}
  const speechSegments = await detectSilenceSegments(audioPath, silenceOpts)
  const contentStart = await resolveContentStart(audioPath, silenceOpts, speechSegments)
  const afterIntro = speechAfterIntro(speechSegments, contentStart)

  if (afterIntro.length < 3) {
    throw new Error(`Calibrated-fixed: too few speech segments (${afterIntro.length}) after content start ${contentStart.toFixed(2)}s`)
  }

  return buildCalibratedFixedSegments(rows, contentStart, afterIntro, segmentation.fixed ?? {})
}

/**
 * @param {{ audioPath: string, rows: Array<{ name: string }>, segmentation: any }} input
 * @returns {Promise<Segment[]>}
 */
export async function segmentSilence({ audioPath, rows, segmentation }) {
  const silenceOpts = segmentation.silence ?? {}
  const speechSegments = await detectSilenceSegments(audioPath, silenceOpts)
  const contentStart = await resolveContentStart(audioPath, silenceOpts, speechSegments)
  const afterIntro = speechSegments.filter((segment) => segment.start >= contentStart - 0.05)
  const clusters = buildPhraseClusters(afterIntro, {
    clusterGapSec: segmentation.clusterGapSec ?? 2.5,
  })

  if (clusters.length >= rows.length * 0.8) {
    const aligned = clusters.slice(0, rows.length).map((cluster, idx) => ({
      index: idx + 1,
      start: cluster.start,
      end: cluster.end,
      text: rows[idx].name,
      strategy: 'phrase-cluster',
    }))
    if (aligned.length === rows.length) {
      return aligned
    }
  }

  const aligned = alignSpeechSegmentsToRows(afterIntro, rows.length, segmentation.silence)
  return aligned.map((segment, idx) => ({
    index: idx + 1,
    start: segment.start,
    end: segment.end,
    text: rows[idx].name,
    strategy: 'silence',
  }))
}

let whisperPipelinePromise = null

export async function getWhisperPipeline(modelName) {
  if (!whisperPipelinePromise) {
    whisperPipelinePromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('automatic-speech-recognition', modelName, { quantized: true }),
    )
  }
  return whisperPipelinePromise
}

export async function transcribeWithWhisper(audioPath, modelName) {
  const transcriber = await getWhisperPipeline(modelName)
  const result = await transcriber(audioPath, { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 })
  const chunks = result.chunks ?? []
  return chunks.map((chunk) => ({
    start: chunk.timestamp?.[0] ?? 0,
    end: chunk.timestamp?.[1] ?? 0,
    text: chunk.text?.trim() ?? '',
  }))
}

/**
 * @param {{ audioPath: string, rows: Array<{ name: string }>, segmentation: any }} input
 * @returns {Promise<Segment[]>}
 */
export async function segmentSttAlign({ audioPath, rows, segmentation }) {
  const { phraseSimilarity } = await import('../similarity.mjs')
  const modelName = segmentation.whisper?.model ?? 'Xenova/whisper-tiny.en'
  const minSimilarity = segmentation.minAlignSimilarity ?? 0.55
  const transcript = await transcribeWithWhisper(audioPath, modelName)
  if (transcript.length === 0) {
    throw new Error('STT produced no transcript segments')
  }

  const segments = []
  let cursor = 0

  for (let i = 0; i < rows.length; i++) {
    const expected = rows[i].name
    let best = null

    for (let end = cursor; end < Math.min(cursor + 4, transcript.length); end++) {
      const combined = transcript
        .slice(cursor, end + 1)
        .map((item) => item.text)
        .join(' ')
      const score = phraseSimilarity(expected, combined)
      if (!best || score > best.score) {
        best = {
          score,
          start: transcript[cursor].start,
          end: transcript[end].end,
          text: combined,
          endIndex: end,
        }
      }
    }

    if (!best || best.score < minSimilarity) {
      throw new Error(`STT align failed for #${i + 1} "${expected}" (best=${best?.score?.toFixed(2) ?? 'n/a'})`)
    }

    segments.push({
      index: i + 1,
      start: best.start,
      end: best.end,
      text: best.text,
      strategy: 'stt-align',
    })
    cursor = best.endIndex + 1
  }

  return segments
}

/**
 * @param {object} input
 * @returns {Promise<Segment[]>}
 */
export async function segmentUnit(input) {
  const { segmentation, manualCsv } = input
  if (manualCsv) {
    return loadManualSegments(manualCsv)
  }

  const chain = [segmentation.strategy, ...(segmentation.fallback ?? [])].filter(Boolean)
  const strategyMap = {
    'stt-align': segmentSttAlign,
    'anchor-boundary': segmentAnchorBoundary,
    'calibrated-fixed': segmentCalibratedFixed,
    silence: segmentSilence,
    'phrase-cluster': segmentSilence,
    fixed: segmentFixed,
    manual: async () => {
      throw new Error('manual strategy requires manual CSV')
    },
  }

  const errors = []
  for (const strategyName of chain) {
    const runner = strategyMap[strategyName]
    if (!runner) {
      errors.push(`${strategyName}: unknown strategy`)
      continue
    }
    try {
      const segments = await runner(input)
      return segments.map((segment) => ({ ...segment, strategy: segment.strategy ?? strategyName }))
    } catch (error) {
      errors.push(`${strategyName}: ${error.message}`)
    }
  }

  throw new Error(`All segmentation strategies failed:\n- ${errors.join('\n- ')}`)
}
