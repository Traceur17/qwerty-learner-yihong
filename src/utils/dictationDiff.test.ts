import { diffPhrase, formatTranslation } from './dictationDiff'
import { describe, expect, it } from 'vitest'

describe('diffPhrase', () => {
  it('marks missing leading word', () => {
    const result = diffPhrase('couple of', 'a couple of', true)
    expect(result.userLine.some((p) => p.type === 'missing' && p.text.trim() === 'a')).toBe(true)
    expect(result.correctLine.some((p) => p.type === 'match' && p.text.includes('a'))).toBe(true)
  })

  it('marks extra word', () => {
    const result = diffPhrase('a couple of words', 'a couple of', true)
    expect(result.userLine.some((p) => p.type === 'extra' && p.text.includes('words'))).toBe(true)
  })

  it('marks replaced word with char-level diff', () => {
    const result = diffPhrase('explosve', 'explosive', true)
    expect(result.userLine.some((p) => p.type === 'wrong')).toBe(true)
    expect(result.correctLine.some((p) => p.type === 'wrong')).toBe(true)
  })

  it('treats case-only difference as match when ignoreCase', () => {
    const result = diffPhrase('Hello', 'hello', true)
    expect(result.userLine.every((p) => p.type === 'match')).toBe(true)
    expect(result.correctLine.every((p) => p.type === 'match')).toBe(true)
  })

  it('flags case difference when not ignoring case', () => {
    const result = diffPhrase('Hello', 'hello', false)
    expect(result.userLine.some((p) => p.type === 'wrong')).toBe(true)
  })
})

describe('formatTranslation', () => {
  it('joins multiple translations', () => {
    expect(formatTranslation(['几个', '一对'])).toBe('几个；一对')
  })
})
