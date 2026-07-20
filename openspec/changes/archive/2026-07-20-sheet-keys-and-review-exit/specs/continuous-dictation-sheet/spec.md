## MODIFIED Requirements

### Requirement: Keyboard navigation within played range

The answer input focus SHALL move with Enter, Tab, and ArrowDown to the next row, and with Shift+Tab and ArrowUp to the previous row. ArrowLeft SHALL move to the previous row and ArrowRight to the next row under the same rules. The focused answer index MUST NOT exceed `min(playPointer + 1, lastWordIndex)`. Rows beyond that focus ceiling MUST NOT be focusable.

#### Scenario: Move to next cell within ceiling

- **WHEN** focus is on answer row i and i is less than the focus ceiling (`playPointer + 1`, capped at the last word)
- **AND** the user presses Enter, Tab, ArrowDown, or ArrowRight
- **THEN** focus moves to answer row i+1

#### Scenario: Allow one row ahead of play pointer

- **WHEN** the play pointer is on row P and P is not the last word
- **AND** focus is on row P
- **AND** the user presses Enter, Tab, ArrowDown, or ArrowRight
- **THEN** focus moves to row P+1
- **AND** rows after P+1 do not receive focus

#### Scenario: Block moving past focus ceiling

- **WHEN** focus is already on the focus ceiling row
- **AND** the user presses Enter, Tab, ArrowDown, or ArrowRight
- **THEN** focus remains on that row
- **AND** later unplayed rows do not receive focus

#### Scenario: Move to previous cell

- **WHEN** focus is on answer row i (i > 0)
- **AND** the user presses Shift+Tab, ArrowUp, or ArrowLeft
- **THEN** focus moves to answer row i-1

## ADDED Requirements

### Requirement: Ctrl+Space toggles playback while typing

In sheet mode, pressing Ctrl+Space SHALL toggle continuous playback: pause when running, resume when paused. The shortcut MUST work whether or not an answer input is focused, and MUST prevent inserting a space character. Plain Space (without Ctrl) while an answer input is focused SHALL continue to type a space. Plain Space outside inputs and Escape SHALL retain their existing pause/resume or dismiss behaviors.

#### Scenario: Toggle while focused in an answer input

- **WHEN** an answer input is focused and playback is running
- **AND** the user presses Ctrl+Space
- **THEN** playback pauses
- **AND** no space character is inserted into the input

#### Scenario: Resume with the same shortcut

- **WHEN** playback is paused
- **AND** the user presses Ctrl+Space
- **THEN** playback resumes from the current play pointer
