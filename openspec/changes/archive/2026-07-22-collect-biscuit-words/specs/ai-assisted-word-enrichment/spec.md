## ADDED Requirements

### Requirement: Gemini API key BYOK in settings

The system SHALL allow the user to save a Gemini API key in settings, store it only in the browser's local storage, clear it, and run a connectivity test. The key MUST NOT be hardcoded in the repository.

#### Scenario: Save key

- **WHEN** the user enters a Gemini API key and saves in settings
- **THEN** the key is stored locally in the browser
- **AND** subsequent recognition requests can use it

#### Scenario: Clear key

- **WHEN** the user clears the Gemini API key
- **THEN** the key is removed from local storage
- **AND** recognition that requires Gemini fails with a prompt to configure the key

#### Scenario: Connectivity test success

- **WHEN** the user runs the connectivity test with a valid key
- **THEN** the UI reports success

#### Scenario: Connectivity test failure

- **WHEN** the user runs the connectivity test with a missing or invalid key
- **THEN** the UI reports failure without crashing the app

### Requirement: Recognition extracts English words from text or image

Given configured Gemini access, the system SHALL extract a list of English headwords from overlay/batch text or image input (OCR + structuring). Non-word noise (page numbers, instructions) SHOULD be excluded when feasible.

#### Scenario: Image word list

- **WHEN** the user submits a screenshot of a mostly English IELTS word list
- **THEN** the system returns candidate English words for enrichment

#### Scenario: Missing API key

- **WHEN** the user triggers recognition without a configured Gemini key
- **THEN** the system does not silently fail
- **AND** prompts the user to configure the key in settings

### Requirement: Enrichment fills phonetic and Chinese definition

For each extracted word, the system SHALL auto-fill phonetic transcription(s) and Chinese definition(s) for display on cards. A dictionary API MAY be used first for phonetics; when dictionary data is missing, Gemini SHALL fill the gaps. Auto-filled fields SHALL be shown directly on cards and remain user-editable before save.

#### Scenario: Dictionary hit then display

- **WHEN** a dictionary source returns phonetics for a word
- **THEN** the card shows those phonetics without requiring extra user action

#### Scenario: Dictionary miss uses Gemini

- **WHEN** dictionary lookup misses phonetics or Chinese definition for a word
- **THEN** Gemini supplies the missing fields on the card

### Requirement: Pronunciation preview uses existing playback path

Word cards SHALL offer pronunciation preview using the same pronunciation resolution path as practice (Youdao `dictvoice` when no custom audio), so collected words are audible before save.

#### Scenario: Preview on card

- **WHEN** the user activates pronunciation preview on a card
- **THEN** audio for that word plays using the current pronunciation settings when available
