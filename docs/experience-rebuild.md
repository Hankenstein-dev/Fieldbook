# Walking and discovery experience — 10 September 2026

**Latest walking prototype:** [Walking diorama](walking-diorama.md) supersedes the flat map/panel presentation below. [Online recognition](online-recognition.md) is now the Android default and has been successfully tried by Tony.

Tony explicitly reframed Fieldbook as a nature exploration game. This supersedes the earlier “not a game” framing, confirmation-first identification, and explanatory page furniture. The aim is anticipation, discovery and a lasting personal collection, while attention during a walk belongs outside the phone.

## Accepted experience

- Camera action opens the camera directly. Choosing an existing image, description, name search and recognition setup are secondary menu actions.
- Capturing a photo starts recognition automatically: Pl@ntNet online on Android, or the downloaded BioCLIP pack offline. The captured photo remains visible with a scanning treatment during actual processing; no artificial delay, fabricated model reasoning, or generated reveal story.
- The photograph transitions to the species image. The common name leads. Recognition's main path assumes a useful match, rather than presenting a comparison task to every user. The sighting is saved automatically with a fresh physical GPS fix. Errors remain visible and retryable.
- Recognition accuracy remains an engineering target, not a proven universal property. “Not this species?” retracts that attempt, restores alternatives, and preserves the captured image for retaking/name lookup. A correction does not remain collected. The underlying photo and diagnostic history remain available for debugging.
- New lifetime species, personal count milestones, first discoveries in an area, and completed themed collections receive different rewards. Ordinary repeats are quieter. Rewards remain on the sighting and can be revisited from the map or species card. The richer information card is the learning destination; no new LLM-generated copy is required.
- “First discovery here” is a game achievement. Existing iNaturalist area records seed the world; it is not a claim of scientific novelty. Current rule: the supported species is absent from a complete local record list, and the player has no earlier active sighting of it in the same stable cell. Failed/incomplete data does not award a first by accident. Cross-player discoveries are a later shared-data layer.
- Explore uses a closer following map. Three stable, photographic look-out suggestions replace the default long list. Wanted, uncollected species have priority; collecting something makes room for another suggestion. Full nearby records remain available on demand.
- Species can be saved to a persistent look-out list. Today’s encounters form a small photographic history under the suggestions. Two initial configurable themed collections, Oaks and Pines, demonstrate progress beyond geography.
- Species images, character and map skin remain replaceable through appearance config. No unseen species is placed at an invented map point. Actual sightings from other players can become useful leads later.
- Remove marketing copy, eyebrows, redundant subtitles and paragraphs explaining obvious controls. Keep concise action names, useful status/errors, species information, and accessible source/credit details. Authored plant stories remain untouched.

## Done when

Open Explore and see a close map, three relevant suggestions and today’s finds; pin a species and retain that choice after restart; use the camera action without an intervening menu; capture a photo and get automatic recognition, a reveal and a saved sighting; correct that result without leaving it collected; inspect its species card and achievement history; browse themed progress. Repeated page explanations and eyebrow headings are absent.

## Implementation details

- `config/discovery.ts` owns initial themed membership, walking zoom and existing story-tag display labels. No new botanical claims or prose were generated. Threat levels and rarity tiers are not guessed from unvalidated data; further badge coverage requires suitable source metadata.
- `src/collection/discovery.ts` handles deterministic achievements, stable suggestions and local-calendar-day sightings.
- Preferences store wanted taxon IDs in the existing native SQLite/web store. Existing interests are preserved. Sightings store their earned achievement IDs and labels.
- Corrections use `retractedAt` on the original sighting. Normal collection/map reads exclude it; full notebook export retains the tombstone. Native retraction preserves the existing private photo file. Restoring an older backup cannot reactivate an existing retraction.
- Computer backups retain original JSON/photo and append a `.retracted` sidecar. Reads merge the correction; the sync index acknowledges corrections independently, so an already-uploaded sighting can subsequently be corrected. The same local diagnostics preference controls sending. Raw identification logs are never rewritten.
- Native UI spacing remains outside the WebView, including keyboard space. The camera file input remains inside the user’s click handler, preserving Android’s direct capture action. Browser file pickers remain available for desktop tests.

Actual walk feel, recognition reliability on new subjects, haptics/sound, richer sourced visual identification cues, final character art, further themes and social sharing remain follow-up work. No artificial dwell time or new cloud/API inference cost was introduced.

## Validation

- 85 unit checks pass, covering award rules, suggestion stability, correction persistence/export, and append-only computer corrections alongside the existing suite.
- 13 walking/collection/photo browser scenarios pass, including real offline model inference, automatic capture-to-save, correction and name fallback, photo inspection, wanted preference persistence and themed browsing. The new theme check exposed an exact-name duplicate taxon ID; canonical theme membership now matches the existing fieldbook identity rule.
- Android emulator: ordinary release APK recognised the retained Pittosporum photograph, revealed it, saved its photo and rewards to SQLite, and retracted it through the correction action without copying or deleting the original photo. Native system-bar spacing survives scrolling and keyboard use.
- Final APK upgrade retained all six emulator records (five active, one corrected), five photo files and 64 recognition files with identical hashes. No acceptance hooks are enabled. Served APK matches SHA-256 `4f288d1060c75e4fa9197d3bb29b90cadc830bf78b500c7fde1d4c411e7e18c1`.
- Mobile walking and native reveal screenshots were visually inspected. Final artwork and actual outdoor feel remain Tony’s next review. The unrelated historical multi-tab web service-worker update flake was not part of this acceptance run.
- Two additional browser checks pass for offline photo/log relay and full computer-backup recovery: 15 relevant browser scenarios verified in total.

## Reveal timing follow-up

The guava field test exposed a 6.4-second result-to-save delay that included GPS and local records, with awards delayed further by collection reload and visit bookkeeping. Identification now starts an encounter's fresh GPS and records preparation in parallel with recognition. Rewards are calculated before the species/rewards reveal callback, and save success is only shown after persistence succeeds. Offline missing records still allow saving; GPS failures remain retryable. Correcting the species reuses that encounter's physical fix. A new photo starts new preparation.

Saving updates the collection from the record already in memory and performs visit bookkeeping in the background. Stage diagnostics distinguish location, records, remaining preparation wait, photo/database persistence and visit bookkeeping. The photographic recognition scores are unchanged. See [guava investigation](guava-investigation.md) for exact replay evidence and the open question of a calibrated local ranking preference.

Follow-up validation: 88 unit checks and all 12 Fieldbook browser scenarios pass, including real offline recognition, automatic saving, correction, and verification that encounter preparation precedes the recognition result. The normal APK upgrade retained six existing emulator records, five photos and all 64 recognition files unchanged. The native recognition/save/correction scenario also passes. Its new stage timings were 983 ms for fresh GPS and 1,451 ms for records, both completed during the 10.44-second recognition run; rewards were prepared 2.8 ms after the result and persistence took 449 ms. These are emulator measurements, not a claim about Tony's phone. Served APK SHA-256: `3e687cbc9900c10301f428e164048f823ce6387401dc5f550888adf7f6569fa3`.
