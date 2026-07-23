# biscuit-word-collection Specification

## Purpose

练习页收集浮层：点饼干 Logo 打开「收集小饼干」，贴图/输入识别后确认入罐；标题仍回首页。

## Requirements

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

Pressing Enter in the collection overlay SHALL run recognition and enrichment, then show one card per candidate word with English, phonetic(s), definition(s), and a pronunciation preview control. Cards SHALL be editable (at least the word name and definition). All cards SHALL be selected by default; the user SHALL be able to deselect individual cards before save.

#### Scenario: Multi-word result with deselection

- **WHEN** recognition returns multiple words
- **THEN** each word appears as a selected card
- **AND** the user can deselect some cards so they are not saved

#### Scenario: Edit definition before save

- **WHEN** a card shows an auto-filled definition
- **THEN** the user can edit the definition text on the card
- **AND** saving persists the edited definition

#### Scenario: Edit word name before save

- **WHEN** a card shows a recognized English word
- **THEN** the user can edit the word name on the card
- **AND** saving persists the edited name

#### Scenario: Re-recognize

- **WHEN** the user chooses re-recognize
- **THEN** the system runs recognition again on the current input
- **AND** replaces the previous card list with the new result

### Requirement: Default save confirms selected cards into 小饼干罐

The primary action SHALL save all currently selected cards into the「小饼干罐」dictionary. Saving SHALL NOT navigate away; after success the overlay SHALL play a jar animation, update the jar count, then close and restore the underlying page. The overlay title SHALL be「收集小饼干」.

#### Scenario: Save and animate closed

- **WHEN** the user confirms save with at least one selected card
- **THEN** selected words are written to「小饼干罐」
- **AND** a biscuits-into-jar animation plays
- **AND** the overlay closes, leaving the user on the same page as before

### Requirement: Jar animation shows 小饼干罐 word count

After save, the center jar animation SHALL show a badge equal to the number of words currently stored in「小饼干罐」.

#### Scenario: Count after save

- **WHEN** a new word is saved into「小饼干罐」
- **THEN** the displayed count equals the total stored words in that dictionary

### Requirement: Duplicate words prompt with source dictionary

Before or at save time, if a candidate word already exists in「小饼干罐」, the current dictionary, or a biscuit-series built-in dictionary, the system SHALL indicate which dictionary contains it and, when resolvable, which chapter. The user SHALL decide whether to still add it to「小饼干罐」(deselection or explicit confirm per product UI).

#### Scenario: Word already in another dict

- **WHEN** a recognized word already exists in a checked dictionary (e.g. a wang biscuit dict)
- **THEN** the card shows which dictionary and chapter already have the word (e.g. `词本名·第N章` or `小饼干罐·听力`)
- **AND** the user can choose to skip or still add it to「小饼干罐」

### Requirement: Batch add from the collected dictionary view

The system SHALL provide a batch-add / batch-recognize entry when viewing「小饼干罐」, reusing the same recognition and enrichment pipeline as the overlay.

#### Scenario: Batch recognize from dict view

- **WHEN** the user opens batch add on「小饼干罐」and submits text or images
- **THEN** the system produces the same style of reviewable word cards
- **AND** confirmed words are saved into「小饼干罐」

### Requirement: Word cards offer listening/reading binary choice on the right

Each reviewable word card in the collection / batch overlay SHALL show a mutually exclusive **听力 | 阅读** control on the **right** side of the card (left: checkbox and word content; right: binary split). Exactly one of listening or reading SHALL be selected at a time. New recognition results SHALL default to listening.

#### Scenario: Default section is listening

- **WHEN** recognition produces a new word card
- **THEN** the card's section control shows 听力 as selected

#### Scenario: Toggle to reading on the card

- **WHEN** the user activates 阅读 on a card's right-side control
- **THEN** that card is marked reading
- **AND** 听力 on that card is no longer selected

#### Scenario: Control placement is on the right

- **WHEN** the user views a word card with recognition results
- **THEN** the 听力 | 阅读 binary control appears on the right side of the card for quick scanning

### Requirement: Bulk set all cards to listening or reading

When one or more word cards are visible, the overlay SHALL provide one-click actions to set **all** current cards to listening or **all** to reading.

#### Scenario: Set all to reading

- **WHEN** the user chooses 全部阅读 with multiple cards shown
- **THEN** every card's section becomes reading

#### Scenario: Set all to listening

- **WHEN** the user chooses 全部听力 with multiple cards shown
- **THEN** every card's section becomes listening

### Requirement: Save persists each card's section

Saving selected cards SHALL persist each card's chosen section (`listening` or `reading`) into「小饼干罐」storage together with the word fields.

#### Scenario: Mixed sections in one save

- **WHEN** the user saves some cards marked listening and some marked reading
- **THEN** each saved word stores its corresponding section
- **AND** those words later appear under the matching practice chapter
