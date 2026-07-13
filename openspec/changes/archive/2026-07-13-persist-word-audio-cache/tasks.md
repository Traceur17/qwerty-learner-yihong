## 1. Disk cache helper

- [x] 1.1 新增 `audioDiskCache.ts`：`get/put`、当前桶名、清理非当前 `av` 桶
- [x] 1.2 单测：put/match、epoch 切换删旧桶、无 `caches` 时安全降级

## 2. Player + deploy wiring

- [x] 2.1 `wordAudioPlayer.fetchAndDecode`：Cache 命中优先，未命中网络后再 put
- [x] 2.2 `deployServiceWorker`：epoch 变更清旧音频桶；代码发版 `clearRuntimeCaches` 保留当前音频桶
- [x] 2.3 更新/补充 `wordAudioPlayer` 相关测试

## 3. Verify

- [x] 3.1 跑相关 vitest
- [x] 3.2 手测要点：同 av 下先冷进章写盘，刷新再进章应明显快于冷启动（仍阻塞短进度条）；改 av 后应重新拉新音
