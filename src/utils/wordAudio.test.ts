import { isWordAudioSegment, resolveSegmentAudioUrl, resolveWordAudioSegment } from './wordAudio'
import { describe, expect, it } from 'vitest'

describe('wordAudio', () => {
  it('detects segment refs', () => {
    expect(isWordAudioSegment({ unit: 'unit5-01', start: 0, end: 1.2 })).toBe(true)
    expect(isWordAudioSegment('/audio/foo.mp3')).toBe(false)
  })

  it('resolves segment from word', () => {
    const seg = resolveWordAudioSegment({ ukAudio: { unit: 'unit5-01', start: 1, end: 2 } }, 'uk')
    expect(seg?.unit).toBe('unit5-01')
  })

  it('builds merged audio url', () => {
    expect(resolveSegmentAudioUrl({ unit: 'unit5-01', start: 0, end: 1 })).toBe('/audio/wang-c5-audio/unit5-01.mp3')
  })
})
