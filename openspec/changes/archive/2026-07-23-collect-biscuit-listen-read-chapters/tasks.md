## 1. Align data layer (verify / complete)

- [x] 1.1 Confirm `CollectSection`、`toCollectedWord`、Dexie 迁移与 `listCollectedWords` / `getCollectedDictMeta` 已符合两章模型；缺项则补齐
- [x] 1.2 Confirm `addCollectedWords` 持久化 `section`；导出/导入保留 `section`（缺省 normalize 为听力）
- [x] 1.3 Remove or ignore empty duplicate change `biscuit-jar-listen-read`（仅保留本 change）

## 2. Collection card UI

- [x] 2.1 Extend `CollectCardDraft` with `section`（默认 `listening`）；`recognizeAndEnrich` 产出默认听力
- [x] 2.2 In `CollectBiscuitOverlay`，词卡右侧加入听力 | 阅读一分为二、二选一控件（互斥高亮）
- [x] 2.3 Add 全部听力 / 全部阅读 bulk actions above the card list
- [x] 2.4 Pass each selected card’s `section` into `addCollectedWords` on save

## 3. Wire chapter metadata in UI / store

- [x] 3.1 Update `currentDictInfoAtom`（及 live count 同步）使「小饼干罐」使用 `chapterCount=2` + live `chapterLengths`，不再 `calcChapterCount`
- [x] 3.2 Update `DictDetail` / `DictionaryWithoutCover` displayDict 同步两章元数据
- [x] 3.3 Update Gallery `Chapter`（及练习页章节列表若硬编码「第 N 章」）对 collect 库显示「听力」「阅读」标题

## 4. Verify

- [x] 4.1 Manual: 识别多词 → 右侧改个别为阅读 → 全部听力/阅读 → 保存后 Gallery 两章词数正确
- [x] 4.2 Manual: 分别练习听力章与阅读章，词表与 section 一致；旧无 section 词出现在听力章
- [x] 4.3 Smoke: 其它预置词库切章仍按默认章长，不受影响
