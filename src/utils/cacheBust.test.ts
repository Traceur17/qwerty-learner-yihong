import { getAppBuildId, withCacheBust } from '@/utils/cacheBust'
import { describe, expect, it } from 'vitest'

describe('cacheBust', () => {
  it('strips dev suffix from build id', () => {
    expect(getAppBuildId()).toBe(LATEST_COMMIT_HASH.replace(/\s*\(dev\)\s*$/, '').trim())
  })

  it('appends version query to relative urls', () => {
    const busted = withCacheBust('/dicts/wang-c5-biscuit.json')
    expect(busted).toContain('v=')
    expect(busted.startsWith('/dicts/wang-c5-biscuit.json?')).toBe(true)
  })

  it('uses ampersand when url already has query', () => {
    const busted = withCacheBust('/audio/foo.mp3?foo=1')
    expect(busted).toContain('foo=1')
    expect(busted).toContain('&v=')
  })

  it('leaves external urls unchanged', () => {
    const external = 'https://dict.youdao.com/dictvoice?audio=test'
    expect(withCacheBust(external)).toBe(external)
  })
})
