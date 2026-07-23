## Context

「收集小饼干」已上线：浮层识词 → 卡片确认 → 写入 Dexie「小饼干罐」。另一会话已部分落地数据层（`CollectSection`、`chapterLengths: [听力, 阅读]`、Dexie 迁移补 `section`、按 section 排序加载），但 **收集词卡尚无听力/阅读控件**，且 Gallery / `currentDictInfoAtom` 仍用默认 `CHAPTER_LENGTH=20` 切章，与 repo 元数据不同步。本设计把「词卡右侧二选一」与「固定两章」接成闭环。

## Goals / Non-Goals

**Goals:**

- 词卡右侧：听力 | 阅读 **一分为二、二选一**（segmented），扫一眼可改；默认听力
- 卡片列表上方：一键「全部听力 / 全部阅读」
- 保存时把 `section` 写入 Dexie；练习按听力章 / 阅读章切片
- Gallery 与练习侧对「小饼干罐」展示章名「听力」「阅读」，`chapterCount=2`，`chapterLengths` 随词数变
- 复用并补齐已有 `collectedWords*` 能力，避免重造数据模型

**Non-Goals:**

- 不自动从截图推断听力/阅读（本版人工标注）
- 不增加第三类来源或自定义章名
- 不改其它预置词库的切章规则
- 不在练习主界面单独做 section 编辑器（分类只在收集/批量浮层完成）

## Decisions

### 1. 词卡布局：左内容、右分类

**选择**：卡片 `flex` — 左勾选 + 词/音标/释义；**右侧固定宽度**放竖直或横排的「听力 | 阅读」二分控件（两半等宽、互斥高亮）。不把分类塞进释义行或底部，保证扫视路径「词 → 右缘分类」。

**备选**：下拉 / 单选圆点 — 不如二分直观，也不符合「一分为二」。

### 2. 控件形态：segmented 二选一

**选择**：同一行两个互斥按钮（或 `role="radiogroup"`），当前选中半侧用实色，另一半浅底；点击即切换，无需确认。列表顶「全部听力」「全部阅读」遍历当前 `cards` 写 `section`。

**备选**：仅批量无单卡 — 无法纠正个别词；否决。

### 3. 章节模型：固定 2 章 + chapterLengths

**选择**：`chapterCount = 2`；`chapterLengths = [listeningCount, readingCount]`；词表顺序听力在前、阅读在后；`getChapterRange` 已支持 `chapterLengths`，练习切片无需特殊 fork。

空章（0 词）仍展示，点进练习则列表为空（与现有空章行为一致），避免「忽然少一章」造成索引错乱。

### 4. 元数据接线

**选择**：`syncCollectBiscuitDictMeta` 已写 `idDictionaryMap` / `dictionaries`；补齐：

- `collectedWordCountAtom` / `currentDictInfoAtom`：对 collect 库返回 `chapterCount: 2` + live `chapterLengths`（可另加 atom 存两段长度，或从 sync 后的 dict 读）
- `DictDetail` / `DictionaryWithoutCover`：不要再 `calcChapterCount(collectedCount)`
- `Chapter`：当 `dictID === collect-biscuit` 时标题用 `getCollectBiscuitChapterTitle(index)`

### 5. Draft / 保存路径

**选择**：`CollectCardDraft` 增加 `section`（默认 `listening`）；`recognizeAndEnrich` 产出默认听力；保存调用已有 `addCollectedWords(..., { section })`。重新识别重置卡片时 section 仍默认听力（不保留上一轮分类，避免错绑）。

### 6. 与另一空壳 change 的关系

**选择**：本变更目录 `collect-biscuit-listen-read-chapters` 为唯一真相源；空目录 `biscuit-jar-listen-read` 可在实现前删除，避免双开。

## Risks / Trade-offs

- [数据层已半落地、UI/store 未接] → tasks 先对齐现状再改，避免重复迁移
- [用户历史练习记录按旧 20 词章索引] → 章语义变更后旧 `chapterRecords` 可能对不上；接受一次性错位，或文档提示「收集库章节已改为听力/阅读」
- [空阅读章仍显示] → 略占位，但索引稳定；若产品后续要隐藏空章再改
- [窄屏词卡右侧挤压] → 右侧固定最小宽度；极窄时可纵向堆叠（分类仍在右/下缘，不挪到左侧）

## Migration Plan

- Dexie 升版与缺省 `section='listening'` 若已存在则跳过；否则补迁移
- 导出/导入字段含 `section`；旧备份无字段时 normalize 为听力
- 回滚：去掉词卡控件与固定两章接线，恢复 `calcChapterCount`；保留 DB 字段无害

## Open Questions

- （无阻塞）空章是否隐藏：本版默认显示；若你更倾向隐藏 0 词章，实现前改一句即可
