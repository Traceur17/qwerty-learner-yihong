import atomForConfig from './atomForConfig'
import { reviewInfoAtom } from './reviewInfoAtom'
import {
  DISMISS_CHAPTER_ERROR_BOOK_GUIDE_KEY,
  DISMISS_CONTINUOUS_SHEET_GUIDE_KEY,
  DISMISS_START_CARD_DATE_KEY,
  DISMISS_UPDATE_ANNOUNCEMENT_KEY,
  defaultFontSizeConfig,
} from '@/constants'
import { idDictionaryMap } from '@/resources/dictionary'
import { correctSoundResources, keySoundResources, wrongSoundResources } from '@/resources/soundResource'
import type {
  Dictionary,
  InfoPanelState,
  ListenDictationConfig,
  LoopWordTimesOption,
  PhoneticType,
  PronunciationType,
  WordDictationOpenBy,
  WordDictationType,
} from '@/typings'
import { calcChapterCount } from '@/utils'
import { COLLECT_BISCUIT_DICT_ID } from '@/utils/db/collectedWords'
import type { ReviewRecord } from '@/utils/db/record'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const currentDictIdAtom = atomWithStorage('currentDict', 'wang-c3-biscuit')

/** Live count of words in「小饼干罐」(synced from Dexie). */
export const collectedWordCountAtom = atom(0)

export const geminiApiKeyAtom = atomWithStorage('geminiApiKey', '')

export const currentDictInfoAtom = atom<Dictionary>((get) => {
  const id = get(currentDictIdAtom)
  let dict = idDictionaryMap[id]
  // 如果 dict 不存在，则回退到饼干 C3；Typing 中会检查并重置
  if (!dict) {
    dict = idDictionaryMap['wang-c3-biscuit']
  }
  if (dict.id === COLLECT_BISCUIT_DICT_ID) {
    const length = get(collectedWordCountAtom)
    return { ...dict, length, chapterCount: Math.max(1, calcChapterCount(length)) }
  }
  return dict
})

export const currentChapterAtom = atomWithStorage('currentChapter', 0)

export const loopWordConfigAtom = atomForConfig<{ times: LoopWordTimesOption }>('loopWordConfig', {
  times: 1,
})

export const keySoundsConfigAtom = atomForConfig('keySoundsConfig', {
  isOpen: true,
  isOpenClickSound: true,
  volume: 1,
  resource: keySoundResources[0],
})

export const hintSoundsConfigAtom = atomForConfig('hintSoundsConfig', {
  isOpen: true,
  volume: 1,
  isOpenWrongSound: true,
  isOpenCorrectSound: true,
  wrongResource: wrongSoundResources[0],
  correctResource: correctSoundResources[0],
})

export const pronunciationConfigAtom = atomForConfig('pronunciation', {
  isOpen: true,
  volume: 1,
  type: 'us' as PronunciationType,
  name: '美音',
  isLoop: false,
  isTransRead: false,
  transVolume: 1,
  rate: 1,
})

export const fontSizeConfigAtom = atomForConfig('fontsize', defaultFontSizeConfig)

export const pronunciationIsOpenAtom = atom((get) => get(pronunciationConfigAtom).isOpen)

export const pronunciationIsTransReadAtom = atom((get) => get(pronunciationConfigAtom).isTransRead)

export const randomConfigAtom = atomForConfig('randomConfig', {
  isOpen: false,
})

export const isShowPrevAndNextWordAtom = atomWithStorage('isShowPrevAndNextWord', true)

export const isIgnoreCaseAtom = atomWithStorage('isIgnoreCase', true)

export const isShowAnswerOnHoverAtom = atomWithStorage('isShowAnswerOnHover', true)

export const isTextSelectableAtom = atomWithStorage('isTextSelectable', false)

export const reviewModeInfoAtom = reviewInfoAtom({
  isReviewMode: false,
  reviewRecord: undefined as ReviewRecord | undefined,
})
export const isReviewModeAtom = atom((get) => get(reviewModeInfoAtom).isReviewMode)

export const phoneticConfigAtom = atomForConfig('phoneticConfig', {
  isOpen: true,
  type: 'us' as PhoneticType,
})

export const isOpenDarkModeAtom = atomWithStorage('isOpenDarkModeAtom', window.matchMedia('(prefers-color-scheme: dark)').matches)

export const isShowSkipAtom = atom(false)

export const isInDevModeAtom = atom(false)

export const infoPanelStateAtom = atom<InfoPanelState>({
  donate: false,
  vsc: false,
  community: false,
  redBook: false,
})

export const wordDictationConfigAtom = atomForConfig('wordDictationConfig', {
  isOpen: false,
  type: 'hideAll' as WordDictationType,
  openBy: 'auto' as WordDictationOpenBy,
})

export const listenDictationConfigAtom = atomForConfig<ListenDictationConfig>('listenDictationConfig', {
  isOpen: true,
  showPrevWord: false,
  showPhonetic: false,
  showTranslation: false,
  sheetMode: false,
  gapMs: 1200,
  talentCelebration: true,
})

/** 连播卷面当前播放题索引；普通模式不用，侧栏定位可读 */
export const continuousSheetPlayIndexAtom = atom(0)

/** 侧栏「从 xx 开始」向连播卷面发起的起播请求；ts 用于同索引重复触发 */
export const continuousSheetJumpRequestAtom = atom<{ index: number; ts: number } | null>(null)

export const dismissStartCardDateAtom = atomWithStorage<Date | null>(DISMISS_START_CARD_DATE_KEY, null)

export const dismissChapterErrorBookGuideAtom = atomWithStorage<boolean>(DISMISS_CHAPTER_ERROR_BOOK_GUIDE_KEY, false)

export const dismissContinuousSheetGuideAtom = atomWithStorage<boolean>(DISMISS_CONTINUOUS_SHEET_GUIDE_KEY, false)

export const dismissUpdateAnnouncementAtom = atomWithStorage<boolean>(DISMISS_UPDATE_ANNOUNCEMENT_KEY, false)

// Enhanced version promotion popup state
export const hasSeenEnhancedPromotionAtom = atomWithStorage('hasSeenEnhancedPromotion', false)
export { errorBookFilterAtom, typingResumeAtom } from './errorBookFilterAtom'
export type { ErrorBookFilter, TypingResumeSnapshot } from './errorBookFilterAtom'

// for dev test
//   dismissStartCardDateAtom = atom<Date | null>(new Date())
