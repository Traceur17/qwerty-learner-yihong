# listen-dictation-mode Specification

## Purpose

TBD - created by archiving change listen-dictation-mode. Update Purpose after archive.

## Requirements

### Requirement: Listen dictation mode toggle

The system SHALL provide a listen dictation mode toggle in the typing page toolbar. When enabled, the typing page SHALL enter listen dictation mode. Listen dictation mode and word dictation mode (默写模式) MUST be mutually exclusive: enabling one SHALL automatically disable the other.

#### Scenario: Enable listen dictation mode

- **WHEN** user enables listen dictation mode
- **THEN** listen dictation mode becomes active
- **AND** word dictation mode is automatically disabled if it was enabled

#### Scenario: Enable word dictation mode while listen dictation is active

- **WHEN** user enables word dictation mode while listen dictation mode is active
- **THEN** listen dictation mode is automatically disabled
- **AND** word dictation mode becomes active

### Requirement: Minimal UI during listen dictation

During listen dictation mode, the typing page SHALL always display the word pronunciation audio and pronunciation icon. Phonetic symbols, translations, and previous word preview SHALL be hidden by default but MAY be shown when the corresponding listen dictation display option is enabled.

The system MUST NOT display per-letter grids, next word previews, or Tab-to-reveal-answer tooltips during listen dictation.

#### Scenario: Default minimal UI

- **WHEN** listen dictation mode is active with all display options off
- **THEN** only pronunciation icon and dictation input are shown
- **AND** phonetic, translation, and previous word are hidden

#### Scenario: Optional phonetic shown

- **WHEN** `showPhonetic` is enabled in listen dictation mode
- **THEN** phonetic symbols are displayed for the current word

#### Scenario: Pronunciation available in listen dictation mode

- **WHEN** a new word begins in listen dictation mode
- **THEN** word pronunciation audio plays automatically
- **AND** pronunciation icon is visible for manual replay (Ctrl+J)

### Requirement: Single-line input with underline

During listen dictation mode, the system SHALL provide a single-line text input area styled as one continuous underline (not per-letter underscores). The user SHALL be able to type, delete, and edit freely without real-time character validation.

#### Scenario: Free editing before submit

- **WHEN** user is typing in listen dictation mode
- **THEN** no per-character validation occurs
- **AND** user can use backspace to edit input freely

### Requirement: Enter to submit whole word

The system SHALL submit the user's input when Enter is pressed. After submission, the input MUST be locked and the user MUST NOT be able to modify the input until the next word.

#### Scenario: Submit on Enter

- **WHEN** user presses Enter with non-empty input
- **THEN** the system compares the full input against the correct word
- **AND** the input field becomes locked

#### Scenario: Empty submit ignored

- **WHEN** user presses Enter with empty input
- **THEN** no validation occurs
- **AND** no record is written
- **AND** user remains on the current word

### Requirement: Correct/incorrect feedback with auto-advance

After submission, the system SHALL display feedback and automatically advance to the next word after a fixed delay.

- Correct answer: display success indicator, wait 1000ms, then advance
- Incorrect answer: display failure indicator, user's input, and correct answer, wait 1500ms, then advance

#### Scenario: Correct answer feedback

- **WHEN** user submits a correct answer
- **THEN** a success indicator is displayed
- **AND** after 1000ms the system advances to the next word

#### Scenario: Incorrect answer feedback

- **WHEN** user submits an incorrect answer
- **THEN** a failure indicator is displayed
- **AND** the user's input is shown
- **AND** the correct answer is shown
- **AND** after 1500ms the system advances to the next word

### Requirement: Case-insensitive comparison respects setting

Word comparison during listen dictation SHALL respect the global `isIgnoreCase` setting.

#### Scenario: Ignore case enabled

- **WHEN** ignore case is enabled and user submits input differing only in letter case
- **THEN** the answer is judged as correct

#### Scenario: Ignore case disabled

- **WHEN** ignore case is disabled and user submits input differing in letter case
- **THEN** the answer is judged as incorrect
