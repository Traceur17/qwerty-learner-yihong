## Context

Qwerty Learner 打字页（`src/pages/Typing/`）当前以 `WordComponent` 为核心，通过 `KeyEventHandler` 逐字捕获键盘输入，在 `useEffect` 中实时比对每个字母。错误时设置 `hasWrong = true`，300ms 后清空输入重来。工具栏已有「默写模式」（`wordDictationConfigAtom`），通过隐藏字母显示 `_` 下划线，但仍使用逐字校验与 `Letter` 组件。

项目已有错题体系：IndexedDB `wordRecords` 存储练习记录，词库详情页（Gallery-N）提供「错题回顾」入口（`reviewModeInfoAtom`），全局 `/error-book` 仅用于查看历史错词。

用户需要独立的「听写模式」，交互模型与现有打字/默写完全不同。

## Goals / Non-Goals

**Goals:**

- 新增听写模式开关，与默写模式互斥
- 听写时仅显示发音图标，隐藏音标、翻译、字母格、上下词预览
- 单行横线输入，Enter 整词提交，提交后锁定
- 显示对错反馈（错误时展示用户输入与正确答案），定时自动过词
- 每次提交写入 IndexedDB，错词可供词库内「错题回顾」使用
- 保持现有 UI 风格（indigo 强调色、圆角、深色模式兼容）

**Non-Goals:**

- 不修改全局错题本 `/error-book`（不加「再练」入口）
- 不修改词库内「错题回顾」的生成逻辑与 UI
- 不改造现有普通打字模式与默写模式的逐字校验逻辑
- 不将反馈停留时间做成用户可配置项（先写死 1s / 1.5s）

## Decisions

### 1. 独立组件 `DictationWord`，而非改造 `WordComponent`

**选择**：在 `WordPanel` 中根据 `listenDictationConfig.isOpen` 条件渲染 `DictationWord` 或现有 `WordComponent`。

**理由**：两种模式的输入捕获、校验时机、UI 结构差异过大。改造 `WordComponent` 会引入大量分支，维护成本高。

**备选**：在 `WordComponent` 内加 `if (listenDictation)` 分支 — 否决，违反单一职责。

### 2. 独立 atom `listenDictationConfigAtom`

**选择**：新增 `listenDictationConfigAtom`（`{ isOpen: boolean }`），与 `wordDictationConfigAtom` 分离。

**理由**：听写模式不是默写模式的子类型，而是平行的练习模式。独立 atom 使互斥逻辑清晰。

**互斥实现**：在听写开关 `onChange` 中，开启听写时设置 `wordDictationConfig.isOpen = false`；在默写开关 `onChange` 中，开启默写时设置 `listenDictationConfig.isOpen = false`。

### 3. 输入方式：隐藏 `<input>` + 视觉横线

**选择**：使用透明/无边框 `<input>` 叠加在一条横线 `<div>` 上，通过 `onKeyDown` 捕获 Enter 提交。英语词库沿用 `KeyEventHandler` 的 `isLegal` 校验；含空格词使用 `EXPLICIT_SPACE` 常量处理。

**理由**：需要可见光标与标准文本编辑体验（退格、选中等），纯 `window.addEventListener` 不如 input 自然。

**备选**：继续用 `KeyEventHandler` 逐字拼接 — 否决，无法自然支持 Enter 提交语义。

### 4. 整词比对逻辑

**选择**：提交时将 `inputWord` 与 `word.name`（经 `EXPLICIT_SPACE` 处理后的 `displayWord`）做整词比对，尊重 `isIgnoreCaseAtom` 设置。

**比对时机**：仅 Enter 按下时，输入过程中不做任何校验。

### 5. 提交后状态机

```
idle → typing → submitted → feedback → (timer) → onFinish → idle
```

- `submitted`：锁定 input，`readOnly` 或 `disabled`
- `feedback`：显示 ✓/✗ 及错误详情
- 正确：1000ms 后调用 `onFinish()`
- 错误：1500ms 后调用 `onFinish()`

### 6. 记录写入

**选择**：在 `DictationWord` 提交判定时直接调用 `useSaveWordRecord()`，不依赖 `isFinished` 逐字完成逻辑。

- 正确：`wrongCount: 0, letterMistake: {}`
- 错误：`wrongCount: 1, letterMistake: {}`（听写模式不记录逐字母错误）

同时 `dispatch(REPORT_CORRECT_WORD)` 或 `dispatch(REPORT_WRONG_WORD)` 保持章节统计一致。

### 7. 听写模式下的 UI 隐藏策略

在 `WordPanel` 中：

```tsx
{
  !listenDictationConfig.isOpen && phoneticConfig.isOpen && <Phonetic />
}
{
  !listenDictationConfig.isOpen && <Translation />
}
{
  !listenDictationConfig.isOpen && isShowPrevAndNextWord && <PrevAndNextWord />
}
```

`DictationWord` 内部仅渲染发音图标（复用 `WordPronunciationIcon`），新词开始时自动播放。

### 8. 开关 UI 位置

**选择**：在 `Switcher` 工具栏中，`WordDictationSwitcher` 旁新增 `ListenDictationSwitcher`，样式与默写开关一致（Popover + Switch）。

**快捷键**：`Ctrl + Shift + D`（D = Dictation），避免与现有 `Ctrl + V`（默写）冲突。

## Risks / Trade-offs

- **[Risk] 听写与普通模式切换时状态残留** → 切换模式时通过 `wordComponentKey` 强制 remount 组件，清空输入与反馈状态
- **[Risk] Enter 键与输入法冲突** → 复用现有 `isChineseSymbol` 检测，输入法激活时提示关闭
- **[Risk] 空输入按 Enter** → 忽略空提交，不判对错，不写入记录
- **[Risk] `useSaveWordRecord` 假设逐字完成** → 检查 `saveWordRecord` 实现，确保 `letterTimeArray` 可为空数组、`wrongCount` 直接传入即可
- **[Trade-off] 反馈时间写死** → 后续可在 Setting 中扩展，当前 YAGNI
- **[Trade-off] 听写错误不记录逐字母 mistakes** → 词库「错题回顾」仍按单词维度工作，与现有逻辑兼容

## Migration Plan

- 纯前端功能新增，无数据库 schema 变更
- 无破坏性 API 变更
- 部署：正常 `npm run build`，用户刷新即可
- 回滚：移除听写开关与 `DictationWord` 组件即可恢复原有行为

## Open Questions

（无。探索阶段已全部确认。）
