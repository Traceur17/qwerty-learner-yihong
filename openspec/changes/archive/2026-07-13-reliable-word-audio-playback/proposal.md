## Why

饼干词库（自定义 `ukAudio`）进章后进度条会走完，但点击左侧词表仍偶发无声；有时先用主区快捷键/自动播成功一次后，侧栏又突然能播了。这说明「加载完成」只暖了 HTTP，真正播放仍依赖各自独立的 Howl(html5) 实例，且受浏览器音频解锁、HTMLAudio 池与 `stop→play` 竞态影响。需要把契约改成：**预加载完成 = 可播就绪；点击必有声（或明确失败提示）**。

## What Changes

- 章级预加载从「fetch 丢弃 bytes」升级为「解码/装入可播缓存」，失败 URL 不计入完成、不解除阻塞（或明确标红）
- 词表/主区改为**共享单一发音播放器**，避免一章挂出百级 Howl(html5)
- 去掉点击路径上的双重 `stop()` + 立刻 `play()` 竞态；`playerror` 自动重试一次并可选提示
- 首次用户手势（含主区播音快捷键）统一 unlock，侧栏与主区共用同一解锁状态
- 进度条文案/语义对齐：「音频就绪」而非仅「已下载」

## Capabilities

### New Capabilities

- `reliable-word-audio-playback`: 自定义词音频的可播预加载、共享播放器与点击必播契约

### Modified Capabilities

- `custom-word-audio`: 补充「章预加载完成即代表可播」与失败可见性要求（若与现有「有道回退」边界冲突，以本 change 的自定义音频路径为准）

## Impact

- `src/utils/chapterAudioPreload.ts`、`src/hooks/useChapterAudioPreload.ts`、`src/hooks/usePronunciation.ts`
- `src/components/WordPronunciationIcon/`、`src/pages/Typing/components/WordList/`
- `src/utils/segmentAudioPlayer.ts`（可复用其缓存思路；wang-c\* 主路径仍为整文件 URL）
- 听写/自动播/Ctrl+J 等主区播音入口需走同一播放器
- 预计工期约 2.5–4 天（此前方案 C）
