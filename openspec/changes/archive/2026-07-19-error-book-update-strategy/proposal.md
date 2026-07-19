# 错题本更新策略（error-book-update-strategy）

## Why

错题目前是"叠加"口径：一个词只要错过一次就永远留在错题本里，练对了也不会移出，只能手动删除，越用越臃肿，无法聚焦真正没掌握的词。同时发现三个关联缺口：① 连播卷面判分后不写练习记录，游离在错题体系之外；② 结算盖章把"未作答的词"当成答对（断点续练时 40% 正确率也能盖章）；③ 错题练习轮次短，正常模式的连对阈值（6/9/12）几乎无法触发，激励在错题场景失效。

## What Changes

- **错题口径从"叠加"改为"更新"**：一个词是否还是错题，由它在该词典下**时间最新的一条练习记录**决定（最新一条 `wrongCount > 0` → 仍是错题；`= 0` → 已掌握，移出默认视图）。历史错误次数永久保留、持续累加，不删除任何记录。
- **错题本页面新增视图切换**：「最新错题」（默认）/「全部错题」两档，全局错题本与章节错题本均生效。「全部错题」展示历史所有错过的词（含已掌握，行内打勾标记并弱化展示），错误次数照常显示并可排序，勾选/练习/删除/导出行为跟随当前视图。
- **章节错题入口换口径**：结算页「练习错题 (N)」与顶栏「练本章错词」的数量与练习列表均改为「最新错题」口径。
- **连播卷面判分写入练习记录**：点击「对答案」时为每个已判分的词批量写入 `wordRecord`（对 = `wrongCount: 0`，错 = `wrongCount: 1`），使卷面结果进入错题与统计体系。
- **结算盖章正确率修正**：盖章依据改为"实际答对的词数 / 总词数"，未作答（断点续练遗留、跳词）不再计为答对。
- **错题模式独立连对阈值**：错词复习模式下连对阈值改为 3/4/5（5 之后每 +3 重复「了不起」），正常听写维持 6/9/12（12 之后每 +6）。

## Capabilities

### New Capabilities

- `error-book-latest-view`: 错题"最新状态"口径的定义（最新一条记录决定是否仍为错题、错误次数累计保留），以及错题本页面「最新错题 / 全部错题」视图切换的展示与交互。

### Modified Capabilities

- `chapter-error-review`: 章节错题查询要求变更——默认按"最新状态"过滤（最新一条记录仍为错才纳入），入口按钮的数量与可用态随之变化。
- `continuous-dictation-sheet`: 判分要求变更——「对答案」时须为已判分的词写入练习记录，进入错题与统计体系。
- `talent-celebration`: 结算盖章正确率口径修正（未作答不计为答对）；错词复习模式使用独立连对阈值 3/4/5（5 后每 +3）。

## Impact

- **数据层**（无新表、无 schema 变更）：`src/utils/db/index.ts`（卷面批量写入 helper）、错题聚合逻辑三处——`src/pages/ErrorBook/index.tsx` 两个查询、`src/utils/chapterErrorReview.ts` 的 `fetchChapterErrorWordData`、`src/pages/Gallery-N/hooks/useErrorWords.ts`。
- **UI**：`src/pages/ErrorBook/`（视图切换、已掌握行样式）、`src/pages/Typing/components/ResultScreen/index.tsx`（错题数量口径、盖章正确率）、`src/pages/Typing/components/WordPanel/components/ContinuousDictationSheet/index.tsx`（判分写记录）。
- **激励**：`src/utils/talentCelebration.ts`（`getStreakLevel` 增加复习模式参数）、`src/pages/Typing/components/WordPanel/index.tsx`（传入 `isReviewMode`）。
- **兼容性**：纯前端本地改动；既有 IndexedDB 数据无需迁移，口径切换即时生效。性能与现状同量级（聚合时多取每组最新一条记录）。
