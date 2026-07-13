import { applyCanonicalVersionUrl } from '@/utils/appVersionCheck'
import { clearRuntimeCaches, deleteLegacyWordAudioBuckets, pruneWordAudioCacheForPrefix } from '@/utils/audioDiskCache'
import { AUDIO_ASSET_EPOCH, AUDIO_ASSET_EPOCH_BY_PREFIX, getAppBuildId } from '@/utils/cacheBust'
import { publicUrl } from '@/utils/publicUrl'

type VersionPayload = {
  hash?: string
}

const AUDIO_EPOCH_MAP_KEY = 'qwerty.audioAssetEpochMap'

function currentEpochMap(): Record<string, string> {
  return {
    '*': AUDIO_ASSET_EPOCH,
    ...AUDIO_ASSET_EPOCH_BY_PREFIX,
  }
}

/**
 * 拉取线上 version.json，确保 URL 带当前 `_v` 版本号。
 * 音频按词典前缀世代失效；代码发版清缓存时保留 word-audio 磁盘桶。
 */
export async function checkForAppUpdate(): Promise<void> {
  // Dev 也跑世代 prune，避免改 av 后旧键残留、新键每次都当 miss
  await ensureAudioEpochsFresh()

  if (import.meta.env.DEV) return

  registerDeployServiceWorker()

  try {
    const response = await fetch(publicUrl(`/version.json?_=${Date.now()}`), {
      cache: 'no-store',
    })
    if (!response.ok) return

    const payload = (await response.json()) as VersionPayload
    const remoteHash = payload.hash?.trim()
    if (!remoteHash) return

    const redirected = applyCanonicalVersionUrl(remoteHash, window.location.href)
    if (redirected === 'redirect') return

    const buildId = getAppBuildId()
    if (buildId && buildId !== remoteHash) {
      await clearRuntimeCaches({ preserveCurrentWordAudio: true })
      const url = new URL(window.location.href)
      url.searchParams.set('_v', remoteHash)
      url.searchParams.set('_bust', String(Date.now()))
      window.location.replace(url.toString())
    }
  } catch {
    // 网络异常时静默跳过
  }
}

async function ensureAudioEpochsFresh(): Promise<void> {
  try {
    await deleteLegacyWordAudioBuckets()

    const next = currentEpochMap()
    let prev: Record<string, string> = {}
    try {
      prev = JSON.parse(localStorage.getItem(AUDIO_EPOCH_MAP_KEY) || '{}') as Record<string, string>
    } catch {
      prev = {}
    }

    for (const [prefix, epoch] of Object.entries(AUDIO_ASSET_EPOCH_BY_PREFIX)) {
      if (prev[prefix] && prev[prefix] !== epoch) {
        await pruneWordAudioCacheForPrefix(prefix, epoch)
      }
    }

    // Default epoch change: prune URLs that use only the default av and are under /audio/
    // but not covered by a more specific prefix — rare; skip aggressive wipe.

    localStorage.setItem(AUDIO_EPOCH_MAP_KEY, JSON.stringify(next))
    // Migrate away from old single-key storage
    localStorage.removeItem('qwerty.audioAssetEpoch')
  } catch {
    // ignore quota / private mode
  }
}

export function registerDeployServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return

  const swUrl = publicUrl('/sw.js')
  const scope = publicUrl('/') || '/'
  void navigator.serviceWorker.register(swUrl, { scope }).catch(() => {
    // SW 注册失败不影响主流程
  })
}
