## MODIFIED Requirements

### Requirement: Custom audio URL takes priority over TTS

When a word provides `usAudio` or `ukAudio`, the application SHALL use that source for pronunciation instead of Youdao TTS. The field value MAY be either a URL string pointing to an audio file, or a segment reference object `{ unit: string, start: number, end: number }` for merged chapter audio.

#### Scenario: Custom UK audio URL

- **WHEN** a word has `ukAudio` set to a URL string and UK pronunciation is selected
- **THEN** playback uses the custom URL

#### Scenario: Custom UK audio segment

- **WHEN** a word has `ukAudio` set to `{ unit, start, end }` and UK pronunciation is selected
- **THEN** playback uses merged unit audio seek playback for that time range

#### Scenario: No custom audio

- **WHEN** a word has no custom audio for the selected accent
- **THEN** playback falls back to Youdao TTS as before
