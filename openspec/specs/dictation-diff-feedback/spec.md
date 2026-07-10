# dictation-diff-feedback Specification

## Purpose

Listen dictation feedback enhancements: Chinese translation, visual diff on errors, and Enter-to-continue after incorrect answers.

## Requirements

### Requirement: Chinese translation on feedback

After listen dictation submission, the feedback area SHALL display the word's Chinese translation (`word.trans`, joined when multiple entries exist).

#### Scenario: Translation shown on correct answer

- **WHEN** user submits a correct answer in listen dictation mode
- **THEN** Chinese translation is displayed below the success indicator

#### Scenario: Translation shown on incorrect answer

- **WHEN** user submits an incorrect answer in listen dictation mode
- **THEN** Chinese translation is displayed together with the correct answer and diff

### Requirement: Prominent answer diff on incorrect submission

On incorrect listen dictation submission, the system SHALL render a prominent visual diff between the user's input and the correct answer. For multi-word phrases, comparison MUST be word-level first (missing, extra, replaced tokens). For single-token differences within a matched span, character-level highlighting MAY be applied.

#### Scenario: Phrase missing word

- **WHEN** correct answer is `a couple of` and user submits `couple of`
- **THEN** diff highlights the missing token `a`
- **AND** extra/missing/replaced tokens use high-contrast colors (e.g. red for wrong/missing, green for correct reference)

#### Scenario: Single word typo

- **WHEN** correct answer is `explosive` and user submits `explosve`
- **THEN** diff highlights differing characters within the word

### Requirement: Enter to continue after incorrect answer

After an incorrect listen dictation submission, the system MUST NOT auto-advance. The user SHALL press Enter to proceed to the next word once feedback (including diff and translation) is visible.

#### Scenario: No auto-advance on error

- **WHEN** user submits an incorrect answer
- **THEN** the system stays on the current word feedback view
- **AND** no timer auto-invokes advance to the next word

#### Scenario: Enter advances after error

- **WHEN** incorrect feedback is shown and user presses Enter
- **THEN** the system advances to the next word

#### Scenario: Enter ignored during empty feedback

- **WHEN** user has not yet submitted the current word
- **THEN** Enter still submits non-empty input per existing behavior
- **AND** does not skip to next word
