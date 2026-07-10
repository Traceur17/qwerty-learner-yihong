import { getDictPronunciationOptions, isPronunciationAllowedForDict, resolveDictDefaultPronunciation } from './dictPronunciation'
import { describe, expect, it } from 'vitest'

describe('dictPronunciation', () => {
  it('returns all pronunciations when pronunciationTypes is unset', () => {
    const options = getDictPronunciationOptions({ language: 'en' })
    expect(options.map((item) => item.pron)).toEqual(['us', 'uk'])
  })

  it('returns only uk when dictionary is uk-only', () => {
    const options = getDictPronunciationOptions({ language: 'en', pronunciationTypes: ['uk'] })
    expect(options).toEqual([{ name: '英音', pron: 'uk' }])
  })

  it('resets invalid pronunciation to dictionary default', () => {
    const item = resolveDictDefaultPronunciation({
      language: 'en',
      defaultPronIndex: 1,
      pronunciationTypes: ['uk'],
    })
    expect(item.pron).toBe('uk')
  })

  it('checks allowed pronunciation types', () => {
    expect(isPronunciationAllowedForDict({ pronunciationTypes: ['uk'] }, 'us')).toBe(false)
    expect(isPronunciationAllowedForDict({ pronunciationTypes: ['uk'] }, 'uk')).toBe(true)
    expect(isPronunciationAllowedForDict({}, 'us')).toBe(true)
  })
})
