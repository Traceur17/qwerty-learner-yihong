## ADDED Requirements

### Requirement: Merged unit audio file

For dictionaries built with merged audio output, each unit SHALL have a single MP3 file at `public/audio/{dict-audio-id}/{unit}.mp3` (e.g. `unit5-01.mp3`) containing all word clips for that unit in dictionary order.

#### Scenario: Unit merge output exists

- **WHEN** unit `5-01` is built or merged with merged audio enabled
- **THEN** file `{unit}.mp3` exists for that unit
- **AND** per-word clip files are no longer required for playback

### Requirement: Unit audio index

Each merged unit SHALL have a companion index JSON documenting segment time ranges keyed by clip id (e.g. `001_word-slug`).

#### Scenario: Index documents segments

- **WHEN** merged audio is produced for a unit
- **THEN** `{unit}.index.json` lists each segment with `start` and `end` in seconds relative to the merged file

### Requirement: Word audio segment reference

Words in merged-audio dictionaries MAY store custom pronunciation as `{ unit: string, start: number, end: number }` instead of a per-word MP3 URL.

#### Scenario: Dict entry uses segment ref

- **WHEN** a word entry has `ukAudio: { unit: "unit5-01", start: 1.2, end: 3.4 }`
- **THEN** playback uses the merged unit file at the given time range

### Requirement: Segment playback with unit cache

The application SHALL play word audio segments by loading the unit MP3 once and seeking to `start`, stopping at `end`. It MUST cache a limited number of recently used unit files (LRU, default 3) for cross-chapter playback.

#### Scenario: Same unit consecutive words

- **WHEN** user plays two words from the same unit in sequence
- **THEN** the unit MP3 is not re-downloaded for the second word

#### Scenario: Cross-unit playback

- **WHEN** user plays words from different units
- **THEN** each unit file is loaded on demand
- **AND** LRU eviction may unload least recently used unit sounds
