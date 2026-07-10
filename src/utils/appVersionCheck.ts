/** 线上 version.json 的 hash 与 URL 中 _v 不一致时，跳转到带 _v 的地址以绕过 index.html 磁盘缓存 */
export type VersionRedirectDecision = 'noop' | 'redirect'

/** 判断是否需要跳转到带远程版本号的 canonical URL */
export function resolveCanonicalVersionUrl(remoteHash: string | undefined, currentVersionParam: string | null): VersionRedirectDecision {
  const remote = remoteHash?.trim()
  if (!remote) return 'noop'
  if (currentVersionParam === remote) return 'noop'
  return 'redirect'
}

/** 生成带 `_v` 参数的跳转 URL */
export function buildVersionRedirectUrl(href: string, remoteHash: string): string {
  const url = new URL(href)
  url.searchParams.set('_v', remoteHash)
  return url.toString()
}

export function applyCanonicalVersionUrl(remoteHash: string | undefined, href: string): VersionRedirectDecision {
  const currentVersionParam = new URL(href).searchParams.get('_v')
  const decision = resolveCanonicalVersionUrl(remoteHash, currentVersionParam)

  if (decision === 'redirect' && remoteHash) {
    window.location.replace(buildVersionRedirectUrl(href, remoteHash.trim()))
  }

  return decision
}
