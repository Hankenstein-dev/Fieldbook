# First Android test: partial evidence, 9 September 2026

Tony reported a first identification taking roughly one or two minutes, faster subsequent attempts, and incorrect matches on the final plant. Rejected photos were not retained by the original implementation, so those images cannot be recovered from its diagnostics.

The attached pasted export ends mid-event at roughly 50,000 characters, with a marker saying another 231 KB was omitted. It is not a complete JSON export. We recovered its first **137 complete events** into the ignored development archive `data/diagnostics/imports/android-2026-09-09-partial.json`. No later results or total first-attempt duration can be established from that prefix.

## What the available events establish

The phone reports mobile Chrome 152, a secure context, WebGPU availability and eight logical processors. The reduced user-agent string does not establish the actual Android version or phone model.

| First photo, starting 14:50:14 UTC | Observed |
| --- | --- |
| Source JPEG | 4,563,690 bytes |
| Processed JPEG | 397,533 bytes |
| Candidate lookup | 2,587 species in 18.2 ms |
| Image model setup | 3,497.1 ms |
| Image embedding, including setup/preprocessing | 8,337.9 ms |
| Provider configuration | WebGPU / WASM |
| Subsequent text embeddings completed before truncation | 24, totalling 10,192.6 ms |

The 3.5-second image setup is **inside** the 8.3-second embedding measurement; do not add them. The text model then loads and repeated text embeddings follow the photograph. In the current engine, this sequence is consistent with generating missing taxonomic references for the local candidate list. Those references are cached, providing a plausible reason later attempts could be quicker. The partial record cannot quantify the full contribution or establish whether later slow attempts have the same cause. The reported provider describes the configured execution-provider chain, not proof that every model operator ran on the GPU.

No final match result is present in the recoverable prefix. We cannot assess the reported misidentifications without their results and photos, and we have not changed recognition thresholds or claimed an accuracy improvement.

## Development changes following this test

- Keep processed identification photos separately from sightings, including abandoned/rejected attempts. Local buffer: latest 100 photos, at most 100 MB.
- Automatically send photos and diagnostic events to the local computer when reachable, retaining failed deliveries for retry. A setting can pause transmission. This is explicitly authorised personal development behaviour, not production cloud telemetry.
- Retain JPEGs plus metadata under `data/diagnostics/photos/`, and complete received session logs under `data/diagnostics/sessions/`; neither archive is automatically pruned. Link photos and results in the desktop viewer.
- Log missing-reference counts and aggregate preparation time, reducing per-reference event noise that could otherwise evict useful evidence from the phone's bounded journal.
- Offer recent-photo downloads on the phone. This does not imply insertion into the Android gallery or create a collection sighting.

Validation: **58 automated tests**, production build, and **two focused Chromium browser scenarios pass**. The browser scenarios cover automatic sending by default, offline photo retention across dismissal and reload, JPEG download, upload retry after a simulated HTTP 503, desktop photo display, and real offline recognition/sighting export. The next Android test should check this new automatic delivery on actual hardware. See [Android testing instructions](android-testing.md).

## First actual automatic delivery, 15:49 UTC

Resolved the receiver's HTTP/2 origin check: Android sent `:authority`, while our check only read `Host`. Status probes succeeded but upload POSTs returned 403, so the old client only displayed “Waiting to reconnect”. Supporting HTTP/2 authority restored delivery without resetting or reinstalling the phone app. The receiver now journals transport status independently of uploaded client logs.

The queued session `188b6025-03e5-45e7-b6c6-18920f069cf1` and JPEG `920bdf6d-5caf-49b8-ab30-f5648ea8f53f` arrived automatically in the ignored archive. The processed photo is 445,058 bytes. Its identification records establish:

| Pampas-grass attempt, starting 15:31:15 UTC | Observed |
| --- | --- |
| Candidate lookup | 2,587 species in 19.68 seconds |
| Image inference | 8.68 seconds |
| Missing taxonomic references | 317 |
| Reference preparation | 348.40 seconds (5 min 48 sec) |
| Total identification | 376.85 seconds (6 min 17 sec) |
| First match | Cortaderia selloana, similarity 0.7262 |
| Second match | Cymbopogon citratus, similarity 0.7108 |
| Save | Successful, taxon 64240, sighting ID `5b20245b-3590-455b-a19e-1c69e5784ffe` |

The result is a model ranking and a user-confirmed save, not botanical ground truth. Missing-reference generation accounts for most of this attempt's duration. Investigate which candidates need those references before changing the model or ranking. A preceding preparation/download sequence lasted 55.31 seconds; its older event format does not identify cache versus network source reliably.

Later synced starts show the installed app at `https://192.168.0.97:5174`, retaining storage ID `017de765-9dce-42d4-a46b-8c5506648acc` across two starts, about 714–719 MB usage, and `persistent: false`. This does not prove eviction or explain the three earlier missing sightings. Tony confirms the original browser address was the same; its tab is no longer open. No app code clearing sightings during updates was found. Added stored-sighting counts and storage identity allow a browser/installed comparison; recovery remains unresolved.

Follow-up validation: **59 unit tests and the production build pass**. **Two focused browser tests pass**, covering offline photo retention/upload retries and two real service-worker updates with another tab open. The update checks retain local storage, a recognition-cache probe and an unsent IndexedDB photo across both the Settings button and the standalone recovery page. Automatic delivery is additionally verified by the actual Android session and photo above.
