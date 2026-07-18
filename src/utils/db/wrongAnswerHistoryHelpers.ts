/** 含本次错误，最多保留 4 次；展示时 1～2 黄点为轻微，≥3 以 3 红点表示复发 */
export const MAX_WRONG_ANSWER_HISTORY = 4

export type WrongSeverity = 'mild' | 'recurring'

/** 点的个数与颜色：1～2 黄；≥3 显示 3 个红点 */
export function wrongSeverityDots(historyCount: number): { count: number; severity: WrongSeverity } {
  if (historyCount <= 0) return { count: 0, severity: 'mild' }
  if (historyCount === 1) return { count: 1, severity: 'mild' }
  if (historyCount === 2) return { count: 2, severity: 'mild' }
  return { count: 3, severity: 'recurring' }
}

export function truncateWrongAnswers(answers: string[]): string[] {
  return answers.slice(0, MAX_WRONG_ANSWER_HISTORY)
}

export function prependWrongAnswer(existing: string[], nextWrong: string): string[] {
  const trimmed = nextWrong.trim()
  if (!trimmed) return truncateWrongAnswers(existing)
  return truncateWrongAnswers([trimmed, ...existing.filter((a) => a !== trimmed)])
}
