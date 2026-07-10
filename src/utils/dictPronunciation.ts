import { LANG_PRON_MAP } from '@/resources/soundResource'
import type { Dictionary, PronunciationConfig } from '@/typings'
import type { PronunciationType } from '@/typings'

export function getDictPronunciationOptions(dict: Pick<Dictionary, 'language' | 'pronunciationTypes'>): PronunciationConfig[] {
  const all = LANG_PRON_MAP[dict.language].pronunciation
  const allowed = dict.pronunciationTypes
  if (!allowed?.length) return all
  return all.filter((item) => allowed.includes(item.pron))
}

export function resolveDictDefaultPronunciation(
  dict: Pick<Dictionary, 'language' | 'defaultPronIndex' | 'pronunciationTypes'>,
): PronunciationConfig {
  const options = getDictPronunciationOptions(dict)
  const fallback = LANG_PRON_MAP[dict.language].pronunciation[dict.defaultPronIndex ?? LANG_PRON_MAP[dict.language].defaultPronIndex]
  return options.find((item) => item.pron === fallback.pron) ?? options[0]
}

export function isPronunciationAllowedForDict(dict: Pick<Dictionary, 'pronunciationTypes'>, type: PronunciationType): boolean {
  const allowed = dict.pronunciationTypes
  if (!allowed?.length) return true
  return allowed.includes(type)
}
