import BiscuitIcon from '@/components/BiscuitIcon'
import { dismissUpdateAnnouncementAtom } from '@/store'
import noop from '@/utils/noop'
import { Dialog, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import IconCog6Tooth from '~icons/heroicons/cog-6-tooth-solid'
import IconArrowRight from '~icons/tabler/arrow-narrow-right'
import IconCheck from '~icons/tabler/check'
import IconCookie from '~icons/tabler/cookie'
import IconKey from '~icons/tabler/key'
import IconPlugConnected from '~icons/tabler/plug-connected'
import IconX from '~icons/tabler/x'

type IconComp = ComponentType<SVGProps<SVGSVGElement>>

function StepArrow() {
  return <IconArrowRight className="mx-0.5 h-4 w-4 shrink-0 text-indigo-300 dark:text-indigo-500 sm:mx-1.5" aria-hidden />
}

function StepBubble({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800 sm:h-16 sm:w-16">
        {children}
      </div>
      <span className="text-[11px] font-medium leading-tight text-gray-600 dark:text-gray-300">{label}</span>
    </div>
  )
}

/** 只展示入口：左上角 Logo + slogan；「点这里」标在饼干上 */
function CollectEntryFigure() {
  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-600 dark:bg-gray-800/80">
      <div className="inline-flex items-center">
        <div className="relative shrink-0">
          <BiscuitIcon className="h-11 w-11 md:h-12 md:w-12" title="" />
          <span className="absolute -right-3 -top-2 whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            点这里
          </span>
        </div>
        <h1 className="ml-2 truncate text-xl font-bold text-indigo-500 md:text-2xl">Empress Biscuit</h1>
      </div>
      <p className="mt-2 text-xs text-gray-400">练习页左上角</p>
    </div>
  )
}

function GeminiSetupFigure() {
  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white px-2 py-3 dark:border-gray-600 dark:bg-gray-800/80 sm:px-4">
      <div className="flex items-center justify-between gap-0.5 sm:gap-1">
        <StepBubble label="设置">
          <IconCog6Tooth className="h-7 w-7 text-indigo-500" />
        </StepBubble>
        <StepArrow />
        <StepBubble label="找华仔要 key">
          <IconKey className="h-7 w-7 text-amber-500" />
        </StepBubble>
        <StepArrow />
        <StepBubble label="测试连通">
          <IconPlugConnected className="h-7 w-7 text-sky-500" />
        </StepBubble>
        <StepArrow />
        <StepBubble label="保存">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
            <IconCheck className="h-5 w-5" />
          </span>
        </StepBubble>
      </div>
    </div>
  )
}

type UpdateItem = {
  tag: string
  title: string
  summary: ReactNode
  figure?: ReactNode
  icon: IconComp
}

const UPDATE_ITEMS: UpdateItem[] = [
  {
    tag: '词库',
    title: '收集小饼干',
    summary: '点左上角饼干就能收词。',
    figure: <CollectEntryFigure />,
    icon: IconCookie,
  },
  {
    tag: '设置',
    title: '配置 Gemini API Key',
    summary: '用之前先配一次 Key（只存在你这台浏览器）。',
    figure: <GeminiSetupFigure />,
    icon: IconKey,
  },
]

const TAG_COLORS: Record<string, string> = {
  练习: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200',
  错题: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  听写: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  连播: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  词库: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  设置: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  体验: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  界面: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
}

export default function UpdateAnnouncement() {
  const [dismissed, setDismissed] = useAtom(dismissUpdateAnnouncementAtom)
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const isHome = location.pathname === '/'
  const hasAutoOpenedRef = useRef(false)

  useEffect(() => {
    if (dismissed || !isHome) {
      setIsOpen(false)
      return
    }
    if (hasAutoOpenedRef.current) return

    const timer = window.setTimeout(() => {
      hasAutoOpenedRef.current = true
      setIsOpen(true)
    }, 800)

    return () => window.clearTimeout(timer)
  }, [dismissed, isHome])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDismissPermanently = () => {
    setDismissed(true)
    setIsOpen(false)
  }

  return (
    <Transition appear show={isOpen} as={Fragment} afterLeave={noop}>
      <Dialog as="div" className="relative z-50" onClose={handleClose} initialFocus={panelRef}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500/40 dark:bg-gray-900/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                ref={panelRef}
                className="my-card flex max-h-[min(88vh,820px)] w-[min(94vw,64rem)] flex-col overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="relative shrink-0 border-b border-indigo-50 bg-gradient-to-br from-indigo-50 via-white to-amber-50/40 px-6 pb-5 pt-8 dark:border-gray-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-800 md:px-10 md:pt-10">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="absolute right-5 top-5 rounded-full p-1.5 text-gray-400 outline-none transition-colors hover:bg-white/80 hover:text-gray-600 focus:outline-none focus:ring-0 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    aria-label="关闭"
                  >
                    <IconX className="h-6 w-6" />
                  </button>

                  <div className="flex flex-col gap-2 pr-10 text-left md:flex-row md:items-end md:justify-between">
                    <div>
                      <Dialog.Title className="text-3xl font-bold tracking-wide text-indigo-600 dark:text-indigo-300 md:text-4xl">
                        致 小圆饼干
                      </Dialog.Title>
                      <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
                        新功能
                        <strong className="font-medium text-gray-800 dark:text-gray-100">收集小饼干</strong>
                        来啦～看图就会用。
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-gray-500 dark:text-gray-400 md:text-right">2026-07-22</p>
                  </div>
                </div>

                <div className="customized-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-7">
                  <div className="grid grid-cols-1 gap-5">
                    {UPDATE_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (
                        <article
                          key={item.title}
                          className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-5 text-left dark:border-gray-700 dark:bg-gray-900/40"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TAG_COLORS[item.tag] ?? TAG_COLORS['练习']}`}
                              >
                                {item.tag}
                              </span>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{item.title}</h3>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{item.summary}</p>
                            {item.figure}
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <p className="mt-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-4 text-left text-sm leading-relaxed text-indigo-900/80 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-100/80">
                    练习记录和小饼干罐都在本机；用着不顺手随时告诉我～
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-100 px-6 py-5 dark:border-gray-700 md:px-10">
                  <p className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">点击「不再提示」后，下次发版前不再显示本页</p>
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      知道了
                    </button>
                    <button type="button" onClick={handleDismissPermanently} className="my-btn-primary h-11 px-8 text-sm">
                      不再提示
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
