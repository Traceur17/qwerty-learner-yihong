import type { PronunciationType } from '@/typings'

export type WordAudioSegment = {
  unit: string
  start: number
  end: number
  /** public/audio 下的目录名，默认 wang-c5-audio */
  base?: string
}

export type WordAudioRef = string | WordAudioSegment

export function isWordAudioSegment(value: unknown): value is WordAudioSegment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'unit' in value &&
    'start' in value &&
    'end' in value &&
    typeof (value as WordAudioSegment).unit === 'string' &&
    typeof (value as WordAudioSegment).start === 'number' &&
    typeof (value as WordAudioSegment).end === 'number'
  )
}

export function resolveWordAudioSegment(
  word: Pick<{ usAudio?: WordAudioRef; ukAudio?: WordAudioRef }, 'usAudio' | 'ukAudio'>,
  pronunciation: Exclude<PronunciationType, false>,
): WordAudioSegment | null {
  const ref = pronunciation === 'us' ? word.usAudio : word.ukAudio
  return isWordAudioSegment(ref) ? ref : null
}

export function resolveSegmentAudioUrl(segment: WordAudioSegment): string {
  const base = segment.base ?? 'wang-c5-audio'
  const unit = segment.unit.endsWith('.mp3') ? segment.unit : `${segment.unit}.mp3`
  return `/audio/${base}/${unit}`
}
