## MODIFIED Requirements

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
