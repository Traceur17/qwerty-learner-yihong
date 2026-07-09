# 词库音频构建流水线

将 Excel 词汇表 + 单元音频批量裁切为词条 MP3，并生成带 `ukAudio`/`usAudio` 的词库 JSON。

## 依赖

1. **ffmpeg / ffprobe**（系统 PATH）
2. **Node.js 18+**
3. **项目依赖**（项目根目录执行 `yarn`）
4. **STT（可选，仅 `stt-align` / `verifyTranscript` 需要）**

```bash
yarn add @xenova/transformers
```

> **Windows 注意**：该包依赖原生模块 `sharp`，部分环境会安装失败（需 C++ 编译工具链）。
> 失败时**不必强装**，请用 manifest 默认的 `silence` 策略 + `verifyTranscript: false`，仅需 ffmpeg 即可裁切。

检查依赖：

```bash
yarn dict-audio:check-deps
```

## 输入约定

| 输入        | 约定                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------- |
| Excel sheet | 如 `5.3-1` = 第 5 章第 1 单元；仅匹配 `*.*-*` 形式（自动排除「使用说明」等）                  |
| Excel 列    | 默认从**第 2 行**起：列 1 序号、列 2 单词、列 3 音标、列 4 释义（`fixedColumns`，无需改表头） |
| 音频文件    | 如 `01 Test 1-横向测试.mp3`，`Test 1` 的 `1` 与 sheet 单元号对应                              |
| 目录        | 默认所有 mp3 放在 `audio.dir`；也可按章分子目录（`chapterDirPattern`）                        |

### 王陆 C5 配对示例

| Excel sheet | 含义             | 音频文件示例             |
| ----------- | ---------------- | ------------------------ |
| `5.3-1`     | 第 5 章第 1 单元 | `01 Test 1-横向测试.mp3` |
| `5.3-2`     | 第 5 章第 2 单元 | `02 Test 2-....mp3`      |

## 用法

```bash
# 构建第5章第1单元
yarn dict-audio build manifests/wang-c5-audio.yaml --unit 5-1
```

## 裁切策略

按 manifest 中 `segmentation.strategy` 执行，失败时按 `fallback` 依次尝试：

1. **stt-align**（默认）：Whisper 转写 + 与 Excel 词表顺序对齐
2. **silence**：ffmpeg 静音检测切分
3. **fixed**：跳过 intro 秒数 + 固定间隔
4. **manual**：读取 `manualDir/unitXX.csv`（列：`index,start,end,text`）

## 输出

- `public/audio/{dict-id}/unitXX/001_phrase.mp3`
- `public/dicts/{dict-id}-unitXX.json`
- 构建报告：`tools/dict-audio-pipeline/output/reports/build-report-*.json|html`

`registerDictionary: true` 时自动在 `dictionary.ts` 的 `internationalExam` 段追加注册项，并运行 `scripts/update-dict-size.js`。

## 版权

请仅处理你有权使用的音频素材。仓库不包含教材原音频。

## 故障排查

| 问题                | 处理                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| 段数与 Excel 不一致 | 查看 HTML 报告；对失败 unit 提供 manual CSV                                       |
| STT 对齐分数低      | 调低 `validation.minSimilarity` 或换 `whisper.model` 为 `Xenova/whisper-small.en` |
| intro 长度不一      | 使用 `stt-align` 或 `manual`，不要依赖固定 `skipIntroSec`                         |

## 裁切方式

**命令行工具，无 Web 可视化页面。** 在终端执行 `yarn dict-audio build ...`，结果查看 HTML 报告。
