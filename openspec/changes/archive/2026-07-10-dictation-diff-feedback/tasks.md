## 1. Diff 工具

- [x] 1.1 新增 `src/utils/dictationDiff.ts`：短语 token 对齐 + 字符级 fallback
- [x] 1.2 单元测试：漏词、多词、替换、单字 typo、ignoreCase

## 2. Diff 组件（T4）

- [x] 2.1 新增 `DictationDiff.tsx`：高对比色块渲染 `DiffLinePart[]`
- [x] 2.2 展示用户输入行与正确答案行（含词级/字级高亮）

## 3. DictationWord 反馈节奏（T3）

- [x] 3.1 答对：在成功指示下方显示 `word.trans`，保留 1s 自动 `onFinish`
- [x] 3.2 答错：显示正确答案 + `trans` + `DictationDiff`，**移除** 1.5s 自动跳
- [x] 3.3 答错后 Enter 调用 `onFinish`；避免与未提交时的 Enter 冲突

## 4. 验证

- [ ] 4.1 手动：答对见释义，约 1s 后自动下一词
- [ ] 4.2 手动：答错见 diff + 释义，不按 Enter 不前进
- [ ] 4.3 手动：短语 `a couple of` 漏 `a` 时 diff 正确高亮
- [x] 4.4 `yarn test` 通过 diff 工具测试
