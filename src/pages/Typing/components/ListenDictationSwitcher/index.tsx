import { listenDictationConfigAtom, wordDictationConfigAtom } from '@/store'
import { Popover, Switch, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import { Fragment } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import IconHeadphones from '~icons/tabler/headphones'
import IconHeadphonesOff from '~icons/tabler/headphones-off'

export default function ListenDictationSwitcher() {
  const [listenDictationConfig, setListenDictationConfig] = useAtom(listenDictationConfigAtom)
  const [, setWordDictationConfig] = useAtom(wordDictationConfigAtom)

  const onToggleListenDictation = () => {
    setListenDictationConfig((old) => {
      const nextOpen = !old.isOpen
      if (nextOpen) {
        setWordDictationConfig((prev) => ({ ...prev, isOpen: false }))
      }
      return { ...old, isOpen: nextOpen }
    })
  }

  const onToggleDisplayOption = (key: 'showPrevWord' | 'showPhonetic' | 'showTranslation') => {
    setListenDictationConfig((old) => ({ ...old, [key]: !old[key] }))
  }

  useHotkeys(
    'ctrl+shift+d',
    () => {
      onToggleListenDictation()
    },
    { enableOnFormTags: true, preventDefault: true },
    [],
  )

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center rounded p-[2px] text-lg ${
              listenDictationConfig.isOpen ? 'text-indigo-500' : 'text-gray-500'
            } outline-none transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white  ${
              open ? 'bg-indigo-500 text-white' : ''
            }`}
            type="button"
            aria-label="开关听写模式"
          >
            {listenDictationConfig.isOpen ? <IconHeadphones className="icon" /> : <IconHeadphonesOff className="icon" />}
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-1/2 z-10 mt-2 flex max-w-max -translate-x-1/2 px-4 ">
              <div className="shadow-upper box-border flex w-60 select-none flex-col items-center justify-center gap-4 rounded-xl bg-white p-4 drop-shadow dark:bg-gray-800">
                <div className="flex w-full flex-col items-start gap-2 py-0">
                  <span className="text-sm font-normal leading-5 text-gray-900 dark:text-white dark:text-opacity-60">开关听写模式</span>
                  <div className="flex w-full flex-row items-center justify-between">
                    <Switch checked={listenDictationConfig.isOpen} onChange={onToggleListenDictation} className="switch-root">
                      <span aria-hidden="true" className="switch-thumb" />
                    </Switch>
                    <span className="text-right text-xs font-normal leading-tight text-gray-600">{`听写已${
                      listenDictationConfig.isOpen ? '开启' : '关闭'
                    }`}</span>
                  </div>
                </div>

                <Transition
                  show={listenDictationConfig.isOpen}
                  className="flex w-full flex-col items-center justify-center gap-4"
                  enter="transition-all duration-300 ease-in"
                  enterFrom="max-h-0 opacity-0"
                  enterTo="max-h-[300px] opacity-100"
                  leave="transition-all duration-300 ease-out"
                  leaveFrom="max-h-[300px] opacity-100"
                  leaveTo="max-h-0 opacity-0"
                >
                  <div className="flex w-full flex-col items-start gap-3">
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
                  </div>
                </Transition>

                <p className="text-xs text-gray-500 dark:text-gray-400">听写与默写模式互斥，按 Enter 提交整词</p>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
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
