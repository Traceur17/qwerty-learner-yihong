export type DiffLinePart = {
  type: 'match' | 'wrong' | 'missing' | 'extra'
  text: string
}

export type DictationDiffResult = {
  userLine: DiffLinePart[]
  correctLine: DiffLinePart[]
}

function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

function normalizeToken(token: string, ignoreCase: boolean): string {
  return ignoreCase ? token.toLowerCase() : token
}

function tokensEqual(a: string, b: string, ignoreCase: boolean): boolean {
  return normalizeToken(a, ignoreCase) === normalizeToken(b, ignoreCase)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = Array.from({ length: n + 1 }, (_, j) => j)
  const curr = Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

/** 0～1，用于词对齐：避免「option」被对到「course」而不是「optional」 */
export function tokenSimilarity(a: string, b: string, ignoreCase: boolean): number {
  const x = normalizeToken(a, ignoreCase)
  const y = normalizeToken(b, ignoreCase)
  if (x === y) return 1
  if (!x.length || !y.length) return 0
  if (x.startsWith(y) || y.startsWith(x)) {
    return Math.min(x.length, y.length) / Math.max(x.length, y.length)
  }
  const dist = levenshtein(x, y)
  return Math.max(0, 1 - dist / Math.max(x.length, y.length))
}

type WordOp =
  | { kind: 'match'; user: string; correct: string }
  | { kind: 'missing'; correct: string }
  | { kind: 'extra'; user: string }
  | { kind: 'replace'; user: string; correct: string }

const GAP_PENALTY = 0.45
const REPLACE_MIN_SIM = 0.35

/**
 * Needleman–Wunsch 风格对齐：相似度配对优先于任意对角 replace，
 * 这样「option」会对「optional」，漏掉的「course」记为 missing。
 */
function alignWords(userTokens: string[], correctTokens: string[], ignoreCase: boolean): WordOp[] {
  const m = userTokens.length
  const n = correctTokens.length
  const score: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  const ptr: Array<Array<'diag' | 'up' | 'left' | 'none'>> = Array.from({ length: m + 1 }, () => Array(n + 1).fill('none'))

  for (let i = 1; i <= m; i++) {
    score[i][0] = -GAP_PENALTY * i
    ptr[i][0] = 'up'
  }
  for (let j = 1; j <= n; j++) {
    score[0][j] = -GAP_PENALTY * j
    ptr[0][j] = 'left'
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sim = tokenSimilarity(userTokens[i - 1], correctTokens[j - 1], ignoreCase)
      const diag = score[i - 1][j - 1] + (sim >= REPLACE_MIN_SIM ? sim : sim - 1)
      const up = score[i - 1][j] - GAP_PENALTY
      const left = score[i][j - 1] - GAP_PENALTY
      if (diag >= up && diag >= left) {
        score[i][j] = diag
        ptr[i][j] = 'diag'
      } else if (up >= left) {
        score[i][j] = up
        ptr[i][j] = 'up'
      } else {
        score[i][j] = left
        ptr[i][j] = 'left'
      }
    }
  }

  const ops: WordOp[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    const p = ptr[i][j]
    if (p === 'diag' && i > 0 && j > 0) {
      const user = userTokens[i - 1]
      const correct = correctTokens[j - 1]
      if (tokensEqual(user, correct, ignoreCase)) {
        ops.unshift({ kind: 'match', user, correct })
      } else if (tokenSimilarity(user, correct, ignoreCase) >= REPLACE_MIN_SIM) {
        ops.unshift({ kind: 'replace', user, correct })
      } else {
        // 相似度过低：拆成 extra + missing，避免乱配对
        ops.unshift({ kind: 'extra', user })
        ops.unshift({ kind: 'missing', correct })
      }
      i--
      j--
    } else if (p === 'up' || (i > 0 && j === 0)) {
      ops.unshift({ kind: 'extra', user: userTokens[i - 1] })
      i--
    } else if (p === 'left' || (j > 0 && i === 0)) {
      ops.unshift({ kind: 'missing', correct: correctTokens[j - 1] })
      j--
    } else {
      break
    }
  }

  return ops
}

