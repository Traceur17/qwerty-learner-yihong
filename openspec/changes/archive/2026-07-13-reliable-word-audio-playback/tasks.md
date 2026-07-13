## 1. Shared player foundation

- [x] 1.1 新增 `src/utils/wordAudioPlayer.ts`：单例 `preloadUrls` / `playUrl` / `stop` / `unlock` / `isReady`（WebAudio buffer 或单 HTMLAudio + ready 缓存）
- [x] 1.2 为 `wordAudioPlayer` 写单元测试：preload 成功才 ready、失败不计入、playerror 重试一次、stop 不误杀后续合法 play
- [x] 1.3 训练页挂载首次 pointerdown/keydown 调用 `unlock()`

## 2. Chapter preload contract

- [x] 2.1 改造 `chapterAudioPreload.ts`：委托 `wordAudioPlayer.preloadUrls`，仅 ready URL 记入会话集合
- [x] 2.2 改造 `useChapterAudioPreload`：失败 URL 暴露数量/可重试；进度语义为「就绪」而非仅下载
- [x] 2.3 更新进度条文案（Typing 加载 UI）与相关测试

## 3. Wire pronunciation UI

- [x] 3.1 改造 `usePronunciationSound`：自定义 URL 走共享播放器；去掉自定义路径上的 `useSound(html5)`
- [x] 3.2 改造 `WordPronunciationIcon`：去掉外层双重 `stop()+play()`，改为单次 play（可 interrupt）
- [x] 3.3 确认 WordList / DictationWord / Word 主区自动播与 Ctrl+J 均走同一 play API
- [x] 3.4 自定义音频二次 play 失败时给出可见反馈（toast 或图标态）

## 4. Verification

- [ ] 4.1 手测大章（C5/C11）：进章等进度条满 → **不先**主区播音 → 侧栏连点多词均有声
- [ ] 4.2 手测：冷启动后仅侧栏点击也能播；主区 Ctrl+J / 自动播与侧栏切换无静默失败
- [x] 4.3 跑相关单测；必要时 bump 不涉及音频资源的说明即可
