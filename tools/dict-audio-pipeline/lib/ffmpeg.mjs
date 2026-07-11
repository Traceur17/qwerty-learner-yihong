import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, ...options })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`${command} ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')} failed (${code}): ${stderr || stdout}`))
    })
  })
}

export async function getAudioDurationSec(audioPath) {
  const { stdout } = await runCommand('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ])
  return Number.parseFloat(stdout.trim())
}

export async function detectSilenceEvents(audioPath, { noiseDb = -38, minSilenceSec = 0.35 } = {}) {
  const { stderr } = await runCommand('ffmpeg', [
    '-i',
    audioPath,
    '-af',
    `silencedetect=noise=${noiseDb}dB:d=${minSilenceSec}`,
    '-f',
    'null',
    '-',
  ])

  const silenceStarts = [...stderr.matchAll(/silence_start: ([0-9.]+)/g)].map((match) => Number.parseFloat(match[1]))
  const silenceEnds = [...stderr.matchAll(/silence_end: ([0-9.]+)/g)].map((match) => Number.parseFloat(match[1]))
  return { silenceStarts, silenceEnds }
}

/**
 * 在稳定词组节奏出现处定位正文起点（跳过可变长度中文介绍）
 */
export function findContentStartByRhythm(speechSegments, options = {}) {
  if (options.contentStartSec != null && options.contentStartSec > 0) {
    return options.contentStartSec
  }

  const minIntroSec = options.minIntroSec ?? 35
  const windowSize = options.rhythmWindowSize ?? 5
  const intervalMin = options.rhythmIntervalMin ?? 3.5
  const intervalMax = options.rhythmIntervalMax ?? 6.5

  const starts = speechSegments.map((segment) => segment.start)
  const intervals = starts.slice(1).map((start, index) => start - starts[index])

  for (let i = 0; i < starts.length - windowSize; i++) {
    if (starts[i] < minIntroSec) continue
    const window = intervals.slice(i, i + windowSize)
    if (window.length === windowSize && window.every((value) => value >= intervalMin && value <= intervalMax)) {
      return starts[i]
    }
  }

  const fallback = speechSegments.find((segment) => segment.start >= minIntroSec)
  return fallback?.start ?? options.fallbackStartSec ?? 0
}

/**
 * @deprecated 仅作 rhythm 失败时的兜底
 */
export async function findContentStart(audioPath, options = {}) {
  if (options.contentStartSec != null && options.contentStartSec > 0) {
    return options.contentStartSec
  }

  const speechSegments = await detectSilenceSegments(audioPath, options)
  const rhythmStart = findContentStartByRhythm(speechSegments, options)
  if (rhythmStart > 0) {
    return rhythmStart
  }

  const introMinSec = options.introMinSec ?? 8
  const { silenceStarts, silenceEnds } = await detectSilenceEvents(audioPath, options)
  const introSilenceStart = silenceStarts.find((time) => time >= introMinSec && time <= 180)
  if (introSilenceStart == null) {
    return options.fallbackStartSec ?? 0
  }

  const contentStart = silenceEnds.find((time) => time > introSilenceStart && time < introSilenceStart + 8)
  return contentStart ?? introSilenceStart
}

export async function detectSilenceSegments(audioPath, options = {}) {
  const { silenceStarts, silenceEnds } = await detectSilenceEvents(audioPath, options)
  const duration = await getAudioDurationSec(audioPath)

  const speechSegments = []
  let cursor = 0
  for (let i = 0; i < silenceStarts.length; i++) {
    const silenceStart = silenceStarts[i]
    const silenceEnd = silenceEnds[i] ?? silenceStart
    if (silenceStart > cursor) {
      speechSegments.push({ start: cursor, end: silenceStart })
    }
    cursor = silenceEnd
  }
  if (cursor < duration) {
    speechSegments.push({ start: cursor, end: duration })
  }

  return speechSegments.filter((segment) => segment.end - segment.start >= 0.15)
}

/**
 * 将碎语音段按间隔合并为词组簇（间隔 < clusterGapSec 视为同一词组内的停顿）
 */
export function buildPhraseClusters(speechSegments, { clusterGapSec = 2.5 } = {}) {
  if (speechSegments.length === 0) return []

  const clusters = []
  let current = {
    start: speechSegments[0].start,
    end: speechSegments[0].end,
  }

  for (let i = 1; i < speechSegments.length; i++) {
    const segment = speechSegments[i]
    const gap = segment.start - current.end
    if (gap > clusterGapSec) {
      clusters.push({ ...current, duration: current.end - current.start })
      current = { start: segment.start, end: segment.end }
    } else {
      current.end = segment.end
    }
  }
  clusters.push({ ...current, duration: current.end - current.start })
  return clusters
}

function median(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * 词组锚点裁切：起点可前移 startPadSec，终点后延 endPadSec / tailEndPadSec
 * allowPartial=true 时：音频词组少于词表则只匹配前 N 个，不抛错（供词表多于录音的情况）
 */
export function buildAnchorBoundarySegments(rows, speechSegments, options = {}) {
  const startPadSec = options.startPadSec ?? 0
  const endPadSec = options.endPadSec ?? 0.2
  const tailEndPadSec = options.tailEndPadSec ?? 0.35
  const minGapSec = options.minGapSec ?? 0.02
  const allowPartial = options.allowPartial === true
  const count = allowPartial ? Math.min(rows.length, speechSegments.length) : rows.length

  if (speechSegments.length < count) {
    throw new Error(`anchor-boundary: need ${count} phrase anchors, got ${speechSegments.length}`)
  }
  if (!allowPartial && speechSegments.length < rows.length) {
    throw new Error(`anchor-boundary: need ${rows.length} phrase anchors, got ${speechSegments.length}`)
  }
  if (count === 0) {
    throw new Error('anchor-boundary: no phrase anchors available')
  }

  const anchors = speechSegments.slice(0, count)
  const segments = []

  for (let idx = 0; idx < anchors.length; idx++) {
    const anchor = anchors[idx]
    const prevEnd = idx > 0 ? segments[idx - 1].end : 0
    const minStart = idx > 0 ? prevEnd + minGapSec : 0
    const start = Math.max(minStart, anchor.start - startPadSec)
    const end = anchor.end + (idx < anchors.length - 1 ? endPadSec : tailEndPadSec)
    segments.push({
      index: idx + 1,
      start,
      end,
      text: rows[idx].name,
      strategy: allowPartial && speechSegments.length < rows.length ? 'anchor-boundary-partial' : 'anchor-boundary',
    })
  }

  return segments
}

/**
 * 从实测词组起点间隔校准均匀时间轴（降级方案）
 */
export function buildCalibratedFixedSegments(rows, contentStart, speechSegments, options = {}) {
  const skipOutliers = options.skipOutlierIntervals ?? 2
  const sampleEnd = Math.min(options.calibrationSamples ?? 25, speechSegments.length - 1)
  const intervals = []

  for (let i = skipOutliers + 1; i <= sampleEnd; i++) {
    intervals.push(speechSegments[i].start - speechSegments[i - 1].start)
  }

  const intervalSec = options.intervalSec ?? median(intervals)
  const phraseDurationSec = options.phraseDurationSec ?? Math.min(intervalSec * 0.9, options.maxPhraseSec ?? 5.5)

  return rows.map((row, idx) => {
    const start = contentStart + idx * intervalSec
    const end = start + phraseDurationSec
    return {
      index: idx + 1,
      start,
      end,
      text: row.name,
      strategy: 'calibrated-fixed',
    }
  })
}

/**
 * 高质量裁切：精确 seek → 临时 WAV → 再压成高码率 MP3，避免默认 lame 二次压缩在词中间引入电音。
 * @param {string} audioPath
 * @param {string} outputPath
 * @param {number} startSec
 * @param {number} endSec
 * @param {number | { paddingMs?: number, trimSilence?: boolean, mp3Quality?: number }} options
 *   mp3Quality: lame VBR 质量 0(最好)–9，默认 0
 */
export async function cutAudioSegment(audioPath, outputPath, startSec, endSec, options = {}) {
  const paddingMs = typeof options === 'number' ? options : options.paddingMs ?? 60
  const trimSilence = typeof options === 'object' && options.trimSilence === true
  const mp3Quality = typeof options === 'object' && options.mp3Quality != null ? options.mp3Quality : 0
  const start = Math.max(0, startSec - paddingMs / 1000)
  const duration = Math.max(0.05, endSec - startSec + (paddingMs * 2) / 1000)

  const tempDir = mkdtempSync(join(tmpdir(), 'dict-audio-cut-'))
  const wavPath = join(tempDir, 'segment.wav')

  try {
    // -ss after -i: accurate decode seek (avoids mid-stream encoder damage from coarse input seek + default re-encode)
    const wavArgs = ['-y', '-i', audioPath, '-ss', String(start), '-t', String(duration)]
    if (trimSilence) {
      wavArgs.push(
        '-af',
        'silenceremove=start_periods=1:start_duration=0.08:start_threshold=-42dB:stop_periods=1:stop_duration=0.12:stop_threshold=-42dB',
      )
    }
    wavArgs.push('-acodec', 'pcm_s16le', wavPath)
    await runCommand('ffmpeg', wavArgs)

    await runCommand('ffmpeg', ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', String(mp3Quality), outputPath])
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

export async function transcribeShortClip(audioPath, whisperModel) {
  const { transcribeWithWhisper } = await import('./strategies/index.mjs')
  const segments = await transcribeWithWhisper(audioPath, whisperModel)
  return segments
    .map((segment) => segment.text)
    .join(' ')
    .trim()
}
