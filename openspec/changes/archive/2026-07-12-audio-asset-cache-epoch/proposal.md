## Why

GitHub Pages 部署后，浏览器可能长期缓存同路径旧 MP3（含「电音」二次压缩版本）。需要按需强制刷新音频缓存，同时日常功能发版不拖累音频缓存，且不影响 IndexedDB 练习记录。

## What Changes

- 引入独立常量 `AUDIO_ASSET_EPOCH`：仅在重切/替换音频时递增
- 自定义音频 URL 使用 `?av=<epoch>`，与页面/词库的 `v=<git hash>` 解耦
- 检测到 epoch 变化时清理 Cache Storage（不触碰 IndexedDB）
- 预加载 fetch 使用 `cache: 'no-cache'`，避免永久命中陈旧实体

## Capabilities

### New Capabilities

- `audio-asset-cache`: 音频资源世代号、按需 bust、与练习数据隔离

### Modified Capabilities

- （无主规格需求变更；播放仍走现有 custom-word-audio URL 解析）

## Impact

- `src/utils/cacheBust.ts`、`deployServiceWorker.ts`、`chapterAudioPreload.ts`
- 运维约定：换音频后改 `AUDIO_ASSET_EPOCH` 再发版
