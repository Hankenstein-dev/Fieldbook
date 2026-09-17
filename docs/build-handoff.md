**Current handoff:** [docs/ux-rebuild.md](ux-rebuild.md) covers the new Explore/Fieldbook experience, fixed zones and replaceable imagery. The overnight checkpoint below is historical.

# Historical overnight checkpoint

**Resumed 9 September 2026.** Use [the current Phase 2–4 review](phase-2-4-review.md) for status and next steps. The pause instruction below is historical and has been superseded by Tony’s resume request.

# Build checkpoint — 8 September 2026

Paused at Tony’s request so he can shut down for the night. All work is saved locally. No model preparation, evaluation or build jobs remain running. Nothing has been deployed. The full identification/collection/depth task is **in progress**, not finished.

## Resume here

Read this file first, then CLAUDE.md and SPEC.md. Tony authorised building identification, collection and depth before a UX redesign. His target is **Android with Chrome**. Photo identification should present a useful best identification first; alternative candidates are the fallback for ambiguity. Do not reopen permissions or stack decisions. Do not spawn agents unless explicitly requested.

Start by running `npm run test:browser` against the latest production build. Two new browser tests (collection and real offline identification/photo export) have been written but **not run yet**. The latest `npm run check` completed successfully: **35 unit tests and production build passed**. The previous six browser tests passed before this build; their regression run remains pending.

On this computer Chromium needs:

```sh
LD_LIBRARY_PATH=/home/hankenstein/.cache/pwdeps/root/usr/lib/x86_64-linux-gnu npm run test:browser
```

The Playwright configuration starts the production preview on 4173 when needed. `npm run dev` starts development on 5173. Test offline behaviour against production preview, since development does not register the service worker.

## Implemented in this work session

- Identification screen: explicit resumable model/reference download; camera/file input and up to three downscaled photos; worker inference; best result, alternatives, explicit local/regional/country widening, description and name-search paths. Selected photo and model provenance persist with a sighting. Logging always requests a fresh physical fix and never happens automatically.
- Identification candidates ignore interests. Country reference embeddings cover **25,067 taxa** (25,025 country records plus 42 starter-list taxa missing from that snapshot). Consistent taxonomic text references are used for photo classification: mixing image-to-image and image-to-text similarities introduced unfair candidate bias. Reference images prepared during exploration remain under data/models but are no longer part of the active reference manifest.
- Dexie schema v2 migrates species metadata from existing queries and sightings, and adds species, embeddings, ranges and seasons. Collection subscribes to saved data; progress uses the physical visited-cell union within interests. Extra out-of-catalogue sightings do not inflate its denominator. Exact scientific names reconcile primary and fallback entries in the collection. Notebook export schema v2 retains photo bytes as data URLs.
- Collection grid, silhouettes, group/recency ordering and visited-cell map patches; country iNaturalist density tiles. Actual country tile endpoint and browser CORS were checked.
- Seasonal histograms, twelve-month strip, observation-effort caveat, cached labels and small ranking nudges; no calendar exclusion. Visible story cards get seasonal enrichment, rather than requesting every species at once.
- Sparse/unavailable iNaturalist fallback wiring for GBIF and coastal OBIS; source provenance, separate provider IDs and non-additive observation counts. Group mappings remain config, with only plants enabled. These new fallback paths need more integration validation.
- Habitat supports narrow proximity to mapped watercourse lines without closing them into polygons. The earlier map-fill geometry fix is preserved. This latest habitat change needs browser regression validation.

## Model findings and evidence

The original ~90 MB BioCLIP 2 estimate was wrong. Image int8 is **306,917,008 bytes**, text int8 **124,545,619 bytes**. Active references use **85,562,124 bytes**, runtime about **25,801,280 bytes**: approximately **543 MB** total, explicitly downloaded. Models/chunks/tokenizer/runtime are local static assets, with no inference API or per-use charge. Model chunks and reference shards have SHA-256 integrity checks.

The real browser spike succeeded after a full offline reload: a strawberry-tree photo ranked Arbutus unedo first; cold end-to-end recognition was about **3.8 seconds on this desktop**, including about 3.3 seconds of model work. The text encoder also ran offline. Evidence: `docs/identification-browser-spike.txt`. The latest subsequent build changed ORT package resolution to avoid bundling another copy of WASM; this change still needs the new browser regression test.

Chrome worker imports did not reliably use the service-worker runtime cache. The fix reads cached runtime JavaScript and WASM bytes directly in the worker (Blob module + wasmBinary). ORT 1.29’s webgpu build needs the **asyncify** runtime, not jsep. It attempts WebGPU with WASM fallback; phone performance and actual hardware acceleration are **not verified**.

Small curated-photo evaluation: **19/21 correct first, 21/21 in top five**, seven plants including strawberry tree, lantana and pistacia, against the 977 starter taxa whose text references existed at that point. This is a convenience sample, potentially overlapping model training, not an independent field-accuracy estimate or a calibrated confidence threshold. `docs/identification-sample.json` retains image URLs, credits, ranks and scores. `scripts/evaluate_identification.py` can rerun against the completed reference data, so its candidate count now differs. One credited photo fixture is under tests/fixtures.

Text export loaded all official checkpoint keys with none missing or unexpected. Quantised vs original text embedding cosine was **0.991811** for the checked prompt; see `docs/identification-text-parity.txt`. Pinned revisions are in scripts/prepare_identification.py and config/generated/identification.json. Python model environment currently exists at `/tmp/fieldbook-model-env`; it is disposable, not required to run the app. Raw weights and prepared outputs are on disk under data/models and public/models.

## Remaining work, in order

1. Run the browser regression suite, including the new real-model offline/photo-export test. Fix any failures; tests mock candidate APIs/GPS, not inference weights. Run Python story/provenance checks before final handoff.
2. Validate GBIF/OBIS fallback pagination, complete/partial failure behaviour, canonical identities, caching and source labels with fixtures and bounded live checks. Verify fallback logging does not fabricate iNaturalist links or unsupported rarity claims.
3. Review identification cancellation, stale local/regional caches, memory use and descriptions with ordinary descriptions. Do not call the top similarity a confidence probability. The UI remains a prototype; reliable rejection of unrelated/ambiguous photos needs broader evaluation.
4. Review collection/season/map integration, including country density offline gaps, exact-name reconciliation and interest changes. Phase 3’s map silhouette treatment and subjective UX acceptance are not yet satisfied by the collection grid alone. Do not invent unobserved point locations for species.
5. Finish SPEC/README/CLAUDE updates and add a proper Phase 2–4 review. Some older paragraphs still describe Phase 1 status and the superseded photo-reference architecture. This checkpoint takes precedence for implementation status.
6. Clean obsolete generated model/reference/runtime assets from public/ by comparing against active manifests, then rebuild; do not delete raw research or authored stories. All downloads have finished and are reusable.
7. Actual Android Chrome timing, camera/GPS, offline walk and recognition quality remain device acceptance work. No phone acceptance or deployment has happened.

Tony asked to pause, so **do not continue this checklist until he resumes**.
