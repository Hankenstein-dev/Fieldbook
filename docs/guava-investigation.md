# Guava test and delayed reveal badges — 10 September 2026

**Label correction:** the owner subsequently confirmed that the fruit tree is white sapote and the leaf close-up is a different tree, a loquat, after checking both in PictureThis. The historical guava ranks below describe a superseded expected label, not a valid target for tuning. See [the model comparison](recognition-comparison.md).

The owner supplied “common guava” as the expected identification. This is a user-labelled test case, not an independent botanical verification. The actual phone's photo, query embedding, candidate metadata, result and correction synced automatically after Windows forwarding was repaired.

- Phone: Pixel 10 Pro, Android 16 / WebView 152; build `2026-09-10T09:18:11.507Z`.
- Session: `a090b54a-aa59-4fdf-b7ba-d48fb47a27fe`.
- Operation: `a5ffbfab-1a72-4521-a0ea-7a6aef2a63ca`.
- Photo: `data/diagnostics/photos/78ef6ab1-ecd5-4309-9549-898c76464268.jpg`, 305,176 bytes, 904×1200. Original camera file: 3,200,195 bytes.
- Replay report: `data/diagnostics/investigations/78ef6ab1-ecd5-4309-9549-898c76464268.json`. Original journal and photo remain untouched.

## Recognition finding

The app compared **25,383 candidates**, all using available packed references; zero missing vectors. The country reference manifest hash matches the logged revision. Replaying the exact phone query embedding against those float32 vectors reproduces its top scores to floating-point precision:

| Species | Rank | Similarity |
| --- | ---: | ---: |
| California buckeye — *Aesculus californica* | 1 | 0.740768365531737 |
| *Calodendrum capense* | 2 | 0.717344811973510 |
| *Rhododendron occidentale* | 3 | 0.710244719640151 |
| Common guava — *Psidium guajava* | **1,025** | **0.636817666293334** |

These are embedding similarities, not probabilities. Guava was included and compared. Its absence from the ten alternatives follows its poor rank; this is not a recurrence of the old local-list exclusion. Increasing the alternative count slightly would not resolve this case.

The input contains foliage, fruit and substantial background vegetation. Current preprocessing makes a central square crop and reduces it to the model input size. Whether subject framing, representation quality or another factor dominates this error remains untested. No species-specific score changes, model replacement or recognition fix is claimed.

## Timing and reveal finding

- Start: 09:24:29.390 UTC.
- Result/reveal begins: 09:24:49.596 — **20.2 seconds** after start.
- Model inference: **10.19 seconds**; reference comparison: **8.62 seconds**; remaining time includes candidate preparation.
- Sighting saved: 09:24:56.020 — **6.424 seconds after the result**.
- Correction recorded: 09:25:03.710. The mistaken sighting was retracted.

`Identify.discover()` reveals the species immediately, but does not set its saved/achievement state until the `App.record()` promise returns. That promise waits for a fresh GPS fix, local occurrence lookup, SQLite/photo save, reloading all sightings and updating the visited-cell record. Consequently the achievement badges arrive after those operations, in addition to their short stagger animation. Existing stage logs do not distinguish how much of the 6.4 seconds belonged to GPS, occurrence lookup or file/database work, nor precisely how much additional time the subsequent collection reload took.

The next reveal iteration should prepare location/occurrence and personal achievement context alongside recognition, then coordinate the reward sequence while keeping successful persistence accurately represented. The owner accepts the current reveal as a better baseline; a broader visual redesign is not part of this investigation. No app changes or new APK were made for this feedback turn.

## Local-only replay and follow-up

Replaying the same photo against its logged 2,592 nearby candidate IDs places guava **174th**. It is present locally; California buckeye is not. The local winner would be pampas grass, followed by giant reed and Agapanthus praecox. Thus broader eligibility changes the winner, but restoring the local-only list would still misidentify this photograph. A uniform bonus for locally recorded species would not change guava's order relative to the other local candidates. No older successful guava result was found in the archived identification results, so the different-photo comparison remains open.

