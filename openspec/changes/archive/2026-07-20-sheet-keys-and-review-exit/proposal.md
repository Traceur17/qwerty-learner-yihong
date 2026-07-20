## Why

连播卷面输入焦点过严（只能跟到当前播放词），切词缺少左右方向键，暂停用 Esc 太远；章节结算进入的「本章错词练习」结束后退出被强制重置到第 1 章，缺少回到原章继续练的入口。需要一次改完键盘体验与错题结算出口。

## What Changes

- 连播卷面焦点上限改为「当前播放词 + 1」（不超过词表末尾），便于输完当前词后提前进入下一格等待
- 输入框内增加 `←` / `→` 切词（仍受焦点上限约束）；保留现有 Enter / Tab / ↑↓
- 新增 `Ctrl + Space` 暂停/继续（输入内外均可）；保留非输入焦点时单独 Space，以及 Esc 现有行为
- 有原章快照（`chapterErrorReturn`）的错题练习结算：退出不再重置到第 1 章；提供「重复本章节」「下一章节」；关闭（×）等同重复本章节
- Gallery 无快照的全局错题复习结算仍走「练习其他章节」→ 词库（不变）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `continuous-dictation-sheet`: 焦点上限、左右切词、Ctrl+Space 播放切换
- `chapter-error-review`: 本章错词练习结算后的退出/回原章按钮行为

## Impact

- `ContinuousDictationSheet`：`focusRow`、全局 keydown、`onAnswerKeyDown`
- `ResultScreen`：复习模式结算按钮与关窗逻辑（读 `chapterErrorReturn`）
- 可能小幅更新连播引导文案（若提到焦点/快捷键）
- 无新依赖、无 DB schema 变更
