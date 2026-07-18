import GuideBubble from '@/components/GuideBubble'
import { dismissChapterErrorBookGuideAtom } from '@/store'
import { useAtom } from 'jotai'
import { type RefObject, useCallback, useState } from 'react'

export type ChapterErrorBookGuideTargets = {
  selectRef: RefObject<HTMLElement | null>
  practiceRef: RefObject<HTMLElement | null>
  rowRef: RefObject<HTMLElement | null>
  closeRef: RefObject<HTMLElement | null>
}

const GUIDE_STEPS = [
  {
    key: 'select',
    target: 'selectRef' as const,
    content: '勾选错词，可只练习选中的部分',
    placement: 'bottom' as const,
  },
  {
    key: 'practice',
    target: 'practiceRef' as const,
    content: '不勾选时，点此练习本章全部错词',
    placement: 'bottom' as const,
  },
  {
    key: 'row',
    target: 'rowRef' as const,
    content: '点击单词行，查看错词详情',
    placement: 'bottom' as const,
  },
  {
    key: 'close',
    target: 'closeRef' as const,
    content: '关闭后回到进入错题本前的章节进度',
    placement: 'bottom-end' as const,
  },
]

type ChapterErrorBookGuideProps = {
  targets: ChapterErrorBookGuideTargets
  hasRows: boolean
}

export default function ChapterErrorBookGuide({ targets, hasRows }: ChapterErrorBookGuideProps) {
  const [dismissedPermanently, setDismissedPermanently] = useAtom(dismissChapterErrorBookGuideAtom)
  const [hiddenThisSession, setHiddenThisSession] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const visibleSteps = hasRows ? GUIDE_STEPS : GUIDE_STEPS.filter((step) => step.key !== 'row')

  const handleDismissPermanently = useCallback(() => {
    setDismissedPermanently(true)
    setHiddenThisSession(true)
  }, [setDismissedPermanently])

  const handleDismissSession = useCallback(() => {
    setHiddenThisSession(true)
  }, [])

  const handleNext = useCallback(() => {
    if (stepIndex >= visibleSteps.length - 1) {
      setHiddenThisSession(true)
      return
    }
    setStepIndex((prev) => prev + 1)
  }, [stepIndex, visibleSteps.length])

  if (dismissedPermanently || hiddenThisSession) return null

  const currentStep = visibleSteps[stepIndex]
  if (!currentStep) return null

  const targetRef = targets[currentStep.target]
  const stepLabel = `${stepIndex + 1}/${visibleSteps.length}`

  return (
    <GuideBubble
      targetRef={targetRef}
      open
      anchorKey={`${currentStep.key}-${stepIndex}-${hasRows}`}
      content={currentStep.content}
      placement={currentStep.placement}
      stepLabel={stepLabel}
      isLast={stepIndex >= visibleSteps.length - 1}
      onNext={handleNext}
      onDismissSession={handleDismissSession}
      onDismissPermanently={handleDismissPermanently}
    />
  )
}
