## Context

- 当前：`unit5-01/001_xxx.mp3` … 每词一文件；词库 `ukAudio: "/audio/.../001_xxx.mp3"`
- 播放：`use-sound` + `generateWordSoundSrc` 每词换 `src`
- 目标：每单元 1 个 MP3 + index；词库存 `{ unit: "unit5-01", start, end }`

## Goals / Non-Goals

**Goals:**

- 合并后文件数 O(章数)；播放行为与现听写一致
- 支持跨章随机（LRU 缓存多章 Howl）
- 可从**已有**逐词 MP3 合并，不必重裁切

**Non-Goals:**

- Opus 转码（Phase 5b）
- 修改随机抽词逻辑（仅受益）

## Decisions

### 1. 词库片段格式

```ts
type WordAudioSegment = { unit: string; start: number; end: number }
type WordAudioRef = string | WordAudioSegment
```

`unit` = `unit5-01`；音频 URL = `/audio/{audioPublicId}/{unit}.mp3`

### 2. 合并算法

1. 按文件名排序读取 `unit5-XX/*.mp3`
2. `ffprobe` 实测每段时长，累加 `start/end`
3. `ffmpeg -f concat` 生成 `unit5-XX.mp3`
4. 写 `unit5-XX.index.json`：`{ version, unit, audio, segments: { "001_slug": { start, end } } }`
5. `buildDictEntries` 写 `ukAudio: { unit, start, end }`

### 3. 播放器

- `segmentAudioPlayer.ts`：Map<unit, Howl>，LRU 上限 3
- `playSegment(unit, start, end, { volume, rate, onEnd })`：seek → play → `setTimeout` 或 `timeupdate` 在 end 暂停
- `usePronunciationSound`：若 `isWordAudioSegment(ukAudio)` 走 segment 分支，否则原 URL 逻辑

### 4. 迁移脚本

`scripts/merge-existing-unit-audio.mjs`：遍历 `public/audio/wang-c5-audio/unit5-*` 目录，合并并回写 `wang-c5-biscuit.json`

## Risks / Trade-offs

- **[Risk] 合并后 seek 边界** → 用 ffprobe 实测时长，不用理论 segment 长
- **[Risk] Howl 多实例内存** → LRU 3 章
- **[Trade-off] 删除旧 MP3** → 默认合并后删除子目录内 clip，保留 index

## Migration Plan

1. 跑合并脚本生成 11 个 mp3 + index
2. 更新词库 JSON
3. 部署应用代码
4. 删除 `unit5-XX/` 子目录（合并脚本内）

## Open Questions

- 是否在 manifest 默认 `mergedAudio: true` 对新构建生效（是，wang-c5）
