## Context

Qwerty Learner（本 fork 品牌为 Empress Biscuit）是纯前端 SPA：词库来自 `public/dicts/*.json` + `dictionary.ts` 注册，经 SWR/`wordListFetcher` 加载；练习记录在 Dexie `RecordDB`。Header 左上角 `BiscuitIcon` 目前整块 `NavLink` 回首页。用户需要在练习中途把站外雅思词表（截图或文本）快速入库，且仅一人使用，Gemini 采用 BYOK（设置页存本地）。

## Goals / Non-Goals

**Goals:**

- 固定本地词库「收集小饼干」，可与预置词库一样被选中练习
- 浮层收集：图标开弹窗 → 输入/贴图 → 识别补全 → 卡片确认 → 飞入饼干盒动画 → 不打断原页
- Logo 方案 A：图标开收集；标题回首页
- Gemini key：保存 / 清除 / 连通测试
- 补全管线：词典优先，miss 用 Gemini；释义可手改；发音用现有有道
- 多词默认可取消勾选；跨词库重复时提示词本并由用户决定是否仍添加
- Gallery/词库详情可批量添加

**Non-Goals:**

- 服务端代理或把 API key 打进仓库/构建产物给陌生人用
- 用户自建多个自定义词库（本版固定一个）
- 离线打包完整 ECDICT（体积大）；可作为后续优化
- 改动连播卷面、错题本等既有练习语义

## Decisions

### 1. 自定义词库以 Dexie 为源，虚拟注册进词典列表

**选择**：`id = collect-biscuit`，展示名「收集小饼干」；词条存在 Dexie 新表（如 `collectedWords`），并在运行时注入 `dictionaries` / `idDictionaryMap`（或等价 store 合并层）。`useWordList` / `wordListFetcher` 对特殊 url/id 走本地读取，而不是 HTTP JSON。

**备选**：每次导出静态 JSON 到 OPFS——多余且难同步。  
**理由**：与现有练习进度 `dict` 字段对齐，章节可用默认章长切片。

### 2. Logo 点击拆分（方案 A）

**选择**：`BiscuitIcon` 按钮打开收集浮层；旁侧标题 `NavLink` 仍 `to="/"`。图标旁或盒上展示「收集小饼干」词数徽章。

**备选**：角标另开入口——与「点饼干收集」叙事不符。

### 3. 识别与补全管线分层

```
输入（文本 / 图片）
  → Gemini：抽出英文词列表（结构化 JSON）
  → 逐词/批量补全：
       Free Dictionary API → us/uk 音标（及英文义项参考）
       中文释义：Gemini 批量生成（词典无中文源时）
       音标 miss → Gemini 补
  → 发音试听：现有 generateWordSoundSrc / 有道
  → 用户改卡片 → 写入 Dexie
```

**备选**：全程只靠 Gemini——音标易飘、费额度。  
**理由**：OCR/抽词与中文释义必须 LLM；音标尽量结构化 API；发音已有。

### 4. Gemini BYOK

**选择**：`localStorage`（或现有 jotai `atomWithStorage`）存 key；设置页保存/清除/「测试连通」（发一条最小 generateContent）；请求从浏览器直连 Google Generative Language API。未配置 key 时浮层提示去设置。

**备选**：加密写进仓库——SPA 可逆，不采用。

### 5. 重复词检测范围（务实）

**选择**：保存前对每个勾选词检查：

1. 「收集小饼干」Dexie
2. 当前选中词库已加载词表
3. 饼干系列预置库（`wang-c*-biscuit`）的词名集合（可缓存）

命中则在卡片上提示「已在：xxx」，默认仍勾选，用户可取消或确认仍添加（允许同词再入收集库）。

**备选**：全站所有 dict JSON 全量索引——首启成本高，本版不做。

### 6. 浮层与批量共用一套 enrich service

**选择**：`enrichWords(input)` 纯函数/服务层；浮层与词库批量页只换壳。保存成功播放「缩成饼干 → 飞入盒」动画后关闭。

### 7. 章节与练习

**选择**：「收集小饼干」使用全局默认章长（与项目 `CHAPTER_LENGTH` 一致）；`length` / `chapterCount` 随词数变化更新。无自定义音频字段时发音走有道即可。

## Risks / Trade-offs

- [Free Dictionary 无中文 / 不稳定] → 中文统一走 Gemini；音标 API 失败则整词 Gemini 兜底；结果可编辑
- [Gemini 额度/网络失败] → 明确错误态；保留已出卡片；可重新识别
- [CORS：浏览器直连 Gemini / dictionaryapi.dev] → 实现时验证；若 Free Dict CORS 受限则音标也改 Gemini 或走公共代理（记录为实现风险）
- [Key 存在 localStorage] → 同机同浏览器可见；设置提供清除；文档说明勿公开分享带 key 的配置
- [重复检测不全站] → UI 文案说明「已检查收集库、当前库与饼干系列」；避免假装全覆盖
- [Header 行为变化] → 标题仍回首页，降低迷路成本

## Migration Plan

- Dexie 升版本加表；无旧数据可迁
- 首次打开词数为 0；徽章显示 0
- 回滚：去掉虚拟词库注入与浮层即可；Dexie 表可保留无害

## Open Questions

- Free Dictionary 若遇 CORS，是否第一期直接「音标也 Gemini」以减少外部依赖（实现时二选一，行为对外仍满足「自动填好」）
- 批量页具体挂在 Gallery 词库详情还是独立路由——默认可挂在「收集小饼干」详情内的「批量添加」按钮
