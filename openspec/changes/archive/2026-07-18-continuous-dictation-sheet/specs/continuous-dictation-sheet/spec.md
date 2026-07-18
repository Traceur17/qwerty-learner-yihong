## ADDED Requirements

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

The system SHALL play word audio in chapter order with a user-configurable gap after each clip ends before starting the next word. The user SHALL be able to pause and resume playback. The currently playing row SHALL be visually highlighted as the play pointer.

#### Scenario: Auto-advance after gap

- **WHEN** playback is running and the current word audio ends
- **THEN** the system waits for the configured gap duration
- **AND** then plays the next word and advances the play pointer

#### Scenario: Pause and resume

- **WHEN** the user pauses during continuous playback
- **THEN** audio stops and the scheduled next-word advance is cancelled
- **AND** when the user resumes, playback continues from the current play pointer

### Requirement: Click number to restart playback

Clicking a question number SHALL restart continuous playback from that word (set play pointer to that index and play its audio, then continue forward with the configured gap).

#### Scenario: Restart from chosen number

- **WHEN** the user clicks question number N
- **THEN** the play pointer moves to N
- **AND** word N audio plays immediately
- **AND** subsequent words continue under the continuous playback rules

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
- **THEN** rows 0..P show English, translation, and error-history columns
- **AND** each played row is marked correct or incorrect based on its answer input
- **AND** rows after P remain ungraded without reference columns required

#### Scenario: Correct and incorrect markers

- **WHEN** a played row is graded correct
- **THEN** it shows a clear correct indicator (e.g. checkmark)
- **WHEN** a played row is graded incorrect
- **THEN** it shows a prominent visual diff between the user answer and the correct English

#### Scenario: Regrade after edits

- **WHEN** the user edits an answer after a previous reveal
- **THEN** grade markers MUST NOT silently update until the user activates grade/reveal again

### Requirement: Error history display and persistence

For each word, the system SHALL retain up to the three most recent wrong answer strings across sessions. After reveal, the error-history cell SHALL show `/` when empty; otherwise it SHALL show the latest wrong answer as full text with a diff against the correct answer, plus `×N` when N is the number of stored wrong answers (1..3). Clicking the error-history cell SHALL expand or collapse the full list of up to three wrong answers (each eligible for diff). Hover-only disclosure MUST NOT be the sole way to read history.

#### Scenario: No history

- **WHEN** a word has no stored wrong answers
- **THEN** the error-history cell displays `/`

#### Scenario: Latest wrong with count

- **WHEN** a word has two stored wrong answers and reveal is active
- **THEN** the cell shows the most recent wrong answer text with diff
- **AND** shows `×2`

#### Scenario: Expand full history

- **WHEN** the user clicks an error-history cell that has stored wrongs
- **THEN** up to three wrong answers are shown without requiring hover

#### Scenario: Persist new wrong on grade

- **WHEN** grading marks a row incorrect with a non-empty user answer
- **THEN** that answer is prepended to the word's wrong-answer history
- **AND** history is truncated to at most three entries
