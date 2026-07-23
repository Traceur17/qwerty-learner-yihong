import styles from './index.module.css'
import { geminiApiKeyAtom } from '@/store'
import { GEMINI_MODEL, GEMINI_QUOTA_TIP, testGeminiConnectivity } from '@/utils/gemini'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom } from 'jotai'
import { useCallback, useState } from 'react'
import IconAlertCircle from '~icons/tabler/alert-circle'

const API_KEY_HELP = `Key 仅保存在本机浏览器，请从 Google AI Studio 申请。

若提示「地区不支持」，是 Google 按访问 IP 限制，与 Key 无关；识别时需使用可访问 Gemini 的网络。

${GEMINI_QUOTA_TIP}`

export default function GeminiSetting() {
  const [storedKey, setStoredKey] = useAtom(geminiApiKeyAtom)
  const [draft, setDraft] = useState(storedKey)
  const [status, setStatus] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)

  const onSave = useCallback(() => {
    setStoredKey(draft.trim())
    setStatus('已保存到本机浏览器')
  }, [draft, setStoredKey])

  const onClear = useCallback(() => {
    setDraft('')
    setStoredKey('')
    setStatus('已清除 Key')
  }, [setStoredKey])

  const onTest = useCallback(async () => {
    const key = draft.trim() || storedKey.trim()
    if (!key) {
      setStatus('请先填写 Key')
      return
    }
    setTesting(true)
    setStatus('测试中…')
    const result = await testGeminiConnectivity(key)
    setTesting(false)
    setStatus(result.ok ? '连通成功' : `连通失败：${result.message}`)
  }, [draft, storedKey])

  return (
    <ScrollArea.Root className="flex-1 select-none overflow-y-auto">
      <ScrollArea.Viewport className="h-full w-full px-3">
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <div className="flex items-center gap-1.5">
              <span className={styles.sectionLabel}>Gemini API Key</span>
              <div className="relative inline-flex" onMouseEnter={() => setTipOpen(true)} onMouseLeave={() => setTipOpen(false)}>
                <button
                  type="button"
                  className="rounded-full text-gray-400 outline-none hover:text-amber-500 focus:text-amber-500"
                  aria-label="API Key 说明"
                  onClick={() => setTipOpen((v) => !v)}
                >
                  <IconAlertCircle className="h-5 w-5" />
                </button>
                {tipOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg bg-white p-3 text-left text-xs leading-relaxed text-gray-600 shadow-lg dark:bg-gray-700 dark:text-gray-200">
                    {API_KEY_HELP.split('\n').map((line, i) =>
                      line ? (
                        <p key={i} className={i > 0 ? 'mt-2' : undefined}>
                          {line}
                        </p>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            </div>
            <span className={styles.sectionDescription}>当前模型：{GEMINI_MODEL}</span>
            <div className={styles.block}>
              <input
                type="password"
                autoComplete="off"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="粘贴 Gemini API Key"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm text-white hover:bg-indigo-400"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={onTest}
                  disabled={testing}
                  className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300"
                >
                  测试连通
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:border-red-400"
                >
                  清除
                </button>
              </div>
              {status && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{status}</p>}
            </div>
          </div>
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  )
}
