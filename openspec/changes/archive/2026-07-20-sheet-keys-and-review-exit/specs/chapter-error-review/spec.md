## ADDED Requirements

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
