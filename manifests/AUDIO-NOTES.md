# 饼干专属词库 · 音频裁切备注

> 记录各章中文介绍起点、单元覆盖参数，以及词序/词表特殊调整。  
> 改介绍时长或词表后：改对应 `wang-c*-audio.yaml` → 重切该单元 → 必要时递增 `AUDIO_ASSET_EPOCH`。  
> 最后更新：2026-07-13

源表与原音频在 `manifests/source/`（gitignore，仅本地）。

---

## 通用约定

| 项               | 值                                                   |
| ---------------- | ---------------------------------------------------- |
| 裁切垫音         | 前后各约 `paddingMs: 150`                            |
| 音质             | WAV 中间态 → MP3 `-q:a 0`（HQ）                      |
| Git              | `*.mp3 binary`（勿当文本提交，否则会剥 CRLF 出电音） |
| 强制刷新线上音频 | 改 `src/utils/cacheBust.ts` 里的 `AUDIO_ASSET_EPOCH` |

`minIntroSec` / `introMaxSec`：介绍至少跳过到该秒附近再找词组。  
`contentStartSec`：强制从该秒起切（避免误把介绍里的短语音当首词）。

「实测首词」来自当时成功的 build report，仅作参考；以 yaml 覆盖为准。

---

## C3 · 雅思 wang C3（特别名词）

- Manifest：`wang-c3-audio.yaml`
- 词库 id：`wang-c3-biscuit`
- 章节长度：`[112, 143, 113, 112, 145, 113, 104, 152, 141]`（共 1135）
- **默认介绍：22s**

| 章 (unitId) | 词数 | 介绍配置                   | 实测首词约 | 首词 → 末词             |
| ----------- | ---- | -------------------------- | ---------- | ----------------------- |
| 1 (`3-01`)  | 112  | **47s**（`unitOverrides`） | ~49s       | ability → cab           |
| 2 (`3-02`)  | 143  | 默认 22s                   | ~24s       | cabinet → debate        |
| 3 (`3-03`)  | 113  | 默认 22s                   | ~23s       | debt → factory          |
| 4 (`3-04`)  | 112  | 默认 22s                   | ~25s       | faculty → hour          |
| 5 (`3-05`)  | 145  | 默认 22s                   | ~24s       | hotel → mountain        |
| 6 (`3-06`)  | 113  | 默认 22s                   | ~25s       | moustache → particulars |
| 7 (`3-07`)  | 104  | 默认 22s                   | ~25s       | potteries → role        |
| 8 (`3-08`)  | 152  | 默认 22s                   | ~24s       | roommates → tax         |
| 9 (`3-09`)  | 141  | 默认 22s                   | ~24s       | taxi → zero             |

特殊词表/对齐调整：

| 项 | 说明 |
|----|------|
| 第 9 章 · wing → workforce | `speechSkips: afterWord wing / skipCount 1`（源音频多一段，见 `wang-c3-audio.yaml`） |

---

## C4 · 雅思 wang C4（形容词副词）

- Manifest：`wang-c4-audio.yaml`
- 词库 id：`wang-c4-biscuit`
- 章节长度：`[104, 104, 126, 12]`（共 346）
- **默认介绍：22s**

| 章 (unitId) | 词数 | 介绍配置                              | 实测首词约 | 首词 → 末词        |
| ----------- | ---- | ------------------------------------- | ---------- | ------------------ |
| 1 (`4-01`)  | 104  | **54s**                               | ~57s       | abnormal → fake    |
| 2 (`4-02`)  | 104  | 默认 22s                              | ~23s       | famed → pop        |
| 3 (`4-03`)  | 126  | **18s 强制**（`contentStartSec: 18`） | —          | popular → worthy   |
| 4 (`4-04`)  | 12   | 默认 22s                              | ~23s       | almost → virtually |

说明：第 3 章介绍截止 **18s**。词表中 `previous` 紧接 `printed`，但源音频中间多两段朗读，需跳过后再对齐。

特殊词表/对齐调整：

| 项                           | 说明                                                                       |
| ---------------------------- | -------------------------------------------------------------------------- |
| 第 3 章 · previous → printed | `speechSkips: afterWord previous / skipCount 2`（见 `wang-c4-audio.yaml`） |

---

## C5 · 雅思 wang C5（吞音）

- Manifest：`wang-c5-audio.yaml`
- 词库 id：`wang-c5-biscuit`
- 章节长度：`[114, 111, 114, 105, 100, 108, 130, 144, 139, 142, 127, 235]`（共 1569）
- **默认介绍：12s**

