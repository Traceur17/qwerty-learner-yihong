## ADDED Requirements

### Requirement: Pause overlay in listen dictation mode

When listen dictation mode is active, the system SHALL display the same pause overlay as normal typing mode when `isTyping` is false.

The overlay text SHALL be:

- "按任意键开始" when the chapter timer has not started (`timerData.time === 0`)
- "按任意键继续" when practice was paused mid-session (`timerData.time > 0`)

#### Scenario: Overlay on chapter start

- **WHEN** listen dictation mode is active and user enters a chapter without having started practice
- **THEN** the pause overlay is displayed with "按任意键开始"

#### Scenario: Overlay on manual pause

- **WHEN** listen dictation mode is active and user pauses practice (Start/Pause button, window blur, settings, or word list)
- **THEN** the pause overlay is displayed with "按任意键继续"

#### Scenario: No overlay during Enter submit feedback

- **WHEN** user submits an answer with Enter in listen dictation mode
- **THEN** `isTyping` remains true
- **AND** the pause overlay is NOT displayed during correct/incorrect feedback

#### Scenario: Resume from overlay

- **WHEN** the pause overlay is visible in listen dictation mode
- **THEN** user can resume by pressing a legal character key or clicking Start
- **AND** Enter alone MUST NOT toggle pause (reserved for word submission)
