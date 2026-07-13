## MODIFIED Requirements

### Requirement: Chapter preload means playable readiness

For dictionaries with custom word audio, chapter preload SHALL treat a URL as loaded only after it is ready to play from the shared player memory cache. Byte source MAY be Cache API (same audio epoch) or network; readiness semantics remain decode-complete, and chapter entry remains blocked until ready or failed.

#### Scenario: Progress completes only for ready URLs

- **WHEN** chapter audio preload runs for a set of custom MP3 URLs
- **THEN** each URL counted in the completed progress total has been admitted to the playable memory cache
- **AND** a URL that fails to become ready is not counted as successfully loaded

#### Scenario: Disk cache hit still blocks until decoded

- **WHEN** all chapter custom URLs are already present in the current-epoch Cache API bucket
- **THEN** preload may skip network downloads
- **AND** the typing page still waits until those URLs are decoded into the shared playable cache before ending the blocking state
