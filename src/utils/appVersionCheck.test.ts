import { buildVersionRedirectUrl, resolveVersionRedirect } from '@/utils/appVersionCheck'
import { describe, expect, it } from 'vitest'

describe('appVersionCheck helpers', () => {
  it('noop when remote matches build', () => {
    expect(resolveVersionRedirect('0431af4', '0431af4', null)).toBe('noop')
  })

  it('redirect when remote is newer', () => {
    expect(resolveVersionRedirect('fe273cb', '0431af4', null)).toBe('redirect')
  })

  it('give up after cache-bust param already applied', () => {
    expect(resolveVersionRedirect('fe273cb', '0431af4', '0431af4')).toBe('give-up')
  })

  it('builds redirect url with _v query', () => {
    const url = buildVersionRedirectUrl('https://example.com/qwerty-learner-yihong/', '0431af4')
    expect(url).toContain('_v=0431af4')
  })
})