| 章 (unitId) | 词数 | 介绍配置                                                      | 实测首词约 | 首词 → 末词                            |
| ----------- | ---- | ------------------------------------------------------------- | ---------- | -------------------------------------- |
| 1 (`5-01`)  | 114  | **40s**                                                       | ~41s       | a great variety of → botanical garden  |
| 2 (`5-02`)  | 111  | 默认 12s                                                      | ~14s       | bulletin board → classical music       |
| 3 (`5-03`)  | 114  | 默认 12s                                                      | ~14s       | contact lenses → dial                  |
| 4 (`5-04`)  | 105  | 默认 12s                                                      | ~14s       | emotion and mood → fourth-year student |
| 5 (`5-05`)  | 100  | 默认 12s                                                      | ~16s       | free for heating → hothouse effect     |
| 6 (`5-06`)  | 108  | 默认 12s                                                      | ~17s       | hotel crime → lecture theater          |
| 7 (`5-07`)  | 130  | 默认 12s                                                      | ~17s       | living cost → OHPEN                    |
| 8 (`5-08`)  | 144  | 默认 12s                                                      | ~16s       | on campus → random selection           |
| 9 (`5-09`)  | 139  | 默认 12s                                                      | ~17s       | range of English level → silver cloth  |
| 10 (`5-10`) | 142  | 默认 12s                                                      | ~14s       | sky dome → the Milky Way               |
| 11 (`5-11`) | 127  | 默认 12s                                                      | ~16s       | theme garden → yellow fever            |
| 12 (`5-12`) | 235  | **强制 18s**（`contentStartSec`/`minIntroSec`/`introMaxSec`） | —          | abbreviation → zoo                     |

### C5 介绍特殊原因

- **第 12 章**：默认 12s 会把约 **13.4s** 处片段误当首词，故锁死从 **18s** 起切。

### C5 词表特殊调整

脚本：`tools/dict-audio-pipeline/scripts/patch-wang-c5-ch9-ch10.mjs`（改的是本地 `source/wang-c5.xlsx`）

| 章  | 调整                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | **删除** `recruiting method`（140 → 139）；**2026-07-13** 已按 HQ 规范整章重切并对齐 139 个音频（此前词表已删词但文件编号未重排，大量路径错位） |
| 10  | **`spinose plants` 移到 `sports shoes` 之后**                                                                                                   |

---

## C11 · 雅思 wang C11（《剑 18》专用测试）

- Manifest：`wang-c11-audio.yaml`（全库）；第 4 章专用：`wang-c11-section4.yaml`
- 词库 id：`wang-c11-biscuit`
- 章节长度：`[366, 396, 349, 595]`（共 1706）
- **默认介绍：6s**（第 2–4 章）；静音检测更敏感：`noiseDb: -45`，`minSilenceSec: 0.2`

| 章 (unitId) | 词数 | 介绍配置     | 实测/说明   | 首词 → 末词                    |
| ----------- | ---- | ------------ | ----------- | ------------------------------ |
| 1 (`11-01`) | 366  | **强制 32s** | 首词约 33s+ | caravan → **road runner**      |
| 2 (`11-02`) | 396  | 默认 6s      | 首词约 7s   | canoe → palm trees             |
| 3 (`11-03`) | 349  | 默认 6s      | 首词约 7s   | rangers → conflicting opinions |
| 4 (`11-04`) | 595  | 默认 6s      | 首词约 7.5s | code → multiple tasks          |

### C11 词表 / 裁切特殊调整

| 项                           | 说明                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 第 1 章 · `side entrance` 后 | 原音频多出无关的 **`side gate`**（不入词表）→ **删除该段，后续词音频整体前移**；若 `side entrance` 切片误融了 `side gate`，只裁掉该条尾部即可（现 `side entrance` 为章内第 173 词） |
| 第 1 章 · `road runner`      | 曾缺失 → **从原音频补切**，现为第 1 章**最后一词**                                                                                                                                  |
| 第 4 章词表                  | **不用**原总表 Excel 里 Section4 的超长列表；改用整理后的转录表 `source/C11-Section4-transcript.xlsx`（经 `wang-c11-section4.yaml` 构建），**595 词**，要求均有音频+释义            |

---

## 重切常用命令

```bash
# 只重切某一单元（不覆盖整库 JSON）
node tools/dict-audio-pipeline/scripts/recut-unit-audio-only.mjs manifests/wang-c4-audio.yaml 4-03

# C11 第 4 章（转录表）
yarn dict-audio build manifests/wang-c11-section4.yaml
```

改完 `public/audio/**` 并推送前：确认 `.gitattributes` 含 `*.mp3 binary`，并视需要 bump `AUDIO_ASSET_EPOCH`。
