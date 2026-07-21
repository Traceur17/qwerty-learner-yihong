# 连播底栏与操作体验

## Why

连播底栏与正常听写指标栏观感不一致；左右键抢光标；对答案后缺少正确率与便捷复听。

## What Changed

- 底栏指标化：播放 / 间隔 / 计时 / 对答案；对答案后展开正确率
- ←→ 只移光标；对答案后点卡片发音；题号加宽；滚动条半透明悬停变实
- 同步 `continuous-dictation-sheet` 键盘规格与站内公告 2026-07-21

## Capabilities

### Modified Capabilities

- `continuous-dictation-sheet`: 键盘左右键、底栏正确率展示、判分后复听

## Impact

- UI：`ContinuousDictationSheet`、`sheet-scrollbar`、`UpdateAnnouncement`
- Spec：`openspec/specs/continuous-dictation-sheet/spec.md`
