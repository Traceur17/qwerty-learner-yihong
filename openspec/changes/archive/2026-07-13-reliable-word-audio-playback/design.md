## Context

饼干词库（`wang-c*`）走字符串 `ukAudio` + Howler `html5: true`。章级预加载（`chapterAudioPreload.ts`）只 `fetch → arrayBuffer` 暖 HTTP 缓存，进度条走完即解除阻塞。词表每个 `WordCard` 挂一个 `WordPronunciationIcon` → 一个 `useSound` Howl，一章可达 100–300+ 个 HTMLAudio 实例。

点击路径为 `WordPronunciationIcon.playSound` → `stop()` → `play()`，而 `usePronunciationSound.play` 内部再 `stop()` 后立刻 `playUrl()`。`playerror` 仅 `setIsPlaying(false)`，无重试、无提示。

用户现象：进章后侧栏偶发无声；主区成功播一次（用户称 F5 / 实际多为 Ctrl+J 或开练自动播）后，侧栏往往又能播。这与「浏览器媒体解锁 + Howler 内部状态被一次成功 play 暖起来」高度吻合，也说明问题不在文件缺失，而在播放链路就绪语义。

方案目标对齐此前评估的 **方案 C**：加载完 = 可播就绪；点击必播。

## Goals / Non-Goals

**Goals:**

- 章预加载完成 ⇒ 自定义 MP3 已进入可播缓存（至少 Howl/HTMLAudio `canplaythrough` 或等价 WebAudio buffer）
- 主区与侧栏共用**单一发音播放器**，消除百级 Howl 池耗尽
- 消除双重 `stop` 竞态；`playerror` 自动重试一次；仍失败时可见反馈（toast/图标态）
- 首次用户手势统一 unlock，主区成功播后侧栏不应再「突然才好」——因为本就同一解锁态

**Non-Goals:**

- 不改 dict-audio-pipeline 裁切逻辑 / 词库内容
- 不强制 segment 合并音频方案（`{unit,start,end}`）本期仍可选，主路径保持一词一文件
- 不改变有道 TTS 作为「无自定义音频」时的回退行为
- 不做跨章全局常驻解码所有词库

## Decisions

### 1. 共享播放器模块 `wordAudioPlayer`

- **选择**：模块级单例（类似 `segmentAudioPlayer`），API：`playUrl(url, opts)` / `stop()` / `preloadUrls(urls, onProgress)` / `isReady(url)`
- **替代**：继续每词 Howl — 已证实侧栏规模下不稳定，否决
- **实现倾向**：优先 WebAudio `AudioBuffer` 缓存（预加载即 decode），播放走 `BufferSource`；内存紧张时对超大章可 LRU（如保留本章全部、跨章淘汰）。若 decode 成本过高，退化为**单一 HTMLAudioElement** + 预加载到 `readyState >= HAVE_FUTURE_DATA`，仍比 N 个 Howl 稳

### 2. 预加载契约

- `preloadWordAudios` 改为调用 `wordAudioPlayer.preloadUrls`
- 仅成功 ready 的 URL 记入集合；失败不计入「完成」
- `useChapterAudioPreload`：存在失败时保持阻塞或展示「N 条失败可重试」，不假装 100%
- 进度条文案改为「音频就绪 x/y」

### 3. React 接入

- `usePronunciationSound`：自定义 URL / segment 均委托共享播放器；去掉组件内 `useSound(html5)`（有道 TTS 可暂留 Howl 或一并迁入）
- `WordPronunciationIcon`：只调 `play()`，不再外层 `stop()+play()`
- `WordCard` 不再为「持有 Howl」而存在；点击只传 URL 给单例

### 4. Unlock

- 在训练页首次 pointerdown / keydown（含播音快捷键）调用 `wordAudioPlayer.unlock()`（`AudioContext.resume` + 静音短缓冲 play）
- 解释 F5/Ctrl+J 现象：主区成功 play 完成了 unlock；改造后进章后首次任意手势即可，侧栏不必「等主区先播」

### 5. 有道 TTS

- 本期：自定义音频走新播放器；纯有道路径可保留现有 Howl，或第二阶段迁入
- 自定义 `playerror` **不**静默回退有道（避免错音），只提示重试

## Risks / Trade-offs

- [大章 decode 内存] → 本章全量 decode + 离章 unload；必要时仅 LRU 最近 N 条并在点击时补 decode（仍保证「进度条完成的 URL」已 ready）
- [WebAudio 与 Howler 混用] → 发音统一到一处；按键音可继续 Howler
- [预加载变慢] → 并发限制（现有 6）+ 优先当前词；体感换可靠性
- [回归听写自动播] → 共用 API，自动播与侧栏同路径单测/手测

## Migration Plan

1. 落地 `wordAudioPlayer` + 单测（preload / play / stop / retry）
2. 接线 `usePronunciationSound` 与章预加载
3. 改 WordList / Icon 调用方式
4. 手测：C5/C11 大章进章 → 进度条满 → 侧栏连点；冷启动不先 Ctrl+J 也能播
5. 回滚：feature 开关或 git revert；不改音频资源

## Open Questions

- 有道 TTS 是否本期一并迁入共享播放器？（建议：自定义优先，有道可二期）
- 失败 UI：轻 toast 还是仅图标抖动？（建议：首次失败静默重试，二次失败 toast）
