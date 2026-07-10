## Why

听写练习中，用户常在某一章积累错词，但现有「错题复习」入口在词库页，且按整本词典智能排序，无法一键只练**当前章**的错词。训练页与结果页缺少直达链路，错词闭环断裂，复习成本高。

## What Changes

- 训练页工具栏（错题本旁）新增 **「练本章错词」** 按钮
- 章节结果页新增 **「再练本章错词」** 按钮（同链路）
- 从 IndexedDB 筛选 `dict = 当前词库` + `chapter = 当前章` + `wrongCount > 0` 的去重错词列表
- 复用现有 `reviewMode` + `ReviewRecord` 进入训练，不必跳转词库页
- 本章无错词时按钮置灰，并显示简短提示（tooltip 或 title）
- 新增按章查询错词的 hook/工具函数，供训练页与结果页共用

## Capabilities

### New Capabilities

- `chapter-error-review`: 从训练页/结果页一键启动「当前章错词」复习模式

### Modified Capabilities

- （无）不修改现有 `listen-dictation-*` 规格；复习模式内听写/打字行为保持不变

## Impact

- **修改文件**: `src/pages/Typing/components/ErrorBookButton.tsx`（或新建邻接组件）、`src/pages/Typing/components/ResultScreen/index.tsx`
- **新增**: `src/hooks/useChapterErrorWords.ts`（或 `src/pages/Typing/hooks/`）、`src/utils/chapterErrorReview.ts`（启动复习的共用函数）
- **复用**: `reviewModeInfoAtom`、`generateNewWordReviewRecord`、`useWordList` 的 `isReviewMode` 分支
- **数据**: IndexedDB `wordRecords` 已有 `[dict+chapter]` 复合索引，无需 schema 变更
- **依赖**: 无新 npm 包
