## Context

- 错题数据存于 Dexie `wordRecords`，字段含 `dict`、`chapter`（0-based）、`wrongCount`，复合索引 `[dict+chapter]`
- 整词典错题复习：`Gallery-N/ReviewDetail` → `generateNewWordReviewRecord(dictId, errorData)` → `reviewModeInfoAtom`
- 训练页词表：`useWordList` 在 `isReviewMode` 时读 `reviewRecord.words`
- 训练页错题本按钮 `ErrorBookButton` 仅 `navigate('/error-book')`，无本章筛选
- 结果页 `ResultScreen` 已有 `wrongWords`（本章本次错词），但无「再练错词」入口

## Goals / Non-Goals

**Goals:**

- 训练页、结果页一键启动**当前章**错词复习
- 复用 `ReviewRecord` / `reviewMode`，最小改动
- 无错词时明确禁用 + 提示

**Non-Goals:**

- 不改变整词典智能复习算法（`ReviewDetail`）
- 不新增 IndexedDB 表或字段
- 不在本章错词复习中写回 `chapter` 到 `ReviewRecord`（沿用 `isReviewMode` → `chapter: -1` 记录策略）

## Decisions

### 1. 数据查询：`useChapterErrorWords`

新增 hook，参数 `(dictId, chapter, wordList)`：

```ts
db.wordRecords
  .where('[dict+chapter]')
  .equals([dictId, chapter])
  .filter((r) => r.wrongCount > 0)
```

按 `word` 去重，映射到 `wordList` 中的 `Word`。与 `useErrorWords` 逻辑类似，但范围限定单章。

**备选**：结果页仅用本次 `wrongWords` — 拒绝，因用户可能想练历史累计错词，不仅是本轮。

### 2. 启动复习：共用 `startChapterErrorReview`

```ts
async function startChapterErrorReview(dict, chapter, errorWords, setters) {
  const errorData = toTErrorWordData(errorWords, records) // 或简化：直接 map Word[]
  const record = await generateNewWordReviewRecord(dict.id, errorData)
  setCurrentDictId(dict.id)
  setCurrentChapter(chapter) // 保留章节上下文供 UI 显示；review 词表来自 record
  setReviewModeInfo({ isReviewMode: true, reviewRecord: record })
  dispatch(RESET / START) // 结果页需先退出结果态
}
```

复用 `generateNewWordReviewRecord` 保持排序权重（错次、最近错误时间）。若 `errorData` 仅含单章记录，排序仍有效。

**备选**：新建 `chapterReviewRecord` 类型 — 过度设计，不采用。

### 3. UI 落点

| 位置   | 组件                                                                        |
| ------ | --------------------------------------------------------------------------- |
| 训练页 | 新建 `ChapterErrorReviewButton.tsx`，与 `ErrorBookButton` 并列于 `Switcher` |
| 结果页 | `ResultScreen` 按钮区，「重复」旁增加「再练本章错词」                       |

禁用态：`disabled={count === 0}`，`title="本章暂无错词"`。

### 4. 结果页启动时需重置 Typing 状态

从结果屏进入复习：调用现有 `dispatch` 重置 chapter（与「重复本章」类似），再设 `reviewMode`。

## Risks / Trade-offs

- **[Risk] 同一词多章都有错记录** → 本章查询只取当前 `chapter` 索引，行为符合预期
- **[Risk] `generateNewWordReviewRecord` 覆盖词典级未完成 ReviewRecord** → 与词库页「开始新的复习」行为一致；可接受
- **[Trade-off] 复习记录 chapter 存 -1** → 无法在分析页区分「本章错词复习」vs「整库复习」；本期不解决

## Migration Plan

纯前端功能，无数据迁移。部署后即生效。

## Open Questions

- 按钮文案是否统一为「练本章错词」/「再练本章错词」（暂定：是）
- 复习模式下是否隐藏「练本章错词」按钮（暂定：隐藏，避免嵌套）
