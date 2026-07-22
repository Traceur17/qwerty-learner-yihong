## ADDED Requirements

### Requirement: Fixed local dictionary 收集小饼干

The system SHALL provide a single built-in custom dictionary with id `collect-biscuit` and display name「收集小饼干」. New words collected via the overlay or batch flow SHALL be stored in this dictionary's local persistence (not `public/dicts` static JSON).

#### Scenario: Dictionary appears in gallery

- **WHEN** the user opens the dictionary gallery
- **THEN**「收集小饼干」is listed and can be selected like other dictionaries

#### Scenario: Empty dictionary

- **WHEN**「收集小饼干」has zero words
- **THEN** it still appears as a selectable dictionary with length 0

### Requirement: Collected words persist locally and load for practice

Words in「收集小饼干」SHALL persist in browser storage (Dexie) across reloads. When the user practices this dictionary, the typing flow SHALL load its word list and chapter slicing using the same chapter-length rules as other dictionaries (default chapter length).

#### Scenario: Practice after collect

- **WHEN** the user has saved words into「收集小饼干」and selects that dictionary to practice
- **THEN** those words appear in the practice word list according to the current chapter

#### Scenario: Survive reload

- **WHEN** the user reloads the app after saving collected words
- **THEN**「收集小饼干」still contains those words

### Requirement: Word count reflects stored entries

The authoritative word count for「收集小饼干」SHALL equal the number of stored word entries in local persistence, and SHALL drive the header biscuit-box badge and dictionary length metadata used for chapters.

#### Scenario: Length updates chapter count

- **WHEN** enough words are added that a new chapter boundary is crossed under the default chapter length
- **THEN** the dictionary's chapter count increases accordingly

### Requirement: Collected words use standard Word fields

Each stored collected word SHALL include at least `name`, `trans`, `usphone`, and `ukphone` compatible with the existing `Word` type so pronunciation and display features work without special casing beyond dictionary loading.

#### Scenario: Pronunciation without custom audio

- **WHEN** a collected word has no `usAudio`/`ukAudio`
- **THEN** pronunciation uses the existing Youdao-based resolution for the word name
