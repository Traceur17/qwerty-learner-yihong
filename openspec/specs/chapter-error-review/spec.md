# chapter-error-review Specification

## Purpose

Allow users to practice error words from the current chapter without leaving the typing flow.

## Requirements

### Requirement: Chapter error word query

The system SHALL be able to query distinct error words for a given dictionary and chapter from local practice records. A word SHALL be included when it has at least one `wordRecord` with matching `dict`, matching `chapter` (0-based chapter index), and `wrongCount > 0`, **AND** its latest record across all sources for the same `dict + word` (including review records with `chapter = -1` and continuous sheet records) still has `wrongCount > 0`（「最新错题」口径）. Words whose latest record has `wrongCount = 0`（已掌握）MUST be excluded. Results MUST be deduplicated by word name and resolved to full `Word` objects from the dictionary JSON. Accumulated error counts MUST be preserved and reported from all historical records.

#### Scenario: Chapter has error words

- **WHEN** the user has practiced chapter 3 of dictionary `wang-c5-biscuit` and at least one word has `wrongCount > 0` for that chapter and its latest record is still wrong
- **THEN** the chapter error word query returns those words as `Word` objects
- **AND** each word appears at most once

#### Scenario: Chapter has no error words

- **WHEN** no `wordRecord` exists for the current dict and chapter with `wrongCount > 0`
- **THEN** the chapter error word query returns an empty list

#### Scenario: Mastered words excluded from query

- **WHEN** a word was wrong in chapter 3 historically but its latest record (e.g. answered correctly during error review) has `wrongCount = 0`
- **THEN** the chapter error word query excludes that word
- **AND** the「练习错题」/「练本章错词」counts and word lists shrink accordingly; when all chapter errors are mastered the buttons are disabled

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

### Requirement: Exit chapter error review to original chapter from result screen

When chapter error review was started with a `chapterErrorReturn` snapshot and the user finishes that review session, the result screen SHALL exit review mode back to the original chapter from the snapshot (MUST NOT reset to chapter 0). The result screen SHALL provide **「重复本章节」** (exit review, restore original chapter word list, repeat that chapter) and, when the original chapter is not the last chapter, **「下一章节」** (exit review, advance to original chapter + 1). Closing the result screen (×) SHALL behave the same as **「重复本章节」**. Gallery / global error review without `chapterErrorReturn` MAY keep navigating to the gallery via **「练习其他章节」**.

#### Scenario: Repeat original chapter after chapter error review

- **WHEN** the user finishes chapter error review that has `chapterErrorReturn` for chapter N
- **AND** clicks **「重复本章节」** (or closes the result screen with ×)
- **THEN** review mode ends
- **AND** the typing session returns to chapter N's normal word list and restarts that chapter
- **AND** the chapter index is not forced to 0

#### Scenario: Advance to next chapter after chapter error review

- **WHEN** the user finishes chapter error review that has `chapterErrorReturn` for chapter N
- **AND** N is not the last chapter
- **AND** clicks **「下一章节」**
- **THEN** review mode ends
- **AND** the typing session starts chapter N+1

#### Scenario: Global review without snapshot keeps gallery exit

- **WHEN** the user finishes a review session without `chapterErrorReturn`
- **THEN** the result screen still provides **「练习其他章节」** that exits review and navigates to the gallery
