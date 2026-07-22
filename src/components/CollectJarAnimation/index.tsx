import BiscuitIcon from '@/components/BiscuitIcon'
import { publicUrl } from '@/utils/publicUrl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type CollectJarAnimationProps = {
  /** Increment / change to replay the animation */
  playToken: number
  addedCount: number
  totalCount: number
  onDone?: () => void
}

/**
 * Full-screen center animation: biscuits drop into the jar, then show count badge.
 * Click any blank area (or anywhere on the overlay) to dismiss early.
 */
export default function CollectJarAnimation({ playToken, addedCount, totalCount, onDone }: CollectJarAnimationProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
    onDone?.()
  }, [onDone])

  useEffect(() => {
    if (!playToken) return
    setVisible(true)
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setVisible(false)
      onDone?.()
    }, 3200)
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [playToken, onDone])

  if (!visible) return null

  const biscuits = Math.min(Math.max(addedCount, 1), 5)

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-black/20"
      onMouseDown={(e) => {
        // Any press on the overlay (including blank areas) ends the scene
        e.preventDefault()
        dismiss()
      }}
    >
      <div className="pointer-events-none relative flex animate-[jar-scene-in_0.35s_ease-out] flex-col items-center">
        <div className="relative">
          <img
            src={publicUrl('/biscuit-jar.png?v=open-lid-3')}
            alt="小饼干罐"
            className="h-48 w-48 object-contain drop-shadow-xl md:h-60 md:w-60"
            draggable={false}
          />
          <span className="absolute -right-2 -top-2 flex h-8 min-w-[2rem] animate-[jar-badge-pop_0.45s_ease-out_1.1s_both] items-center justify-center rounded-full bg-amber-500 px-2 text-sm font-bold text-white shadow-lg">
            {totalCount}
          </span>

          {Array.from({ length: biscuits }).map((_, i) => (
            <span
              key={`${playToken}-${i}`}
              className="absolute left-1/2 top-0 -translate-x-1/2"
              style={{
                animation: `biscuit-drop-in 0.9s ease-in ${0.15 * i}s both`,
              }}
            >
              <BiscuitIcon className="h-10 w-10 md:h-12 md:w-12" title="" />
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-white drop-shadow">+{addedCount}</p>
      </div>

      <style>{`
        @keyframes jar-scene-in {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes biscuit-drop-in {
          0% { transform: translate(-50%, -140px) scale(1.2); opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translate(-50%, 42px) scale(0.4); opacity: 0; }
        }
        @keyframes jar-badge-pop {
          0% { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  )
}
