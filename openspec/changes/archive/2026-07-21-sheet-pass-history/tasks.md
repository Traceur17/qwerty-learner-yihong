## 1. Data layer

- [x] 1.1 Add Dexie types/tables for `sheetPassDrafts` and `sheetPasses` (version bump + indexes on dict/chapter/timeStamp)
- [x] 1.2 Implement draft CRUD: get/save/clear by `(dict, chapter)` including answers, grades, play progress, revealed, linkedPassId
- [x] 1.3 Implement pass history API: list by chapter, upsert sealed pass, helpers for sealable check and accuracy summary
- [x] 1.4 Unit tests for sealable rules, upsert-same-round (no spike), and mid-chapter not creating history rows

## 2. Sheet session wiring

- [x] 2.1 On `ContinuousDictationSheet` mount for a chapter: load and restore draft by default
- [x] 2.2 Persist draft on answer/grade/play-progress changes (debounce as needed)
- [x] 2.3 On unmount / chapter change: if sealable, silently upsert `sheetPasses` then keep or update draft per design
- [x] 2.4 Keep existing「对答案」wordRecord + wrongAnswerHistory behavior unchanged

## 3. 再练一遍

- [x] 3.1 Add「再练一遍」control to sheet chrome when draft/revealed state exists
- [x] 3.2 Sealable path: upsert history, clear draft + local sheet state
- [x] 3.3 Non-sealable path: confirm dialog then clear without writing history

## 4. Progress dialog (折线)

- [x] 4.1 Make footer accuracy control clickable when revealed or chapter has sealed history
- [x] 4.2 Build progress dialog with line chart (x = pass index, y = accuracy) and empty/single-point states
- [x] 4.3 Add summary line (latest pass, optional delta vs first) and「查看听写记录」button

## 5. Full-page history grid

- [x] 5.1 Full-page overlay opened from「查看听写记录」, close via top-right ✕
- [x] 5.2 Excel grid: frozen # + correct answer; one column per sealed pass (index, date, accuracy); horizontal scroll
- [x] 5.3 Cells show typed answer with correct/incorrect styling; wrong cells open/show diff
- [x] 5.4 Selecting a chart point scrolls to and highlights the matching pass column

## 6. Polish and verify

- [x] 6.1 Align restored revealed draft with continuous-dictation-sheet column visibility rules
- [x] 6.2 Manual check: mid-grade → no history row; full grade → leave → history; regrade → upsert; retry flows
- [x] 6.3 Run relevant unit tests / lint for touched files
