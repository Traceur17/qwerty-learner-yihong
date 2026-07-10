import { getAppBuildId } from '@/utils/cacheBust'
import { publicUrl } from '@/utils/publicUrl'

export type VersionRedirectDecision = 'noop' | 'redirect' | 'give-up'

type VersionPayload = {
  hash?: string
}

/** 判断是否需要为线上新版本做 cache-bust 跳转 */
export function resolveVersionRedirect(
  buildId: string,
  remoteHash: string | undefined,
  currentVersionParam: string | null,
): VersionRedirectDecision {
  const remote = remoteHash?.trim()
  if (!remote || !buildId || remote === buildId) return 'noop'
  if (currentVersionParam === remote) return 'give-up'
  return 'redirect'
}

/** 生成带 `_v` 参数的跳转 URL，促使浏览器拉取新的 index.html */
export function buildVersionRedirectUrl(href: string, remoteHash: string): string {
  const url = new URL(href)
  url.searchParams.set('_v', remoteHash)
  return url.toString()
}

export function applyVersionRedirect(buildId: string, remoteHash: string | undefined, href: string): VersionRedirectDecision {
  const currentVersionParam = new URL(href).searchParams.get('_v')
  const decision = resolveVersionRedirect(buildId, remoteHash, currentVersionParam)

  if (decision === 'redirect' && remoteHash) {
    window.location.replace(buildVersionRedirectUrl(href, remoteHash.trim()))
  }

  return decision
}

/**
 * 对比线上 version.json 与当前 bundle 的构建 hash。
 * 使用带 `_v` 参数的 replace 跳转，避免 reload() 继续命中缓存的 index.html。
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
    applyVersionRedirect(buildId, payload.hash, window.location.href)
  } catch {
    // 网络异常时静默跳过，避免影响正常使用
  }
}
