# 设计：错题本更新策略

## Context

练习记录 `wordRecords` 是 append-only 的：每次作答追加一条（含 `wrongCount`、`timeStamp`、`chapter`，错词复习模式下 `chapter = -1`）。当前所有错题视图（全局错题本、章节错题本、结算页入口、Gallery 错题数据）都用"叠加"口径聚合：`wrongCount > 0` 的历史记录全部纳入，答对不移出。相关缺口：连播卷面判分结果不落库；结算盖章公式 `(总词数 − 答错词数) / 总词数` 把未作答的词当成答对（断点续练时被触发）；错词复习模式沿用正常模式的连对阈值 6/9/12，短轮次下几乎无法触发。

索引现状：`wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,[dict+chapter]'`——有 `word` 单索引，无 `[dict+word]` 复合索引。

## Goals / Non-Goals

**Goals:**

- 错题状态由"最新一条记录"决定，练对自动移出默认视图、再错自动回来；历史错误次数永久累加保留
- 错题本页面提供「最新错题 / 全部错题」切换，两种形态（全局 / 章节）一致
- 连播卷面判分结果写入 `wordRecords`，进入错题与统计体系
- 盖章正确率改为"实际答对词数 / 总词数"
- 错词复习模式连对阈值 3/4/5（5 后每 +3 重复最高级）

**Non-Goals:**

- 不做间隔复习 / 记忆曲线调度（只看最新一次结果）
- 不区分打字模式与听写模式的"对"（用户确认：打字模式很少用）
- 不改结算页圆环（本次会话提交口径）与 ConclusionBar 文案的算法
- 不做 IndexedDB schema 变更 / 数据迁移

## Decisions

### D1：最新状态用"记录时间戳"现场计算，不引入新表

一个词（`dict + word`）的掌握状态 = 该组合下 `timeStamp` 最新的一条记录（同秒并列时取 `id` 更大者，id 自增可作次序兜底）：`wrongCount > 0` → 仍是错题；`= 0` → 已掌握。

- **替代方案：清除标记表**（错题练对时写 `clearedAt`，聚合时对比时间）。被否：需要新表 + 版本升级，且"清除"语义要在每个练习入口显式埋点；而"最新记录"口径下所有入口（正常听写、错词复习、卷面）天然统一，零埋点。
- 查询策略：先按现有查询拿到错词候选（`wrongCount > 0` 聚合），再用现有 `word` 索引一次 `where('word').anyOf(候选词名)` 批量取回这些词的全部记录，内存按 `dict + word` 分组取最新一条。开销与错词数量成正比，不随总记录数膨胀；无需加 `[dict+word]` 索引。

### D2：聚合逻辑收敛为一个共享 helper

新增 `src/utils/db/errorWordStatus.ts`（命名可调）：输入 `(dict, 候选词分组)`，输出每组的 `isMastered` 标记。四个消费方复用：

1. `src/pages/ErrorBook/index.tsx` 全局查询（按 `dict+word` 分组）
2. `src/pages/ErrorBook/index.tsx` 章节查询（`[dict+chapter]` 候选）
3. `src/utils/chapterErrorReview.ts` 的 `fetchChapterErrorWordData`（结算页/顶栏入口，默认只返回最新错题）
4. `src/pages/Gallery-N/hooks/useErrorWords.ts`（Gallery 错题复习数据，同口径）

### D3：视图切换是纯前端过滤，一次聚合两种视图

ErrorBook 页面聚合时给每组打 `isMastered` 标记，「最新错题」视图 = 过滤掉 `isMastered`，「全部错题」= 不过滤。切换不重新查库；两档数量徽标来自同一份数据。默认「最新错题」，视图状态为组件内 `useState`（不持久化，进页面总是从默认视图开始）。已掌握行：整行降透明度 + 「✓ 已掌握」标记，仍可勾选/删除/查看详情；练习按钮与导出跟随当前视图数据。

### D4：卷面判分写库复用 `useSaveWordRecord`，按"判定变化"去重

「对答案」时对每个已判分行（`index <= maxPlayedIndex`）调用现有 `useSaveWordRecord`（自动处理复习模式 `chapter = -1`）：对 → `wrongCount: 0`，错 → `wrongCount: 1`。组件内维护 `lastWrittenGrades`（行 → 上次写入的判定）：首次判分全部写入；修改答案后重新判分，只为判定发生变化的行追加新记录，避免反复点「对答案」刷记录。会话内多条记录以最新一条为准，与 D1 口径自洽。

### D5：盖章正确数改为"有正确提交的词"

`ResultScreen` 盖章：正确数 = `userInputLogs.filter(log => log.correctCount > 0 && log.wrongCount === 0).length`，总数不变（本轮词表长度）。未作答（断点续练遗留、快捷键跳词）两个计数都为 0，不再计入正确。结算页「练习错题 (N)」数量随 `fetchChapterErrorWordData` 新口径自动变化。

### D6：连对阈值按模式分档，函数签名扩展

`getStreakLevel(streak, mode: 'normal' | 'review' = 'normal')`：normal 维持 6/9/12（12 后每 +6）；review 为 3/4/5（5 后每 +3 重复「了不起」）。`WordPanel` 调用处传入 `isReviewMode`。连对计数归零时机不变（换章、进出复习、答错）。

## Risks / Trade-offs

- [蒙对一次即移出默认视图] → 「全部错题」视图 + 错误次数排序兜底，可随时回炉；再错自动回到「最新错题」。这是用户明确选择的"高效但不保险"策略。
- [`where('word').anyOf(...)` 会取回同名词在其他词典的记录] → 内存中按 `dict` 过滤即可，多余数据量可忽略（同名词跨词典本身少）。
- [卷面重复判分刷记录] → D4 的"判定变化才写"去重；极端情况（反复改对改错）产生多条记录也无害，最新一条为准。
- [时间戳同秒并列] → 以自增 `id` 为次序兜底，保证判定确定性。
- [旧数据首次切换视角的观感突变]（错题本数量骤降）→ 「全部错题」一键可见全部历史，公告里说明口径变化。

## Open Questions

- 无（打字模式不区分、卷面纳入体系、标签用「最新错题 / 全部错题」均已由用户确认）。
