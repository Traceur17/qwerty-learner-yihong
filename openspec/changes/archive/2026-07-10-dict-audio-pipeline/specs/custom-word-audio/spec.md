# custom-word-audio Specification

## ADDED Requirements

### Requirement: Word type supports optional custom audio URLs

The `Word` type SHALL include optional `usAudio` and `ukAudio` string fields containing resolvable URLs or site-relative paths to MP3 files.

#### Scenario: Word with custom UK audio

- **WHEN** a word entry includes `ukAudio: "/audio/example/001.mp3"`
- **THEN** the application treats the field as a valid pronunciation source for UK accent

#### Scenario: Word without custom audio

- **WHEN** a word entry omits both `usAudio` and `ukAudio`
- **THEN** pronunciation behavior remains unchanged from current Youdao TTS behavior

### Requirement: Custom audio takes precedence over Youdao TTS

When resolving pronunciation audio for a word, the system SHALL prefer custom audio matching the active pronunciation type (`us` or `uk`) over Youdao `dictvoice` URLs.

#### Scenario: Play UK custom audio

- **WHEN** pronunciation type is `uk` and the word has `ukAudio` set
- **THEN** the player loads and plays `ukAudio`
- **AND** does not request Youdao dictvoice for that word

#### Scenario: Fallback to Youdao when custom missing

- **WHEN** pronunciation type is `us` and the word has only `ukAudio` set (no `usAudio`)
- **THEN** the system falls back to Youdao US TTS using the word name

### Requirement: Custom audio works in typing and listen dictation modes

Custom word audio SHALL work in normal typing mode, word dictation mode, and listen dictation mode without separate configuration.

#### Scenario: Auto-play in listen dictation with custom audio

- **WHEN** listen dictation mode plays a word that has `ukAudio`
- **THEN** the custom MP3 plays automatically on word start
- **AND** manual replay (Ctrl+J) replays the same custom MP3

#### Scenario: Pronunciation icon replay

- **WHEN** user clicks the pronunciation icon on a word with `usAudio`
- **THEN** the custom US MP3 plays

### Requirement: Prefetch compatibility for custom audio

When custom audio URLs are present, the prefetch mechanism SHALL preload those URLs instead of Youdao URLs for the current word.

#### Scenario: Prefetch custom URL

- **WHEN** the current word has `ukAudio` and pronunciation is enabled
- **THEN** a prefetch hint is added for the `ukAudio` URL
- **AND** no prefetch is added for the Youdao URL of that word

### Requirement: Backward compatibility for string-only pronunciation API

Pronunciation hooks that receive a plain string word name SHALL continue to use Youdao TTS only, preserving behavior for callers not yet migrated to `Word` objects.

#### Scenario: Legacy string caller

- **WHEN** `usePronunciationSound` is called with a string word name
- **THEN** audio source is resolved via Youdao dictvoice as today
- **AND** no regression occurs for existing word lists without audio fields
