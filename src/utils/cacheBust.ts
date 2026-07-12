/** 当前构建版本（git 短 hash），用于静态资源 cache bust */
export function getAppBuildId(): string {
  return LATEST_COMMIT_HASH.replace(/\s*\(dev\)\s*$/, '').trim()
}

/**
 * 自定义音频资源世代号。重切/替换 public/audio 后务必递增，
 * 避免 GitHub Pages + 浏览器对同路径 MP3 的长期缓存继续播旧文件（含电音问题）。
 */
export const AUDIO_ASSET_EPOCH = 'hq3'

/** 为同源静态资源 URL 追加版本查询参数，避免浏览器长期使用旧词库/音频缓存 */
export function withCacheBust(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url

  const buildId = getAppBuildId()
  const isAudio = /\/audio\//i.test(url)
  const parts: string[] = []
  if (buildId) parts.push(`v=${encodeURIComponent(buildId)}`)
  if (isAudio) parts.push(`av=${encodeURIComponent(AUDIO_ASSET_EPOCH)}`)
  if (parts.length === 0) return url

  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}${parts.join('&')}`
}
