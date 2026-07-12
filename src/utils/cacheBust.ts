/** 当前构建版本（git 短 hash），用于词库 JSON 等非音频静态资源 cache bust */
export function getAppBuildId(): string {
  return LATEST_COMMIT_HASH.replace(/\s*\(dev\)\s*$/, '').trim()
}

/**
 * 自定义音频资源世代号（与 git hash 解耦）。
 *
 * 何时递增：重切 / 替换 `public/audio/**` 后，需要用户强制拉新 MP3 时。
 * 平时只发功能代码、不改音频：不要改这个值，以便浏览器继续复用音频缓存。
 * 练习记录等 IndexedDB 数据不受影响。
 */
export const AUDIO_ASSET_EPOCH = '20260712-hq'

/** 为同源静态资源 URL 追加版本查询参数 */
export function withCacheBust(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url

  const isAudio = /\/audio\//i.test(url)
  const sep = url.includes('?') ? '&' : '?'

  if (isAudio) {
    return `${url}${sep}av=${encodeURIComponent(AUDIO_ASSET_EPOCH)}`
  }

  const buildId = getAppBuildId()
  if (!buildId) return url
  return `${url}${sep}v=${encodeURIComponent(buildId)}`
}
