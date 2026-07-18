import styles from './index.module.css'
import type { TalentLevel } from '@/utils/talentCelebration'
import { TALENT_LEVEL_META } from '@/utils/talentCelebration'

/**
 * 结算盖章：静态展示天分徽章，入场播一次"盖章"动画。
 * animate=false 用于同一揭晓会话内重复展示（不重播动画）。
 */
export default function TalentStamp({
  level,
  animate = true,
  className = '',
}: {
  level: TalentLevel
  animate?: boolean
  className?: string
}) {
  const meta = TALENT_LEVEL_META[level]
  return (
    <img
      src={meta.image}
      alt={meta.label}
      title={meta.label}
      draggable={false}
      className={`${animate ? styles.stamp : styles.static} pointer-events-none select-none drop-shadow-lg ${className}`}
    />
  )
}
