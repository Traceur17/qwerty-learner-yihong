import { getRepoRoot } from './utils.mjs'
import fs from 'node:fs'
import path from 'node:path'

/**
 * @param {{ manifest: any, unitResults: Array<object>, combinedMeta?: object | null }} params
 */
export function registerDictionaryEntries({ manifest, unitResults, combinedMeta = null }) {
  const dictionaryPath = path.join(getRepoRoot(), 'src', 'resources', 'dictionary.ts')
  const source = fs.readFileSync(dictionaryPath, 'utf-8')
  const snippet = combinedMeta ? buildCombinedSnippet(manifest, combinedMeta) : buildSnippet(manifest, unitResults)
  const marker = `// dict-audio-pipeline:${manifest.dict.id}`

  let nextSource = source
  if (source.includes(marker)) {
    const regex = new RegExp(`\\s*${escapeRegex(marker)}[\\s\\S]*?${escapeRegex(marker)}-end`, 'm')
    nextSource = source.replace(regex, `\n${snippet}\n`)
  } else {
    nextSource = source.replace(
      /const internationalExam: DictionaryResource\[] = \[/,
      `const internationalExam: DictionaryResource[] = [\n${snippet}`,
    )
  }

  fs.writeFileSync(dictionaryPath, nextSource, 'utf-8')

  const snippetPath = path.join(getRepoRoot(), 'tools', 'dict-audio-pipeline', 'output', `${manifest.dict.id}-dictionary-snippet.ts`)
  fs.mkdirSync(path.dirname(snippetPath), { recursive: true })
  fs.writeFileSync(snippetPath, `${snippet}\n`, 'utf-8')

  return { dictionaryPath, snippetPath }
}

function formatUnitLabel(unitId) {
  const match = String(unitId).match(/^(\d+)-(\d+)$/)
  if (match) {
    return `第${match[1]}章第${Number(match[2])}单元`
  }
  return `Unit ${unitId}`
}

function buildCombinedSnippet(manifest, combinedMeta) {
  const chapterLengths = `[${combinedMeta.chapterLengths.join(', ')}]`
  return `  // dict-audio-pipeline:${manifest.dict.id}
  {
    id: '${combinedMeta.dictId}',
    name: '${manifest.dict.name}',
    description: '${manifest.dict.description ?? manifest.dict.name}',
    category: '${manifest.dict.category ?? '国际考试'}',
    tags: ${JSON.stringify(manifest.dict.tags ?? ['IELTS'])},
    url: '/dicts/${combinedMeta.fileName}',
    length: ${combinedMeta.length},
    chapterLengths: ${chapterLengths},
    language: '${manifest.dict.language}',
    languageCategory: '${manifest.dict.languageCategory ?? manifest.dict.language}',
    defaultPronIndex: ${manifest.dict.defaultPronIndex ?? 1},
  },
  // dict-audio-pipeline:${manifest.dict.id}-end`
}

function buildSnippet(manifest, unitResults) {
  const lines = unitResults.map((unit) => {
    const id = unit.dictId
    const name = `${manifest.dict.name} ${formatUnitLabel(unit.unitId)}`
    const url = `/dicts/${unit.fileName}`
    return `  {
    id: '${id}',
    name: '${name}',
    description: '${manifest.dict.description ?? manifest.dict.name}（音频版 ${formatUnitLabel(unit.unitId)}）',
    category: '${manifest.dict.category ?? '国际考试'}',
    tags: ${JSON.stringify(manifest.dict.tags ?? ['IELTS'])},
    url: '${url}',
    length: ${unit.length},
    language: '${manifest.dict.language}',
    languageCategory: '${manifest.dict.languageCategory ?? manifest.dict.language}',
    defaultPronIndex: ${manifest.dict.defaultPronIndex ?? 1},
  },`
  })

  return `  // dict-audio-pipeline:${manifest.dict.id}\n${lines.join('\n')}\n  // dict-audio-pipeline:${manifest.dict.id}-end`
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
