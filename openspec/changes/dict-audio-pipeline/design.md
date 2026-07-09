## Context

Qwerty Learner 词条发音由 `usePronunciation.ts` 调用有道 `dictvoice` API 实时生成，无法表达教材录音中的连读、吞音。用户持有按单元划分的 Excel（每 sheet 一单元）与对应 MP3（每单元前段为可变长度中文介绍，随后为等间隔词组朗读）。现有 `IELTS_WANG_5.json` 为扁平数组、应用内按 `CHAPTER_LENGTH=20` 自动分章，与教材单元分组不一致；词条顺序与 C5 一致，适合按单元边界从现有文本派生并绑定音频。

本变更引入离线构建工具与应用侧自定义音频字段，使多个词库可复用同一套裁切与校验流程。

## Goals / Non-Goals

**Goals:**

- 提供配置驱动的离线流水线 `tools/dict-audio-pipeline/`，支持多 manifest、多单元批量处理
- 默认使用 STT（Whisper）+ 已知词表顺序对齐裁切，自动跳过各单元可变长度中文介绍
- 支持策略降级：STT 对齐 → 静音检测 → 固定间隔 → 人工时间轴 CSV
- 构建前强校验：段数、回读相似度；失败 unit 不写入产物，输出可复查报告
- 应用侧 `Word.usAudio` / `Word.ukAudio` 优先于有道 TTS；听写/普通模式均自动受益
- 首个落地：雅思 wang C5 音频版，按单元注册词库，与现有文本版并存

**Non-Goals:**

- 不在仓库内分发受版权保护的教材原音频
- 不改造应用内 `CHAPTER_LENGTH` 分章逻辑去匹配教材单元（改为每单元独立词库条目）
- 不在应用内提供音频裁切 UI（裁切仅在离线工具完成）
- 不替换或删除现有 `IELTS_WANG_5` 文本词库
- 首期不实现云端 STT API 集成（仅本地 Whisper；manifest 预留扩展点）

## Decisions

### 1. 离线工具与应用解耦

**选择**：裁切、校验、JSON 生成放在 `tools/dict-audio-pipeline/`（Node.js CLI），不耦合 Vite/React 构建。

**理由**：处理 ffmpeg、Whisper、大文件 I/O，适合独立 CLI；多词库复用同一工具链；`npm run build` 不依赖音频生成。

**备选**：Vite 插件或 npm prebuild 脚本 — 否决，拖慢日常开发且依赖重。

### 2. Manifest YAML 作为词库构建入口

**选择**：每个词库一份 `manifests/{dict-id}.yaml`，描述 Excel 路径、音频 glob、输出目录、策略参数、校验阈值。

**理由**：新词库零代码改动；参数（intro、间隔、模型大小）可 per-dict / per-unit 覆盖。

**结构要点**：

```yaml
dict:
  id: wang-c5-audio
  name: 雅思wang C5（音频版）
  language: en
  accent: uk
units:
  excel: ./source/wang-c5.xlsx # 每 sheet = unit
  sheetPattern: 'Unit*' # 可选过滤
audio:
  pattern: './source/audio/unit{unit:02d}.mp3'
segmentation:
  strategy: stt-align
  fallback: [silence, fixed]
  whisper: { model: base }
validation:
  minSimilarity: 0.85
  failOnMismatch: true
output:
  audioDir: public/audio/wang-c5-audio
  dictDir: public/dicts
  registerDictionary: true
```

### 3. 裁切策略：STT 词表对齐为默认

**选择**：对整段 unit 音频跑 Whisper（word-level 或 segment 时间戳），按 Excel 行顺序与 `name` 模糊匹配，取匹配段时间窗裁切 MP3；第一个匹配前的音频视为 intro 丢弃。

**理由**：用户场景下词表顺序已知；各单元 intro 长度不同；不依赖固定间隔秒数；比纯静音切分更抗漂移。

**备选**：

- 仅固定间隔 — 否决，易累积错位
- 仅静音切分 — 作为 fallback，段数不等于行数时失败

**对齐算法**：顺序贪心匹配（第 i 条词组在第 i 个未匹配转写段中找最高相似度）；相似度低于阈值则 unit 失败并写入报告。

