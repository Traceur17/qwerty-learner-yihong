# 听写训练增强 · 探索 Backlog

> 探索阶段记录，非实现承诺。优先级可随反馈调整。
> 最后更新：2026-07-14

---

## 已确认的产品选择

| 项         | 决定                                 |
| ---------- | ------------------------------------ |
| 随机播放   | **随机抽词**（无放回；**可能跨章**） |
| 错题本练词 | **练当前章所有错词**                 |
| 错词反馈   | **显眼 diff**，对比越醒目越好        |
| Phase 5    | **弃案**（按章合并 + seek 不做）     |
| 落地顺序   | Phase 1✅ → 2✅ → 3 → 4（见下）      |

---

## Phase 1 · 错题闭环 ✅ 已落地（2026-07-14 核对）

**现状**：训练页错题本 → 带当前章筛选进错题本 →「练习全部/已选」→ `reviewMode` 本章错词练习；可退出并回到进错题本前进度。

- [x] 按章筛选：`dict + chapter + wrongCount > 0`
- [x] 复用 `reviewMode` / `startChapterErrorReview`
- [x] 无错词时练习按钮禁用
- [x] 本章错词练习中的退出 / 返程（`chapterErrorReturn`）

**与最初提案的差异（非 blocker，可选补）**

- [ ] 训练页工具栏一键「练本章错词」（现需经错题本一跳）
- [x] 结果页「再练本章错词」直达按钮

---

## Phase 2 · 听写反馈 ✅ 已落地（2026-07-14 核对）

### 提交后反馈节奏 ✅

| 结果     | 展示                                   | 继续方式               |
| -------- | -------------------------------------- | ---------------------- |
| **正确** | 中文释义 + 音标                        | 停留 **1s** 自动下一词 |
| **错误** | 正确答案 + 释义 + 音标 + **显眼 diff** | **敲 Enter** 才继续    |

### 显眼 diff ✅

- [x] 词级 diff（漏词 / 多词 / 替换）
- [x] 字符级 fallback
- [x] 高对比色块，错误停留至 Enter

### 听写词级指标（尚未做，原 Phase 2 附录）

- [ ] 词级 WPM（当前 Speed 里 WPM 仍是既有按键统计）
- [ ] 错词类型落库：`missing` / `typo` / `extra` / `completely_wrong`
- [ ] 可选：提交前编辑次数

---

## Phase 3 · 随机抽词（中优先级 · 未做）

- [ ] 新开关 `randomDrawConfig`（与现有 `randomConfig` _shuffle 一次_ 区分）
- [ ] 每轮从剩余词池随机 pop，**无放回**，池空 = 章节结束（或整库池空，若跨章）
- [ ] 进度 UI：**「剩余 N / 共 M」**，不显示线性序号
- [ ] 与听写模式联动：建议默认关「上一词/下一词」预览
- [ ] **跨章随机**（可选）

---

## Phase 5 · 音频：按章合并 + 索引 ❌ 弃案（2026-07-14）

用户确认不做。现有裁片 MP3 + 磁盘缓存方案继续沿用。勿再开 `chapter-merged-audio` change。

---

## 连播卷面听写 · continuous-dictation-sheet（2026-07-14）

OpenSpec change：`openspec/changes/continuous-dictation-sheet`（已实现）

- 听写开关内开启 **连播卷面**；编号表 + 作答；点题号起播；间隔可配
- 默认识别列隐藏；「对答案」揭晓英文/释义/错史（仅已播题）
- 错史近 3 次；展示末次全文+diff+`×N`；点击展开

---

## Phase 4 · 长期熟悉度（低优先级）

- [ ] 章节熟悉度卡片（练习次数、错词率、连续全对）
- [ ] 轻量 SRS：错得多 + 久未练 → 随机抽词权重更高
- [ ] 错后强制重听一遍（可选）
- [ ] 章节预热：前 N 词只听不写
- [ ] 音频变速 / 重播快捷键

---

## 新需求 · 三连对庆祝（2026-07-10）

**触发**：连续 **3 题答对**（听写/打字模式待定，默认听写优先）。

**表现**：全屏或居中 overlay 提示：

> **了不起的天分！**

**视觉风格**：**洛克王国**（卡通奇幻、明亮饱和、徽章/对话框感、可选轻粒子，非 Qwerty 默认 indigo 极简风）。

**注意**：

- 计数器在答错时归零
- 不与「错误 diff 需 Enter」流程冲突（庆祝可在进入下一词前短暂弹出）
- 可配置开关 / 仅听写模式

---

## 音频体积 · 探索结论（2026-07-10）

**用户问题**：音频能否转成字符串（类似长时网页录音存法）以减小体积？

| 方案                              | 是否减小体积       | 说明                                   |
| --------------------------------- | ------------------ | -------------------------------------- |
| **Base64 / Data URL 字符串**      | ❌ 否，约 **+33%** | 二进制 → 文本的编码开销，不是压缩      |
| **IndexedDB 存 Blob/Base64**      | ❌ 不减小          | 适合「录音存本地」，不适合缩小教材音频 |
| **Opus / 更低码率 MP3 / 单声道**  | ✅ 是              | 流水线重编码，体积可降 50%+            |
| **合并为单文件 + 按 offset 索引** | ✅ 略减            | 减少 HTTP 请求，JSON 存 `{start,end}`  |
| **嵌入 JSON 的 base64 音频**      | ❌ 不推荐          | JSON 膨胀、Git 不友好、首屏慢          |

**当前架构**（`public/audio/*.mp3` + 词库 JSON 路径）对 GitHub Pages 静态部署是合理方向；若要减体积，应在 **dict-audio-pipeline 转码阶段** 做（码率/格式），而非 base64 字符串化。

---

## 建议 OpenSpec Change 拆分

1. ~~`chapter-error-review`~~ — ✅ 已归档
2. ~~`dictation-diff-feedback`~~ — ✅ 已归档（三连对庆祝仍单独立项）
3. `random-draw-mode` — 随机抽词（含可选跨章词池）
4. ~~`chapter-merged-audio`~~ — ❌ 弃案
5. （可选）`dictation-word-metrics` — 词级错型分类 / 词级 WPM
6. （可选）`triple-correct-celebration` — 「了不起的天分！」

---

## 代码锚点（实现时参考）

- 听写反馈：`src/pages/Typing/components/WordPanel/components/DictationWord/index.tsx`
- 错题复习：`src/pages/Gallery-N/ReviewDetail/index.tsx`、`reviewModeInfoAtom`
- 错题本：`src/pages/ErrorBook/`、`ErrorBookButton.tsx`
- 随机（现有 shuffle）：`randomConfigAtom`、`SETUP_CHAPTER` / `shouldShuffle`
- 音频播放：`src/utils/pronunciation.ts`、`public/audio/`
