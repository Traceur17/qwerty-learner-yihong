import talentAmazingImg from '@/assets/talent/talent-amazing.webp'
import talentGreatImg from '@/assets/talent/talent-great.webp'
import talentNiceImg from '@/assets/talent/talent-nice.webp'

export type TalentLevel = 'nice' | 'great' | 'amazing'

export const TALENT_LEVEL_META: Record<TalentLevel, { label: string; image: string }> = {
  nice: { label: '还不错的天分', image: talentNiceImg },
  great: { label: '相当好的天分', image: talentGreatImg },
  amazing: { label: '了不起的天分', image: talentAmazingImg },
}

const AMAZING_STREAK = 5
const AMAZING_REPEAT_INTERVAL = 5

/**
 * 连对阶梯：3 → nice、4 → great、5 → amazing，之后每 +5（10、15…）重复 amazing。
 */
export function getStreakLevel(streak: number): TalentLevel | null {
  if (streak === 3) return 'nice'
  if (streak === 4) return 'great'
  if (streak === AMAZING_STREAK) return 'amazing'
  if (streak > AMAZING_STREAK && (streak - AMAZING_STREAK) % AMAZING_REPEAT_INTERVAL === 0) return 'amazing'
  return null
}

/**
 * 正确率评级：≥80% → amazing、≥70% → great、≥60% → nice、否则不评级。
 */
export function getAccuracyLevel(correct: number, total: number): TalentLevel | null {
  if (total <= 0) return null
  const ratio = correct / total
  if (ratio >= 0.8) return 'amazing'
  if (ratio >= 0.7) return 'great'
  if (ratio >= 0.6) return 'nice'
  return null
}

/** 首次触发前预加载徽章图，避免弹出瞬间白屏 */
let hasPreloaded = false
export function preloadTalentImages() {
  if (hasPreloaded) return
  hasPreloaded = true
  Object.values(TALENT_LEVEL_META).forEach(({ image }) => {
    new Image().src = image
  })
}
