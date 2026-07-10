## 1. 类型与发音解析

- [x] 1.1 `WordAudioSegment` / `WordAudioRef` 类型；`ukAudio`/`usAudio` 扩展
- [x] 1.2 `isWordAudioSegment` 与 `pronunciation.ts` 解析辅助

## 2. 片段播放器

- [x] 2.1 `segmentAudioPlayer.ts`：Howl LRU + `playSegment` / `stopSegment`
- [x] 2.2 `usePronunciationSound` 接入片段播放；保留 URL 与有道回退

## 3. 流水线合并

- [x] 3.1 `merge-unit-audio.mjs`：concat + index + 更新 entries
- [x] 3.2 `build.mjs` / `writer.mjs` 在 `mergedAudio` 时调用
- [x] 3.3 `merge-existing-unit-audio.mjs` 合并现有 wang-c5 逐词 MP3

## 4. 词库迁移

- [x] 4.1 对 11 章执行合并脚本
- [x] 4.2 更新 `wang-c5-biscuit.json` 为片段引用
- [x] 4.3 manifest `output.mergedAudio: true`

## 5. 验证

- [x] 5.1 单元测试：segment 解析与 `isWordAudioSegment`
- [x] 5.2 `yarn build` 通过
- [ ] 5.3 手动：听写模式播放第 1、10 章词验证
