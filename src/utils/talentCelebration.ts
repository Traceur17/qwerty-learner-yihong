import talentAmazingImg from '@/assets/talent/talent-amazing.webp'
import talentGreatImg from '@/assets/talent/talent-great.webp'
import talentNiceImg from '@/assets/talent/talent-nice.webp'

export type TalentLevel = 'nice' | 'great' | 'amazing'

export const TALENT_LEVEL_META: Record<TalentLevel, { label: string; image: string }> = {
  nice: { label: '还不错的天分', image: talentNiceImg },
  great: { label: '相当好的天分', image: talentGreatImg },
  amazing: { label: '了不起的天分', image: talentAmazingImg },
}

export type StreakMode = 'normal' | 'review'

/** 连对阶梯配置：正常听写 6/9/12（12 后每 +6）；错词复习轮次短，用 3/4/5（5 后每 +3） */
const STREAK_THRESHOLDS: Record<StreakMode, { nice: number; great: number; amazing: number; repeatInterval: number }> = {
  normal: { nice: 6, great: 9, amazing: 12, repeatInterval: 6 },
  review: { nice: 3, great: 4, amazing: 5, repeatInterval: 3 },
}

export function getStreakLevel(streak: number, mode: StreakMode = 'normal'): TalentLevel | null {
  const { nice, great, amazing, repeatInterval } = STREAK_THRESHOLDS[mode]
  if (streak === nice) return 'nice'
  if (streak === great) return 'great'
  if (streak === amazing) return 'amazing'
  if (streak > amazing && (streak - amazing) % repeatInterval === 0) return 'amazing'
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
