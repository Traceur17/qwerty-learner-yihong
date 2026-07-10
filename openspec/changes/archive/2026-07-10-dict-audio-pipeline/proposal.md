## Why

当前词库发音依赖有道 TTS 实时生成，无法还原教材/真题中的连读、吞音等真实语料；用户已拥有按单元划分的 Excel 词汇表与原始音频（含可变长度中文介绍 + 固定间隔词组），需要一套可复用的离线流水线完成裁切、校验与词库绑定。现有 `IELTS_WANG_5` 等词库顺序一致但分组不同，不宜在旧 JSON 上硬补音频，应支持从素材重建带自定义音频的词库。

## What Changes

- 新增离线工具 `tools/dict-audio-pipeline/`：配置驱动，支持多词库、多单元（Excel 按 sheet、音频按 unit 文件）
- 裁切策略可插拔：STT 词表对齐（默认）、静音检测、固定间隔、人工时间轴 CSV；策略失败时自动降级并输出报告
- 校验层：段数对齐、切片回读相似度检查、HTML/JSON 构建报告；不达标不写入最终产物
- 输出：`public/audio/{dict-id}/` 切片 MP3、`public/dicts/{dict-id}-unit{N}.json`、可选更新 `dictionary.ts`
- 应用侧：`Word` 类型增加 `usAudio` / `ukAudio` 可选字段；`usePronunciation` 优先播放自定义音频，否则回退有道
- 首个落地词库：雅思 wang C5 音频版（按单元注册为多个词库条目），与现有文本版 C5 并存

## Capabilities

### New Capabilities

- `dict-audio-pipeline`: 离线词库音频构建流水线（manifest 配置、多策略裁切、校验、报告、JSON/音频输出、词库注册辅助）
- `custom-word-audio`: 应用运行时对词条自定义音频 URL 的支持（类型扩展、发音优先级、预加载兼容）

### Modified Capabilities

- （无）现有 `listen-dictation-*` 规格不变；听写模式通过 `custom-word-audio` 自动获益，无需修改其需求定义

## Impact

- **新增目录**: `tools/dict-audio-pipeline/`（CLI、策略、校验、报告生成）
- **修改文件**: `src/typings/index.ts`、`src/hooks/usePronunciation.ts`、调用发音 hook 的组件（传入词条或音频 URL）
- **新增资源**: `public/audio/` 下各词库切片；`public/dicts/` 下音频版 JSON；`src/resources/dictionary.ts` 新注册项
- **外部依赖**: `ffmpeg`（系统级）、Whisper 或等效 STT（Node/Python 绑定，用于 `stt-align` 策略）
- **构建/开发**: 文档说明工具安装与运行；词库音频生成在应用 `npm run build` 之外独立执行
- **版权**: 用户自备教材音频，工具仅处理本地文件，不内置受版权保护的素材
