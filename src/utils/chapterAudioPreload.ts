import type { PronunciationType, Word } from '@/typings'
import { withCacheBust } from '@/utils/cacheBust'
import { generateWordSoundSrc } from '@/utils/pronunciation'
import { publicUrl } from '@/utils/publicUrl'
import { isWordAudioSegment, resolveSegmentAudioUrl, resolveWordAudioSegment } from '@/utils/wordAudio'

const DEFAULT_CONCURRENCY = 6

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

export function formatPreloadBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function fetchOne(url: string): Promise<number> {
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) throw new Error(`preload failed: ${response.status}`)
  const buffer = await response.arrayBuffer()
  return buffer.byteLength
}

/**
 * 预加载一组词的自定义音频；返回是否实际执行了预加载。
 * onProgress 在每完成一个 URL 时回调（按真实完成数/字节累计）。
 */
export async function preloadWordAudios(
  words: Word[],
  pronunciation: Exclude<PronunciationType, false>,
  onProgress?: (progress: AudioPreloadProgress) => void,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<boolean> {
  const urls = collectCustomAudioUrls(words, pronunciation)
  if (urls.length === 0) return false

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
      } catch {
        // 单个失败不阻断；播放时仍会再请求
      }
      loaded += 1
      onProgress?.({ loaded, total: urls.length, loadedBytes })
    }
  })

  await Promise.all(workers)
  return true
}
