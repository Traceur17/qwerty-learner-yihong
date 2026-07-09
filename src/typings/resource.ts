import type { LanguageCategoryType, LanguageType, PronunciationType } from '.'

export type DictionaryResource = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  url: string
  length: number
  language: LanguageType
  languageCategory: LanguageCategoryType
  //override default pronunciation when not undefined
  defaultPronIndex?: number
  /** 按单元/章节自定义每章词数，长度即 chapterCount */
  chapterLengths?: number[]
  /** 词库卡片展示用图标（emoji 或文本） */
  icon?: string
}

export type Dictionary = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  url: string
  length: number
  language: LanguageType
  languageCategory: LanguageCategoryType
  // calculated in the store
  chapterCount: number
  //override default pronunciation when not undefined
  defaultPronIndex?: number
  chapterLengths?: number[]
  icon?: string
}

export type PronunciationConfig = {
  name: string
  pron: PronunciationType
}

export type LanguagePronunciationMapConfig = {
  defaultPronIndex: number
  pronunciation: PronunciationConfig[]
}

export type LanguagePronunciationMap = {
  [key in LanguageType]: LanguagePronunciationMapConfig
}

export type SoundResource = {
  key: string
  name: string
  filename: string
}
