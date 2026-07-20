import { type DictationThemeId, getDictationTheme } from '@/utils/dictationThemes'
import { useEffect, useRef, useState } from 'react'

type DictationThemeBackdropProps = {
  themeId?: DictationThemeId
  className?: string
}

const FADE_IN_MS = 300
const HOLD_BEFORE_FADE_MS = 500
const FADE_OUT_MS = 1200

function isInCornerHotspot(clientX: number, clientY: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const rightInset = vw >= 1024 ? 64 : vw >= 768 ? 48 : 32
  const imageWidth = Math.min(vw * 0.25, 350)
  const imageHeight = imageWidth * 1.1
  const pad = 20

  return clientX >= vw - rightInset - imageWidth - pad && clientY >= vh - imageHeight - pad
}

/**
 * 听写模式右下角淡淡主题装饰。
 * 用 fixed 贴视口，避免 absolute + 偏移撑开布局或把图裁掉。
 * 悬停通过全局鼠标位置检测右下角热区触发，图片保持 pointer-events-none 不挡操作。
 */
export default function DictationThemeBackdrop({ themeId, className = '' }: DictationThemeBackdropProps) {
  const theme = getDictationTheme(themeId)
  const [revealed, setRevealed] = useState(false)
  const [fadeMs, setFadeMs] = useState(FADE_OUT_MS)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const inHotspotRef = useRef(false)

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = undefined
      }
    }

    const scheduleHide = () => {
      clearHideTimer()
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = undefined
        setFadeMs(FADE_OUT_MS)
        setRevealed(false)
      }, HOLD_BEFORE_FADE_MS)
    }

    const handleMouseMove = (event: MouseEvent) => {
      const inHotspot = isInCornerHotspot(event.clientX, event.clientY)
      if (inHotspot === inHotspotRef.current) return

      inHotspotRef.current = inHotspot
      if (inHotspot) {
        clearHideTimer()
        setFadeMs(FADE_IN_MS)
        setRevealed(true)
      } else {
        scheduleHide()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearHideTimer()
    }
  }, [])

  return (
    <img
      src={theme.image}
      alt=""
      aria-hidden
      draggable={false}
      style={{ transitionDuration: `${fadeMs}ms` }}
      className={`pointer-events-none fixed bottom-0 right-8 z-0 w-[min(25vw,350px)] select-none transition-opacity ease-out ${
        revealed ? 'opacity-[0.55] dark:opacity-[0.48]' : 'opacity-[0.22] dark:opacity-[0.18]'
      } md:right-12 lg:right-16 ${className}`}
    />
  )
}
