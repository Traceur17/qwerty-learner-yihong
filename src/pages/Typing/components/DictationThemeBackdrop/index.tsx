import { type DictationThemeId, getDictationTheme } from '@/utils/dictationThemes'

type DictationThemeBackdropProps = {
  themeId?: DictationThemeId
  className?: string
}

/**
 * 听写模式右下角淡淡主题装饰。
 * 用 fixed 贴视口，避免 absolute + 偏移撑开布局或把图裁掉。
 */
export default function DictationThemeBackdrop({ themeId, className = '' }: DictationThemeBackdropProps) {
  const theme = getDictationTheme(themeId)

  return (
    <img
      src={theme.image}
      alt=""
      aria-hidden
      draggable={false}
      className={`pointer-events-none fixed bottom-0 right-8 z-0 w-[min(25vw,350px)] select-none opacity-[0.14] dark:opacity-[0.11] md:right-12 lg:right-16 ${className}`}
    />
  )
}
