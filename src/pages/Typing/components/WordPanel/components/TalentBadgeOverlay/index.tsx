import styles from './index.module.css'
import { CONFETTI_DEFAULTS } from '@/constants'
import type { TalentLevel } from '@/utils/talentCelebration'
import { TALENT_LEVEL_META } from '@/utils/talentCelebration'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'

/**
 * 天分徽章弹出层：非阻塞（pointer-events 穿透）、不抢焦点，动画约 3s 后由父层卸载。
 * 父层用 key 重挂载来实现"新徽章替换旧徽章并重新计时"。
 * 定位：fixed 于视口右上区域（顶栏下方），不随单词输入区布局变动；游戏成就标识风格的砸入 + 抖动。
 */
export default function TalentBadgeOverlay({ level, onDone }: { level: TalentLevel; onDone: () => void }) {
  const meta = TALENT_LEVEL_META[level]

  useEffect(() => {
    if (level !== 'amazing') return
    const timer = window.setTimeout(() => {
      confetti({
        ...CONFETTI_DEFAULTS,
        particleCount: 70,
        spread: 75,
        startVelocity: 35,
        origin: { x: 0.66, y: 0.33 },
      })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [level])

  return (
    <div className="pointer-events-none fixed left-[60%] top-[300px] z-50" aria-hidden="true">
      <img
        src={meta.image}
        alt={meta.label}
        draggable={false}
        className={`${styles.badge} w-48 select-none md:w-56`}
        onAnimationEnd={onDone}
      />
    </div>
  )
}
