import { type DictationThemeId, getDictationTheme } from '@/utils/dictationThemes'
import { useEffect, useRef, useState } from 'react'

type DictationThemeBackdropProps = {
  themeId?: DictationThemeId
  className?: string
}

const FADE_IN_MS = 300
const HOLD_BEFORE_FADE_MS = 500
const FADE_OUT_MS = 1200

/**
 * 听写模式右下角淡淡主题装饰。
 * 用 fixed 贴视口，避免 absolute + 偏移撑开布局或把图裁掉。
 */
export default function DictationThemeBackdrop({ themeId, className = '' }: DictationThemeBackdropProps) {
  const theme = getDictationTheme(themeId)
  const [revealed, setRevealed] = useState(false)
  const [fadeMs, setFadeMs] = useState(FADE_OUT_MS)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = undefined
    }
  }

  return (
    <img
      src={theme.image}
      alt=""
      aria-hidden
      draggable={false}
      onMouseEnter={() => {
        clearHideTimer()
        setFadeMs(FADE_IN_MS)
        setRevealed(true)
      }}
      onMouseLeave={() => {
        clearHideTimer()
        hideTimerRef.current = setTimeout(() => {
          hideTimerRef.current = undefined
          setFadeMs(FADE_OUT_MS)
          setRevealed(false)
        }, HOLD_BEFORE_FADE_MS)
      }}
      style={{ transitionDuration: `${fadeMs}ms` }}
      className={`fixed bottom-0 right-8 z-0 w-[min(25vw,350px)] cursor-default select-none transition-opacity ease-out ${
        revealed ? 'opacity-[0.55] dark:opacity-[0.48]' : 'opacity-[0.22] dark:opacity-[0.18]'
      } md:right-12 lg:right-16 ${className}`}
    />
  )
}
