## ADDED Requirements

### Requirement: Persist raw custom MP3 in Cache API by audio epoch

The system SHALL store successfully fetched custom word MP3 responses in a Cache API bucket named with the current `AUDIO_ASSET_EPOCH`, keyed by the request URL (including `av` query).

#### Scenario: First preload writes disk cache

- **WHEN** chapter preload fetches a custom audio URL that is not yet in the word-audio Cache API bucket
- **THEN** after a successful network response the response body is stored in the current-epoch bucket
- **AND** the audio is decoded into the in-memory playable cache as today

#### Scenario: Refresh preload prefers disk cache

- **WHEN** the page reloads and chapter preload runs for a URL already stored under the current audio epoch bucket
- **THEN** the player loads bytes from Cache API without requiring a network download of that URL
- **AND** chapter entry remains blocked until decode readiness as before

### Requirement: Invalidate word-audio disk cache when audio epoch changes

When `AUDIO_ASSET_EPOCH` changes, the system SHALL delete Cache API buckets for word audio that do not match the new epoch so stale MP3s are not reused.

#### Scenario: Epoch bump drops old buckets

- **WHEN** the running app detects `AUDIO_ASSET_EPOCH` differs from the last stored epoch
- **THEN** outdated `qwerty-word-audio-*` cache buckets are deleted
- **AND** subsequent preloads fetch and store under the new epoch bucket

### Requirement: Code deploy cache clear preserves current audio epoch bucket

When clearing runtime caches due to an app build/version redirect, the system SHALL preserve the current-epoch word-audio Cache API bucket so unchanged audio does not need a full re-download.

#### Scenario: Build hash update keeps current audio cache

- **WHEN** a build/version mismatch triggers runtime cache clearing
- **THEN** the Cache API bucket for the current `AUDIO_ASSET_EPOCH` word audio is retained
- **AND** other runtime caches may still be deleted
