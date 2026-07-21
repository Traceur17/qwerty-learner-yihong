import { dismissUpdateAnnouncementAtom } from '@/store'
import noop from '@/utils/noop'
import { Dialog, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import type { ReactNode } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import IconClipboardCheck from '~icons/tabler/clipboard-check'
import IconKeyboard from '~icons/tabler/keyboard'
import IconX from '~icons/tabler/x'

type UpdateItem = {
  tag: string
  title: string
  summary: ReactNode
  figure?: ReactNode
  details: string[]
  icon: typeof IconKeyboard
}

const UPDATE_ITEMS: UpdateItem[] = [
  {
    tag: '连播',
    title: '底栏更像指标栏',
    summary: '播放、间隔、计时、对答案排成一排；对答案后正确率会平滑展开。',
    details: ['主题色图标：播放 / 暂停、对答案 / 收起', '正确率按已判分行计算'],
    icon: IconClipboardCheck,
  },
  {
    tag: '连播',
    title: '操作小改进',
    summary: '左右键还光标，对答案后点卡片可听发音。',
    details: ['←→ 只移光标；Enter / Tab / ↑↓ 切行', '点词条卡片发音（题号除外）', '题号加宽；滚动条半透明、悬停变实'],
    icon: IconKeyboard,
  },
]

const TAG_COLORS: Record<string, string> = {
  练习: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200',
  错题: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  听写: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  连播: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  词库: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  体验: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  界面: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
}

export default function UpdateAnnouncement() {
  const [dismissed, setDismissed] = useAtom(dismissUpdateAnnouncementAtom)
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dismissed) return

    const timer = window.setTimeout(() => {
      setIsOpen(true)
    }, 800)

    return () => window.clearTimeout(timer)
  }, [dismissed])

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

                  <div className="flex flex-col gap-2 pr-10 md:flex-row md:items-end md:justify-between">
                    <div>
                      <Dialog.Title className="text-3xl font-bold tracking-wide text-indigo-600 dark:text-indigo-300 md:text-4xl">
                        致 小圆饼干
                      </Dialog.Title>
                      <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
                        小圆饼干，你好！这次主要打磨了
                        <strong className="font-medium text-gray-800 dark:text-gray-100">连播底栏</strong>和
                        <strong className="font-medium text-gray-800 dark:text-gray-100">操作体验</strong>
                        ，对答案后也能看到正确率。
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-gray-500 dark:text-gray-400 md:text-right">2026-07-21</p>
                  </div>
                </div>

                <div className="customized-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-7">
                  <div className={`grid grid-cols-1 gap-5 lg:gap-x-6 lg:gap-y-5 ${UPDATE_ITEMS.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                    {UPDATE_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (
                        <article
                          key={item.title}
                          className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/40"
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
                            <ul className="mt-3 space-y-1.5">
                              {item.details.map((detail) => (
                                <li key={detail} className="flex gap-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-700 md:px-10">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  >
                    稍后再看
                  </button>
                  <button type="button" onClick={handleDismissPermanently} className="my-btn-primary h-11 px-8 text-sm">
                    知道了，不再提示
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
