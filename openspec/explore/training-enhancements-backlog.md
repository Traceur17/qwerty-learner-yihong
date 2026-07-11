# 听写训练增强 · 探索 Backlog

> 探索阶段记录，非实现承诺。优先级可随反馈调整。
> 最后更新：2026-07-10

---

## 已确认的产品选择

| 项         | 决定                                                        |
| ---------- | ----------------------------------------------------------- |
| 随机播放   | **随机抽词**（无放回；**可能跨章**，见 Phase 3 / 音频方案） |
| 错题本练词 | **练当前章所有错词**                                        |
| 错词反馈   | **显眼 diff**，对比越醒目越好                               |
| 落地顺序   | Phase 1→2→3→4（见下）                                       |

---

## Phase 1 · 错题闭环（高优先级）

- [ ] 训练页错题本 → **「练本章错词」** 按钮
  - 筛选：`dict = currentDictId` + `chapter = currentChapter` + `wrongCount > 0`
  - 复用 `reviewMode` 进训练，不必回词库页
- [ ] 结果页 → **「再练本章错词」**（同链路）
- [ ] 本章无错词时按钮置灰 + 提示文案

---

## Phase 2 · 听写反馈 & 指标（高优先级）

### 提交后反馈节奏（新需求 2026-07-10）

| 结果     | 展示                                        | 继续方式                          |
| -------- | ------------------------------------------- | --------------------------------- |
| **正确** | 下方显示 **中文释义**（`word.trans`）       | 停留 **1s** 自动下一词            |
| **错误** | **正确答案** + **中文释义** + **显眼 diff** | **敲 Enter** 才继续（取消自动跳） |

当前代码：`DictationWord` 正确/错误均为定时器自动 `onFinish()`（1s / 1.5s），错误时无 diff、无中文。

### 显眼 diff

- 词级 diff 优先（短语词库）：缺失词、多余词、替换词
- 字符级 diff 次之：拼写错误字母
- 视觉：大字、红/绿底色、对比行并排，错误停留至用户确认

### 听写词级指标（非按键热力图）

- 词/分钟 WPM
- 错词类型：`missing` / `typo` / `extra` / `completely_wrong`
- 可选：提交前编辑次数

---

## Phase 3 · 随机抽词（中优先级）

- [ ] 新开关 `randomDrawConfig`（与现有 `randomConfig` _shuffle 一次_ 区分）
- [ ] 每轮从剩余词池随机 pop，**无放回**，池空 = 章节结束（或整库池空，若跨章）
- [ ] 进度 UI：**「剩余 N / 共 M」**，不显示线性序号
- [ ] 与听写模式联动：建议默认关「上一词/下一词」预览
- [ ] **跨章随机**（可能）：词池可跨 `chapterLengths` 切片，每词自带 `audioUnit` + `{start,end}`（见音频方案 B）

---

## Phase 5 · 音频：按章合并 + 索引（已倾向采用，2026-07-10）

**决策**：用户确认方案 B 不错；需兼容 **本章随机** 与 **跨章随机**。

### 结构

```
public/audio/wang-c5-audio/
  unit5-01.mp3
  unit5-01.index.json    ← { "001_slug": { start, end }, ... }
  unit5-02.mp3
  unit5-02.index.json
  ...

词库 JSON 每词：
  ukAudio: { unit: "unit5-01", start: 12.4, end: 14.6 }
  或 chapter: 0 + 上字段
```

### 播放（含跨章随机）

```
随机抽到词 W
  → 查 W 所属 unit（章/单元）
  → 若该 unit 的 mp3 未加载 → fetch + 缓存（LRU，如最近 2～3 章）
  → seek(start) → 播放到 end → pause
```

**与随机抽词**：只改播放顺序，不改索引；跨章 = 可能连续加载不同 unit 的 mp3，逻辑仍成立。

### 优点

- 文件数 O(章数) 非 O(词数)，Git / GitHub Pages 友好
- 本章随机：1 次 HTTP + 多次 seek
- 跨章随机：少量章文件按需缓存，仍优于 1335 个小文件乱序请求

### 实现注意

- 播放器抽象：`playSegment(unitId, start, end)`，替代换 `src`
- 流水线产出 index；合并词库 `wang-c5-biscuit` 写 unit + offset
- 可选：与 Opus/单声道叠加（Phase 5b）

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

1. `chapter-error-review` — 本章错词练习
2. `dictation-diff-feedback` — diff + 中文反馈节奏 + 三连对庆祝
3. `random-draw-mode` — 随机抽词
4. `random-draw-mode` — 随机抽词（含跨章词池选项）
5. `chapter-merged-audio` — 按章合并 + index，播放器 `playSegment`

---

## 代码锚点（实现时参考）

- 听写反馈：`src/pages/Typing/components/WordPanel/components/DictationWord/index.tsx`
- 错题复习：`src/pages/Gallery-N/ReviewDetail/index.tsx`、`reviewModeInfoAtom`
- 错题本：`src/pages/ErrorBook/`、`ErrorBookButton.tsx`
- 随机（现有 shuffle）：`randomConfigAtom`、`SETUP_CHAPTER` / `shouldShuffle`
- 音频播放：`src/utils/pronunciation.ts`、`public/audio/`
