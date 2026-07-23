# custom-collected-dictionary Specification

## Purpose

本地自定义词库「小饼干罐」（id `collect-biscuit`）：Dexie 持久化，可练习、可导出备份。

## Requirements

### Requirement: Fixed local dictionary 小饼干罐

The system SHALL provide a single built-in custom dictionary with id `collect-biscuit` and display name「小饼干罐」. New words collected via the overlay or batch flow SHALL be stored in this dictionary's local persistence (not `public/dicts` static JSON).

#### Scenario: Dictionary appears in gallery

- **WHEN** the user opens the dictionary gallery
- **THEN**「小饼干罐」is listed and can be selected like other dictionaries

#### Scenario: Empty dictionary

- **WHEN**「小饼干罐」has zero words
- **THEN** it still appears as a selectable dictionary with length 0

### Requirement: Collected words persist locally and load for practice

Words in「小饼干罐」SHALL persist in browser storage (Dexie) across reloads. When the user practices this dictionary, the typing flow SHALL load its word list ordered by section (listening then reading) and slice chapters using the fixed two-chapter listening/reading model with `chapterLengths`, not the global default chapter length.

#### Scenario: Practice after collect

- **WHEN** the user has saved words into「小饼干罐」and selects that dictionary to practice
- **THEN** those words appear in the practice word list according to the current listening or reading chapter

#### Scenario: Survive reload

- **WHEN** the user reloads the app after saving collected words
- **THEN**「小饼干罐」still contains those words
- **AND** each word's section (or listening default) is preserved for chapter slicing

### Requirement: Word count reflects stored entries

The authoritative word count for「小饼干罐」SHALL equal the number of stored word entries in local persistence, and SHALL drive dictionary length metadata used for chapters and post-save jar badge. For this dictionary, chapter count SHALL remain 2, and `chapterLengths` SHALL be `[listeningCount, readingCount]`.

#### Scenario: Length updates chapter lengths not chapter count

- **WHEN** words are added to listening or reading sections
- **THEN** the corresponding `chapterLengths` entry increases
- **AND** chapter count stays 2

### Requirement: Collected words use standard Word fields

Each stored collected word SHALL include at least `name`, `trans`, `usphone`, and `ukphone` compatible with the existing `Word` type so pronunciation and display features work without special casing beyond dictionary loading. In addition, each entry SHALL carry a `section` used only for「小饼干罐」chapter grouping (not required on other dictionaries' `Word` JSON).

#### Scenario: Pronunciation without custom audio

- **WHEN** a collected word has no `usAudio`/`ukAudio`
- **THEN** pronunciation uses the existing Youdao-based resolution for the word name, with browser speech synthesis fallback when Youdao fails

### Requirement: Collected words carry a listening or reading section

Each stored collected word SHALL include a `section` of `listening` or `reading`. Missing or invalid section values SHALL be treated as listening.

#### Scenario: Legacy row without section

- **WHEN** a stored collected word has no section field
- **THEN** the system treats it as listening for chapter counts and practice ordering

#### Scenario: Export includes section

- **WHEN** the user exports app data that includes collected words
- **THEN** each collected word entry includes its section when present

### Requirement: 小饼干罐 has fixed listening and reading chapters

「小饼干罐」SHALL use exactly two chapters: chapter 0 titled 听力 and chapter 1 titled 阅读. Chapter lengths SHALL equal the counts of listening and reading words respectively. The practice word list SHALL order all listening words before all reading words so chapter ranges align with those lengths.

#### Scenario: Chapter titles in gallery

- **WHEN** the user opens「小饼干罐」chapter selection
- **THEN** the two chapters are labeled 听力 and 阅读 (not 第 N 章)
- **AND** each shows its current word count

#### Scenario: Practice listening chapter

- **WHEN** the user practices chapter 0 of「小饼干罐」with both listening and reading words stored
- **THEN** only listening-section words appear in that chapter's word list

#### Scenario: Practice reading chapter

- **WHEN** the user practices chapter 1 of「小饼干罐」with reading words stored
- **THEN** only reading-section words appear in that chapter's word list

#### Scenario: Empty section chapter still exists

- **WHEN**「小饼干罐」has listening words but zero reading words
- **THEN** chapter count remains 2
- **AND** the reading chapter shows 0 words

### Requirement: Data export includes collected words

The existing data settings export/import SHALL include the `collectedWords` Dexie table so「小饼干罐」can be backed up and restored with practice data.

#### Scenario: Export then import restores jar

- **WHEN** the user exports data and later imports that file
- **THEN**「小饼干罐」word entries are restored
- **AND** dictionary length metadata is synced after import
