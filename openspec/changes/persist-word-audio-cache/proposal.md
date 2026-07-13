## Why

章级预加载已把自定义 MP3 decode 进内存，刷新后内存清空，即使浏览器 HTTP 缓存命中仍要重新拉字节+解码，进度条体感偏长。用户希望：**仍阻塞到可播**，但同 `av` 下刷新应尽量走磁盘上的原始 MP3，加载更快。

## What Changes

- 用 Cache API 按 `AUDIO_ASSET_EPOCH`（`av`）分桶持久化原始 MP3 Response
- `wordAudioPlayer` 预加载/点播：先读磁盘缓存，未命中再网络拉取并写入
- `av` 变更时自动删除旧音频桶；纯代码发版清缓存时保留当前 `av` 桶
- 保持进章阻塞直到 decode 就绪（不改为后台可点）

## Capabilities

### New Capabilities

- `persist-word-audio-cache`: 自定义词音频原始 MP3 的磁盘持久化与按 `av` 失效

### Modified Capabilities

- `reliable-word-audio-playback`: 预加载字节来源优先磁盘缓存，语义仍为「就绪才解除阻塞」

## Impact

- `src/utils/wordAudioPlayer.ts`、`src/utils/deployServiceWorker.ts`（或抽 `audioDiskCache.ts`）
- 单元测试需 mock `caches`
- 不改音频资源文件本身；不改听写业务 UI 结构（进度条文案可区分「缓存/网络」可选）
