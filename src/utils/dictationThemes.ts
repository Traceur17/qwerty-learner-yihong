import lotusImg from '@/assets/dictation-themes/lotus.webp'

export type DictationThemeId = 'lotus'

export type DictationTheme = {
  id: DictationThemeId
  name: string
  image: string
}

export const DICTATION_THEMES: Record<DictationThemeId, DictationTheme> = {
  lotus: {
    id: 'lotus',
    name: '荷花',
    image: lotusImg,
  },
}

/** 当前默认主题；后续可改为用户可选 */
export const DEFAULT_DICTATION_THEME_ID: DictationThemeId = 'lotus'

export function getDictationTheme(id: DictationThemeId = DEFAULT_DICTATION_THEME_ID): DictationTheme {
  return DICTATION_THEMES[id] ?? DICTATION_THEMES.lotus
}
