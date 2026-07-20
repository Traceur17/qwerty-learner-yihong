## 1. 连播卷面键盘

- [x] 1.1 `focusRow` 上限改为 `min(playIndex + 1, words.length - 1)`
- [x] 1.2 `onAnswerKeyDown` 增加 ArrowLeft / ArrowRight，与现有切词共用 focusRow
- [x] 1.3 全局 keydown 增加 Ctrl+Space 切换播放/暂停（输入内外均 `preventDefault`）；保留 Esc 与非输入 Space

## 2. 错题结算回原章

- [x] 2.1 ResultScreen：有 `chapterErrorReturn` 时提供「重复本章节」「下一章节」，退出清复习态并设回快照章节，再 REPEAT / NEXT
- [x] 2.2 关窗（×）在有快照时等同「重复本章节」，不再 `setCurrentChapter(0)`
- [x] 2.3 无快照的全局错题复习仍保留「练习其他章节」→ 词库

## 3. 验证与文档

- [x] 3.1 手动验证连播：播到 10 可进 11、不可进 12；左右切词；Ctrl+Space 输入中可暂停/继续
- [x] 3.2 手动验证本章错词结算：× / 重复本章 → 原章重练；下一章 → 原章+1
- [x] 3.3 如连播引导文案提到焦点/快捷键，同步更新
