## Context

`reliable-word-audio-playback` 已用共享 WebAudio 播放器 + 章阻塞预加载。刷新后须重新 `fetch+decode`。用户确认策略：**继续阻塞**，但同世代音频应磁盘命中以加快就绪。

## Goals / Non-Goals

**Goals:**

- 原始 MP3 写入 Cache API，键为带 `av` 的完整 URL
- 缓存名含 `AUDIO_ASSET_EPOCH`；世代切换自动删旧桶
- 代码发版清理 Cache Storage 时保留当前音频桶
- 预加载仍阻塞至 decode ready；磁盘命中时只省网络

**Non-Goals:**

- 不持久化 PCM/AudioBuffer
- 不改为非阻塞进章
- 不预缓存用户未进入过的章节（仍按进章/后台后续章逻辑）

## Decisions

1. **Cache API 分桶** `qwerty-word-audio-${AUDIO_ASSET_EPOCH}`，`cache.match(url)` / `cache.put(url, response.clone())`
2. **读取路径**：内存 buffer → Cache API → `fetch(cache:'no-cache')` → 写入 Cache → decode
3. **失效**：`ensureAudioEpochFresh` 删掉所有 `qwerty-word-audio-*` 且不等于当前桶的 cache；全量 `clearRuntimeCaches` 增加 `preserveCurrentWordAudio: true` 供代码发版使用
4. **写入失败**（配额）：忽略，降级为仅内存/网络，不阻断预加载
5. **保持阻塞**：不改变 `useChapterAudioPreload` 的 blocking 契约

## Risks / Trade-offs

- [磁盘配额] → put 失败静默降级
- [隐私模式无 caches] → 行为同改造前
- [decode 仍耗时] → 大章刷新仍有短进度条，属预期

## Migration Plan

无数据迁移。首次访问写盘；之后同 `av` 受益。

## Open Questions

无（用户已选定阻塞策略）。
