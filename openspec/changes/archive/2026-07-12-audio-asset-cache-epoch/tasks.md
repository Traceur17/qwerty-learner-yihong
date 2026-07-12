## 1. 核心实现

- [x] 1.1 增加 `AUDIO_ASSET_EPOCH`；音频 URL 仅附加 `av=`
- [x] 1.2 非音频资源继续使用 `v=<buildId>`
- [x] 1.3 epoch 变化时清理 Cache Storage，写入 localStorage；不碰 IndexedDB
- [x] 1.4 预加载 fetch 使用 `cache: 'no-cache'`

## 2. 验证与文档

- [x] 2.1 单元测试覆盖音频 / 非音频 bust 行为
- [x] 2.2 design 中记录「以后如何 bump epoch」运维说明
- [x] 2.3 归档本 change，供后续查阅
