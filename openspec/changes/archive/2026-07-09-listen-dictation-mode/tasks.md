## 1. 配置与类型

- [x] 1.1 在 `src/store/index.ts` 新增 `listenDictationConfigAtom`（`{ isOpen: boolean }`），使用 `atomForConfig` 持久化
- [x] 1.2 在 `src/typings/index.ts` 补充听写相关类型（如需要导出）

## 2. 听写模式开关

- [x] 2.1 新建 `src/pages/Typing/components/ListenDictationSwitcher/index.tsx`，样式对齐 `WordDictationSwitcher`（Popover + Switch）
- [x] 2.2 实现与默写模式互斥：开启听写时关闭 `wordDictationConfig.isOpen`，反之亦然
- [x] 2.3 在 `Switcher/index.tsx` 中引入 `ListenDictationSwitcher`，添加 Tooltip 与快捷键 `Ctrl + Shift + D`

## 3. DictationWord 核心组件

- [x] 3.1 新建 `src/pages/Typing/components/WordPanel/components/DictationWord/index.tsx` 及样式文件
- [x] 3.2 实现单行 input + 横线视觉样式，支持自由输入与退格编辑
- [x] 3.3 实现 Enter 提交逻辑：空输入忽略，非空输入锁定并整词比对（尊重 `isIgnoreCaseAtom`）
- [x] 3.4 实现对错反馈 UI：正确显示 ✓，错误显示 ✗ + 用户输入 + 正确答案
- [x] 3.5 实现定时自动过词：正确 1000ms、错误 1500ms 后调用 `onFinish()`
- [x] 3.6 集成发音：新词自动播放 + `WordPronunciationIcon`（Ctrl+J 重播）
- [x] 3.7 处理输入法检测（复用 `isChineseSymbol` 提示）

## 4. WordPanel 集成

- [x] 4.1 在 `WordPanel/index.tsx` 中根据 `listenDictationConfig.isOpen` 条件渲染 `DictationWord` 或 `WordComponent`
- [x] 4.2 听写模式下隐藏 `Phonetic`、`Translation`、`PrevAndNextWord`
- [x] 4.3 模式切换时通过 `wordComponentKey` 强制 remount，避免状态残留

## 5. 记录与统计

- [x] 5.1 在 `DictationWord` 提交时调用 `useSaveWordRecord()`：正确 `wrongCount: 0`，错误 `wrongCount: 1`
- [x] 5.2 提交时 dispatch `REPORT_CORRECT_WORD` 或 `REPORT_WRONG_WORD` 更新章节统计
- [x] 5.3 验证 `useSaveWordRecord` 在 `letterTimeArray` 为空、`letterMistake` 为空对象时正常工作

## 6. 验证

- [x] 6.1 手动测试：开启听写模式，确认仅显示发音图标与横线输入
- [x] 6.2 手动测试：Enter 提交正确/错误/空输入三种情况
- [x] 6.3 手动测试：听写与默写互斥切换
- [x] 6.4 手动测试：错词出现在词库详情页「查看错题」列表，可通过「错题回顾」练习
- [x] 6.5 运行 `npm run build` 确认无编译错误
