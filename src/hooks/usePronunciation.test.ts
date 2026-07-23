import type { Word } from '@/typings'
import { generateWordSoundSrc, resolvePronunciationWordName, shouldPreferBrowserTts, toBrowserSpeechText } from '@/utils/pronunciation'
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
    expect(generateWordSoundSrc(wordWithUkAudio, 'uk')).toContain('/audio/test/001.mp3')
  })

  it('falls back to Youdao when custom audio missing for active accent', () => {
    expect(generateWordSoundSrc(wordWithUkAudio, 'us')).toContain('dict.youdao.com')
    expect(generateWordSoundSrc(wordWithUkAudio, 'us')).toContain(encodeURIComponent('a couple of'))
  })

  it('uses custom US audio when pronunciation is us', () => {
    expect(generateWordSoundSrc(wordWithUsAudio, 'us')).toContain('/audio/test/hello_us.mp3')
  })

  it('keeps legacy string-only Youdao behavior', () => {
    const src = generateWordSoundSrc('ability', 'uk')
    expect(src).toBe('https://dict.youdao.com/dictvoice?audio=ability&type=1')
  })

  it('URL-encodes phrases with spaces for Youdao', () => {
    const src = generateWordSoundSrc('Empress Biscuit', 'us')
    expect(src).toBe('https://dict.youdao.com/dictvoice?audio=Empress%20Biscuit&type=2')
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

describe('browser TTS helpers (hyphen / phrase)', () => {
  it('prefers browser TTS for hyphenated compounds without rewriting stored spelling', () => {
    expect(shouldPreferBrowserTts('pages-build-deployment')).toBe(true)
    expect(toBrowserSpeechText('pages-build-deployment')).toBe('pages build deployment')
  })

  it('prefers browser TTS for spaced phrases', () => {
    expect(shouldPreferBrowserTts('Empress Biscuit')).toBe(true)
    expect(toBrowserSpeechText('Empress Biscuit')).toBe('Empress Biscuit')
  })

  it('keeps plain words on Youdao path', () => {
    expect(shouldPreferBrowserTts('deployment')).toBe(false)
    expect(toBrowserSpeechText('deployment')).toBe('deployment')
  })
})
