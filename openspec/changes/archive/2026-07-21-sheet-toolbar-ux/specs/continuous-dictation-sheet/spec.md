## ADDED Requirements

### Requirement: Sheet toolbar accuracy after grade

After grade/reveal, the sheet toolbar SHALL show accuracy as correct graded rows / graded rows, expanding and collapsing with a width/opacity transition.

#### Scenario: Accuracy expands on reveal

- **WHEN** the user grades at least one played row
- **THEN** an accuracy metric appears in the toolbar with a smooth expand transition

### Requirement: Replay from graded card

Clicking a graded row card (excluding the question number) SHALL play that word's pronunciation.

#### Scenario: Click card to replay

- **WHEN** answers are revealed and the user clicks a graded card body
- **THEN** that row's pronunciation plays
