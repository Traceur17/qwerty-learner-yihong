## Why

「小饼干罐」里的词来自雅思听力与阅读材料，但当前按统一章长切片，练习时无法按来源分流。收集确认时也缺少一眼可辨的听力/阅读标记，用户只能事后在脑子里记来源。

## What Changes

- 收集浮层词卡右侧增加 **听力 | 阅读** 一分为二、二选一控件（segmented），默认听力，便于扫一眼就改
- 浮层提供一键「全部听力 / 全部阅读」，批量改当前卡片列表的分类
- 每条收集词持久化 `section: 'listening' | 'reading'`；旧数据无字段时视为听力
- 「小饼干罐」练习章节改为固定两章：**听力**、**阅读**（不再按默认 20 词切章）；章长随各类词数动态变化
- Gallery 词库详情对「小饼干罐」展示「听力」「阅读」章名，而非「第 N 章」
- 练习加载顺序：听力词在前、阅读词在后；空章仍可选中但练习列表为空（或隐藏空章——见 design）

## Capabilities

### New Capabilities

- （无）本变更在既有收集/自定义词库能力上扩展，不引入独立新能力域

### Modified Capabilities

- `biscuit-word-collection`: 词卡增加右侧听力/阅读二选一与批量一键分类
- `custom-collected-dictionary`: 词条增加 section；章节模型改为听力/阅读两章及对应元数据

## Impact

- **UI**: `CollectBiscuitOverlay` 词卡布局；Gallery `DictDetail` 章名；可能的章节选择文案
- **数据**: Dexie `collectedWords` 增加 `section`；导出/导入需带回该字段；`length`/`chapterCount`/`chapterLengths` 计算逻辑
- **练习**: `useWordList` / 章节切片对 `collect-biscuit` 走按 section 分组，而非全局 `CHAPTER_LENGTH`
- **兼容**: 已有无 `section` 的词默认听力；不破坏其它预置词库的切章规则
