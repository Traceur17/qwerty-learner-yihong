## 1. 最新状态口径（数据层）

- [x] 1.1 新建 `src/utils/db/errorWordStatus.ts`：输入候选词分组，按 `where('word').anyOf(...)` 批量取回记录，按 `dict + word` 分组取最新一条（`timeStamp` 相同时以 `id` 兜底），输出 `isMastered` 标记；附单元测试（练对移出、再错回归、跨来源统一、同秒并列）
- [x] 1.2 `src/utils/chapterErrorReview.ts` 的 `fetchChapterErrorWordData` 接入最新状态过滤（默认只返回最新错题），累计错误次数保持全量统计
- [x] 1.3 `src/pages/Gallery-N/hooks/useErrorWords.ts` 接入同口径过滤

## 2. 错题本页面（UI）

- [x] 2.1 ErrorBook 两个查询（全局 / 章节）聚合时打 `isMastered` 标记，一次聚合同时得出两档数据与数量
- [x] 2.2 新增「最新错题 / 全部错题」切换控件（默认最新错题，显示两档数量，组件内 state 不持久化）
- [x] 2.3 「全部错题」视图中已掌握行的展示：「✓已掌握」标记 + 整行弱化；勾选/删除/详情保持可用
- [x] 2.4 排序、勾选、导出、「练习全部/已选」按钮的数量与词表跟随当前视图

## 3. 连播卷面判分写库

- [x] 3.1 卷面「对答案」时对已判分行批量调用 `useSaveWordRecord`（对 `wrongCount: 0` / 错 `wrongCount: 1`，复习模式自动 `chapter = -1`）
- [x] 3.2 组件内维护 `lastWrittenGrades`：重复判分只为判定变化的行写新记录，未播放行不写

## 4. 盖章正确率与连对阈值

- [x] 4.1 `ResultScreen` 盖章正确数改为 `userInputLogs.filter(l => l.correctCount > 0 && l.wrongCount === 0).length`，未作答不计为答对
- [x] 4.2 `getStreakLevel(streak, mode)` 增加 `review` 分档（3/4/5，5 后每 +3 重复），`WordPanel` 传入 `isReviewMode`；更新 `talentCelebration.test.ts` 覆盖两档阈值

## 5. 验证与收尾

- [ ] 5.1 手动验证主链路：正常听写答错 → 错题本出现；错词复习练对 → 移出「最新错题」且「全部错题」可见并保留次数；再错 → 回归；卷面判分 → 对错入库；结算页「练习错题 (N)」数量随口径变化；断点续练结算不再误盖章（待用户在浏览器实测）
- [x] 5.2 跑 `yarn test`、`yarn lint`、`yarn build`，确认无新增错误（单测 18 项全过；lint 11 条 warning 与 build chunk 提示均为既有问题；`tools/dict-audio-pipeline` 2 个集成测试为既有失败，与本次无关）
- [x] 5.3 更新 `openspec/explore/training-enhancements-backlog.md` 与更新公告（说明错题口径变化与视图切换）
