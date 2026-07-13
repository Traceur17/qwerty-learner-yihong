import type { PronunciationType, Word } from '@/typings'
import { withCacheBust } from '@/utils/cacheBust'
import { generateWordSoundSrc } from '@/utils/pronunciation'
import { publicUrl } from '@/utils/publicUrl'
import { resolveSegmentAudioUrl, resolveWordAudioSegment } from '@/utils/wordAudio'
import {
  ensureMp3OnDisk,
  isWordAudioOnDisk,
  resetWordAudioPlayerForTests,
  retainDecodedUrls,
  scheduleDecodeUrls,
} from '@/utils/wordAudioPlayer'

const DEFAULT_CONCURRENCY = 6
export const BACKGROUND_AUDIO_CONCURRENCY = 2

/** 饼干专属词库：跨库后台暖缓存顺序 */
export const BISCUIT_DICT_IDS = ['wang-c3-biscuit', 'wang-c4-biscuit', 'wang-c5-biscuit', 'wang-c11-biscuit'] as const
export type BiscuitDictId = (typeof BISCUIT_DICT_IDS)[number]

const BISCUIT_SHORT_LABEL: Record<BiscuitDictId, string> = {
  'wang-c3-biscuit': 'C3',
  'wang-c4-biscuit': 'C4',
  'wang-c5-biscuit': 'C5',
  'wang-c11-biscuit': 'C11',
}

export function isBiscuitDictId(id: string): id is BiscuitDictId {
  return (BISCUIT_DICT_IDS as readonly string[]).includes(id)
}

export function biscuitDictShortLabel(id: string): string {
  return isBiscuitDictId(id) ? BISCUIT_SHORT_LABEL[id] : id
}

/** 本词库其它章顺序：先后续章，再更早章（切章后优先暖「下一章方向」） */
export function buildOtherChapterIndexes(chapterCount: number, currentChapter: number): number[] {
  const later: number[] = []
  const earlier: number[] = []
  for (let chapter = 0; chapter < chapterCount; chapter++) {
    if (chapter === currentChapter) continue
    if (chapter > currentChapter) later.push(chapter)
    else earlier.push(chapter)
  }
  return [...later, ...earlier]
}

/** 跨库排队：C3→C4→C5→C11，跳过当前词库 */
export function buildBiscuitFollowupDictIds(currentDictId: string): BiscuitDictId[] {
  if (!isBiscuitDictId(currentDictId)) return []
  return BISCUIT_DICT_IDS.filter((id) => id !== currentDictId)
}

export type AudioPreloadProgress = {
  loaded: number
  total: number
  loadedBytes: number
  failed: number
}

export function collectCustomAudioUrls(words: Word[], pronunciation: Exclude<PronunciationType, false>): string[] {
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

export function chapterNeedsAudioPreload(words: Word[], pronunciation: Exclude<PronunciationType, false>): boolean {
  return collectCustomAudioUrls(words, pronunciation).length > 0
}

/** 本章自定义 MP3 是否已全部在磁盘会话标记中（刷新后需再跑 ensure 才能为 true） */
export function areWordAudiosOnDisk(words: Word[], pronunciation: Exclude<PronunciationType, false>): boolean {
  const urls = collectCustomAudioUrls(words, pronunciation)
  if (urls.length === 0) return true
  return urls.every((url) => isWordAudioOnDisk(url))
}

/** @deprecated 使用 areWordAudiosOnDisk；保留别名避免旧引用炸掉 */
export function areWordAudiosPreloaded(words: Word[], pronunciation: Exclude<PronunciationType, false>): boolean {
  return areWordAudiosOnDisk(words, pronunciation)
}

export function resetPreloadedAudioCache(): void {
  resetWordAudioPlayerForTests()
}

export function formatPreloadBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 确保本章 MP3 已在磁盘 Cache（不 decode）。
 * 已缓存时静默命中，不触发 onProgress；仅网络下载缺失文件时回调。
 * @returns fetched>0 表示发生了网络拉取
 */
export async function ensureChapterMp3OnDisk(
  words: Word[],
  pronunciation: Exclude<PronunciationType, false>,
  onProgress?: (progress: AudioPreloadProgress) => void,
  concurrency = DEFAULT_CONCURRENCY,
  onNetworkStart?: (missCount: number) => void,
  signal?: AbortSignal,
): Promise<{ didFetch: boolean; failed: number; aborted: boolean }> {
  const allUrls = collectCustomAudioUrls(words, pronunciation)
  if (allUrls.length === 0) return { didFetch: false, failed: 0, aborted: false }

  if (signal?.aborted) return { didFetch: false, failed: 0, aborted: true }

  if (areWordAudiosOnDisk(words, pronunciation)) {
    return { didFetch: false, failed: 0, aborted: false }
  }

  const result = await ensureMp3OnDisk(allUrls, {
    concurrency,
    onNetworkStart,
    signal,
    onProgress: (p) => {
      onProgress?.({
        loaded: p.loaded,
        total: p.total,
        loadedBytes: p.loadedBytes,
        failed: p.failed,
      })
    },
  })

  return {
    didFetch: result.fetched > 0,
    failed: result.failed.length,
    aborted: Boolean(signal?.aborted),
  }
}

/** 进入章节：只保留本章 decode，并后台 decode 本章（点击会插队）。 */
export function activateChapterAudio(words: Word[], pronunciation: Exclude<PronunciationType, false>): void {
  const urls = collectCustomAudioUrls(words, pronunciation)
  retainDecodedUrls(urls)
  scheduleDecodeUrls(urls)
}

/**
 * @deprecated 改为 ensureChapterMp3OnDisk；旧名仍做磁盘 ensure，不再整章 decode 阻塞。
 */
export async function preloadWordAudios(
  words: Word[],
  pronunciation: Exclude<PronunciationType, false>,
  onProgress?: (progress: AudioPreloadProgress) => void,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<boolean> {
  const { didFetch } = await ensureChapterMp3OnDisk(words, pronunciation, onProgress, concurrency)
  return didFetch
}
