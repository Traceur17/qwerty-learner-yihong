## Context

现有听写（`DictationWord`）是一词一判：播词 → 输入 → Enter 判对错 → 反馈后前进。音频为 `public/audio/**` 词级 MP3，经 `usePronunciationSound` / `wordAudioPlayer` 播放，倍速已由 `pronunciationConfigAtom.rate` 控制。

本 change 增加并列的「连播卷面」模式，面向雅思机考听写肌肉：连续音频、编号答题格、不即时判分、按需对账。长章（100～400 词）必须靠播放行高亮防止作答与音频错位。

## Goals / Non-Goals

**Goals:**

- 章节词表以纵向编号答题纸呈现；默认识别仅 `#` + 作答
- 可配置间隔自动连播词音频；暂停 / 继续；点题号从该题重新起播
- 输入焦点用真实 input focus；`Enter` / `Tab` / `↓` / `Shift+Tab` / `↑` 导航；焦点不得超过当前播放题号
- 「对答案」仅结算已播放题；揭晓英文、释义、错史；正确 ✓、错误 diff
- 错史：最近一次完整错答 + diff + `×N`；点击展开近 3 次；无历史 `/`；持久化最多 3 条错答
- 与一词一判听写并存，互不破坏

**Non-Goals:**

- 整章原音合并 / seek（已弃案）
- 考试档「禁暂停禁重播」严格模式（可后续加；本版允许暂停与点号起播）
- 天分激励、SRS、加权随机
- 顶栏「播放位 / 焦点位 / 落后 N 题」数字（行指针足够）
- 替换现有 `DictationWord` 即时反馈流程

## Decisions

### D1 · 模式入口与互斥

- **决定**：在听写相关设置中增加「连播卷面」开关（或细分：`listenDictationConfig.sheetMode`）。开启后 Typing 主区渲染 `ContinuousDictationSheet`，而非 `DictationWord`。
- **备选**：独立路由 `/sheet` — 丢弃现有章节进度/词表加载，成本高。
- **理由**：复用 `useWordList`、章节状态与音频预加载。

### D2 · Session 状态放哪里

- **决定**：卷面 session（`playIndex`、`answers[]`、`revealed`、`maxPlayedIndex`、`isPlaying`）用组件内 `useState` / `useReducer`；持久配置（模式开、间隔秒）用 Jotai `atomForConfig`。
- **理由**：一章一局，刷新可丢；配置需跨会话。

### D3 · 连播调度

- **决定**：播放完当前词音频（或 `ended` 回调）后 `setTimeout(intervalMs)` 再播下一词并 `playIndex++`。暂停清 timer、停当前音。点题号 `N`：停当前 → `playIndex = N` → 立即播 N。
- **备选**：固定 wall-clock 节拍（不听 ended）— 长短词体验差。
- **理由**：以真实音频时长 + 用户间隔更自然。

### D4 · 焦点上限

- **决定**：可聚焦作答框索引 `i` 满足 `0 <= i <= playIndex`（播放指针当前行也可填）。未播行 `disabled` / 不入 Tab 环。
- **理由**：用户确认的防超前规则，避免整章错位。

### D5 · 对账与列显隐

- **决定**：默认 CSS/条件渲染只渲染两列。`revealed === true` 时插入英文、释义、错史列。再次「对答案」可刷新已播范围判分；改答案后须再点「对答案」才更新标记（简单、可预期）。
- **判分**：复用现有 `isAnswerCorrect` / `diffPhrase`（忽略大小写跟随全局设置）。

### D6 · 错答历史存储

- **决定**：IndexedDB 增加按 `(dict, word)` 聚合的错答历史（新表或扩展现有记录）：`wrongAnswers: string[]` 最多 3 条，新错 `unshift`，截断长度 3。对账写入；正确不强制清空历史。
- **展示**：错史列显示最近一条全文（对标准答案做 diff）+ `×N`（N=条数）；点击展开另外至多 2 条。无则 `/`。
- **备选**：只存 session — 无法跨次回看错法。

### D7 · 长列表性能

- **决定**：首版用普通滚动表格；若 400 行卡顿再虚拟列表。输入用受控数组或按行走本地 state + blur 写回。
- **理由**：先交付交互；章节规模已知可测。

### D8 · 章节结束

- **决定**：播到最后一词并过间隔后停止；用户仍可对答案、改已播格。不强制自动弹出结果页；可提供「完成本章」按钮写入 `chapterRecords`（若易接则接；否则首版只写词级错史）。

## Risks / Trade-offs

- [长表 400 行 DOM] → 先测；必要时虚拟化作答列  
- [连播与全局发音键冲突] → 卷面激活时禁用一词重播逻辑或映射到「重播当前播放行」  
- [Tab 落入工具栏] → 答题区隔离 tabIndex / roving tabindex  
- [错史 schema 迁移] → Dexie version bump + 温和默认 `[]`  
- [与一词一判模式切换中途] → 切换时重置卷面 session，避免脏状态  

## Migration Plan

1. 增加配置默认 `sheetMode: false`、`gapMs: 1200`  
2. Dexie 升级可选字段/新表  
3. 功能开关灰度：仅听写开启时可进卷面  
4. 回滚：关开关即回 `DictationWord`；错史字段可保留无害  

## Open Questions

- 「完成本章」是否必须写入既有 `ResultScreen` 流程 — 首版可弱化为仅对账 + 错史，章节结算后续补  
- 点未播题号：当前决定是起播（会推进 `playIndex`），与「焦点≤playIndex」一致  
