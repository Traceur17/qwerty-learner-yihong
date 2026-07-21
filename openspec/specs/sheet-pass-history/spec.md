# sheet-pass-history Specification

## Purpose

连播卷面的遍次草稿与完整听写历史：按章恢复草稿、封存整章答卷、正确率折线进步视图，以及 Excel 式多遍答卷对比。

## Requirements

### Requirement: Sheet pass draft persistence

The system SHALL persist a per-`(dict, chapter)` continuous-sheet draft containing answers, grades, play progress (`playIndex` / `maxPlayedIndex`), and reveal state. When the user opens continuous sheet mode for that chapter, the system SHALL restore the draft by default without prompting whether to load or start fresh.

#### Scenario: Restore draft on open

- **WHEN** the user opens continuous sheet mode for a chapter that has a saved draft
- **THEN** the sheet restores answers, grades, play progress, and reveal state from that draft
- **AND** no modal asks the user to choose between loading the draft and starting over

#### Scenario: Empty sheet when no draft

- **WHEN** the user opens continuous sheet mode for a chapter with no draft
- **THEN** the sheet starts empty as today

### Requirement: Sealable pass definition

A sheet round SHALL be considered sealable only when the play pointer has reached the last word of the chapter and the user has graded/revealed answers for the played range at least once in that round.

#### Scenario: Mid-chapter grade is not sealable

- **WHEN** the user grades while `maxPlayedIndex` is less than the last word index
- **THEN** the round is not sealable for full pass history
- **AND** existing word-level practice records and wrong-answer history behavior remain unchanged

#### Scenario: Full chapter after grade is sealable

- **WHEN** playback has reached the last word and the user has revealed grades for the played range
- **THEN** the round is sealable

### Requirement: Commit sealed passes without chart spikes

When sealing, the system SHALL upsert at most one `sheetPass` history row for the current round (update if the draft already links to a pass; otherwise insert). Repeated grading within the same round MUST NOT create additional history rows. Mid-chapter grading MUST NOT create history rows.

#### Scenario: Regrade updates same pass

- **WHEN** a sealable round is committed and the user later changes answers, grades again, and commits again for the same round
- **THEN** the existing history row for that round is updated
- **AND** no extra pass is appended to the chapter history

#### Scenario: Silent commit on leave

- **WHEN** the user switches chapter or leaves the sheet while the round is sealable
- **THEN** the system silently upserts the sealed pass into history
- **AND** the draft remains available for default restore on next open unless cleared by「再练一遍」

### Requirement: Retry this round control

The system SHALL provide「再练一遍」. If the round is sealable, activating it SHALL upsert the sealed pass into history and then clear the draft and sheet for a new round. If the round is not sealable, the system SHALL warn that clearing will discard the current round without writing full pass history, and clear only after confirmation.

#### Scenario: Retry after full graded chapter

- **WHEN** the round is sealable and the user confirms「再练一遍」
- **THEN** a sealed pass is upserted into history
- **AND** the sheet and draft are cleared for a new round

#### Scenario: Retry before chapter finished

- **WHEN** the round is not sealable and the user activates「再练一遍」
- **THEN** a confirmation warns that the current round will be cleared and not recorded in full history
- **AND** clearing happens only after the user confirms

### Requirement: Accuracy entry to progress view

The sheet footer accuracy control SHALL be activatable to open a chapter progress view showing a line chart of sealed pass accuracies (x-axis = pass index). When the current round is not revealed but sealed history exists for the chapter, an entry to the progress view SHALL still be available.

#### Scenario: Open progress from accuracy

- **WHEN** the user activates the accuracy entry with at least one sealed pass or a revealed current round
- **THEN** a progress dialog opens with the chapter accuracy line chart

#### Scenario: Empty chart state

- **WHEN** the progress view opens with fewer than two sealed passes
- **THEN** the UI shows an empty or single-point state explaining that another full sealed pass will reveal the trend

### Requirement: Full-page Excel-style history grid

From the progress view,「查看听写记录」SHALL open a full-page overlay (not a small modal) showing an Excel-like grid: rows are words (with frozen question number and correct-answer columns), columns are sealed passes (header includes pass index, date, and accuracy). Cells SHALL show the user's answer with a clear correct/incorrect visual. The overlay SHALL close via a top-right close control.

#### Scenario: Open full-page history from progress

- **WHEN** the user clicks「查看听写记录」in the progress view
- **THEN** a full-page history grid opens for the chapter
- **AND** a top-right close control dismisses it

#### Scenario: Column per pass

- **WHEN** the chapter has multiple sealed passes
- **THEN** each pass appears as its own column in chronological order
- **AND** the user can scroll horizontally to earlier passes

#### Scenario: Inspect wrong cell

- **WHEN** the user inspects an incorrect cell
- **THEN** they can see how the typed answer differs from the correct word (diff or equivalent)

#### Scenario: Chart point focuses column

- **WHEN** the user selects a point on the progress chart that corresponds to a sealed pass
- **THEN** the history grid (when open, or after opening records) scrolls to and highlights that pass column
