import { listenDictationConfigAtom, wordDictationConfigAtom } from '@/store'
import type { WordDictationType } from '@/typings'
import { Listbox, Switch, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import { Fragment, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import IconEyeSlash from '~icons/heroicons/eye-slash-solid'
import IconEye from '~icons/heroicons/eye-solid'
import IconCheck from '~icons/tabler/check'
import IconChevronDown from '~icons/tabler/chevron-down'
import IconHeadphones from '~icons/tabler/headphones'
import IconHeadphonesOff from '~icons/tabler/headphones-off'

type ActiveMode = 'none' | 'listen' | 'word'

const wordDictationTypeList: { name: string; type: WordDictationType }[] = [
  { name: '全部隐藏', type: 'hideAll' },
  { name: '隐藏元音', type: 'hideVowel' },
  { name: '隐藏辅音', type: 'hideConsonant' },
  { name: '随机隐藏', type: 'randomHide' },
]

export default function ListenDictationSwitcher() {
  const [listenDictationConfig, setListenDictationConfig] = useAtom(listenDictationConfigAtom)
  const [wordDictationConfig, setWordDictationConfig] = useAtom(wordDictationConfigAtom)
  const [panelOpen, setPanelOpen] = useState(false)
  const [currentType, setCurrentType] = useState(
    () => wordDictationTypeList.find((item) => item.type === wordDictationConfig.type) || wordDictationTypeList[0],
  )
  const rootRef = useRef<HTMLDivElement>(null)

  const activeMode: ActiveMode = listenDictationConfig.isOpen ? 'listen' : wordDictationConfig.isOpen ? 'word' : 'none'

  useLayoutEffect(() => {
    setCurrentType(wordDictationTypeList.find((item) => item.type === wordDictationConfig.type) || wordDictationTypeList[0])
  }, [wordDictationConfig.type])

  /** 只改 isOpen，其余字段（连播间隔、隐藏类型等）原样保留 */
  const enableListen = useCallback(() => {
    setWordDictationConfig((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
    setListenDictationConfig((old) => (old.isOpen ? old : { ...old, isOpen: true }))
    setPanelOpen(true)
  }, [setListenDictationConfig, setWordDictationConfig])

  const enableWord = useCallback(() => {
    setListenDictationConfig((old) => (old.isOpen ? { ...old, isOpen: false } : old))
    setWordDictationConfig((prev) => (prev.isOpen ? prev : { ...prev, isOpen: true, openBy: 'user' }))
    setPanelOpen(true)
  }, [setListenDictationConfig, setWordDictationConfig])

  const disableListen = useCallback(() => {
    setListenDictationConfig((old) => (old.isOpen ? { ...old, isOpen: false } : old))
  }, [setListenDictationConfig])

  const disableWord = useCallback(() => {
    setWordDictationConfig((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
  }, [setWordDictationConfig])

  const onListenClick = () => {
    if (activeMode === 'listen') {
      if (panelOpen) {
        disableListen()
        setPanelOpen(false)
      } else {
        setPanelOpen(true)
      }
      return
    }
    enableListen()
  }

  const onWordClick = () => {
    if (activeMode === 'word') {
      if (panelOpen) {
        disableWord()
        setPanelOpen(false)
      } else {
        setPanelOpen(true)
      }
      return
    }
    enableWord()
  }

  const onToggleDisplayOption = (key: 'showPrevWord' | 'showPhonetic' | 'showTranslation' | 'sheetMode' | 'talentCelebration') => {
    setListenDictationConfig((old) => ({ ...old, [key]: !old[key] }))
  }

  const onChangeWordDictationType = (value: WordDictationType) => {
    setWordDictationConfig((old) => ({ ...old, type: value }))
  }

  useEffect(() => {
    if (!panelOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setPanelOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [panelOpen])

  useHotkeys(
    'alt+c',
    () => {
      if (listenDictationConfig.isOpen) {
        disableListen()
        setPanelOpen(false)
      } else {
        enableListen()
      }
    },
    { enableOnFormTags: true, preventDefault: true },
    [disableListen, enableListen, listenDictationConfig.isOpen],
  )

  useHotkeys(
    'alt+v',
    () => {
      if (wordDictationConfig.isOpen) {
        disableWord()
        setPanelOpen(false)
      } else {
        enableWord()
      }
    },
    { enableOnFormTags: true, preventDefault: true },
    [disableWord, enableWord, wordDictationConfig.isOpen],
  )

  const gapSec = Math.max(0, listenDictationConfig.gapMs) / 1000
  const showPanel = panelOpen && activeMode !== 'none'

  const onGapSecChange = (raw: string) => {
    if (raw.trim() === '') {
      setListenDictationConfig((old) => ({ ...old, gapMs: 0 }))
      return
    }
    const sec = Number(raw)
    if (!Number.isFinite(sec) || sec < 0) return
    setListenDictationConfig((old) => ({ ...old, gapMs: Math.round(sec * 1000) }))
  }

  return (
    <div className="relative" ref={rootRef}>
      <div
        className="flex overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
        role="radiogroup"
        aria-label="听写 / 默写"
      >
        <IconModeButton
          selected={activeMode === 'listen'}
          panelOpen={showPanel && activeMode === 'listen'}
          onClick={onListenClick}
          ariaLabel="听写模式"
          title="听写"
        >
          {activeMode === 'listen' ? <IconHeadphones className="icon" /> : <IconHeadphonesOff className="icon" />}
        </IconModeButton>
        <IconModeButton
          selected={activeMode === 'word'}
          panelOpen={showPanel && activeMode === 'word'}
          onClick={onWordClick}
          ariaLabel="默写模式"
          title="默写"
        >
          {activeMode === 'word' ? <IconEye className="icon" /> : <IconEyeSlash className="icon" />}
        </IconModeButton>
      </div>

      <Transition
        show={showPanel}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <div className="absolute left-1/2 z-10 mt-2 flex max-w-max -translate-x-1/2 px-4">
          <div className="shadow-upper box-border flex w-64 select-none flex-col items-center justify-center gap-4 rounded-xl bg-white p-4 drop-shadow dark:bg-gray-800">
            {activeMode === 'listen' ? (
              <>
                <div className="flex w-full flex-col items-start gap-3">
                  <span className="text-sm font-normal leading-5 text-gray-900 dark:text-white dark:text-opacity-60">听写设置</span>
                  <DisplayOptionSwitch
                    label="连播卷面"
                    checked={listenDictationConfig.sheetMode}
                    onChange={() => onToggleDisplayOption('sheetMode')}
                  />
                  {listenDictationConfig.sheetMode ? (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-sm font-normal leading-5 text-gray-900 dark:text-white dark:text-opacity-60">连播间隔</span>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          inputMode="decimal"
                          value={gapSec}
                          onChange={(e) => onGapSecChange(e.target.value)}
                          className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-right font-mono text-sm text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                          aria-label="连播间隔秒数"
                        />
                        <span className="text-xs text-gray-500">s</span>
                      </label>
                    </div>
                  ) : (
                    <>
                      <DisplayOptionSwitch
                        label="显示上一词"
                        checked={listenDictationConfig.showPrevWord}
                        onChange={() => onToggleDisplayOption('showPrevWord')}
                      />
                      <DisplayOptionSwitch
                        label="显示音标"
                        checked={listenDictationConfig.showPhonetic}
                        onChange={() => onToggleDisplayOption('showPhonetic')}
                      />
                      <DisplayOptionSwitch
                        label="显示翻译"
                        checked={listenDictationConfig.showTranslation}
                        onChange={() => onToggleDisplayOption('showTranslation')}
                      />
                    </>
                  )}
                  <DisplayOptionSwitch
                    label="展示我的天分"
                    checked={listenDictationConfig.talentCelebration}
                    onChange={() => onToggleDisplayOption('talentCelebration')}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {listenDictationConfig.sheetMode
                    ? '连播卷面：点题号起播，对答案揭晓英文与错史'
                    : '原始听写：按 Enter 提交整词。快捷键 Alt+C 开关'}
                </p>
              </>
            ) : (
              <>
                <div className="flex w-full flex-col items-start gap-2 py-0">
                  <span className="text-sm font-normal leading-5 text-gray-900 dark:text-white dark:text-opacity-60">默写设置</span>
                  <div className="flex w-full flex-row items-center justify-between">
                    <Listbox value={currentType.type} onChange={onChangeWordDictationType}>
                      <div className="relative">
                        <Listbox.Button className="listbox-button">
                          <span>{currentType.name}</span>
                          <span>
                            <IconChevronDown className="focus:outline-none" />
                          </span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                          <Listbox.Options className="listbox-options">
                            {wordDictationTypeList.map((item) => (
                              <Listbox.Option key={item.name} value={item.type}>
                                {({ selected }) => (
                                  <>
                                    <span>{item.name}</span>
                                    {selected ? (
                                      <span className="listbox-options-icon">
                                        <IconCheck className="focus:outline-none" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">听写与默写互斥。快捷键 Alt+V 开关默写</p>
              </>
            )}
          </div>
        </div>
      </Transition>
    </div>
  )
}

function IconModeButton({
  selected,
  panelOpen,
  onClick,
  ariaLabel,
  title,
  children,
}: {
  selected: boolean
  panelOpen: boolean
  onClick: () => void
  ariaLabel: string
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-expanded={panelOpen}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center p-1.5 text-lg outline-none transition-colors ${
        selected
          ? 'bg-indigo-500 text-white'
          : 'bg-transparent text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-indigo-300'
      } ${panelOpen ? 'ring-2 ring-indigo-300 ring-offset-1 dark:ring-offset-gray-800' : ''}`}
    >
      {children}
    </button>
  )
}

function DisplayOptionSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex w-full flex-row items-center justify-between">
      <span className="text-sm font-normal leading-5 text-gray-900 dark:text-white dark:text-opacity-60">{label}</span>
      <Switch checked={checked} onChange={onChange} className="switch-root">
        <span aria-hidden="true" className="switch-thumb" />
      </Switch>
    </div>
  )
}
