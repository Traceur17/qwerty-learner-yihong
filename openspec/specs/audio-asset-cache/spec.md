## ADDED Requirements

### Requirement: Audio asset epoch query parameter

The system SHALL append an audio-only cache-busting query parameter `av` derived from a developer-controlled epoch constant to same-origin custom dictionary audio URLs. Non-audio same-origin assets SHALL continue to use the build-id `v` parameter and SHALL NOT receive `av`.

#### Scenario: Custom audio URL includes epoch

- **WHEN** the app resolves a same-origin path under `/audio/` for playback or preload
- **THEN** the request URL includes `av=<AUDIO_ASSET_EPOCH>`
- **AND** the URL does not use the git build hash as the audio cache key

#### Scenario: Dictionary JSON keeps build bust

- **WHEN** the app fetches a same-origin dictionary JSON under `/dicts/`
- **THEN** the URL includes `v=<buildId>`
- **AND** the URL does not include `av=`

### Requirement: Epoch bump forces fresh audio without wiping practice data

When `AUDIO_ASSET_EPOCH` changes between visits, the system SHALL invalidate browser Cache Storage entries used for runtime caching, and SHALL NOT delete IndexedDB practice records or error-book data.

#### Scenario: Epoch changes on launch

- **WHEN** a user opens the deployed app and the stored epoch differs from `AUDIO_ASSET_EPOCH`
- **THEN** the app clears Cache Storage keys it can access
- **AND** updates the stored epoch
- **AND** leaves IndexedDB learning data intact

### Requirement: Operator-controlled refresh

Operators SHALL refresh user audio caches by incrementing `AUDIO_ASSET_EPOCH` and redeploying. Routine feature deploys without an epoch change SHALL keep the same `av` value so browsers can reuse cached MP3s.
