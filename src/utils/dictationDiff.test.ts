import { diffPhrase, formatTranslation } from './dictationDiff'
import { describe, expect, it } from 'vitest'

describe('diffPhrase', () => {
  it('marks missing only on correct line, not on user line', () => {
    const result = diffPhrase('couple of', 'a couple of', true)
    expect(result.userLine.some((p) => p.type === 'missing')).toBe(false)
    expect(result.userLine.map((p) => p.text).join('')).toMatch(/couple of/)
    expect(result.correctLine.some((p) => p.type === 'missing' && p.text.includes('a'))).toBe(true)
  })

  it('marks extra word on user line for deletion', () => {
    const result = diffPhrase('a couple of words', 'a couple of', true)
    expect(result.userLine.some((p) => p.type === 'extra' && p.text.includes('words'))).toBe(true)
    expect(result.correctLine.some((p) => p.type === 'extra')).toBe(false)
  })

  it('marks replaced word with char-level diff', () => {
    const result = diffPhrase('explosve', 'explosive', true)
    expect(result.userLine.some((p) => p.type === 'wrong')).toBe(true)
    expect(result.correctLine.some((p) => p.type === 'wrong')).toBe(true)
  })

  it('aligns partial first word to nearest correct token, not a later one', () => {
    const result = diffPhrase('option', 'optional course', true)
    const userText = result.userLine.map((p) => p.text).join('')
    const correctText = result.correctLine.map((p) => p.text).join('')
    expect(userText.replace(/\s+/g, ' ').trim()).toContain('option')
    // 「option」应对「optional」，「course」为漏词；不应把 option 对到 course
    expect(correctText.toLowerCase()).toMatch(/optional/)
    expect(result.correctLine.some((p) => p.type === 'missing' && p.text.includes('course'))).toBe(true)
    const joinedWrongOnCorrect = result.correctLine
      .filter((p) => p.type === 'wrong' || p.type === 'missing')
      .map((p) => p.text)
      .join(' ')
    expect(joinedWrongOnCorrect.toLowerCase()).not.toMatch(/^course$/)
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
