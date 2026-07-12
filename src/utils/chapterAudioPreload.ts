import type { PronunciationType, Word } from '@/typings'
import { withCacheBust } from '@/utils/cacheBust'
import { generateWordSoundSrc } from '@/utils/pronunciation'
import { publicUrl } from '@/utils/publicUrl'
import { resolveSegmentAudioUrl, resolveWordAudioSegment } from '@/utils/wordAudio'

const DEFAULT_CONCURRENCY = 6

/** 本会话已成功预加载过的自定义音频 URL（刷新页面后清空） */
const preloadedAudioUrls = new Set<string>()

export type AudioPreloadProgress = {
  loaded: number
  total: number
  /** 已下载字节数（真实网络/磁盘读取量） */
  loadedBytes: number
}

function collectCustomAudioUrls(words: Word[], pronunciation: Exclude<PronunciationType, false>): string[] {
  const urls = new Set<string>()
  for (const word of words) {
    const segment = resolveWordAudioSegment(word, pronunciation)
    if (segment) {
      urls.add(withCacheBust(publicUrl(resolveSegmentAudioUrl(segment))))
      continue
    }
    const src = generateWordSoundSrc(word, pronunciation)
    if (src && !src.includes('dict.youdao.com')) {
      urls.add(src)
    }
  }
  return [...urls]
}

/** 词库是否包含需本地预加载的自定义音频（有道在线发音不预加载整章） */
export function chapterNeedsAudioPreload(words: Word[], pronunciation: Exclude<PronunciationType, false>): boolean {
  return collectCustomAudioUrls(words, pronunciation).length > 0
}

/** 本章自定义音频是否已在本会话全部预加载过 */
export function areWordAudiosPreloaded(words: Word[], pronunciation: Exclude<PronunciationType, false>): boolean {
  const urls = collectCustomAudioUrls(words, pronunciation)
  if (urls.length === 0) return true
  return urls.every((url) => preloadedAudioUrls.has(url))
}

/** 测试用：清空会话预加载记录 */
export function resetPreloadedAudioCache(): void {
  preloadedAudioUrls.clear()
}

export function formatPreloadBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function fetchOne(url: string): Promise<number> {
  // no-cache：带 ETag 协商，避免 force-cache 永久命中部署前的旧 MP3
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`preload failed: ${response.status}`)
  const buffer = await response.arrayBuffer()
  return buffer.byteLength
}

/**
 * 预加载一组词的自定义音频；已在本会话加载过的 URL 会跳过。
 * onProgress 在每完成一个待拉取 URL 时回调。
 * @returns 是否实际发起了拉取（全已缓存则 false）
 */
export async function preloadWordAudios(
  words: Word[],
  pronunciation: Exclude<PronunciationType, false>,
  onProgress?: (progress: AudioPreloadProgress) => void,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<boolean> {
  const allUrls = collectCustomAudioUrls(words, pronunciation)
  if (allUrls.length === 0) return false

  const urls = allUrls.filter((url) => !preloadedAudioUrls.has(url))
  if (urls.length === 0) {
    onProgress?.({ loaded: allUrls.length, total: allUrls.length, loadedBytes: 0 })
    return false
  }

  let loaded = 0
  let loadedBytes = 0
  onProgress?.({ loaded: 0, total: urls.length, loadedBytes: 0 })

  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (cursor < urls.length) {
      const index = cursor++
      const url = urls[index]
      try {
        const bytes = await fetchOne(url)
        loadedBytes += bytes
        preloadedAudioUrls.add(url)
      } catch {
        // 单个失败不阻断；播放时仍会再请求，也不记入已加载集合
      }
      loaded += 1
      onProgress?.({ loaded, total: urls.length, loadedBytes })
    }
  })

  await Promise.all(workers)
  return true
}
