import type { Word } from '@/typings'
import { generateWordSoundSrc, resolvePronunciationWordName } from '@/utils/pronunciation'
import { describe, expect, it } from 'vitest'

const wordWithUkAudio: Pick<Word, 'name' | 'usAudio' | 'ukAudio'> = {
  name: 'a couple of',
  ukAudio: '/audio/test/001.mp3',
}

const wordWithUsAudio: Pick<Word, 'name' | 'usAudio' | 'ukAudio'> = {
  name: 'hello',
  usAudio: '/audio/test/hello_us.mp3',
}

describe('generateWordSoundSrc', () => {
  it('uses custom UK audio when pronunciation is uk', () => {
    expect(generateWordSoundSrc(wordWithUkAudio, 'uk')).toBe('/audio/test/001.mp3')
  })

  it('falls back to Youdao when custom audio missing for active accent', () => {
    expect(generateWordSoundSrc(wordWithUkAudio, 'us')).toContain('dict.youdao.com')
    expect(generateWordSoundSrc(wordWithUkAudio, 'us')).toContain('a couple of')
  })

  it('uses custom US audio when pronunciation is us', () => {
    expect(generateWordSoundSrc(wordWithUsAudio, 'us')).toBe('/audio/test/hello_us.mp3')
  })

  it('keeps legacy string-only Youdao behavior', () => {
    const src = generateWordSoundSrc('ability', 'uk')
    expect(src).toBe('https://dict.youdao.com/dictvoice?audio=ability&type=1')
  })
})

describe('resolvePronunciationWordName', () => {
  it('returns string input as-is', () => {
    expect(resolvePronunciationWordName('test')).toBe('test')
  })

  it('returns word name from object input', () => {
    expect(resolvePronunciationWordName(wordWithUkAudio)).toBe('a couple of')
  })
})
