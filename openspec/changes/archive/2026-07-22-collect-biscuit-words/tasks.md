## 1. Data model and dictionary injection

- [x] 1.1 Add Dexie table for collected words (`collect-biscuit`) with CRUD helpers and word-count query
- [x] 1.2 Register virtual dictionary resource `collect-biscuit` /「收集小饼干」and merge into gallery/`idDictionaryMap`
- [x] 1.3 Extend `wordListFetcher` / `useWordList` to load `collect-biscuit` from Dexie and update `length`/`chapterCount` from live count

## 2. Gemini BYOK and enrichment pipeline

- [x] 2.1 Add settings storage for Gemini API key (save / clear) via `atomWithStorage` or equivalent
- [x] 2.2 Implement connectivity test against Gemini and surface success/failure in settings UI
- [x] 2.3 Implement `extractWordsFromTextOrImage` (Gemini structured JSON) with missing-key error UX
- [x] 2.4 Implement enrichment: Free Dictionary phonetics when available; Gemini fills Chinese defs and phonetic misses; map to `Word` fields
- [x] 2.5 Wire pronunciation preview on cards through existing `generateWordSoundSrc` / playback hooks

## 3. Collection overlay and header

- [x] 3.1 Split Header: biscuit icon opens overlay; title `NavLink` remains home
- [x] 3.2 Build collection overlay: text input, paste/select image, Enter to recognize, loading/error states
- [x] 3.3 Render review cards: checkbox (default on), editable definition, phonetics, pronounce button, re-recognize action
- [x] 3.4 Implement duplicate detection (collect Dexie + current dict + wang biscuit series) with per-card source hint
- [x] 3.5 Save selected cards to Dexie; play shrink-to-biscuit-box animation; update badge count; close overlay

## 4. Batch entry and gallery polish

- [x] 4.1 Add batch-add / batch-recognize entry on「收集小饼干」dict detail, reusing extract+enrich+card review
- [x] 4.2 Ensure gallery card shows live length and can start practice on collected words

## 5. Verification

- [x] 5.1 Manual: no key → recognize prompts settings; save key → test OK; clear key removes access
- [x] 5.2 Manual: paste IELTS-like English word-list image → cards → deselect some → save → count badge updates → practice works
- [x] 5.3 Manual: duplicate in biscuit dict shows source; user can skip or still add; title click still goes home
