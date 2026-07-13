# persist-word-audio-cache Specification

## Purpose

Persist successfully fetched custom word MP3s across page refresh, keyed by audio URL (including `av` epoch), without forcing a full re-download when only app code changes.

## Requirements

### Requirement: Persist raw custom MP3 by audio epoch

The system SHALL store successfully fetched custom word MP3 responses (IndexedDB and/or Cache API), keyed by the request URL including the `av` query derived from per-dictionary audio epoch.

#### Scenario: First preload writes disk cache

- **WHEN** chapter preload fetches a custom audio URL that is not yet in the word-audio disk cache
- **THEN** after a successful network response the response body is stored under the current audio epoch key
- **AND** the audio is decoded into the in-memory playable cache

#### Scenario: Refresh preload prefers disk cache

- **WHEN** the page reloads and chapter preload runs for a URL already stored under the current audio epoch
- **THEN** the player loads bytes from disk cache without requiring a network download of that URL
- **AND** chapter entry remains blocked until decode readiness as before

### Requirement: Invalidate word-audio disk cache when audio epoch changes

When a dictionary audio epoch changes, the system SHALL prune cached entries for that dictionary prefix that do not match the new epoch so stale MP3s are not reused.

#### Scenario: Epoch bump drops outdated entries

- **WHEN** the running app detects a prefix epoch differs from the last stored epoch map
- **THEN** outdated word-audio cache entries for that prefix are deleted
- **AND** subsequent preloads fetch and store under the new epoch

### Requirement: Code deploy cache clear preserves current audio epoch cache

When clearing runtime caches due to an app build/version redirect, the system SHALL preserve the current-epoch word-audio disk cache so unchanged audio does not need a full re-download.

#### Scenario: Build hash update keeps current audio cache

- **WHEN** a build/version mismatch triggers runtime cache clearing
- **THEN** the word-audio cache for the current audio epoch is retained
- **AND** other runtime caches may still be deleted
