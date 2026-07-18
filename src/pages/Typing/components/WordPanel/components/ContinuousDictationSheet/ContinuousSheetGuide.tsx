import GuideBubble from '@/components/GuideBubble'
import { dismissContinuousSheetGuideAtom } from '@/store'
import { useAtom } from 'jotai'
import type { ReactNode, RefObject } from 'react'
import { useCallback, useState } from 'react'

export type ContinuousSheetGuideTargets = {
  numberRef: RefObject<HTMLElement | null>
  inputRef: RefObject<HTMLElement | null>
  gradeRef: RefObject<HTMLElement | null>
}

type GuideStep = {
  key: string
  target: keyof ContinuousSheetGuideTargets
  content: ReactNode
  placement: 'top' | 'bottom' | 'bottom-end' | 'left' | 'right'
}

const GUIDE_STEPS: GuideStep[] = [
  {
    key: 'number',
    target: 'numberRef',
    content: '题号就是遥控器：点当前题可暂停 / 继续，点其他题从那题起播。按 Esc 可随时暂停。',
    placement: 'right',
  },
  {
    key: 'input',
    target: 'inputRef',
    content: '边听边写，Enter 或 ↑↓ 在输入框之间切换，已播过的题都可以回头补写。',
    placement: 'bottom',
  },
  {
    key: 'grade',
    target: 'gradeRef',
    content: (
      <>
        <p>写完点「对答案」：对的行显示 ✓ 与释义，错的行给出修订对照。</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-300" />
          <span>写错过</span>
          <span className="ml-2 inline-block h-2 w-2 shrink-0 rounded-full bg-red-400" />
          <span>反复写错</span>
        </p>
        <p className="mt-1 text-xs text-indigo-100">圆点出现在错题右侧，悬停可查看历史错答，按空格可钉住。</p>
      </>
    ),
    placement: 'top',
  },
]

export default function ContinuousSheetGuide({ targets }: { targets: ContinuousSheetGuideTargets }) {
  const [dismissedPermanently, setDismissedPermanently] = useAtom(dismissContinuousSheetGuideAtom)
  const [hiddenThisSession, setHiddenThisSession] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const handleDismissPermanently = useCallback(() => {
    setDismissedPermanently(true)
    setHiddenThisSession(true)
  }, [setDismissedPermanently])

  const handleDismissSession = useCallback(() => {
    setHiddenThisSession(true)
  }, [])

  const handleNext = useCallback(() => {
    if (stepIndex >= GUIDE_STEPS.length - 1) {
      setHiddenThisSession(true)
      return
    }
    setStepIndex((prev) => prev + 1)
  }, [stepIndex])

  if (dismissedPermanently || hiddenThisSession) return null

  const currentStep = GUIDE_STEPS[stepIndex]
  if (!currentStep) return null

  return (
    <GuideBubble
      targetRef={targets[currentStep.target]}
      open
      anchorKey={`${currentStep.key}-${stepIndex}`}
      content={currentStep.content}
      placement={currentStep.placement}
      stepLabel={`${stepIndex + 1}/${GUIDE_STEPS.length}`}
      isLast={stepIndex >= GUIDE_STEPS.length - 1}
      onNext={handleNext}
      onDismissSession={handleDismissSession}
      onDismissPermanently={handleDismissPermanently}
    />
  )
}
