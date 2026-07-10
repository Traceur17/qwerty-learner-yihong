## Why

听写模式答对后缺少中文释义巩固，答错后仅显示两行纯文本、1.5s 自动跳走，用户来不及对比自己的错误与正确答案，尤其对短语词库（王陆 C5）难以发现漏词、多词或拼写差异。需要更显眼的 diff 与差异化的继续节奏。

## What Changes

- **答对**：反馈区显示中文释义（`word.trans`），**1s** 后自动下一词（保持现有节奏，补充释义）
- **答错**：显示正确答案 + 中文释义 + **显眼 diff**（词级优先、字符级次之），**按 Enter 才继续**（取消 1.5s 自动跳）
- 新增听写 diff 展示组件与比较工具（短语按空格分词对比）
- 更新 `listen-dictation-mode` 规格中「反馈与自动前进」相关要求

## Capabilities

### New Capabilities

- `dictation-diff-feedback`: 听写提交后的释义展示、词级/字符级 diff 渲染、错误时 Enter 确认继续

### Modified Capabilities

- `listen-dictation-mode`: 修改「Correct/incorrect feedback with auto-advance」— 答对加释义；答错加 diff 且改为手动 Enter 继续

## Impact

- **修改**: `src/pages/Typing/components/WordPanel/components/DictationWord/index.tsx`
- **新增**: `src/pages/Typing/components/WordPanel/components/DictationWord/DictationDiff.tsx`（或同级）、`src/utils/dictationDiff.ts`
- **规格**: `openspec/specs/listen-dictation-mode/spec.md` 归档时需合并 delta
- **依赖**: 优先自研 diff（短语分词 + 字符 LCS/逐位对比），避免新增重型依赖；若需可选用 `diff` 包
