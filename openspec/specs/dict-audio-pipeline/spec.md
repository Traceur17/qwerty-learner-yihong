# dict-audio-pipeline Specification

## Purpose

Offline manifest-driven pipeline to build dictionary JSON and per-word MP3 clips from Excel and source audio.

## Requirements

### Requirement: Manifest-driven build configuration

The offline pipeline SHALL accept a YAML manifest per dictionary that defines dictionary metadata, Excel source, audio file pattern, segmentation strategy, validation thresholds, and output paths.

#### Scenario: Load valid manifest

- **WHEN** user runs the CLI with a path to a valid manifest YAML
- **THEN** the pipeline loads all configured units without modifying application source code

#### Scenario: Reject invalid manifest

- **WHEN** manifest is missing required fields (dict.id, units.excel, audio.pattern, output paths)
- **THEN** the CLI exits with a non-zero code and prints a descriptive error

### Requirement: Unit mapping from Excel sheets and audio files

The pipeline SHALL map each Excel worksheet to one audio file using manifest patterns. Each row in a sheet SHALL produce one dictionary entry in output JSON for that unit.

#### Scenario: One sheet one audio file

- **WHEN** manifest defines 12 Excel sheets and 12 matching audio files
- **THEN** the pipeline processes 12 units independently
- **AND** each unit output JSON entry count equals its sheet row count

#### Scenario: Sheet-audio count mismatch

- **WHEN** the number of matched sheets does not equal the number of matched audio files
- **THEN** the pipeline fails before cutting audio
- **AND** the error report lists missing or extra units

### Requirement: Segmentation strategy plug-in with fallback chain

The pipeline SHALL support pluggable segmentation strategies: `stt-align` (default), `silence`, `fixed`, and `manual`. When the primary strategy fails for a unit, the pipeline SHALL attempt configured fallback strategies in order.

#### Scenario: STT align success

- **WHEN** strategy is `stt-align` and Whisper produces segments that align to all sheet phrases in order
- **THEN** the pipeline cuts one MP3 clip per phrase using aligned timestamps
- **AND** audio before the first aligned phrase is discarded as intro

#### Scenario: Fallback to silence segmentation

- **WHEN** `stt-align` fails for a unit and fallback includes `silence`
- **THEN** the pipeline attempts silence-based segmentation
- **AND** succeeds only if segment count equals sheet row count

#### Scenario: Manual timestamps override

- **WHEN** a unit provides a manual CSV with start/end times per index
- **THEN** the pipeline uses CSV timestamps regardless of other strategies
- **AND** marks the unit as `manual` in the build report

### Requirement: Pre-write validation gate

The pipeline SHALL validate each unit before writing final JSON and audio to output directories. When `failOnMismatch` is true, a failed unit MUST NOT be written to the final output paths.

#### Scenario: Segment count validation

- **WHEN** cut segment count does not equal Excel row count
- **THEN** the unit fails validation
- **AND** no final dict JSON is emitted for that unit

#### Scenario: Transcript similarity validation

- **WHEN** a cut clip is re-transcribed and similarity to the expected `name` is below `minSimilarity`
- **THEN** the unit fails validation
- **AND** the build report lists each failing index with expected vs actual text

#### Scenario: All validations pass

- **WHEN** segment count and similarity checks pass for a unit
- **THEN** MP3 files are written under the configured audio directory
- **AND** dict JSON is written with `ukAudio` or `usAudio` paths per manifest accent

### Requirement: Build report for human review

The pipeline SHALL emit a machine-readable build report (JSON) and SHOULD emit an HTML report for each build run, listing per-unit status, strategy used, failures, and paths to generated clips.

#### Scenario: Partial unit failure

- **WHEN** some units pass and others fail validation
- **THEN** the report marks each unit as `success` or `failed`
- **AND** successful units remain in output while failed units are excluded from final output

#### Scenario: Dry run mode

- **WHEN** user passes `--dry-run`
- **THEN** the pipeline performs alignment and validation without writing MP3 or dict JSON
- **AND** still produces a build report

### Requirement: Dictionary registration helper

The pipeline SHALL provide a command or flag to append or update entries in `src/resources/dictionary.ts` for generated unit JSON files, using manifest metadata for id, name, description, category, and tags.

#### Scenario: Register audio dictionary units

- **WHEN** build completes with `registerDictionary: true`
- **THEN** each unit JSON is registered as a separate dictionary resource
- **AND** dictionary `length` matches the unit JSON array length

### Requirement: Incremental unit rebuild

The pipeline SHALL support processing a single unit by identifier (e.g. `--unit 03`) without rebuilding all units.

#### Scenario: Rebuild one failed unit

- **WHEN** user runs build with `--unit 03` after fixing audio or manual CSV
- **THEN** only unit 03 is processed and its report section is updated
