## 1. Application — custom word audio

- [x] 1.1 Extend `Word` type in `src/typings/index.ts` with optional `usAudio` and `ukAudio` fields
- [x] 1.2 Update `generateWordSoundSrc` to accept `Word | string` and prefer custom audio URLs over Youdao
- [x] 1.3 Update `usePronunciationSound` and `usePrefetchPronunciationSound` to pass `Word` objects from typing/listen dictation components
- [x] 1.4 Verify pronunciation icon, listen dictation auto-play, and result screen replay work with custom audio URLs
- [x] 1.5 Add unit tests for audio URL resolution (custom present, custom absent, accent fallback)

## 2. Pipeline — project scaffold

- [x] 2.1 Create `tools/dict-audio-pipeline/` directory with CLI entry (`bin/dict-audio.mjs` or `src/cli.ts`)
- [x] 2.2 Add pipeline dependencies to `package.json` (`js-yaml`, `xlsx`, STT optional) and `yarn dict-audio` script
- [x] 2.3 Implement `dict-audio check-deps` command to verify ffmpeg and STT runtime availability
- [x] 2.4 Add `tools/dict-audio-pipeline/README.md` with install, manifest format, and usage examples
- [x] 2.5 Add `.gitignore` rules for user-generated `public/audio/` content (keep test fixtures)

## 3. Pipeline — manifest and input loading

- [x] 3.1 Define manifest JSON schema / TypeScript types and YAML loader with validation errors
- [x] 3.2 Implement Excel reader: map each sheet to a unit with ordered rows (`name`, `trans`, optional phones)
- [x] 3.3 Implement audio file resolver from `audio.pattern` (e.g. `unit{unit:02d}.mp3`)
- [x] 3.4 Validate sheet count matches audio file count before processing

## 4. Pipeline — segmentation strategies

- [x] 4.1 Implement strategy interface (`segment(unit): Segment[]`) with shared `Segment { index, start, end, text? }`
- [x] 4.2 Implement `stt-align` strategy: Whisper transcription with timestamps + ordered phrase matching
- [x] 4.3 Implement `silence` strategy using ffmpeg/pydub silence detection as fallback
- [x] 4.4 Implement `fixed` strategy (skip intro seconds + fixed interval) as last-resort fallback
- [x] 4.5 Implement `manual` strategy reading per-unit CSV timestamps
- [x] 4.6 Implement fallback chain executor per manifest config

## 5. Pipeline — cutting, output, and validation

- [x] 5.1 Implement MP3 cutter using ffmpeg with configurable padding ms before/after segment
- [x] 5.2 Implement validation: segment count equals row count; duration bounds; re-transcribe similarity check
- [x] 5.3 Implement JSON writer emitting `Word` entries with `ukAudio` or `usAudio` paths per manifest accent
- [x] 5.4 Implement build report JSON and HTML review page per run
- [x] 5.5 Implement `--dry-run` and `--unit <id>` flags for partial/incremental builds
- [x] 5.6 Implement `failOnMismatch` gate: skip writing failed units to final output

## 6. Pipeline — dictionary registration

- [x] 6.1 Implement helper to append unit dictionary entries to `src/resources/dictionary.ts` (or emit snippet for manual merge)
- [x] 6.2 Support `registerDictionary: true` in manifest to auto-register after successful build
- [x] 6.3 Run existing `scripts/update-dict-size.js` or equivalent after registration

## 7. Testing and fixtures

- [x] 7.1 Add short golden fixture audio + Excel (3–5 phrases) under `tools/dict-audio-pipeline/fixtures/`
- [x] 7.2 Add Vitest tests for manifest parsing, phrase normalization, similarity scoring, and strategy segment counts
- [x] 7.3 Add integration test: fixture unit builds MP3 + JSON passing validation in dry-run and full modes

## 8. First dictionary — wang C5 audio pilot

- [x] 8.1 Create `manifests/wang-c5-audio.yaml` template pointing to user's Excel and audio paths
- [ ] 8.2 Run pipeline on unit 01 only; review HTML report and fix alignment thresholds（需你提供 Excel + 音频）
- [ ] 8.3 Run full wang C5 build; register unit dictionaries in Gallery（需你提供素材）
- [ ] 8.4 Manual smoke test: select「雅思 wang C5 音频 Unit N」in listen dictation mode and verify audio matches phrases（需构建完成后）
