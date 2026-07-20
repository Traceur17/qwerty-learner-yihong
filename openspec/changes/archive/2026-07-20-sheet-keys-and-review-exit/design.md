## Context

连播卷面已有焦点上限（= 播放指针）、Enter/Tab/↑↓ 切词，以及非输入焦点时 Space / Esc 暂停。本章错词练习进入时会写入 `chapterErrorReturn` 快照，但结算退出时 `ResultScreen` 把 `currentChapter` 置 0，导致无法回到原章。

## Goals / Non-Goals

**Goals:**

- 连播：焦点可提前一格；左右键切词；Ctrl+Space 输入中切换播放
- 本章错词结算：退出定位原章；提供重复本章 / 下一章；关窗 = 重复本章

**Non-Goals:**

- 不改错题最新状态口径、卷面判分写库、天分激励
- 不改 Gallery 无 `chapterErrorReturn` 的全局错题复习主出口
- 不改连播判分与错答历史 UI

## Decisions

1. **焦点上限 = playIndex + 1**  
   相对「完全开放」更稳：只能提前一格等下一词，避免跳到很后面空行。末词时上限仍是最后一题。

2. **Ctrl+Space 而非单独占用字母键**  
   听写输入中字母键必须留给拼写；Ctrl+Space 与现有「空格切播放」同一直觉，且 `preventDefault` 不插入空格。单独 Space 在输入框内仍打空格。

3. **结算以 `chapterErrorReturn` 有无为分支**  
   - 有快照：重复本章 / 下一章 / × → 清复习态、设回 `snapshot.chapter`，再 `REPEAT_CHAPTER` 或 `NEXT_CHAPTER`  
   - 无快照：保留「练习其他章节」→ 词库  
   不强制保留「练习其他章节」作为有快照时的主按钮；可选弱入口，跳词库时不再把章节置 0（保持原章即可）。

4. **关窗 = 重复本章节**  
   与用户预期一致：关掉结算继续练原章，而不是静默落在第 1 章。

## Risks / Trade-offs

- [Ctrl+Space 与系统输入法切换冲突] → Windows 上少数输入法占用 Ctrl+Space；若反馈强烈可再加备选键。当前按产品选定实现。
- [提前一格聚焦但音频未到] → 预期行为：用户可先等待；判分仍只评到 maxPlayedIndex，未播行不判。
- [退出复习后 REPEAT 会重载原章词表] → 依赖现有 `isReviewMode` 关闭后 `useWordList` 走章节词表；实现时确认清 `reviewRecord` / `chapterErrorReturn`。

## Migration Plan

纯前端行为变更，无数据迁移。上线后旧会话若卡在复习结算，关窗即回原章重练。

## Open Questions

（无）
