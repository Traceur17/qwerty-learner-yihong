import { Button } from '@/components/ui/button'
import { useLayoutEffect, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'

type Placement = 'top' | 'bottom' | 'bottom-end' | 'left' | 'right'

type GuideBubbleProps = {
  targetRef: RefObject<HTMLElement | null>
  open: boolean
  anchorKey: string
  content: ReactNode
  placement?: Placement
  stepLabel?: string
  isLast?: boolean
  onNext: () => void
  onDismissSession: () => void
  onDismissPermanently: () => void
}

const BUBBLE_EST_HEIGHT = 140

function getBubbleStyle(rect: DOMRect, placement: Placement) {
  const gap = 12
  const padding = 12
  const bubbleWidth = Math.min(256, window.innerWidth - padding * 2)

  let top = 0
  let left = 0
  let transform = ''
  let arrowPlacement: Placement = placement

  const placeBottom = () => {
    top = rect.bottom + gap
    left = Math.min(Math.max(rect.left + rect.width / 2, bubbleWidth / 2 + padding), window.innerWidth - bubbleWidth / 2 - padding)
    transform = 'translate(-50%, 0)'
    arrowPlacement = 'bottom'
  }

  const placeBottomEnd = () => {
    top = rect.bottom + gap
    left = Math.min(rect.right, window.innerWidth - padding)
    transform = 'translate(-100%, 0)'
    arrowPlacement = 'bottom-end'
  }

  const placeTop = () => {
    top = rect.top - gap
    left = Math.min(Math.max(rect.left + rect.width / 2, bubbleWidth / 2 + padding), window.innerWidth - bubbleWidth / 2 - padding)
    transform = 'translate(-50%, -100%)'
    arrowPlacement = 'top'
  }

  const placeTopEnd = () => {
    top = rect.top - gap
    left = Math.min(rect.right, window.innerWidth - padding)
    transform = 'translate(-100%, -100%)'
    arrowPlacement = 'bottom-end'
  }

  switch (placement) {
    case 'top':
      placeTop()
      break
    case 'left':
      top = rect.top + rect.height / 2
      left = rect.left - gap
      transform = 'translate(-100%, -50%)'
      if (left - bubbleWidth < padding) {
        placeBottom()
      }
      break
    case 'right':
      top = rect.top + rect.height / 2
      left = rect.right + gap
      transform = 'translateY(-50%)'
      if (left + bubbleWidth > window.innerWidth - padding) {
        placeBottom()
      }
      break
    case 'bottom-end':
      placeBottomEnd()
      break
    case 'bottom':
    default:
      placeBottom()
      break
  }

  // 底部放不下则翻到上方
  if (arrowPlacement === 'bottom' || arrowPlacement === 'bottom-end') {
    if (top + BUBBLE_EST_HEIGHT > window.innerHeight - padding) {
      if (placement === 'bottom-end') {
        placeTopEnd()
      } else {
        placeTop()
      }
    }
  }

  // 顶部放不下则压回视口内
  const opensUpward = transform.indexOf('-100%') !== -1
  if (opensUpward) {
    top = Math.max(padding, top)
  } else {
    top = Math.min(top, window.innerHeight - BUBBLE_EST_HEIGHT - padding)
    top = Math.max(padding, top)
  }

  left = Math.min(Math.max(left, padding), window.innerWidth - padding)

  return { top, left, transform, arrowPlacement }
}

function getArrowClass(arrowPlacement: Placement) {
  switch (arrowPlacement) {
    case 'top':
      return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-indigo-500'
    case 'left':
      return 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-indigo-500'
    case 'right':
      return 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-indigo-500'
    case 'bottom-end':
      return 'top-0 right-4 -translate-y-full border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-indigo-500'
    case 'bottom':
    default:
      return 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-indigo-500'
  }
}

export default function GuideBubble({
  targetRef,
  open,
  anchorKey,
  content,
  placement = 'bottom',
  stepLabel,
  isLast = false,
  onNext,
  onDismissSession,
  onDismissPermanently,
}: GuideBubbleProps) {
  const [layout, setLayout] = useState<ReturnType<typeof getBubbleStyle> | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setLayout(null)
      return
    }

    let frame = 0
    const update = () => {
      if (targetRef.current) {
        setLayout(getBubbleStyle(targetRef.current.getBoundingClientRect(), placement))
        return
      }
      if (frame < 12) {
        frame += 1
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, targetRef, anchorKey, placement])

  if (!open || !layout || !targetRef.current) return null

  const rect = targetRef.current.getBoundingClientRect()

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onDismissSession} aria-hidden />
      <div
        className="pointer-events-none fixed z-40 rounded-lg ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
      <div
        className="fixed z-50 w-[min(16rem,calc(100vw-1.5rem))] rounded-xl bg-indigo-500 px-3.5 py-3 text-white shadow-xl"
        style={{ top: layout.top, left: layout.left, transform: layout.transform }}
        role="dialog"
        aria-live="polite"
      >
        <span className={`pointer-events-none absolute h-0 w-0 ${getArrowClass(layout.arrowPlacement)}`} />
        {stepLabel && <p className="mb-1 text-xs font-medium text-indigo-100">{stepLabel}</p>}
        <div className="text-sm leading-relaxed">{content}</div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
          <button type="button" className="rounded px-1.5 py-0.5 text-xs text-indigo-100 hover:text-white" onClick={onDismissPermanently}>
            不再提示
          </button>
          <button type="button" className="rounded px-1.5 py-0.5 text-xs text-indigo-100 hover:text-white" onClick={onDismissSession}>
            跳过
          </button>
          <Button type="button" size="sm" variant="secondary" className="h-7 px-3 text-xs" onClick={onNext}>
            {isLast ? '知道了' : '下一步'}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  )
}
