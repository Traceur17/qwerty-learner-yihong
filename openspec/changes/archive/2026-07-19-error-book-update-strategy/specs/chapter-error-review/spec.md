## MODIFIED Requirements

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
