# 展示我的天分 · Design

## Context

- 逐词听写的判对/判错唯一入口是 `DictationWord/index.tsx` 的 `handleSubmit`（`REPORT_CORRECT_WORD` / `REPORT_WRONG_WORD` 均由此发出）；答对停留 1s 自动下一词，答错需 Enter 继续。
- 章节结算页为 `src/pages/Typing/components/ResultScreen/`，从 `TypingContext` 的 `chapterData`（`correctCount` / `wrongCount` / `userInputLogs`）取数据。
- 连播卷面 `ContinuousDictationSheet` 用本地 `revealed` state 控制「对答案」揭晓，逐题 `graded` 判定已在组件内。
- 配置沿用 `src/store/index.ts` 的 `atomForConfig`（localStorage 持久化）模式。
- 项目已有 `canvas-confetti` 依赖（ResultScreen 在用）。
- 素材：`manifests/天分/` 下四张 PNG 徽章横幅，本变更只使用正面三张。

## Goals / Non-Goals

**Goals:**

- 逐词听写连对 3 / 4 / 5 弹出递进徽章，5 之后每 +5 重复最高级；答错静默归零。
- 章节结算按正确率（≥80 / ≥70 / ≥60）盖章，<60% 不盖章。
- 弹出/盖章不阻塞、不改变既有练习节奏；一个总开关（默认开）。

**Non-Goals:**

- 打字练习模式不做任何激励。
- 连播卷面模式不做任何激励（2026-07-18 用户确认撤销原「对答案盖章」方案）。
- 「一般般的天分」本期不使用（不迁移进 assets）。
- 不做激励历史记录、成就系统、跨章连对累计。

## Decisions

### D1 · 连对计数器放在 WordPanel 层的 useState/useRef，不进 TypingState reducer

连对计数只服务于弹徽章这一个消费者，生命周期与"本章练习会话"一致（换章、进结算即销毁）。放 reducer 会污染 `TypingState` 并要求所有 action 感知它。方案：新建 `useTalentStreak` hook，由 `DictationWord` 在判对/判错时调用 `reportCorrect()` / `reportWrong()`；hook 内部判断阈值并返回待弹的等级。计数器用 `useRef` 存于 WordPanel 层（跨 word 卸载存活），随 `currentChapter` / `reviewMode` 变化重置。

替代方案：挂 jotai atom——可行，但计数无需持久化也无跨页面消费者，局部 state 更省事。

### D2 · 阈值映射为纯函数，集中在一个模块

`src/utils/talentCelebration.ts` 导出：

- `TalentLevel = 'nice' | 'great' | 'amazing'`
- `getStreakLevel(streak: number): TalentLevel | null` —— 3→nice、4→great、5→amazing、>5 且 `(streak-5)%5===0`→amazing、其余 null
- `getAccuracyLevel(correct: number, total: number): TalentLevel | null` —— ≥80%→amazing、≥70%→great、≥60%→nice、否则 null（total 为 0 时 null）

纯函数便于单测覆盖边界（streak=5/10/15、正确率 59.9/60/79.9/80）。

### D3 · 弹出 overlay：单一 `TalentBadgeOverlay` 组件，CSS 动画，不引入动画库

- `fixed` 定位，徽章左上角锚在 `left-[60%] top-[300px]`（1920 全屏时约 (1150, 300)，单词右上方），不随单词输入区布局变动；`pointer-events-none`、小尺寸（w-48/w-56）。
- 游戏成就标识风格：整体倾斜约 -8°、双层 drop-shadow 投影 + brightness/saturate 提亮；入场为从右上砸入 → 旋转抖动衰减 → 静止停留（约 1.8s）→ 淡出（CSS keyframes），总时长约 3s，`onAnimationEnd` 通知父层卸载。
- `amazing` 等级同时触发一次 `canvas-confetti`（粒子起点靠近徽章位置，与 ResultScreen 现有用法一致）。
- 连对推进快于动画时（1s 自动下一词 + 又答对）：新徽章直接替换旧徽章重新计时，不排队。

替代方案：framer-motion——项目未引入，为 3s 的一次性动画加依赖不值。

### D4 · 结算盖章复用同一素材与等级函数，仅 ResultScreen 接入

- **ResultScreen**：从 `state.chapterData` 算正确率，仅当 `listenDictationConfig.isOpen` 且开关开启时渲染 `TalentStamp`（静态盖章组件，入场做一次 scale 收缩的"盖章"动画）。
- ~~ContinuousDictationSheet 对答案盖章~~：2026-07-18 用户确认连播卷面不需要天分展示，已撤销。

### D5 · 开关：扩展 `listenDictationConfigAtom` 而非新建 atom

激励仅在听写模式生效，语义上属于听写配置。在 `ListenDictationConfig` 增加 `talentCelebration: boolean`（默认 `true`），开关 UI 加在 `ListenDictationSwitcher` 面板。`atomForConfig` 对新增字段有默认值合并，老用户 localStorage 无此字段也能拿到 `true`。

替代方案：独立 `talentCelebrationConfigAtom`——若未来打字模式也要激励再拆不迟。

### D6 · 资产：迁入 `src/assets/talent/`，Vite import 引用

`talent-nice.png` / `talent-great.png` / `talent-amazing.png` 由 ES import 引入（进构建指纹、可被打包器优化）。迁移时用工具做无损/轻度有损压缩（目标单张 <100KB）。`manifests/天分/` 原图保留作为源素材，不删除。

## Risks / Trade-offs

- [连对弹窗打断注意力] → `pointer-events-none` + 不抢焦点（不动 `document.activeElement`），输入框焦点逻辑零改动；总时长压在 1.2s 内。
- [答对 1s 自动下一词与动画重叠] → overlay 挂在 WordPanel 层而非 DictationWord 内，词切换不卸载动画。
- [PNG 体积拖慢首包] → ES import + 首次触发前 `new Image()` 预加载即可，三张图非首屏关键资源。
- [reviewMode（错词复习）也会触发连对] → 视为正常练习，同样激励；结算盖章同理，无需特判。

## Open Questions

（无 —— 阈值、素材用法、生效范围均已与用户确认。）
