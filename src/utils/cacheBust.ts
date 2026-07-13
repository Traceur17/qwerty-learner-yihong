/** 当前构建版本（git 短 hash），用于词库 JSON 等非音频静态资源 cache bust */
export function getAppBuildId(): string {
  return LATEST_COMMIT_HASH.replace(/\s*\(dev\)\s*$/, '').trim()
}

/**
 * 默认音频世代号（未单独配置前缀时使用）。
 * 重切某本词典音频时：优先改 AUDIO_ASSET_EPOCH_BY_PREFIX 里对应前缀，避免其它词典缓存失效。
 */
export const AUDIO_ASSET_EPOCH = '20260713-full-refresh'

/**
 * 按音频目录前缀覆盖世代号。只改被重切的词典即可。
 * key 匹配 publicUrl 后的路径片段，例如 `/audio/wang-c5-audio/`。
 * 2026-07-13：统一抬到 full-refresh，强制用户侧全量重拉饼干专属音频。
 */
export const AUDIO_ASSET_EPOCH_BY_PREFIX: Record<string, string> = {
  '/audio/wang-c3-audio/': '20260713-full-refresh',
  '/audio/wang-c4-audio/': '20260713-full-refresh',
  '/audio/wang-c5-audio/': '20260713-full-refresh',
  '/audio/wang-c11-audio/': '20260713-full-refresh',
}

/** 解析某音频 URL 应使用的 av 世代号 */
export function getAudioAssetEpochForUrl(url: string): string {
  for (const [prefix, epoch] of Object.entries(AUDIO_ASSET_EPOCH_BY_PREFIX)) {
    if (url.includes(prefix)) return epoch
  }
  return AUDIO_ASSET_EPOCH
}

/** 为同源静态资源 URL 追加版本查询参数 */
export function withCacheBust(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url

  const isAudio = /\/audio\//i.test(url)
  const sep = url.includes('?') ? '&' : '?'

  if (isAudio) {
    const epoch = getAudioAssetEpochForUrl(url)
    return `${url}${sep}av=${encodeURIComponent(epoch)}`
  }

  const buildId = getAppBuildId()
  if (!buildId) return url
  return `${url}${sep}v=${encodeURIComponent(buildId)}`
}
