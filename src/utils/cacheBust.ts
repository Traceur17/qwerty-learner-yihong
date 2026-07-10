/** 当前构建版本（git 短 hash），用于静态资源 cache bust */
export function getAppBuildId(): string {
  return LATEST_COMMIT_HASH.replace(/\s*\(dev\)\s*$/, '').trim()
}

/** 为同源静态资源 URL 追加版本查询参数，避免浏览器长期使用旧词库/音频缓存 */
export function withCacheBust(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url

  const buildId = getAppBuildId()
  if (!buildId) return url

  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(buildId)}`
}
