import { buildVersionRedirectUrl, resolveCanonicalVersionUrl } from '@/utils/appVersionCheck'
import { getAppBuildId } from '@/utils/cacheBust'
import { publicUrl } from '@/utils/publicUrl'
import { describe, expect, it } from 'vitest'

describe('appVersionCheck', () => {
  it('noop when _v already matches remote', () => {
    expect(resolveCanonicalVersionUrl('b127823', 'b127823')).toBe('noop')
  })

  it('redirect when _v is missing', () => {
    expect(resolveCanonicalVersionUrl('b127823', null)).toBe('redirect')
  })

  it('redirect when _v is stale', () => {
    expect(resolveCanonicalVersionUrl('b127823', '0431af4')).toBe('redirect')
  })

  it('builds redirect url with _v query', () => {
    const url = buildVersionRedirectUrl('https://example.com/qwerty-learner-yihong/', 'b127823')
    expect(url).toContain('_v=b127823')
  })
})

describe('getAppBuildId', () => {
  it('strips dev suffix', () => {
    expect(getAppBuildId()).toBe(LATEST_COMMIT_HASH.replace(/\s*\(dev\)\s*$/, '').trim())
  })
})
