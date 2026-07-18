## 1. Config & data

- [x] 1.1 Add `continuousSheetConfigAtom` (or extend listen dictation config) with `isOpen` and `gapMs` (default ~1200), persisted via `atomForConfig`
- [x] 1.2 Add Dexie storage for per-word wrong answer history (up to 3 strings keyed by dict+word) with version migration
- [x] 1.3 Add helpers: load history, prependWrongAnswer, truncate to 3

## 2. Sheet UI shell

- [x] 2.1 Create `ContinuousDictationSheet` component with numbered rows and answer inputs only (default columns)
- [x] 2.2 Wire sheet into Typing `WordPanel` (or equivalent) when sheet mode is on; keep `DictationWord` when off
- [x] 2.3 Add settings UI: enable sheet mode + gap duration control

## 3. Playback & navigation

- [x] 3.1 Implement play pointer, pause/resume, gap-after-ended continuous playback using existing pronunciation player
- [x] 3.2 Click question number restarts playback from that index
- [x] 3.3 Highlight current play row; disable/unfocus rows beyond play pointer
- [x] 3.4 Keyboard: Enter/Tab/ArrowDown next, Shift+Tab/ArrowUp prev, clamped to play pointer

## 4. Grade / reveal

- [x] 4.1 「对答案」reveals English, translation, error-history columns for played rows only
- [x] 4.2 Mark correct with clear ✓; incorrect with reused diff highlighting
- [x] 4.3 Regrade only on explicit 「对答案」after edits
- [x] 4.4 Persist wrong answers into history (max 3) on incorrect grade

## 5. Error history UI

- [x] 5.1 Render `/` when empty; else latest wrong full text + diff + `×N`
- [x] 5.2 Click to expand/collapse full list of up to 3 wrongs with diff

## 6. Verify

- [x] 6.1 Manual smoke: play/pause, click number restart, focus clamp, grade played-only, history expand
- [x] 6.2 Ensure single-word dictation path unchanged when sheet mode off
