import type { PronunciationType, Word } from '@/typings'
import { romajiToHiragana } from '@/utils/kana'

const pronunciationApi = 'https://dict.youdao.com/dictvoice?audio='

export type PronunciationWordInput = string | Pick<Word, 'name' | 'usAudio' | 'ukAudio'>

export function resolvePronunciationWordName(word: PronunciationWordInput): string {
  return typeof word === 'string' ? word : word.name
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
      return word.usAudio
    }
    if (pronunciation === 'uk' && word.ukAudio) {
      return word.ukAudio
    }
  }

  return generateYoudaoSoundSrc(resolvePronunciationWordName(word), pronunciation)
}
