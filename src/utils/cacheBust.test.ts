import { AUDIO_ASSET_EPOCH, getAppBuildId, withCacheBust } from '@/utils/cacheBust'
import { describe, expect, it } from 'vitest'

describe('cacheBust', () => {
  it('strips dev suffix from build id', () => {
    expect(getAppBuildId()).toBe(LATEST_COMMIT_HASH.replace(/\s*\(dev\)\s*$/, '').trim())
  })

  it('appends build version query to non-audio urls', () => {
    const busted = withCacheBust('/dicts/wang-c5-biscuit.json')
    expect(busted).toContain('v=')
    expect(busted).not.toContain('av=')
    expect(busted.startsWith('/dicts/wang-c5-biscuit.json?')).toBe(true)
  })

  it('uses audio epoch only for audio urls (not build hash)', () => {
    const busted = withCacheBust('/audio/wang-c3-audio/unit3-01/001.mp3')
    expect(busted).toContain(`av=${AUDIO_ASSET_EPOCH}`)
    expect(busted).not.toMatch(/[?&]v=/)
  })

  it('uses ampersand when audio url already has query', () => {
    const busted = withCacheBust('/audio/foo.mp3?foo=1')
    expect(busted).toContain('foo=1')
    expect(busted).toContain(`&av=${AUDIO_ASSET_EPOCH}`)
    expect(busted).not.toMatch(/[?&]v=/)
  })

  it('leaves external urls unchanged', () => {
    const external = 'https://dict.youdao.com/dictvoice?audio=test'
    expect(withCacheBust(external)).toBe(external)
  })
})
