## ADDED Requirements

### Requirement: Logo opens collection overlay; title navigates home

The Header SHALL split click targets: activating the biscuit icon SHALL open the word-collection overlay; activating the title text SHALL navigate home (`/`) as today.

#### Scenario: Open collection from icon

- **WHEN** the user clicks the header biscuit icon
- **THEN** the collection overlay opens without navigating away from the current page

#### Scenario: Title still goes home

- **WHEN** the user clicks the header title text "Empress Biscuit"
- **THEN** the app navigates to `/`

### Requirement: Collection overlay accepts text and images

The collection overlay SHALL accept typed text, pasted images, and image file selection as input for recognition.

#### Scenario: Paste image

- **WHEN** the user pastes an image into the overlay input area
- **THEN** the image is accepted as recognition input

#### Scenario: Type words

- **WHEN** the user types or pastes plain English text into the overlay
- **THEN** that text is accepted as recognition input

### Requirement: Enter triggers recognition into editable cards

Pressing Enter in the collection overlay SHALL run recognition and enrichment, then show one card per candidate word with English, phonetic(s), definition(s), and a pronunciation preview control. Cards SHALL be editable (at least the definition). All cards SHALL be selected by default; the user SHALL be able to deselect individual cards before save.

#### Scenario: Multi-word result with deselection

- **WHEN** recognition returns multiple words
- **THEN** each word appears as a selected card
- **AND** the user can deselect some cards so they are not saved

#### Scenario: Edit definition before save

- **WHEN** a card shows an auto-filled definition
- **THEN** the user can edit the definition text on the card
- **AND** saving persists the edited definition

#### Scenario: Re-recognize

- **WHEN** the user chooses re-recognize
- **THEN** the system runs recognition again on the current input
- **AND** replaces the previous card list with the new result

### Requirement: Default save confirms selected cards into 收集小饼干

The primary action SHALL save all currently selected cards into the「收集小饼干」dictionary. Saving SHALL NOT navigate away; after success the overlay SHALL play a shrink-to-biscuit animation into the biscuit box, update the box count, then close and restore the underlying page.

#### Scenario: Save and animate closed

- **WHEN** the user confirms save with at least one selected card
- **THEN** selected words are written to「收集小饼干」
- **AND** a shrink-into-biscuit-box animation plays
- **AND** the overlay closes, leaving the user on the same page as before

### Requirement: Biscuit box shows 收集小饼干 word count

The header biscuit area SHALL show a badge or box count equal to the number of words currently stored in「收集小饼干」(not "unpracticed" or other derived metrics).

#### Scenario: Count after save

- **WHEN** a new word is saved into「收集小饼干」
- **THEN** the displayed count increases by the number of newly added words

### Requirement: Duplicate words prompt with source dictionary

Before or at save time, if a candidate word already exists in「收集小饼干」, the current dictionary, or a biscuit-series built-in dictionary, the system SHALL indicate which dictionary contains it. The user SHALL decide whether to still add it to「收集小饼干」(deselection or explicit confirm per product UI).

#### Scenario: Word already in another dict

- **WHEN** a recognized word already exists in a checked dictionary (e.g. a wang biscuit dict)
- **THEN** the card (or save step) shows which dictionary already has the word
- **AND** the user can choose to skip or still add it to「收集小饼干」

### Requirement: Batch add from the collected dictionary view

The system SHALL provide a batch-add / batch-recognize entry when viewing「收集小饼干」, reusing the same recognition and enrichment pipeline as the overlay.

#### Scenario: Batch recognize from dict view

- **WHEN** the user opens batch add on「收集小饼干」and submits text or images
- **THEN** the system produces the same style of reviewable word cards
- **AND** confirmed words are saved into「收集小饼干」
