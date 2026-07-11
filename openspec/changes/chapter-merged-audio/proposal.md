## Why

王陆 C5 音频词库现有约 1334 个独立 MP3，Git 体积大、GitHub Pages 请求多，且不利于后续跨章随机播放。将每章裁切结果合并为单个 MP3 + 时间索引，可显著减少文件数并保持听写播放精度。

## What Changes

- 流水线新增按单元合并：`unit5-01.mp3` + `unit5-01.index.json`
- 词库 `ukAudio` 支持 **片段引用** `{ unit, start, end }`（与现有 URL 字符串并存）
- 应用侧新增 `playSegment` 播放器：单章一次 HTTP，seek 播放词段；LRU 缓存最近 2 ～ 3 章
- 提供对现有 `wang-c5-biscuit` 已裁切 MP3 的离线合并脚本（无需从教材原音频重跑）
- manifest 增加 `output.mergedAudio` 开关；合并后可选清理逐词 MP3

## Capabilities

### New Capabilities

- `chapter-merged-audio`: 按章/单元合并 MP3、索引 JSON、词库片段引用与播放器
- `dict-audio-merge-output`: 流水线构建阶段产出合并音频与更新词库字段

### Modified Capabilities

- `custom-word-audio`: 发音解析与播放支持 `string | { unit, start, end }` 片段引用

## Impact

- **流水线**: `tools/dict-audio-pipeline/lib/merge-unit-audio.mjs`、`build.mjs`、`writer.mjs`
- **应用**: `src/typings/index.ts`、`src/utils/pronunciation.ts`、`src/hooks/usePronunciation.ts`、新增 `src/utils/segmentAudioPlayer.ts`
- **资源**: `public/audio/wang-c5-audio/unit5-XX.mp3` 替代 `unit5-XX/*.mp3`；`public/dicts/wang-c5-biscuit.json` 字段变更
- **兼容**: 其他词库仍可用字符串 `ukAudio` URL；有道 TTS 回退不变
