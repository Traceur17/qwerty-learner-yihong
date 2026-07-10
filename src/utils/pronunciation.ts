import type { PronunciationType, Word } from '@/typings'
import { withCacheBust } from '@/utils/cacheBust'
import { romajiToHiragana } from '@/utils/kana'
import { publicUrl } from '@/utils/publicUrl'
import { type WordAudioRef, isWordAudioSegment } from '@/utils/wordAudio'

const pronunciationApi = 'https://dict.youdao.com/dictvoice?audio='

export type PronunciationWordInput = string | Pick<Word, 'name' | 'usAudio' | 'ukAudio'>

export function resolvePronunciationWordName(word: PronunciationWordInput): string {
  return typeof word === 'string' ? word : word.name
}

function resolveCustomAudioUrl(ref: WordAudioRef | undefined): string | null {
  if (!ref || isWordAudioSegment(ref)) return null
  return withCacheBust(publicUrl(ref))
}

function generateYoudaoSoundSrc(wordName: string, pronunciation: Exclude<PronunciationType, false>): string {
  switch (pronunciation) {
    case 'uk':
      return `${pronunciationApi}${wordName}&type=1`
    case 'us':
      return `${pronunciationApi}${wordName}&type=2`
    case 'romaji':
      return `${pronunciationApi}${romajiToHiragana(wordName)}&le=jap`
    case 'zh':
      return `${pronunciationApi}${wordName}&le=zh`
    case 'ja':
      return `${pronunciationApi}${wordName}&le=jap`
    case 'de':
      return `${pronunciationApi}${wordName}&le=de`
    case 'hapin':
    case 'kk':
      return `${pronunciationApi}${wordName}&le=ru`
    case 'id':
      return `${pronunciationApi}${wordName}&le=id`
    default:
      return ''
  }
}

export function generateWordSoundSrc(word: PronunciationWordInput, pronunciation: Exclude<PronunciationType, false>): string {
  if (typeof word !== 'string') {
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
