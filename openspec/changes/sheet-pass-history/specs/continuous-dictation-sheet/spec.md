## ADDED Requirements

### Requirement: Accuracy control opens pass history flow

While continuous sheet mode is active, the footer accuracy control SHALL act as the entry to the chapter pass progress and history flow defined by `sheet-pass-history` (progress chart, then optional full-page records grid). The control MUST NOT remain non-interactive decoration once history or a revealed round makes the entry available.

#### Scenario: Click accuracy after reveal

- **WHEN** answers have been revealed and the user activates the accuracy control
- **THEN** the chapter progress view opens

### Requirement: Retry round control on sheet chrome

The continuous sheet chrome SHALL expose「再练一遍」when a draft or revealed round exists, following the sealable vs non-sealable clearing rules in `sheet-pass-history`.

#### Scenario: Retry visible after graded session

- **WHEN** the user has a restored draft or a revealed round on the sheet
- **THEN**「再练一遍」is available from the sheet UI

## MODIFIED Requirements

### Requirement: Default columns while listening

While sheet mode is active and answers have not been revealed, each row SHALL show only the question number and an answer input. English text, translation, and error-history columns MUST be hidden. When a restored draft is already in the revealed state, the sheet SHALL show the revealed columns consistent with that draft rather than forcing the listening-only columns.

#### Scenario: Hidden reference columns before reveal

- **WHEN** the user is filling the sheet and has not clicked reveal/grade
- **AND** the restored draft is not in a revealed state
- **THEN** only number and answer columns are visible
- **AND** correct English, translation, and error history are not shown

#### Scenario: Restored revealed draft shows reference columns

- **WHEN** the user opens the sheet and the draft restores in a revealed state
- **THEN** graded rows show the revealed reference presentation (correctness markers, translation/phonetic as today)
- **AND** the user is not forced back into listening-only columns until they clear via「再练一遍」or equivalent
