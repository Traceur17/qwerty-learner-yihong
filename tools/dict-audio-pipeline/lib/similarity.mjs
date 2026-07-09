export function normalizePhrase(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
    }
  }

  return matrix[b.length][a.length]
}

export function phraseSimilarity(expected, actual) {
  const left = normalizePhrase(expected)
  const right = normalizePhrase(actual)
  if (!left && !right) return 1
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) {
    return Math.max(left.length, right.length) / Math.max(left.length, right.length, 1)
  }

  const distance = levenshtein(left, right)
  const maxLen = Math.max(left.length, right.length)
  return Math.max(0, 1 - distance / maxLen)
}