The current recogniser ranks pure visual similarity. The earlier local restriction was a candidate filter, not a calibrated geographic weighting system. The owner's concern about additional false matches from wider competition is reasonable; its effect on overall accuracy has not been measured. A soft geographic prior should be evaluated against retained labelled examples, including the out-of-local-list Pittosporum success. No taxon-specific bonus or new ranking weight has been shipped in this follow-up.

The approved timing change now starts fresh GPS and local record preparation alongside recognition. Recognition and preparation share an operation ID. Achievement computation happens before the reveal callback; the species and badges are set together while actual persistence status remains separate. Alternative corrections reuse the encounter location; GPS failure is recoverable on save retry. Unavailable local records permit saving without granting an unsupported local-first award.

New events separate `encounter.location`, `encounter.records`, `sighting.prepared`, the photo/database persistence duration in `sighting.saved`, and background `sighting.visit`. Saving appends the already available record to UI state instead of reloading every private photo; visit bookkeeping is no longer on the reveal/save completion path. These changes do not establish how much of the historical 6.4-second interval belonged to each stage. Phone timing needs a fresh test on this build.

## Clearer follow-up photographs

Two more photos synced from the same actual phone session and were visually inspected. Exact query-vector replay gives:

| Photo | Winning national match | Guava national rank | Guava rank among local records |
| --- | --- | ---: | ---: |
| Fruit held in hand (`4d90ec0f…`) | Diospyros nigra | 65 | 13 |
| Leaf close-up (`b356484c…`) | Viburnum rhytidophyllum | 5 | **1** |

The leaf image is a concrete example where the former local shortlist would have returned the owner's expected guava identification. This strengthens the case for evaluating soft locality weighting; it is not just a hypothetical concern. The fruit image still fails within the local shortlist, so locality alone does not explain every error.

The fruit image was also retried with regional scope: guava ranked 64th overall and 22nd among that broader area's records. That is the same photograph/query, not an independent photo test. The regional list includes Diospyros nigra; “recorded in area” changing between those two attempts is explained by the changed scope, not the app learning from its mistaken save.

Exact replay reports, retaining owner-labelled expected identity separately from model output, are saved under ignored `data/diagnostics/investigations/` with the operation IDs `5cc2b7ad-3d84-4948-8a23-4acd504c3dd6`, `74daf73b-95a5-4eec-abed-487b494a421e`, and `ab13396f-a3c6-4744-938b-8d4e3a38f226`.

Timing follow-up verification: 88 unit checks, 12 browser scenarios and native SQLite recognition/save/correction pass. On the emulator, GPS plus occurrence context finished 2.43 seconds into recognition; the result arrived at 10.44 seconds, rewards were prepared in a further 2.8 ms and photo/database persistence took 449 ms. This confirms the waits overlap and awards are prepared before persistence. Historical real-phone stage attribution remains unknown until a new phone test supplies these finer diagnostics.

## Resolved expected labels

The owner corrected the labels after separately checking the fruit and leaf photos in PictureThis: fruit tree = Casimiroa edulis (white sapote); leaf tree = Eriobotrya japonica / Rhaphiolepis bibas (loquat). They are two different trees. The previous statement that a local preference would have “correctly” promoted guava is withdrawn: it would have promoted another wrong answer. The saved numeric ranks remain accurate for guava, but guava is not the correct test target.

Pl@ntNet and Plant.id both place the corrected species first on all four individual field photographs, including Pittosporum undulatum. The original overview ranks white sapote 45th in BioCLIP's exact phone replay; the fruit close-up already has it fifth. The combined-photo trial is invalid for model accuracy assessment because it mixed plants; retained results are excluded, and that test was removed from the runnable case list. No phone sightings have been relabelled automatically.
