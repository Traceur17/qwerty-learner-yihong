# continuous-dictation-sheet Specification

## Purpose

连播卷面模式：按章节顺序连续播报单词，用户像考试答题卡一样在编号卷面上边听边写，写完统一对答案，并可查看每个词的历史错答。

## Requirements

### Requirement: Continuous sheet mode entry

The system SHALL provide a continuous dictation sheet mode that can be enabled alongside or instead of single-word listen dictation UI for the current chapter word list. When continuous sheet mode is active, the typing main panel SHALL render the numbered answer sheet instead of the single-word dictation input. Existing single-word listen dictation behavior MUST remain available when sheet mode is off.

#### Scenario: Enable sheet mode

- **WHEN** the user enables continuous dictation sheet mode for the current chapter
- **THEN** the main panel shows a vertical numbered answer sheet for chapter words
- **AND** single-word immediate-grade dictation UI is not shown

#### Scenario: Disable sheet mode

- **WHEN** the user disables continuous dictation sheet mode
- **THEN** the previous non-sheet typing/dictation UI is restored

### Requirement: Default columns while listening

While sheet mode is active and answers have not been revealed, each row SHALL show only the question number and an answer input. English text, translation, and error-history columns MUST be hidden.

#### Scenario: Hidden reference columns before reveal

- **WHEN** the user is filling the sheet and has not clicked reveal/grade
- **THEN** only number and answer columns are visible
- **AND** correct English, translation, and error history are not shown

### Requirement: Continuous audio playback with gap

The system SHALL play word audio in chapter order with a user-configurable gap (0.1s precision, minimum 0) after each clip ends before starting the next word. The user SHALL be able to pause and resume playback. The currently playing row SHALL be visually highlighted as the play pointer, and its number marker SHALL show a pause symbol while playing.

#### Scenario: Auto-advance after gap

- **WHEN** playback is running and the current word audio ends
- **THEN** the system waits for the configured gap duration
- **AND** then plays the next word and advances the play pointer

#### Scenario: Pause and resume

- **WHEN** the user pauses during continuous playback
- **THEN** audio stops and the scheduled next-word advance is cancelled
- **AND** when the user resumes, playback continues from the current play pointer

### Requirement: Playback bound to global typing state

