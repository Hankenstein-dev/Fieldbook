# Recognition preparation — 9 September 2026

Recognition references are built on the computer and installed during explicit offline setup. Identifying a photo must never generate missing taxonomy references on the phone. This corrects the earlier design in the Phase 2–4 review.

## Why the old pack missed local entries

The original build downloaded iNaturalist's country `observations/species_counts` list and added starter-list taxa: 25,067 references. That endpoint returns the leaves of the queried taxonomy, not every directly observed taxon. A genus can be a leaf in a local query but disappear from the national leaf list when a more specific descendant has records elsewhere. See [iNaturalist's explanation](https://www.inaturalist.org/pages/how_inaturalist_counts_taxa).

A fresh query for the configured starter cell returned 3,397 taxa, of which 359 were absent from the original pack: 358 higher taxa and one species. All 359 occur in the full country taxonomy. This reproduces the coverage defect; it does not reconstruct the exact 317 entries generated during the older phone test.

## Current preparation

`scripts/prepare_references.py` combines the existing country/starter list with all directly observed taxa in the configured country's `observations/taxonomy` snapshot. It computes consistent BioCLIP text vectors with the existing int8 text encoder on the computer. The Python tokenizer matches the shipped tokenizer; a previously generated strawberry-tree vector reproduced exactly. Existing chunks are retained, and additions are appended. The wider reference inventory does not add all its higher taxa to the country collection checklist or country identification candidate list.

The resulting pack has **37,856 references**, covers all 3,397 entries in the checked local list, and requires **396,750,219 bytes** of total compressed recognition download (**586,071,472 bytes** unpacked). The added compressed transfer is about **36.5 MB**. Native SQLite's reference index is additional to these asset sizes. BioCLIP model weights and runtime are unchanged.

Setup checks the reference manifest's hash, reuses existing imported vectors, and only records the current pack revision after the complete import succeeds. An older country-list record is not proof that the new pack is installed. Country identification retains the downloaded snapshot; local/regional lists still refresh.

Identification reads the verified saved binary reference chunks directly, with SQLite fallback for legacy additions or unavailable chunks, and embeds the user's photo or description. First-pass matching includes the downloaded country list even without a local record; see [the Pittosporum investigation](pittosporum-investigation.md). It never embeds missing candidate names. If a future live local/regional list contains taxa outside the dated pack, it reports the entries not compared visibly and in diagnostics. Name lookup and recording remain available. No missing coverage is silently passed off as a complete comparison. New taxonomy, new records or a ring extending beyond the configured country can still require a later reference-pack update.

The first model load and a network request for an uncached local species list are separate from taxonomy generation and can still take time. This change removes the reference-generation delay, not every possible source of latency.

## Validation

- 74 unit tests pass, including no runtime candidate embedding, coverage reporting data, versioned setup readiness and resuming interrupted imports. All 11 core browser tests pass, including offline recognition and photo logging. The separately documented browser two-tab update flake was not retested in this change.
- Android emulator upgrade imported the additions in 31.6 seconds with exactly 14 download requests: the updated manifest and 13 new reference chunks. Installing the final normal APK retained all five sightings, four photos and 64 recognition files, verified by original metadata and hashes.
- All 3,397 taxa in the checked local list had references in native SQLite after the update. Offline native inference passed against the existing four-species fixture with zero missing references; queued logs/photos synced on reconnection. These are emulator plumbing checks, not a broad accuracy benchmark or measurements from Tony's phone.

## Rebuild

Use the model-build Python environment with `numpy`, `onnxruntime` and `tokenizers`:

```bash
.venv/bin/python scripts/prepare_references.py
node scripts/prepare_downloads.mjs
npm run build
npm run android:build
```

`--refresh` refreshes source snapshots; `--offline` requires cached snapshots. Keep old content-addressed gzip files available while previously installed APKs may still request them. Install the new APK over the existing app, then finish the reference update; no uninstall or model reset is needed.
