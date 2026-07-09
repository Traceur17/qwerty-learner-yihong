## Why

当前打字练习采用逐字实时校验，输入错误后 300ms 清空重来，适合打字纠错训练，但不适合雅思听写场景。用户需要一种「只听发音、整词输入、Enter 提交、判对错后自动过词」的听写模式，并将错词纳入现有错题体系供词库内复习。

## What Changes

- 新增独立的「听写模式」开关，与现有「默写模式」互斥
- 听写模式下仅保留单词发音与发音图标，隐藏音标、翻译、字母格、上下词预览等一切文字提示
- 输入区改为单行横线样式，用户自由输入，按 Enter 整词提交
- 提交后锁定输入，显示对错反馈（错误时展示用户输入与正确答案），约 1s（正确）/ 1.5s（错误）后自动进入下一词
- 每次提交均写入 IndexedDB 练习记录（正确 `wrongCount = 0`，错误 `wrongCount += 1`），供词库内「错题回顾」使用
- 不修改全局错题本 `/error-book` 与词库内「错题回顾」的现有入口与流程

## Capabilities

### New Capabilities

- `listen-dictation-mode`: 听写模式的开关、互斥逻辑、专用 UI、整词提交校验、对错反馈与自动过词
- `listen-dictation-records`: 听写模式下的练习记录写入规则（提交即记录，不论对错）

### Modified Capabilities

（无。项目尚无既有 OpenSpec 规格，本次为全新能力。）

## Impact

- `src/store/` — 新增听写模式配置 atom
- `src/pages/Typing/components/Switcher/` — 新增听写模式开关
- `src/pages/Typing/components/WordPanel/` — 条件渲染听写 UI，隐藏音标/翻译等
- `src/pages/Typing/components/WordPanel/components/` — 新增 `DictationWord` 组件
- `src/utils/db/` — 听写模式提交即保存记录
- `src/typings/` — 新增听写相关类型（如需要）
