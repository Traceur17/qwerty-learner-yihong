import { getAccuracyLevel, getStreakLevel } from './talentCelebration'
import { describe, expect, it } from 'vitest'

describe('getStreakLevel', () => {
  it('returns null below the first threshold', () => {
    expect(getStreakLevel(0)).toBeNull()
    expect(getStreakLevel(1)).toBeNull()
    expect(getStreakLevel(2)).toBeNull()
  })

  it('maps 3 / 4 / 5 to nice / great / amazing', () => {
    expect(getStreakLevel(3)).toBe('nice')
    expect(getStreakLevel(4)).toBe('great')
    expect(getStreakLevel(5)).toBe('amazing')
  })

  it('is silent between repeats', () => {
    expect(getStreakLevel(6)).toBeNull()
    expect(getStreakLevel(7)).toBeNull()
    expect(getStreakLevel(9)).toBeNull()
    expect(getStreakLevel(11)).toBeNull()
  })

  it('repeats amazing every +5 after 5', () => {
    expect(getStreakLevel(10)).toBe('amazing')
    expect(getStreakLevel(15)).toBe('amazing')
    expect(getStreakLevel(20)).toBe('amazing')
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
