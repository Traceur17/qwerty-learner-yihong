import type { DiffLinePart } from '@/utils/dictationDiff'

const userPartClass: Record<DiffLinePart['type'], string> = {
  match: 'text-gray-800 dark:text-gray-100',
  wrong: 'rounded bg-red-200 px-0.5 text-red-900 dark:bg-red-900/60 dark:text-red-100',
  missing: 'rounded bg-red-100 px-1 text-red-700 line-through decoration-red-500 dark:bg-red-950/50 dark:text-red-300',
  extra: 'rounded bg-orange-200 px-0.5 text-orange-900 dark:bg-orange-900/50 dark:text-orange-100',
}

const correctPartClass: Record<DiffLinePart['type'], string> = {
  match: 'text-gray-800 dark:text-gray-100',
  wrong: 'rounded bg-red-200 px-0.5 text-red-900 dark:bg-red-900/60 dark:text-red-100',
  missing: 'rounded bg-emerald-100 px-0.5 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  extra: 'text-gray-400',
}

export default function DictationDiff({
  parts,
  fontSize,
  variant = 'correct',
  className = '',
}: {
  parts: DiffLinePart[]
  fontSize: number
  variant?: 'user' | 'correct'
  className?: string
}) {
  const classes = variant === 'user' ? userPartClass : correctPartClass

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