function charDiffParts(user: string, correct: string, ignoreCase: boolean): { user: DiffLinePart[]; correct: DiffLinePart[] } {
  if (user === correct) {
    return { user: [{ type: 'match', text: user }], correct: [{ type: 'match', text: correct }] }
  }

  if (ignoreCase && user.toLowerCase() === correct.toLowerCase()) {
    return { user: [{ type: 'match', text: user }], correct: [{ type: 'match', text: correct }] }
  }

  let prefix = 0
  while (prefix < user.length && prefix < correct.length) {
    const uc = user[prefix]
    const cc = correct[prefix]
    if (ignoreCase ? uc.toLowerCase() !== cc.toLowerCase() : uc !== cc) break
    prefix++
  }

  const userRemain = user.slice(prefix)
  const correctRemain = correct.slice(prefix)
  let suffix = 0
  while (
    suffix < userRemain.length - suffix &&
    suffix < correctRemain.length - suffix &&
    (ignoreCase
      ? userRemain[userRemain.length - 1 - suffix].toLowerCase() === correctRemain[correctRemain.length - 1 - suffix].toLowerCase()
      : userRemain[userRemain.length - 1 - suffix] === correctRemain[correctRemain.length - 1 - suffix])
  ) {
    suffix++
  }

  const userParts: DiffLinePart[] = []
  const correctParts: DiffLinePart[] = []

  const userMid = user.slice(prefix, user.length - suffix)
  const correctMid = correct.slice(prefix, correct.length - suffix)
  const userPrefix = user.slice(0, prefix)
  const correctPrefix = correct.slice(0, prefix)
  const userSuffix = suffix > 0 ? user.slice(user.length - suffix) : ''
  const correctSuffix = suffix > 0 ? correct.slice(correct.length - suffix) : ''

  if (userPrefix) {
    userParts.push({ type: 'match', text: userPrefix })
    correctParts.push({ type: 'match', text: correctPrefix })
  }
  if (userMid || correctMid) {
    if (userMid) userParts.push({ type: 'wrong', text: userMid })
    if (correctMid) correctParts.push({ type: 'wrong', text: correctMid })
  }
  if (userSuffix) {
    userParts.push({ type: 'match', text: userSuffix })
    correctParts.push({ type: 'match', text: correctSuffix })
  }

  return { user: userParts, correct: correctParts }
}

function pushWord(parts: DiffLinePart[], type: DiffLinePart['type'], text: string, addSpace: boolean) {
  if (!text) return
  if (addSpace && parts.length > 0) {
    const last = parts[parts.length - 1]
    last.text += ' '
  }
  if (parts.length > 0 && parts[parts.length - 1].type === type) {
    parts[parts.length - 1].text += text
  } else {
    parts.push({ type, text })
  }
}

function appendParts(target: DiffLinePart[], parts: DiffLinePart[], addSpace: boolean) {
  parts.forEach((part, idx) => {
    pushWord(target, part.type, part.text, addSpace && idx === 0)
  })
}

export function diffPhrase(userInput: string, correctAnswer: string, ignoreCase = true): DictationDiffResult {
  const userTokens = tokenize(userInput)
  const correctTokens = tokenize(correctAnswer)
  const ops = alignWords(userTokens, correctTokens, ignoreCase)

  const userLine: DiffLinePart[] = []
  const correctLine: DiffLinePart[] = []

  ops.forEach((op, index) => {
    const addSpace = index > 0

    switch (op.kind) {
      case 'match': {
        if (op.user === op.correct || (ignoreCase && op.user.toLowerCase() === op.correct.toLowerCase())) {
          pushWord(userLine, 'match', op.user, addSpace)
          pushWord(correctLine, 'match', op.correct, addSpace)
        } else {
          const { user, correct } = charDiffParts(op.user, op.correct, ignoreCase)
          appendParts(userLine, user, addSpace)
          appendParts(correctLine, correct, addSpace)
        }
        break
      }
      case 'missing': {
        // 漏写只标在正确行；不往用户行塞「假词+删除线」（删除线语义是「多写该删」）
        pushWord(correctLine, 'missing', op.correct, addSpace)
        break
      }
      case 'extra': {
        // 多写只出现在用户行，样式侧用删除线表示修订删除
        pushWord(userLine, 'extra', op.user, addSpace)
        break
      }
      case 'replace': {
        const { user, correct } = charDiffParts(op.user, op.correct, ignoreCase)
        appendParts(userLine, user, addSpace)
        appendParts(correctLine, correct, addSpace)
        break
      }
    }
  })

  return { userLine, correctLine }
}

export function formatTranslation(trans: string[] | undefined): string {
  if (!trans?.length) return ''
  return trans.filter((item) => typeof item === 'string' && item.trim()).join('；')
}
