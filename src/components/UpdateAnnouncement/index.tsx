import { dismissUpdateAnnouncementAtom } from '@/store'
import noop from '@/utils/noop'
import { Dialog, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import type { ReactNode } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import IconBook from '~icons/tabler/book'
import IconX from '~icons/tabler/x'

type UpdateItem = {
  tag: string
  title: string
  summary: ReactNode
  figure?: ReactNode
  details: string[]
  icon: typeof IconBook
}

/** 错题本视图切换示意：最新错题 / 全部错题 */
function ErrorBookViewFigure() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-rose-200 bg-white/70 px-4 py-3 dark:border-rose-800 dark:bg-gray-900/40">
      <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600">
        <span className="rounded-md bg-indigo-500 px-2.5 py-1 text-xs text-white">最新错题 (5)</span>
        <span className="rounded-md px-2.5 py-1 text-xs text-gray-500 dark:text-gray-300">全部错题 (12)</span>
      </div>
      <p className="w-full text-xs text-gray-500 dark:text-gray-400 sm:w-auto sm:flex-1">
        错题本顶部新增切换：默认只看还没搞定的词，切「全部错题」回顾完整历史
      </p>
    </div>
  )
}

const UPDATE_ITEMS: UpdateItem[] = [
  {
    tag: '错题',
    title: '错题本变聪明了：练对自动清',
    summary:
      '错题不再只进不出：一个词只要最近一次练对了，就自动移出「最新错题」；之后哪天又写错，它会自己回来。你只需要专注练，错题本自己保持干净。',
    figure: <ErrorBookViewFigure />,
    details: [
      '「全部错题」保留完整历史与累计错误次数，按次数排序，勾选高频词随时回炉',
      '连播卷面「对答案」的对错同样计入：错的进错题本，对的算掌握',
      '结算页「练习错题」的数量同步变化，清完就是 0',
      '删除记录等操作照旧，历史错误次数永远保留',
    ],
    icon: IconBook,
  },
]

const TAG_COLORS: Record<string, string> = {
  练习: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200',
  错题: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  听写: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
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

    return () => clearTimeout(timer)
  }, [dismissed])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDismissPermanently = () => {
    setDismissed(true)
    setIsOpen(false)
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" initialFocus={panelRef} onClose={noop}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="bg-black/45 fixed inset-0 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto p-4 md:p-6 xl:p-8">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 scale-[0.98]"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-4 scale-[0.98]"
          >
            <Dialog.Panel
              ref={panelRef}
              tabIndex={-1}
              className="my-card flex max-h-[min(88vh,820px)] w-[min(94vw,64rem)] flex-col overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Header */}
              <div className="relative shrink-0 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-8 py-7 dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-950/40 md:px-10 md:py-8">
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
                      小圆饼干，你好！这次更新让
                      <strong className="font-medium text-gray-800 dark:text-gray-100">错题本</strong>
                      学会了自己收拾：练对的词自动移出，再错的自动回来——你只管练，它负责只留下真正难缠的词。
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-gray-500 dark:text-gray-400 md:text-right">2026-07-19</p>
                </div>
              </div>

              {/* Content */}
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
                              <li key={detail} className="flex gap-2 text-sm leading-snug text-gray-500 dark:text-gray-400">
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

                <p className="mt-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-4 text-sm leading-relaxed text-indigo-900/80 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-100/80">
                  小圆饼干，你的练习记录保存在浏览器本地，同域名更新后不会丢失。用着不顺手的地方，随时告诉我。
                </p>
              </div>

              {/* Footer */}
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
      </Dialog>
    </Transition.Root>
  )
}
