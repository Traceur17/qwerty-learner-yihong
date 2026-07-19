## ADDED Requirements

### Requirement: Grading writes practice records

When the user triggers「对答案」, the system SHALL persist one `wordRecord` for each graded row (rows with index within the played range): a correct row SHALL be saved with `wrongCount: 0` and an incorrect row with `wrongCount: 1`. Records SHALL use the current chapter for normal practice and `chapter = -1` in review mode (consistent with the existing save flow). Repeated grading in the same session SHALL only write new records for rows whose verdict changed since the last write; unchanged rows MUST NOT produce duplicate records. Ungraded (unplayed) rows MUST NOT produce records.

#### Scenario: First grading persists all graded rows

- **WHEN** the user has played through 10 rows and clicks「对答案」with 7 correct and 3 wrong
- **THEN** 10 `wordRecord` entries are written（7 条 `wrongCount: 0`、3 条 `wrongCount: 1`）
- **AND** the wrong words appear in the error book under the latest-state semantics

#### Scenario: Regrading only writes changed verdicts

- **WHEN** the user fixes one wrong answer and clicks「对答案」again
- **THEN** only that row gets a new record（`wrongCount: 0`）
- **AND** rows with unchanged verdicts do not produce duplicate records

#### Scenario: Unplayed rows produce no records

- **WHEN** the user grades after playing only part of the sheet
- **THEN** rows beyond the play pointer produce no `wordRecord`
