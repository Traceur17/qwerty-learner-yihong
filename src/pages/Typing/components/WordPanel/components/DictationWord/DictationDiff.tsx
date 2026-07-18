import type { DiffLinePart } from '@/utils/dictationDiff'

/**
 * 修订语义（接近常见 track-changes）：
 * - wrong：写错了 → 红底
 * - extra：多写了 → 删除线（该删）
 * - missing：漏写了 → 只应出现在正确行，用户行不应渲染
 */
const userPartClass: Record<DiffLinePart['type'], string> = {
  match: 'text-gray-800 dark:text-gray-100',
  wrong: 'rounded bg-red-200 px-0.5 text-red-900 dark:bg-red-900/60 dark:text-red-100',
  missing: 'hidden',
  extra:
    'rounded bg-orange-100 px-0.5 text-orange-900 line-through decoration-orange-600 dark:bg-orange-950/50 dark:text-orange-200 dark:decoration-orange-400',
}

const correctPartClass: Record<DiffLinePart['type'], string> = {
  match: 'text-gray-800 dark:text-gray-100',
  wrong: 'rounded bg-emerald-100 px-0.5 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  missing: 'rounded bg-emerald-100 px-0.5 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  extra: 'hidden',
}

/** 卷面用：同上语义，底色更轻 */
const quietUserPartClass: Record<DiffLinePart['type'], string> = {
  match: 'text-gray-700 dark:text-gray-200',
  wrong: 'bg-red-100/80 text-red-800 underline decoration-red-400 underline-offset-2 dark:bg-red-950/40 dark:text-red-200',
  missing: 'hidden',
  extra: 'bg-orange-100/70 text-orange-800 line-through decoration-orange-500 dark:bg-orange-950/40 dark:text-orange-200',
}

const quietCorrectPartClass: Record<DiffLinePart['type'], string> = {
  match: 'text-gray-800 dark:text-gray-100',
  wrong: 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100',
  missing: 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100',
  extra: 'hidden',
}

export default function DictationDiff({
  parts,
  fontSize,
  variant = 'correct',
  quiet = false,
  className = '',
}: {
  parts: DiffLinePart[]
  fontSize: number
  variant?: 'user' | 'correct'
  quiet?: boolean
  className?: string
}) {
  const classes = quiet
    ? variant === 'user'
      ? quietUserPartClass
      : quietCorrectPartClass
    : variant === 'user'
    ? userPartClass
    : correctPartClass

  return (
    <p className={`break-words text-center font-mono leading-relaxed ${className}`} style={{ fontSize: `${fontSize}px` }}>
      {parts.map((part, index) => (
        <span key={`${part.type}-${index}`} className={classes[part.type]}>
          {part.text}
        </span>
      ))}
    </p>
  )
}
