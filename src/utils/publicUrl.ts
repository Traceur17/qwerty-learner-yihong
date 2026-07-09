export const PUBLIC_URL_PREFIX = REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner-yihong' : ''

export function publicUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${PUBLIC_URL_PREFIX}${normalized}`
}