### 4. 一单元一词库 JSON + 一条 `dictionary.ts` 注册

**选择**：输出 `wang-c5-audio-unit01.json` … 每文件对应一个 sheet/音频；在 `dictionary.ts` 注册为「雅思 wang C5 音频 Unit 1」等。

**理由**：与教材分组一致；每 unit 独立校验与重跑；避免单 JSON 数千条难以维护。

**备选**：单一大 JSON + 元数据 `unit` 字段 — 否决，应用当前无按 unit 筛选章节能力。

### 5. `Word` 类型扩展与发音回退链

**选择**：

```typescript
export type Word = {
  // ...existing
  usAudio?: string
  ukAudio?: string
}
```

`generateWordSoundSrc(word, type)` 逻辑：

1. `type === 'us' && word.usAudio` → 使用 `usAudio`
2. `type === 'uk' && word.ukAudio` → 使用 `ukAudio`
3. 否则 → 现有有道 URL

**理由**：向后兼容所有现有词库；单 accent 词库只填 `ukAudio` 即可。

**调用方调整**：`usePronunciationSound` 接受 `Word | string`；string 时保持旧行为（仅有道）。

### 6. 校验与报告

**选择**：每个 unit 构建后生成 `build-report.json` + 可选 `build-report.html`（内嵌音频播放器对照 `name` 与切片）。

校验项：

- 切片数量 === Excel 行数
- 每条切片时长 ∈ (0.2s, 15s) 可配置
- 切片 Whisper 回读与 `name` 相似度 ≥ `minSimilarity`

**失败策略**：`failOnMismatch: true` 时不写该 unit 的 JSON/音频到 output 目录（或写至 `staging/` 供人工复核）。

### 7. 技术栈

| 组件       | 选择                                                                  |
| ---------- | --------------------------------------------------------------------- |
| CLI 运行时 | Node.js 18+                                                           |
| 配置       | YAML (`js-yaml`)                                                      |
| Excel      | `xlsx`                                                                |
| 音频 I/O   | `fluent-ffmpeg`（依赖系统 ffmpeg）                                    |
| STT        | `@xenova/transformers` Whisper 或 `whisper.cpp` 子进程 — 实现阶段择优 |
| 相似度     | 归一化 Levenshtein / 去标点小写比对                                   |
| 测试       | Vitest + fixture 短音频样本                                           |

## Risks / Trade-offs

| 风险                         | 缓解                                                  |
| ---------------------------- | ----------------------------------------------------- |
| Whisper 转写不准导致对齐失败 | 可调大模型；fallback 静音切分；人工 CSV 时间轴兜底    |
| 词组含数字/符号与转写不一致  | 比对前规范化（去标点、折叠空格）                      |
| `public/audio` 体积大        | 音频不提交 git（`.gitignore` + 文档说明用户本地生成） |
| ffmpeg/Whisper 安装门槛      | README 与 `npm run dict-audio:check-deps` 检测        |
| 有道与自定义音频音量不一致   | 工具可选 loudness 归一化（ffmpeg `loudnorm`）         |
| 版权                         | 文档声明用户自负；仓库仅含工具与 manifest 模板        |

## Migration Plan

1. **阶段 1**：实现 `custom-word-audio`（类型 + `usePronunciation`），无音频词库行为不变
2. **阶段 2**：实现 `dict-audio-pipeline` CLI 与单 unit 黄金样本测试
3. **阶段 3**：用户对 wang C5 跑全量构建，人工抽查报告
4. **阶段 4**：注册 `dictionary.ts`，在 Gallery 选择音频版 unit 词库
5. **回滚**：移除注册项与 `public/audio` 即可；`Word` 新字段可选，不影响旧 JSON

## Open Questions

- 仓库是否 `.gitignore` 全部 `public/audio/**` 还是仅忽略特定 dict-id？（建议忽略用户生成内容，模板用 fixture）
- Whisper 模型默认 `base` 还是 `small`？（实现时用 manifest 可配，文档给推荐值）
- 是否首期支持从现有 `IELTS_WANG_5.json` 按行范围切片文本，而非从 Excel 读？（可作为 manifest 选项 `textSource: json`）
