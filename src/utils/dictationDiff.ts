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

type WordOp =
  | { kind: 'match'; user: string; correct: string }
  | { kind: 'missing'; correct: string }
  | { kind: 'extra'; user: string }
  | { kind: 'replace'; user: string; correct: string }

function alignWords(userTokens: string[], correctTokens: string[], ignoreCase: boolean): WordOp[] {
  const m = userTokens.length
  const n = correctTokens.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokensEqual(userTokens[i - 1], correctTokens[j - 1], ignoreCase)) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const ops: WordOp[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensEqual(userTokens[i - 1], correctTokens[j - 1], ignoreCase)) {
      ops.unshift({ kind: 'match', user: userTokens[i - 1], correct: correctTokens[j - 1] })
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i - 1][j - 1] >= dp[i - 1][j] && dp[i - 1][j - 1] >= dp[i][j - 1]) {
      ops.unshift({ kind: 'replace', user: userTokens[i - 1], correct: correctTokens[j - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ kind: 'missing', correct: correctTokens[j - 1] })
      j--
    } else if (i > 0) {
      ops.unshift({ kind: 'extra', user: userTokens[i - 1] })
      i--
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
        pushWord(userLine, 'missing', op.correct, addSpace)
        pushWord(correctLine, 'match', op.correct, addSpace)
        break
      }
      case 'extra': {
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
