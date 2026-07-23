## ADDED Requirements

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
