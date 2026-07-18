import { prependWrongAnswer, truncateWrongAnswers, wrongSeverityDots } from './wrongAnswerHistoryHelpers'
import { describe, expect, it } from 'vitest'

describe('wrongAnswerHistory helpers', () => {
  it('prepends and truncates to 4', () => {
    expect(prependWrongAnswer([], 'a')).toEqual(['a'])
    expect(prependWrongAnswer(['a'], 'b')).toEqual(['b', 'a'])
    expect(prependWrongAnswer(['b', 'a'], 'c')).toEqual(['c', 'b', 'a'])
    expect(prependWrongAnswer(['c', 'b', 'a'], 'd')).toEqual(['d', 'c', 'b', 'a'])
    expect(prependWrongAnswer(['d', 'c', 'b', 'a'], 'e')).toEqual(['e', 'd', 'c', 'b'])
  })

  it('dedupes exact match by moving to front', () => {
    expect(prependWrongAnswer(['a', 'b'], 'a')).toEqual(['a', 'b'])
  })

  it('ignores empty trim', () => {
    expect(prependWrongAnswer(['a'], '  ')).toEqual(['a'])
  })

  it('truncateWrongAnswers caps length at 4', () => {
    expect(truncateWrongAnswers(['1', '2', '3', '4', '5'])).toEqual(['1', '2', '3', '4'])
  })

  it('maps history count to severity dots', () => {
    expect(wrongSeverityDots(0)).toEqual({ count: 0, severity: 'mild' })
    expect(wrongSeverityDots(1)).toEqual({ count: 1, severity: 'mild' })
    expect(wrongSeverityDots(2)).toEqual({ count: 2, severity: 'mild' })
    expect(wrongSeverityDots(3)).toEqual({ count: 3, severity: 'recurring' })
    expect(wrongSeverityDots(4)).toEqual({ count: 3, severity: 'recurring' })
  })
})
