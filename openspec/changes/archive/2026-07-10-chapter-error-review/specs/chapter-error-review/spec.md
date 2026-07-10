## ADDED Requirements

### Requirement: Chapter error word query

The system SHALL be able to query distinct error words for a given dictionary and chapter from local practice records. A word SHALL be included when it has at least one `wordRecord` with matching `dict`, matching `chapter` (0-based chapter index), and `wrongCount > 0`. Results MUST be deduplicated by word name and resolved to full `Word` objects from the dictionary JSON.

#### Scenario: Chapter has error words

- **WHEN** the user has practiced chapter 3 of dictionary `wang-c5-biscuit` and at least one word has `wrongCount > 0` for that chapter
- **THEN** the chapter error word query returns those words as `Word` objects
- **AND** each word appears at most once

#### Scenario: Chapter has no error words

- **WHEN** no `wordRecord` exists for the current dict and chapter with `wrongCount > 0`
- **THEN** the chapter error word query returns an empty list

### Requirement: Practice chapter errors from typing toolbar

The typing page toolbar SHALL provide a **「练本章错词」** control adjacent to the error book entry. When activated with available chapter error words, the system SHALL start review mode using the existing `reviewMode` flow with a newly generated `ReviewRecord` containing only those words.

#### Scenario: Start chapter error review from toolbar

- **WHEN** user clicks **「练本章错词」** and the current chapter has error words
- **THEN** review mode becomes active
- **AND** the word list contains only error words from the current chapter
- **AND** the user remains on the typing page (no navigation to gallery)

#### Scenario: Toolbar button disabled without chapter errors

- **WHEN** the current chapter has no error words
- **THEN** **「练本章错词」** is disabled
- **AND** a tooltip or title explains that there are no errors in this chapter

### Requirement: Retry chapter errors from result screen

After completing a chapter, the result screen SHALL provide **「再练本章错词」** using the same chapter error review flow as the toolbar button.

#### Scenario: Retry from result screen

- **WHEN** user finishes a chapter and clicks **「再练本章错词」** with chapter errors available
- **THEN** review mode starts with the current chapter's error words
- **AND** the result screen is dismissed and typing resumes

#### Scenario: Result screen button disabled without chapter errors

- **WHEN** the completed chapter has no error words
- **THEN** **「再练本章错词」** is disabled
- **AND** explanatory text is shown

### Requirement: Review mode labeling during chapter error practice

During chapter error review, the typing page header SHALL indicate review context (e.g. existing **「错题复习」** label). Chapter error review MUST NOT alter listen dictation or word dictation mode settings.

#### Scenario: Header shows review context

- **WHEN** user is practicing chapter error words in review mode
- **THEN** the chapter/dict header shows review labeling consistent with existing review mode
