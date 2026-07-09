## ADDED Requirements

### Requirement: Record on every submission

In listen dictation mode, the system SHALL write a word practice record to IndexedDB on every Enter submission, regardless of whether the answer is correct or incorrect.

#### Scenario: Correct answer recorded

- **WHEN** user submits a correct answer in listen dictation mode
- **THEN** a word record is saved with `wrongCount` of 0

#### Scenario: Incorrect answer recorded

- **WHEN** user submits an incorrect answer in listen dictation mode
- **THEN** a word record is saved with `wrongCount` of 1

### Requirement: Incorrect words available for dictionary review

Word records with `wrongCount` greater than 0 written during listen dictation mode SHALL be available for the existing per-dictionary error review feature (词库内「错题回顾」) without any changes to that feature.

#### Scenario: Dictation error appears in dictionary error review

- **WHEN** user submits an incorrect answer in listen dictation mode for a dictionary
- **THEN** that word appears in the dictionary's error word list
- **AND** user can start error review for that dictionary using the existing review flow

### Requirement: Chapter statistics updated

Listen dictation submissions SHALL update chapter-level statistics (correct count, wrong count) consistent with the existing typing state management.

#### Scenario: Correct submission updates stats

- **WHEN** user submits a correct answer in listen dictation mode
- **THEN** chapter correct count is incremented by 1

#### Scenario: Incorrect submission updates stats

- **WHEN** user submits an incorrect answer in listen dictation mode
- **THEN** chapter wrong count is incremented by 1