In sheet mode, the global pause triggers (opening the word drawer, opening settings, window blur, header pause) SHALL pause continuous playback and the practice timer together. The "press any key to continue" overlay MUST NOT be shown in sheet mode; playback resumes only via explicit play actions (play button, header start, clicking a question number, or the drawer's start-from action).

#### Scenario: External pause

- **WHEN** the user opens the word drawer or settings, or the window loses focus during playback
- **THEN** playback pauses and the timer stops
- **AND** typing into answer inputs while paused does not resume playback

#### Scenario: Explicit resume

- **WHEN** the user clicks the play button (or header start) while paused
- **THEN** playback resumes from the current play pointer and the timer restarts

### Requirement: Click number to restart playback

Clicking a question number SHALL act as a remote control: clicking the current playing row pauses; clicking the current paused row resumes; clicking another row restarts continuous playback from that word. The word drawer's start-from action SHALL start playback from the selected word.

#### Scenario: Restart from chosen number

- **WHEN** the user clicks question number N (not the current play pointer)
- **THEN** the play pointer moves to N
- **AND** word N audio plays immediately
- **AND** subsequent words continue under the continuous playback rules

#### Scenario: Toggle on current row

- **WHEN** the user clicks the current playing row's number
- **THEN** playback pauses
- **AND** clicking it again resumes playback

### Requirement: Keyboard navigation within played range

The answer input focus SHALL move with Enter, Tab, and ArrowDown to the next row, and with Shift+Tab and ArrowUp to the previous row. The focused answer index MUST NOT exceed the current play pointer index. Rows beyond the play pointer MUST NOT be focusable.

#### Scenario: Move to next cell

- **WHEN** focus is on answer row i and i is less than the play pointer
- **AND** the user presses Enter, Tab, or ArrowDown
- **THEN** focus moves to answer row i+1

#### Scenario: Block moving past play pointer

- **WHEN** focus is on the play pointer row
- **AND** the user presses Enter, Tab, or ArrowDown
- **THEN** focus remains on the play pointer row
- **AND** unplayed later rows do not receive focus

#### Scenario: Move to previous cell

- **WHEN** focus is on answer row i (i > 0)
- **AND** the user presses Shift+Tab or ArrowUp
- **THEN** focus moves to answer row i-1

### Requirement: Grade only played rows on demand

The system SHALL provide a control to grade/reveal answers at any time. Grading MUST only evaluate rows with index less than or equal to the maximum play pointer reached (already played). Unplayed rows MUST NOT be graded or forced revealed as wrong empty answers.

#### Scenario: Reveal grades for played rows

- **WHEN** the user activates grade/reveal and the play pointer has reached index P
- **THEN** rows 0..P are marked correct or incorrect based on their answer inputs
- **AND** rows after P remain ungraded without reference columns required

#### Scenario: Correct and incorrect markers

- **WHEN** a played row is graded correct
- **THEN** it shows a clear correct indicator (checkmark) with phonetic and translation
- **WHEN** a played row is graded incorrect
- **THEN** it shows a prominent visual diff between the user answer and the correct English, plus phonetic and translation

#### Scenario: Regrade after edits

- **WHEN** the user edits an answer after a previous reveal
- **THEN** grade markers MUST NOT silently update until the user activates grade/reveal again

### Requirement: Error history display and persistence

For each word, the system SHALL retain up to the three most recent wrong answer strings across sessions, keyed by dictionary and word, recorded only when sheet-mode grading marks a row incorrect with a non-empty answer. After reveal, incorrect rows SHALL show severity dot markers (single dot for one recorded wrong, escalated color for recurring wrongs). Hovering the dots SHALL show the stored wrong answers in a popover; the popover SHALL be pinnable (Space or pin button) so hover is not the sole way to read history, and Esc SHALL unpin.

#### Scenario: No history

- **WHEN** a word has no stored wrong answers and the current answer is correct
- **THEN** no history marker is shown

#### Scenario: Severity dots with history

- **WHEN** a graded-wrong word has stored wrong answers
- **THEN** dot markers appear beside the row indicating severity
- **AND** hovering shows the stored wrong answers

#### Scenario: Pin history popover

- **WHEN** the user presses Space while hovering the dots (or clicks the pin button)
- **THEN** the popover stays open without hover
- **AND** pressing Esc (or the pin button again) closes it

#### Scenario: Persist new wrong on grade

- **WHEN** grading marks a row incorrect with a non-empty user answer
- **THEN** that answer is prepended to the word's wrong-answer history
- **AND** history is truncated to at most three entries

### Requirement: First-run guide

The system SHALL show a step-by-step anchored guide the first time the user enters sheet mode, covering the number-as-remote control, input navigation, and grading with error-history markers. The guide SHALL be skippable and permanently dismissible.

#### Scenario: Guide on first entry

- **WHEN** the user enters sheet mode without having dismissed the guide
- **THEN** anchored guide bubbles walk through number control, input switching, and grading
- **AND** choosing "不再提示" prevents the guide from showing again

### Requirement: Grading writes practice records

When the user triggers「对答案」, the system SHALL persist one `wordRecord` for each graded row (rows with index within the played range): a correct row SHALL be saved with `wrongCount: 0` and an incorrect row with `wrongCount: 1`. Records SHALL use the current chapter for normal practice and `chapter = -1` in review mode (consistent with the existing save flow). Repeated grading in the same session SHALL only write new records for rows whose verdict changed since the last write; unchanged rows MUST NOT produce duplicate records. Ungraded (unplayed) rows MUST NOT produce records.

#### Scenario: First grading persists all graded rows

- **WHEN** the user has played through 10 rows and clicks「对答案」with 7 correct and 3 wrong
- **THEN** 10 `wordRecord` entries are written（7 条 `wrongCount: 0`、3 条 `wrongCount: 1`）
- **AND** the wrong words appear in the error book under the latest-state semantics

#### Scenario: Regrading only writes changed verdicts

- **WHEN** the user fixes one wrong answer and clicks「对答案」again
- **THEN** only that row gets a new record（`wrongCount: 0`）
- **AND** rows with unchanged verdicts do not produce duplicate records

#### Scenario: Unplayed rows produce no records

- **WHEN** the user grades after playing only part of the sheet
- **THEN** rows beyond the play pointer produce no `wordRecord`
