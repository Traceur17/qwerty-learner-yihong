# listen-dictation-display-options Specification

## Purpose

TBD - created by archiving change listen-dictation-enhancements. Update Purpose after archive.

## Requirements

### Requirement: Configurable display options in listen dictation

The listen dictation switcher SHALL provide three independent toggles, visible when listen dictation mode is enabled:

- Show previous word (`showPrevWord`, default: false)
- Show phonetic symbols (`showPhonetic`, default: false)
- Show translation (`showTranslation`, default: false)

These settings MUST be stored in `listenDictationConfigAtom` and MUST NOT affect global phonetic, translation, or prev/next word settings used in normal typing mode.

#### Scenario: Default all display options off

- **WHEN** user enables listen dictation mode for the first time
- **THEN** `showPrevWord`, `showPhonetic`, and `showTranslation` are all false

#### Scenario: Toggle display option

- **WHEN** user enables "显示音标" in the listen dictation popover
- **THEN** phonetic symbols are shown for the current word during listen dictation practice
- **AND** global `phoneticConfig` is unchanged

### Requirement: Previous word only in listen dictation

When `showPrevWord` is enabled in listen dictation mode, the system SHALL display only the previous word preview using the same component and styling as `PrevAndNextWord type="prev"` in normal mode with word dictation enabled.

The system MUST NOT display the next word preview in listen dictation mode.

#### Scenario: Previous word shown

- **WHEN** `showPrevWord` is true and user is practicing in listen dictation mode
- **THEN** the previous word is displayed on the left
- **AND** the next word is NOT displayed

#### Scenario: Previous word translation follows listen dictation setting

- **WHEN** `showPrevWord` and `showTranslation` are both true in listen dictation mode
- **THEN** translation text under the previous word is visible

### Requirement: Display options remain visible during feedback

When display options (phonetic, translation, previous word) are enabled, they SHALL remain visible after Enter submission during the correct/incorrect feedback period, until the next word begins.

#### Scenario: Feedback with translation enabled

- **WHEN** `showTranslation` is true and user submits an answer
- **THEN** translation remains visible during the feedback delay
- **AND** correct/incorrect feedback is also visible
