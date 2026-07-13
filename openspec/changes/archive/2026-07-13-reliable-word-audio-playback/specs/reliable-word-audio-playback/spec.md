## ADDED Requirements

### Requirement: Chapter preload means playable readiness

For dictionaries with custom word audio, chapter preload SHALL treat a URL as loaded only after it is ready to play from the shared player cache (decoded buffer or equivalent media readiness), not merely after an HTTP fetch completes.

#### Scenario: Progress completes only for ready URLs

- **WHEN** chapter audio preload runs for a set of custom MP3 URLs
- **THEN** each URL counted in the completed progress total has been admitted to the playable cache
- **AND** a URL that fails to become ready is not counted as successfully loaded

#### Scenario: Blocking ends only when chapter customs are ready or explicitly failed

- **WHEN** the typing page blocks on chapter audio preload
- **THEN** blocking ends only after every chapter custom URL is either ready or reported as failed
- **AND** the UI does not claim 100% success if any URL failed

### Requirement: Shared pronunciation player for custom audio

Custom word audio playback in the typing page (main panel and word list) SHALL use a single shared player instance rather than creating one Howler/HTMLAudio instance per visible word card.

#### Scenario: Sidebar click uses shared player

- **WHEN** the user clicks a word in the chapter word list that has custom `ukAudio`/`usAudio`
- **THEN** playback goes through the shared pronunciation player
- **AND** no per-card persistent Howl is required for that click

#### Scenario: Main panel and sidebar share unlock state

- **WHEN** the user has unlocked audio via any typing-page user gesture (including pronunciation hotkey or auto-play after start)
- **THEN** subsequent sidebar custom-audio clicks do not depend on a separate unlock path
- **AND** sidebar playback works without requiring a prior successful main-panel play

### Requirement: Click-to-play reliability for ready custom audio

Once a custom audio URL is marked ready by chapter preload, a user click to play that word SHALL attempt playback immediately, retry once on play error, and surface a visible failure if still unsuccessful.

#### Scenario: Ready URL plays on first click

- **WHEN** chapter preload has marked a word's custom audio as ready
- **AND** the user clicks that word's pronunciation control
- **THEN** the audio begins playing without requiring an extra wait for network fetch

#### Scenario: Play error retries once

- **WHEN** the shared player raises a play error for a ready custom URL
- **THEN** the system retries playback once automatically
- **AND** if the retry fails, the user receives visible feedback (not a silent no-op)

### Requirement: No double-stop race on pronunciation click

The pronunciation click path SHALL not stop the shared player twice in succession immediately before play in a way that cancels the queued play.

#### Scenario: Icon click issues a single play request

- **WHEN** the user clicks the pronunciation icon
- **THEN** the stack issues at most one intentional stop-for-interrupt followed by one play
- **AND** playback is not cancelled solely by a redundant second stop
