## Context

- `DictationWord` 当前：正确 1s / 错误 1.5s 均 `setTimeout(onFinish)`；错误时仅两行文本，无 `trans`、无 diff
- 词库多为短语（空格分词），需词级对比
- 全局 `isIgnoreCase` 已用于判题，diff 展示应基于**规范化后比较、原样展示**或统一小写对比
- 听写规格 `listen-dictation-mode` 要求错误也自动前进，本变更修改该行为

## Goals / Non-Goals

**Goals:**

- 答对：释义 + 1s 自动下一词
- 答错：释义 + 显眼 diff + Enter 继续
- 短语词级 diff + 单词字符级 diff
- 仅影响听写组件，不改普通打字模式

**Non-Goals:**

- 三连对庆祝（洛克王国 overlay）— 单独 backlog，本期不做
- WPM / 错词类型指标统计 — 本期不做
- 修改 `Word` 默写模式反馈

## Decisions

### 1. Diff 算法：`dictationDiff.ts`

```ts
type DiffToken = { type: 'match' | 'missing' | 'extra' | 'replace'; text: string; ref?: string }

function diffPhrase(user: string, correct: string, ignoreCase: boolean): DiffToken[]
```

- 按空格 `split` 得 token 数组
- 用简单双指针或 LCS 对齐 token（短语长度通常 < 10，O(n²) 可接受）
- 单 token 内若 `replace` 且长度相近，再做逐字符 diff（相同前缀/后缀 + 中间高亮）

**备选**：引入 `diff` npm 包 — 字符级够用但词级需预处理；自研更可控。

### 2. UI：`DictationDiff.tsx`

- 两行并排或上下：「你的」vs「正确」
- Tailwind：`bg-red-100 text-red-800` / `bg-green-100 text-green-800`，`text-xl font-mono`
- `trans` 用 `text-gray-600`，字号略小于 diff

### 3. 状态机扩展

```ts
type FeedbackState = 'none' | 'correct' | 'wrong' | 'wrong_ack' // 不需要 wrong_ack，wrong 时 Enter 调 onFinish
```

- `feedback === 'correct'` → 保持 `setTimeout(onFinish, 1000)`
- `feedback === 'wrong'` → 清除 WRONG_DELAY timer；`handleKeyDown` 在 locked + wrong 时 Enter → `onFinish()`
- 防止重复 Enter：wrong 后第一次 Enter 前进，需 `hasAdvanced` ref 或切状态

### 4. 释义格式

`word.trans.filter(Boolean).join('；')` — 与结果页导出一致。

## Risks / Trade-offs

- **[Risk] Enter 与提交冲突** → wrong + locked 时 Enter 仅用于继续，不再触发 submit
- **[Risk] 长短语 diff 换行** → `max-w-2xl` + `break-words`
- **[Trade-off] 词级 LCS 对语序大错可能不够直观** → 仍优于纯字符 diff；后续可迭代

## Migration Plan

无数据迁移。部署后听写反馈行为立即变化（错误需多按一次 Enter）。

## Open Questions

- diff 是否受 `isIgnoreCase` 影响展示（暂定：比较时忽略大小写，展示保留用户原输入）
