## MODIFIED Requirements

### Requirement: Correct/incorrect feedback with auto-advance

After submission, the system SHALL display feedback. Advance behavior MUST differ by outcome:

- **Correct answer**: display success indicator and Chinese translation (`word.trans`); automatically advance after **1000ms**
- **Incorrect answer**: display failure indicator, user's input, correct answer, Chinese translation, and prominent diff; advance **only when user presses Enter** (no auto-advance timer)

#### Scenario: Correct answer feedback

- **WHEN** user submits a correct answer
- **THEN** a success indicator is displayed
- **AND** Chinese translation is displayed
- **AND** after 1000ms the system advances to the next word

#### Scenario: Incorrect answer feedback

- **WHEN** user submits an incorrect answer
- **THEN** a failure indicator is displayed
- **AND** the user's input is shown
- **AND** the correct answer is shown
- **AND** Chinese translation is shown
- **AND** a prominent diff is displayed
- **AND** the system does NOT auto-advance until user presses Enter

#### Scenario: Enter continues after incorrect feedback

- **WHEN** incorrect feedback is visible and user presses Enter
- **THEN** the system advances to the next word
