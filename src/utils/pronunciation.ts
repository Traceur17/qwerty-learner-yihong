import type { PronunciationType, Word } from '@/typings'
import { withCacheBust } from '@/utils/cacheBust'
import { romajiToHiragana } from '@/utils/kana'
import { publicUrl } from '@/utils/publicUrl'
import { type WordAudioRef, isWordAudioSegment } from '@/utils/wordAudio'

const pronunciationApi = 'https://dict.youdao.com/dictvoice?audio='

export type PronunciationWordInput = string | Pick<Word, 'name' | 'usAudio' | 'ukAudio' | 'audioMissing'>

export function resolvePronunciationWordName(word: PronunciationWordInput): string {
  return typeof word === 'string' ? word : word.name
}

/**
 * Text for browser TTS only. Does not change stored word spelling —
 * hyphens become spaces so engines can pronounce compound tokens.
 */
export function toBrowserSpeechText(wordName: string): string {
  return wordName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Youdao often 500s on spaced phrases and hyphenated compounds → prefer browser TTS. */
export function shouldPreferBrowserTts(wordName: string): boolean {
  return /[\s-]/.test(wordName.trim())
}

function resolveCustomAudioUrl(ref: WordAudioRef | undefined): string | null {
  if (!ref || isWordAudioSegment(ref)) return null
  return withCacheBust(publicUrl(ref))
}

function generateYoudaoSoundSrc(wordName: string, pronunciation: Exclude<PronunciationType, false>): string {
  const audio = encodeURIComponent(wordName.trim())
  switch (pronunciation) {
    case 'uk':
      return `${pronunciationApi}${audio}&type=1`
    case 'us':
      return `${pronunciationApi}${audio}&type=2`
    case 'romaji':
      return `${pronunciationApi}${encodeURIComponent(romajiToHiragana(wordName))}&le=jap`
    case 'zh':
      return `${pronunciationApi}${audio}&le=zh`
    case 'ja':
      return `${pronunciationApi}${audio}&le=jap`
    case 'de':
      return `${pronunciationApi}${audio}&le=de`
    case 'hapin':
    case 'kk':
      return `${pronunciationApi}${audio}&le=ru`
    case 'id':
      return `${pronunciationApi}${audio}&le=id`
    default:
      return ''
  }
}

export function generateWordSoundSrc(word: PronunciationWordInput, pronunciation: Exclude<PronunciationType, false>): string {
  if (typeof word !== 'string') {
    if (word.audioMissing) return ''
    if (pronunciation === 'us' && word.usAudio) {
      const url = resolveCustomAudioUrl(word.usAudio)
      if (url) return url
    }
    if (pronunciation === 'uk' && word.ukAudio) {
      const url = resolveCustomAudioUrl(word.ukAudio)
      if (url) return url
    }
  }

  return generateYoudaoSoundSrc(resolvePronunciationWordName(word), pronunciation)
}
