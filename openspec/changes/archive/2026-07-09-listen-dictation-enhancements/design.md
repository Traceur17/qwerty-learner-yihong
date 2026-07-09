## Context

听写模式（`listen-dictation-mode`）已实现 `DictationWord`、Enter 提交、互斥默写等核心能力。初版为避免 Enter 与 Start 按钮冲突，在听写模式下完全禁用了「按任意键开始/继续」遮罩；同时将音标、翻译、上下词硬编码为隐藏。

用户反馈需要：

1. 遮罩在章节开始和暂停时出现，但 Enter 提交答案时不得出现
2. 听写 Popover 内可配置显示上一词、音标、翻译（默认全关）
3. 反馈期间配置项保持可见

## Goals / Non-Goals

**Goals:**

- 听写模式下 `isTyping === false` 时显示遮罩，文案与普通模式一致
- Enter 提交不改变 `isTyping`，反馈期间无遮罩
- 扩展 `ListenDictationConfig` 三个布尔字段，持久化到 localStorage
- 听写专属显示配置，不影响全局设置
- 仅显示上一词（`PrevAndNextWord type="prev"`），行为对齐默写模式下上一词展示

**Non-Goals:**

- 发音 fallback / URL 编码修复（另开 `pronunciation-fallback` 变更）
- 显示下一词
- 反馈期间隐藏已开启的配置项

## Decisions

### 1. 遮罩条件恢复为与普通模式一致

**选择**：`WordPanel` 遮罩条件从 `!state.isTyping && !listenDictationConfig.isOpen` 改为 `!state.isTyping`。

**Enter 隔离**：保持 `StartButton` 在听写模式下禁用 Enter 快捷键（`enabled: !listenDictationConfig.isOpen`）。`DictationWord` 提交时不 dispatch `SET_IS_TYPING`。

### 2. 扩展配置结构

```ts
export type ListenDictationConfig = {
  isOpen: boolean
  showPrevWord: boolean // default false
  showPhonetic: boolean // default false
  showTranslation: boolean // default false
}
```

`atomForConfig` 会自动 merge 缺失字段，旧用户升级后新字段取默认值 `false`。

### 3. ListenDictationSwitcher UI

Popover 内主开关下方，当 `isOpen` 时展开三个 Switch，样式对齐 `WordDictationSwitcher` 子选项区域。

### 4. WordPanel 条件渲染

听写模式 + `DictationWord` 核心不变。额外渲染：

| 配置   | 条件                             | 组件                                              |
| ------ | -------------------------------- | ------------------------------------------------- |
| 上一词 | `showPrevWord && state.isTyping` | `PrevAndNextWord type="prev"`                     |
| 音标   | `showPhonetic`                   | `Phonetic`                                        |
| 翻译   | `showTranslation`                | `Translation`（`showTrans` 恒 true 或跟听写开关） |

遮罩显示时（`!isTyping`），上一词区域不显示（与普通模式一致：上一词仅在 `isTyping` 时出现）。

反馈期间 `isTyping` 仍为 `true`，`isLocked` 为 `true`——音标/翻译/上一词继续渲染，不受 `isLocked` 影响。

### 5. PrevAndNextWord 释义来源

听写模式下，上一词下方的释义应跟随 `listenDictationConfig.showTranslation`，而非全局 `state.isTransVisible`。

**实现**：给 `PrevAndNextWord` 增加可选 prop `showTransOverride?: boolean`，或在组件内检测听写模式 + `showTranslation`。

### 6. 不显示下一词

听写模式永不渲染 `PrevAndNextWord type="next"`，即使用户误开全局 `isShowPrevAndNextWord`。

## Risks / Trade-offs

- **[Risk] 旧 localStorage 缺字段** → `atomForConfig` merge 默认值已处理
- **[Risk] 翻译 Tab 快捷键在听写下仍触发** → 可接受；听写翻译由专属开关控制，与 Tab 无关
- **[Trade-off] 配置项在 Popover 内** → 与默写模式一致，不另开设置页

## Migration Plan

纯前端增量，无破坏性变更。部署后听写用户自动获得默认全关配置，遮罩行为恢复。

## Open Questions

（无，探索阶段已全部确认。）
