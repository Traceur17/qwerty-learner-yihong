## Why

听写模式初版为追求「零提示」体验，禁用了与普通模式一致的「按任意键开始/继续」遮罩，且音标、翻译、上一词无法按需开启。用户需要在保持 Enter 提交不被打断的前提下，恢复章节开始与中途暂停时的遮罩行为，并在听写开关下提供可配置的显示选项。

## What Changes

- 听写模式下恢复「按任意键开始/继续」遮罩，行为与普通模式一致（章节未开始、Pause、失焦、打开设置/单词列表时显示）
- Enter 提交整词时不得触发暂停或遮罩，对错反馈期间遮罩不得出现
- 扩展 `listenDictationConfigAtom`，新增三个独立开关（默认关闭）：显示上一词、显示音标、显示翻译
- 听写模式下「上一词」仅显示上一个单词（不显示下一词），展示方式与默写模式下 `PrevAndNextWord type="prev"` 一致
- 提交后反馈期间（约 1s/1.5s），已开启的音标、翻译、上一词继续显示
- 听写显示配置与全局 `phoneticConfig`、`isTransVisible`、`isShowPrevAndNextWord` 互不干扰

## Capabilities

### New Capabilities

- `listen-dictation-overlay`: 听写模式下遮罩的显示/隐藏规则，以及与 Enter 提交的隔离
- `listen-dictation-display-options`: 听写模式下的可配置显示项（上一词、音标、翻译）及其默认值与渲染规则

### Modified Capabilities

- `listen-dictation-mode`: 将「强制隐藏音标/翻译/上下词」改为「默认隐藏、可通过听写专属配置开启」；更新最小 UI 相关需求

## Impact

- `src/store/index.ts` — 扩展 `listenDictationConfigAtom` 字段
- `src/typings/index.ts` — 扩展 `ListenDictationConfig` 类型
- `src/pages/Typing/components/ListenDictationSwitcher/` — Popover 内增加三个子开关
- `src/pages/Typing/components/WordPanel/` — 恢复遮罩；按听写配置条件渲染上一词/音标/翻译
- `src/pages/Typing/components/PrevAndNextWord/` — 听写模式下上一词释义跟随听写翻译开关（如需要）
