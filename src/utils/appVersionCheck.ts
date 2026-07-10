import { getAppBuildId } from '@/utils/cacheBust'
import { publicUrl } from '@/utils/publicUrl'

const RELOAD_SESSION_KEY = 'appVersionReloadAttempt'

type VersionPayload = {
  hash?: string
}

/**
 * 对比线上 version.json 与当前 bundle 的构建 hash。
 * 若不一致则自动刷新一次以加载新 index.html / JS（不清理 localStorage / IndexedDB）。
 */
export async function checkForAppUpdate(): Promise<void> {
  if (import.meta.env.DEV) return

  const buildId = getAppBuildId()
  if (!buildId) return

  try {
    const response = await fetch(publicUrl(`/version.json?_=${Date.now()}`), {
      cache: 'no-store',
    })
    if (!response.ok) return

    const payload = (await response.json()) as VersionPayload
    const remoteHash = payload.hash?.trim()
    if (!remoteHash || remoteHash === buildId) return

    if (sessionStorage.getItem(RELOAD_SESSION_KEY) === remoteHash) return

    sessionStorage.setItem(RELOAD_SESSION_KEY, remoteHash)
    window.location.reload()
  } catch {
    // 网络异常时静默跳过，避免影响正常使用
  }
}
