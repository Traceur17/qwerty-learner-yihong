## 1. 配置与类型

- [x] 1.1 扩展 `ListenDictationConfig` 类型，新增 `showPrevWord`、`showPhonetic`、`showTranslation`（默认 false）
- [x] 1.2 更新 `listenDictationConfigAtom` 默认值，包含三个新字段

## 2. 听写开关 UI

- [x] 2.1 在 `ListenDictationSwitcher` Popover 中新增三个 Switch（显示上一词、显示音标、显示翻译）
- [x] 2.2 子开关仅在听写模式开启时显示，样式对齐 `WordDictationSwitcher`

## 3. 遮罩恢复

- [x] 3.1 `WordPanel` 遮罩条件改为 `!state.isTyping`（移除听写模式排除）
- [x] 3.2 确认 `StartButton` 听写模式下 Enter 仍禁用暂停（已有逻辑，验证即可）
- [x] 3.3 确认 `DictationWord` 提交时不改变 `isTyping`（已有逻辑，验证即可）

## 4. WordPanel 条件渲染

- [x] 4.1 听写模式 + `showPrevWord` + `isTyping` 时渲染 `PrevAndNextWord type="prev"`
- [x] 4.2 听写模式 + `showPhonetic` 时渲染 `Phonetic`
- [x] 4.3 听写模式 + `showTranslation` 时渲染 `Translation`
- [x] 4.4 听写模式永不渲染下一词预览
- [x] 4.5 反馈期间（`isLocked`）音标/翻译/上一词保持显示

## 5. PrevAndNextWord 适配

- [x] 5.1 听写模式下上一词释义跟随 `listenDictationConfig.showTranslation`，而非全局 `isTransVisible`

## 6. 验证

- [x] 6.1 听写章节开始：显示「按任意键开始」遮罩
- [x] 6.2 听写 Pause 后：显示「按任意键继续」遮罩
- [x] 6.3 Enter 提交后：遮罩不出现，反馈可见
- [x] 6.4 三个显示开关默认关，可独立开启
- [x] 6.5 开启上一词时仅显示左侧上一词，无下一词
- [x] 6.6 运行 `npm run build` 无编译错误
