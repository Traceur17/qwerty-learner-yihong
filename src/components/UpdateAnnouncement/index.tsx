import talentAmazingImg from '@/assets/talent/talent-amazing.webp'
import { dismissUpdateAnnouncementAtom } from '@/store'
import noop from '@/utils/noop'
import { Dialog, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import type { ReactNode } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import IconEyeSlash from '~icons/heroicons/eye-slash-solid'
import IconHeadphones from '~icons/tabler/headphones'
import IconPlayerPlay from '~icons/tabler/player-play'
import IconSparkles from '~icons/tabler/sparkles'
import IconX from '~icons/tabler/x'

type UpdateItem = {
  tag: string
  title: string
  summary: ReactNode
  figure?: ReactNode
  details: string[]
  icon: typeof IconPlayerPlay
}

/** 连播卷面入口示意：工具栏耳机图标 → 弹框里打开「连播卷面」 */
function SheetModeEntryFigure() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-indigo-200 bg-white/70 px-4 py-3 dark:border-indigo-800 dark:bg-gray-900/40">
      <div className="flex overflow-hidden rounded-md border border-gray-200 shadow-sm dark:border-gray-600">
        <span className="flex items-center justify-center bg-indigo-500 p-1.5 text-white">
          <IconHeadphones className="h-4 w-4" />
        </span>
        <span className="flex items-center justify-center bg-white p-1.5 text-gray-400 dark:bg-gray-800">
          <IconEyeSlash className="h-4 w-4" />
        </span>
      </div>
      <span className="text-gray-400">→</span>
      <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600">
        <span className="text-xs text-gray-600 dark:text-gray-300">连播卷面</span>
        <span className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full bg-indigo-500">
          <span className="absolute right-0.5 h-3 w-3 rounded-full bg-white" />
        </span>
      </div>
      <p className="w-full text-xs text-gray-500 dark:text-gray-400 sm:w-auto sm:flex-1">工具栏点耳机图标，打开「连播卷面」开关即进入</p>
    </div>
  )
}

/** 「了不起的天分」徽章预览 + 开关入口示意：工具栏耳机图标 → 弹框里的「展示我的天分」开关 */
function TalentBadgeFigure() {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-amber-300 bg-white/70 px-4 py-4 dark:border-amber-700 dark:bg-gray-900/40">
        <img src={talentAmazingImg} alt="了不起的天分" draggable={false} className="w-56 max-w-full -rotate-3 select-none drop-shadow-lg" />
        <p className="text-xs text-gray-500 dark:text-gray-400">练得好的时刻，它会突然砸进屏幕。至于怎么让它出现——自己去发现</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-indigo-200 bg-white/70 px-4 py-3 dark:border-indigo-800 dark:bg-gray-900/40">
        <div className="flex overflow-hidden rounded-md border border-gray-200 shadow-sm dark:border-gray-600">
          <span className="flex items-center justify-center bg-indigo-500 p-1.5 text-white">
            <IconHeadphones className="h-4 w-4" />
          </span>
          <span className="flex items-center justify-center bg-white p-1.5 text-gray-400 dark:bg-gray-800">
            <IconEyeSlash className="h-4 w-4" />
          </span>
        </div>
        <span className="text-gray-400">→</span>
        <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600">
          <span className="text-xs text-gray-600 dark:text-gray-300">展示我的天分</span>
          <span className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full bg-indigo-500">
            <span className="absolute right-0.5 h-3 w-3 rounded-full bg-white" />
          </span>
        </div>
        <p className="w-full text-xs text-gray-500 dark:text-gray-400 sm:w-auto sm:flex-1">
          工具栏点耳机图标，「展示我的天分」开关随时可关
        </p>
      </div>
    </div>
  )
}

const UPDATE_ITEMS: UpdateItem[] = [
  {
    tag: '听写',
    title: '全新连播卷面模式',
    summary: '单词连续播报，像考试答题卡一样边听边写，写完统一对答案，还能看到每个词的历史错答。',
    figure: <SheetModeEntryFigure />,
    details: [
      '题号即遥控：点当前题暂停 / 继续，点其他题从那题起播，Esc 随时暂停',
      '对答案后：对的行显示 ✓ 与释义，错的行给出修订对照',
      '错题右侧圆点标记错史，悬停查看历史错答，空格钉住',
      '侧栏单词表可「从 xx 起播」，连播间隔可精确到 0.1 秒',
    ],
    icon: IconPlayerPlay,
  },
  {
    tag: '听写',
    title: '展示我的天分',
    summary: '给认真练习的你一点即时的喝彩：听写表现出色时，会有天分徽章弹出为你庆祝，章节结算也可能被盖上一枚天分印章。',
    figure: <TalentBadgeFigure />,
    details: ['目的只有一个：让每一次进步都被看见，练习更有游戏感', '默认开启，仅听写模式生效，不打扰打字练习'],
    icon: IconSparkles,
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
                      小圆饼干，你好！这次更新带来了
                      <strong className="font-medium text-gray-800 dark:text-gray-100">连播卷面模式</strong>
                      ——像考试一样连续听写、统一对答案；还有
                      <strong className="font-medium text-gray-800 dark:text-gray-100">展示我的天分</strong>
                      ——练得好的时刻，值得被大声宣布。
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-gray-500 dark:text-gray-400 md:text-right">2026-07-18</p>
                </div>
              </div>

              {/* Content */}
              <div className="customized-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-7">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5">
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
