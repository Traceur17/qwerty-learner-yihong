import { applyCanonicalVersionUrl, buildVersionRedirectUrl } from '@/utils/appVersionCheck'
import { getAppBuildId } from '@/utils/cacheBust'
import { publicUrl } from '@/utils/publicUrl'

type VersionPayload = {
  hash?: string
}

/**
 * 拉取线上 version.json，确保 URL 带当前 `_v` 版本号。
 * 同时注册 deploy SW，使无 `_v` 的旧书签在 SW 生效后也能网络优先拉取 index.html。
 */
export async function checkForAppUpdate(): Promise<void> {
  if (import.meta.env.DEV) return

  registerDeployServiceWorker()

  try {
    const response = await fetch(publicUrl(`/version.json?_=${Date.now()}`), {
      cache: 'no-store',
    })
    if (!response.ok) return

    const payload = (await response.json()) as VersionPayload
    const remoteHash = payload.hash?.trim()
    if (!remoteHash) return

    const redirected = applyCanonicalVersionUrl(remoteHash, window.location.href)
    if (redirected === 'redirect') return

    const buildId = getAppBuildId()
    if (buildId && buildId !== remoteHash) {
      const url = new URL(window.location.href)
      url.searchParams.set('_v', remoteHash)
      url.searchParams.set('_bust', String(Date.now()))
      window.location.replace(url.toString())
    }
  } catch {
    // 网络异常时静默跳过
  }
}

export function registerDeployServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return

  const swUrl = publicUrl('/sw.js')
  const scope = publicUrl('/') || '/'
  void navigator.serviceWorker.register(swUrl, { scope }).catch(() => {
    // SW 注册失败不影响主流程
  })
}
