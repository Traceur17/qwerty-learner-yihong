import { getAccuracyLevel, getStreakLevel } from './talentCelebration'
import { describe, expect, it } from 'vitest'

describe('getStreakLevel (normal mode)', () => {
  it('returns null below the first threshold', () => {
    expect(getStreakLevel(0)).toBeNull()
    expect(getStreakLevel(1)).toBeNull()
    expect(getStreakLevel(3)).toBeNull()
    expect(getStreakLevel(5)).toBeNull()
  })

  it('maps 6 / 9 / 12 to nice / great / amazing', () => {
    expect(getStreakLevel(6)).toBe('nice')
    expect(getStreakLevel(9)).toBe('great')
    expect(getStreakLevel(12)).toBe('amazing')
  })

  it('is silent between thresholds and repeats', () => {
    expect(getStreakLevel(7)).toBeNull()
    expect(getStreakLevel(8)).toBeNull()
    expect(getStreakLevel(10)).toBeNull()
    expect(getStreakLevel(11)).toBeNull()
    expect(getStreakLevel(13)).toBeNull()
    expect(getStreakLevel(17)).toBeNull()
  })

  it('repeats amazing every +6 after 12', () => {
    expect(getStreakLevel(18)).toBe('amazing')
    expect(getStreakLevel(24)).toBe('amazing')
    expect(getStreakLevel(30)).toBe('amazing')
  })
})

describe('getStreakLevel (review mode)', () => {
  it('returns null below the first threshold', () => {
    expect(getStreakLevel(0, 'review')).toBeNull()
    expect(getStreakLevel(1, 'review')).toBeNull()
    expect(getStreakLevel(2, 'review')).toBeNull()
  })

  it('maps 3 / 4 / 5 to nice / great / amazing', () => {
    expect(getStreakLevel(3, 'review')).toBe('nice')
    expect(getStreakLevel(4, 'review')).toBe('great')
    expect(getStreakLevel(5, 'review')).toBe('amazing')
  })

  it('repeats amazing every +3 after 5 and stays silent in between', () => {
    expect(getStreakLevel(6, 'review')).toBeNull()
    expect(getStreakLevel(7, 'review')).toBeNull()
    expect(getStreakLevel(8, 'review')).toBe('amazing')
    expect(getStreakLevel(9, 'review')).toBeNull()
    expect(getStreakLevel(11, 'review')).toBe('amazing')
    expect(getStreakLevel(14, 'review')).toBe('amazing')
  })
})

describe('getAccuracyLevel', () => {
  it('returns null when nothing answered', () => {
    expect(getAccuracyLevel(0, 0)).toBeNull()
  })

  it('returns null below 60%', () => {
    expect(getAccuracyLevel(0, 10)).toBeNull()
    expect(getAccuracyLevel(59, 100)).toBeNull()
    expect(getAccuracyLevel(599, 1000)).toBeNull()
  })

  it('takes tiers by greater-or-equal boundaries', () => {
    expect(getAccuracyLevel(60, 100)).toBe('nice')
    expect(getAccuracyLevel(69, 100)).toBe('nice')
    expect(getAccuracyLevel(70, 100)).toBe('great')
    expect(getAccuracyLevel(79, 100)).toBe('great')
    expect(getAccuracyLevel(799, 1000)).toBe('great')
    expect(getAccuracyLevel(80, 100)).toBe('amazing')
  })

  it('returns amazing for a perfect run', () => {
    expect(getAccuracyLevel(10, 10)).toBe('amazing')
  })
})
