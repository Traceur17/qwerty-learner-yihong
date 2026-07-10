## 1. 数据层

- [x] 1.1 新增 `useChapterErrorWords(dict, chapter)`：Dexie `[dict+chapter]` 查询 + 去重 + 映射 `Word`
- [x] 1.2 新增 `startChapterErrorReview(...)` 共用函数：调用 `generateNewWordReviewRecord`、设置 `reviewModeInfoAtom`、必要时 `dispatch` 重置

## 2. 训练页入口（T1）

- [x] 2.1 新建 `ChapterErrorReviewButton`：展示「练本章错词」，无错词时 disabled + tooltip
- [x] 2.2 挂到 `Switcher`（错题本按钮旁）；`isReviewMode` 时隐藏
- [x] 2.3 点击后启动本章错词复习，留在 `/` 训练页

## 3. 结果页入口（T2）

- [x] 3.1 `ResultScreen` 增加「再练本章错词」按钮
- [x] 3.2 无错词时 disabled + 提示文案
- [x] 3.3 点击后退出结果屏、进入 review mode（词表 = 本章累计错词，非仅本轮）

## 4. 验证

- [ ] 4.1 手动：有错词章节能从工具栏/结果页进入复习，词数与错题本本章一致
- [ ] 4.2 手动：无错词章节按钮置灰
- [ ] 4.3 听写模式下本章错词复习可正常播放自定义音频
