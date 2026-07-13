## MODIFIED Requirements

### Requirement: Prefetch compatibility for custom audio

When custom audio URLs are present, chapter-level preload and per-word prefetch SHALL target those custom URLs. Chapter preload success for a URL SHALL mean the URL is playable from the shared player cache, not only that bytes were fetched.

#### Scenario: Prefetch custom URL

- **WHEN** the current word has `ukAudio` and pronunciation is enabled
- **THEN** a prefetch hint is added for the `ukAudio` URL
- **AND** no prefetch is added for the Youdao URL of that word

#### Scenario: Chapter preload ready semantics

- **WHEN** chapter preload finishes successfully for a word's custom audio URL
- **THEN** a subsequent pronunciation click for that word can play without waiting on a cold network fetch of that URL
