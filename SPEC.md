# Fieldbook (working name) — Spec v0.42

A location-based wildlife encyclopaedia with a collection you fill by logging what you've seen. Personal, for fun, no revenue, **no variable running costs**. Photographic imagery and a clear map for now; custom artwork is a replaceable presentation layer.

Open it in a new place, on a hike, on holiday, or when you've just seen something. It tells you what's of note around you, lets you read about any species, lets you log it, and shows what you've logged on a map of your world.

It is a nature exploration game: anticipation, discovery, personal achievements and a lasting fieldbook make real walks rewarding. The walking screen helps you notice nature without demanding constant screen attention. Keep the interface minimal; remove marketing copy, eyebrow headings and redundant explanations. Rich species information belongs in the information card. See `docs/experience-rebuild.md` for the accepted walking and discovery flows.

---

## 1. Principles (apply everywhere)

- **Path of least resistance, as long as building on top stays easy.** Keep the React interface inside Capacitor on Android; native SQLite and app-owned files for phone storage. Retain the shared web build for desktop and iPhone testing. Android remains primary; platform differences stay in existing storage/hardware modules.
- **No variable cost.** Free APIs and free API keys are allowed; runtime usage must not incur charges. Free tiers must stop at their quota rather than incur paid overages; no automatic paid fallback. No backend or proxies. Everything runs on the phone or against free endpoints, which may require a free key. One-off build-time costs (e.g. a batch run to seed content) are acceptable; per-use costs are not.
- **Information, never gates.** Season, radius, rarity are things the app *tells* you, not filters you operate. Nothing leaves a list because of the calendar. No month control, no radius control, no "low population" button. One list, labels on it, and "see all".
- **Local is a prior, never a wall.** Online plant identification uses global Pl@ntNet results; offline identification compares the downloaded country references from the first attempt; local records supply occurrence context and can add candidates, but never exclude a country-supported match. Anything can be logged anywhere (a flamingo in the garden is the most valuable sighting). Out-of-range sightings are flagged "unusual here", never suppressed.
- **Config over code paths.** Countries and species groups are config entries. Nothing else in the app knows which country or group it is in. Start: Portugal, plants.
- **Places organise discovery.** One lifetime fieldbook, with country and fixed-zone checklists. Names belong on geographical navigation and checklists; browsing a zone never records a visit.
- **Logging is binary.** Seen or not seen. If unsure after identification, you don't log. No "uncertain" state.
- **Hardware behind hooks.** `useLocation()` and `useHeading()` are the only code that knows the platform.

---

## 2. Layers

| Layer | Covers |
|---|---|
| 1 · World | Where am I, which way am I facing, what habitat am I in, what's plausibly here (the candidate set for a point). |
| 2 · Catalogue | All species, replaceable imagery, species pages, logging, collection. |
| 3 · Map | Following Explore map; freely browsable Fieldbook maps for zones and recorded sightings. |
| 4 · UX | Moment-of-use scenarios; decides what the other three surface. |

## 3. Scenarios

**Explore — the default app.** Opening Fieldbook starts on a map following the actual physical location, with nearby species visible and uncollected species distinguished and prioritised. This is the current walk. Remote zone browsing belongs in Fieldbook; Explore does not pan away or change its candidate point on a background-map tap. GPS is never replaced by a guessed personal location. Without permission, offer location access and Fieldbook browsing.

Explore now uses a full-screen walking diorama: a close, north-up angled camera, a simple 3D walking character, mapped building volumes, decorative woodland canopies and a small Nearby chip. Suggestions are hidden by default and open on demand at the top; closing them clears the walking scene. This is a replaceable presentation layer over the real map, not invented species occurrences. Fieldbook's Places and Sightings retain freely browsable top-down maps. See `docs/walking-diorama.md` for the prototype and acceptance checks.

**Identify — a direct camera action.** Capture starts recognition automatically, followed by a photographic reveal and an automatically saved fresh-location sighting. The common name leads, achievements celebrate applicable discoveries, and Keep exploring returns to the walking map. A clear correction fallback retracts a mistaken sighting and preserves its photograph for alternatives or name lookup. Upload, description and name lookup live in a secondary menu. When launched from Fieldbook, return to that experience. Cancelling returns without creating a record.

**Fieldbook — review, curiosity and planning.** One tap from Explore opens the lifetime collection. Species, Places and Sightings are views within this experience. Browse country and fixed-zone checklists, learn about missing species and inspect where they are recorded, or review personal encounters. Distinguish potential occurrence from actual personal sightings visually and in labels. Its maps browse freely. Returning to Explore resumes following the current physical position.

---

## 4. Decisions (locked unless marked *leaning*)

### Platform & stack
- **Capacitor Android is the chosen phone app**, retaining the React interface. Native SQLite and private Android files replace browser-owned collection/model storage. Not Expo.
- **Vite + React + TypeScript (strict).** A client-rendered app built as static assets fits the local-first, no-backend architecture and Capacitor Android build. SQLite for Android local data; private files for photos and downloaded recognition assets. Dexie (IndexedDB) remains the web implementation behind the same store interface. Cloudflare Pages or Vercel for hosting (HTTPS required for GPS and compass).
- The web build uses a service worker. The Android build bundles its interface in the APK and does not register a service worker. APK updates preserve app data.
- No backend. No cloud sync initially (Supabase behind the store module if ever wanted).

### Data
- **Full-catalogue source foundation (12 September):** Tony requested scripted source collection for all supported plants before LLM rewriting or card presentation changes. Collect every configured plant catalogue entry into a separate, resumable research corpus with original taxonomy, full Wikipedia revision source, source identities, retrieval dates, rights and content hashes. Track missing articles and uncertain taxonomic scope explicitly. No LLM calls in this phase; do not replace the curated seed's revision-pinned evidence. See [plant source collection](docs/plant-source-collection.md). Done when every catalogue entry is accounted for, the configured source lookups finish, and retained files pass offline integrity checks; remaining narrative-source gaps are reported separately.
- **iNaturalist** is the primary source. `GET /v1/observations/species_counts?lat&lng&radius&iconic_taxa` gives local taxa ranked by observation count with common names, default photo, Wikipedia URL. `GET /v1/taxa/{id}` for detail. Month histogram for seasonal labels. `/v1/heatmap/{z}/{x}/{y}.png?taxon_id=` for per-taxon density tiles. ~60 req/min unauthenticated. Photos mostly CC — keep attribution.
- **Wikipedia full articles** (linked from iNat) for seeding stories, with introductions retained for comparison and concise species reference text. Read uses, ecology, reproduction, history and other relevant sections before selecting the interesting material. Check that each article actually covers the intended species; genus pages require review.
- **GBIF** (species facets) and **OBIS** (marine checklists) supplement sparse or unavailable iNaturalist lists. Both query the same circle, independent of the tapped habitat, since local coverage is never a habitat filter. Group mappings remain config. Retain source links and counts; use the maximum rather than adding potentially overlapping observations. Partial failures carry warnings and are not a complete basis for an “unusual here” claim.
- **Protomaps / OpenStreetMap** vector tiles via MapLibre GL JS. Portugal PMTiles extracts, self-hosted as static files. Phase 1 covers mainland Portugal, Madeira and the Azores at native zoom 13 in 18 files totalling about 227 MB. The client requests byte ranges; it does not download the whole country. The walking prototype can overzoom to 18, without implying extra source detail.
- iNat obscures threatened species' coordinates to ~22 km. Rarity is therefore coarser than commonness by design.

### Caching
- Species queries keyed on **geohash precision-5 cell (~5 km) + habitat**, not raw coordinates.
- Each cell's query is a **circle around the cell centre with radius larger than the cell (at least 8 km, calculated from the cell’s farthest corner plus 5 km; 8.2 km for the starter cell)** so standing anywhere in the cell is covered ≥5 km in every direction; boundaries hide nothing.
- Re-query only on cell change; the card does not shuffle as you walk. Long TTL in the platform store.
- **Coverage target:** at least 5 km in every direction from every point in the cell. The displayed radius is the actual centre-query radius described above. If fewer than 40 species come back, widen to 25 km and say so in small print. No manual radius control. Fetch all pages; rendering long lists in batches is not a catalogue cap.
- Phase 1 caches complete queries for 14 days, reuses the cell query across habitat changes and reranks locally. Stale saved lists remain available when refreshing fails. A bundled, dated starter-cell query is used only for its matching cell, never as a substitute national nearby list.

### Habitat
- Habitat = **the map feature under the point** (ocean, lake, river, wood, grassland, wetland, farmland, built-up), read from the vector tile. Applies to your GPS fix and any tapped point alike. No mode toggle, no coastline dataset. Beach polygons read as coastal ground; water polygons read as sea, river, lake or generic water according to their tile attributes. Missing tile data is “Habitat unavailable”, not a guessed sea or land habitat.
- Habitat is read at native zoom 13 for a stable result independent of display zoom. Polygons are tested for containment; watercourse lines receive a narrow ten-metre proximity tolerance and an explicit label. Lines are never closed into filled polygons. Small verges and unmapped features remain source-data limitations.
- Phase 1 includes 53 source-backed, broad habitat affinities in `config/habitat-affinities.json`. These nudge ordering among the real nearby records and carry separate source passages. They are not a claim that every wetland is suitable for every wetland plant, or a replacement for the deeper habitat ranking in Phase 4.

### Field card ranking ("of note")
- One score per species; **notability strategy differs per group**:
  - **Animals:** local likelihood (iNat frequency) × group weight + bonuses (unique to region, rarely seen, peak month here, not in your collection) − ubiquity penalty.
  - **Plants:** **story**, from a curated stories file (see below). A rare plant isn't what you're looking for; an interesting one is.
- Ubiquity penalty: cosmopolitan species (rock dove, housefly, dandelion) — partly derived from global spread, partly a short hand-curated ignore list per group.
- Season: cached monthly observation counts provide a soft ranking nudge and labels such as “Often recorded at this time of year”. Sparse data earns no seasonal bonus. Histograms describe recording effort; they do not establish flowering, migration or absence. Year-round list always.

### Stories file (plants)
- **Reduced-format Sol pilot (13 September):** Tony chose to drop the broad general-facts array after reviewing its duplication and token overhead. Keep a one-paragraph draft, human food-use/toxicity details, direct source-passage references and brief review flags only for concrete issues. He authorised about 250 fresh samples on Sol high through the subscription subagents, measuring output size, elapsed task time and source-based quality. Select 250 randomly from species with name-matched text, excluding the earlier sample; preserve original outputs for review and do not publish or replace existing stories. Done when all 250 results are saved, structural checks and a disclosed quality sample are reviewed, and token/time limitations are reported. Keep saved-text counts separate from observed generation-agent usage: `agent-usage.json` records local session input, cached input, output and reasoning telemetry, excluding parent orchestration/review. Neither measurement is subscription billing. See `config/plant-content-run-v2.json` and [the 250-plant pilot](docs/plant-content-250-review.md). This supersedes the general-facts requirement in the earlier pilot below.
- **Full-catalogue content pilot (12 September):** Tony approved storing extracted facts separately from the display paragraph, including qualified human food use and independent toxicity records with source evidence. He proposed a one-paragraph overview that identifies the plant and its origin, then explains its most interesting supported traits. Trial this direction with source-rich, sparse, multilingual and scope-review cases; the precise template and copy remain drafts. This prospective template takes precedence over the earlier flexible-paragraph guidance for the pilot; existing authored stories are not migrated. Measure actual saved-source input and draft output sizes. Tony explicitly requested ten identical samples across different OpenAI models/reasoning settings using subscription subagents, not a separate API key. Done when the census, sample/schema proposals and ten-plant model outputs are reviewable with source evidence, quality findings and honest token/cost limitations. See [content pilot](docs/plant-content-pilot.md) and [model comparison](docs/plant-content-model-comparison.md).
- Versioned in the repo, per country and group: `stories/pt/plants.json`. The versioned envelope contains country, group, language, narrative license and a `stories` array. Per species: iNat taxon id, tags (`edible`, `toxic`, `lookalike-of:<taxon>`, `invasive`, `cultural`, `medicinal`), a readable **summary of the most interesting things about that plant**, `reviewStatus`, and source attribution/links. Empty tags are valid for natural-history stories. `stories/pt/plants.review.json` holds the separate editorial evidence and an outcome for every seed taxon.
- **Editorial purpose and tone:** an enthusiastic, friendly educator explaining the plant with warmth and clarity. Include each interesting, supported point and enough context to understand it. If there are four interesting things, explain all four. Use connected sentences and paragraphs as the material warrants; no fixed word count, one-fact quota, marketing hook, teaser, or forced silliness. Interest comes from the plant and the explanation.
- **Evidence stays separate from the story.** Source quotations and review notes are editorial metadata for checking claims, not part of the reader-facing summary. Write the story in our own words. Keep required source attribution separate from the narrative.
- `scripts/review_stories.py` validates authored files offline and renders reading/research copies under `docs/`. It does not write stories or approve copy. Draft status remains until Tony reviews and locks the text. Preserve source revisions, exact contextual passages and notes about scope or conflicting claims; a source pack is not an assertion that every statement in its articles is accepted.
- **Scope:** decides *promotion* only. The catalogue, identification and collection are uncapped and know every species iNat has recorded around you. A plant with no story still identifies, logs, appears in "see all" and has a full species page; the curated summary is simply absent, never a placeholder. Screen layout must not impose an editorial one-line limit on the story.
- Seeded by a keyword pass over full Wikipedia articles (edible, poisonous, toxic, invasive, used to make, cultivated for…) yielding candidate tags plus source sentences, followed by reading both matched and unmatched material across relevant article sections. Keywords are discovery aids, not a definition of interestingness. Retain source sentences and URLs supporting every factual claim and tag. Sparse or mismatched articles need further source research; do not invent detail or pad them to match richer entries. Optionally a one-off build-time batch model run (fixed cost). Never generated at runtime. Tony reviews and locks every summary line by line.
- Start with the most-observed few hundred Portugal plants; expand with the same script.

### Interests & groups
- **Interests:** one per group — birds, mammals, reptiles & amphibians, fish & sea life, insects, plants, fungi — any combination on. Shape the field card, collection and map. **Never applied to identification** (ID always runs across all groups). Logging something from an off group offers to switch it on; off groups accumulate quietly. Strict for now: nothing outside your interests breaks through onto the field card.
- **Group config:** `{ iconicTaxa, rankingWeight, ignoreList, spritePalette, notabilityStrategy }`.
- **Country config:** `{ iNatPlaceId, bbox, tileExtract }`. Countries are the only named place in the app (used for the country "where" view and the outer ID ring).

### Identification
- **Online-first photos (10 September):** Android photos use Pl@ntNet directly when connected; no computer/proxy or offline pack is required. BioCLIP remains available automatically when offline with its pack installed, and as an explicit alternative after an online error or for descriptions. Never silently download models or spend money on a fallback. The source comparison is in [recognition comparison](docs/recognition-comparison.md); implementation and validation are in [online recognition](docs/online-recognition.md).
- **Optional on-device BioCLIP 2** via ONNX Runtime Web (WebGPU attempted, WASM fallback). Measured int8 model files total about 431 MB; with the current reference pack and runtime the explicit gzip download is now about 397 MB, unpacking to 586 MB of assets. Lossless compression changes neither model weights nor inference RAM. The earlier ~90 MB estimate was incorrect. Desktop offline inference has been demonstrated; Android Chrome performance and field accuracy remain unverified. See [the Phase 2–4 review](docs/phase-2-4-review.md) for current implementation and remaining validation.
- Photo classification uses consistent taxonomic text references from the same BioCLIP model, precomputed for the country and cached locally. The build includes directly observed higher taxa from the full country taxonomy, since the country leaf list does not cover every local leaf. All reference vectors are precomputed on the computer and imported during explicit setup. Identification never generates missing taxonomy references; any unsupported live candidates are disclosed and remain available for name lookup/logging. See [recognition preparation](docs/recognition-preparation.md). Mixing reference modalities across candidates would bias similarities. The query photograph is embedded once (the recognition engine also supports combining multiple views); show a best match first, with alternatives available when unclear. Highest similarity is not calibrated confidence. The accepted game flow reveals and automatically records the best match, with a durable correction fallback. Description matching uses the text tower as a secondary narrowing tool; its prose accuracy still needs evaluation. Browse/name search remains available.
- **Candidate coverage:** online results resolve against the bundled catalogue or global taxonomic identifiers without a local eligibility filter. Offline comparisons use the downloaded country list plus saved local additions. An absent or unavailable nearby observation is never a reason to exclude a supported country taxon. Missing local lists can refresh in the background while identification uses the country pack. Results label saved local occurrence without claiming absence or a first-ever sighting. Explicit "not one of these" checks regional records for additional candidates; shared requests avoid duplicate work. Log-by-name via iNat taxa autocomplete covers everything else. No interest/group filter hides animals from identification; alternative similarity scores are not calibrated confidence.
- **Reveal preparation:** prepare physical location and local records alongside recognition; calculate achievements before revealing the species so its badges arrive together. Persistence status remains separate and errors are retryable. Saving does not await a reload of all saved photos or visit-history bookkeeping. GPS, record lookup, persistence and visit timings are logged separately.
- **Download UX:** explicit download with approximate compressed transfer and unpacked sizes, resumable verified chunks, and local model/runtime/reference caching. Build-generated static gzip files cover models, tokenizer, runtime and references. Setup is complete only after the current versioned reference pack is imported. Updates reuse existing model files and reference chunks. Unpack each downloaded file and verify its SHA-256 before caching under the existing decoded asset key; completed downloads remain reusable. Compression needs no backend or host-specific headers. No silent model download: browser connectivity information does not reliably prove that a connection is unmetered. Saved country and visited-area references work offline; an unseen area’s local list needs network access.
- Slow phones: let it run; no escape hatch until the phase-2 spike shows a real problem.
- Pl@ntNet is the chosen online plant recogniser. The owner’s free account stops at its daily quota; HTTP 429 is retained until the next UTC day and offers an explicit offline alternative. Errors and no-match responses never automatically log a different engine’s guess. The existing on-device path also supports the broader groups in its references; online provider coverage will need revisiting when additional groups are introduced.

### Sightings & collection
- **Sighting** = `{ taxonId, lat, lng, timestamp, cell, wasInCandidateSet, photo? }`. Identification requests a fresh physical GPS fix as recognition starts and prepares local occurrence context during the recognition wait. That encounter fix is reused for the reveal, save and alternative-species correction; manual logging requests a fresh fix at the logging action. Coordinates never come from the explored map point or photo EXIF. Phase 1 also stores a unique id, accuracy, species display snapshot and `candidateSetAvailable`. If the local candidate query cannot be obtained, logging still works and no unsupported “unusual here” claim is made. Photo (from ID) kept, downscaled to ~1200 px, in native private files with its SQLite record (IndexedDB on the web).
- **Collected is a lifetime property of the species.** A sighting fills its entry in every country/zone checklist containing that species. Crossing a border does not reset it. Repeat sightings remain independently recordable with dates, locations and optional photos.
- **Collection:** one lifetime book. The current country checklist is the dated national reference catalogue plus taxa in the fixed-zone queries, within configured interests. It no longer depends on the union of physically visited cells. Exact scientific-name matches coalesce fallback/primary taxon records. Saved species outside that checklist remain in the book as additional discoveries. Faded photographic entries distinguish species not yet collected; custom silhouettes can replace them later.
- **Zones:** fixed, source-backed geographical areas, independent of GPS circles and habitats. The initial config uses 20 iNaturalist standard Portuguese districts/island regions, with complete paginated species-count snapshots for each. These boundaries are replaceable config, not a permanent decision about the ideal zone scale. Selecting a zone highlights its polygon and shows its checklist, with uncollected species first. Country and zone progress counts species collected anywhere, never claims all were encountered in that place. A checklist describes dated recorded presence, not exhaustive biodiversity or guaranteed encounters.
- **Where to find it:** a species opens the Fieldbook Places view, showing which zones have records and shading those areas. Optional country iNaturalist density remains available. No invented point markers for unobserved species.
- **My sightings:** the Fieldbook sighting map displays actual saved encounters, clustered by species when necessary. Open a species to restrict this view to its own encounters. Every repeat sighting remains in the dated list and in storage; nearby overlapping records may share a count marker.
- **Rarity** is shown and celebrated: a simple label now ("rarely seen here") and a small sighting marker; a "shiny"-style treatment later.

### Map
- MapLibre + the existing self-hosted Protomaps extracts, rendered at normal resolution by default. Keep polygon-only water fills. Show a clear location dot with heading, and photographic sighting markers. Underlying tile coverage and offline caching are unchanged.
- **Explore follows the actual position, north-up.** Zoom controls remain available. Remote pan, double-click relocation and background-map selection are disabled; tapping an actual sighting can open its entry. Nearby species are a clearly associated list, not fabricated species locations on the map.
- **Fieldbook maps browse freely.** Places shows fixed zone boundaries and recorded occurrence; Sightings shows personal encounters. Keep these maps distinct in labels and content. A sofa exploration never modifies physical visit history or recording coordinates.
- **Density:** group same-species sightings within a screen-space radius at render time and show their count. Storage retains every encounter individually. Zooming separates records where coordinates allow; exact repeats at one point retain a cluster and individual dated list entries.

### Replaceable appearance
- Every displayed species/reference or local photograph opens a full-screen inspection viewer on tap, including species pages, collection/explore lists, identification and saved sightings. Support pinch zoom, drag to pan, zoom controls and fit/reset; closing returns to the previous screen without saving or selecting a species. Use a larger reference rendition when available, falling back to the cached thumbnail offline.
- **Private testing image policy (Tony, 9 September):** show available iNaturalist photos regardless of licence, including all-rights-reserved defaults. Retain attribution, source and the actual licence label. A public release requires an imagery review; this exception does not change story licensing or claim reuse permission. Older stored species lacking images receive catalogue photo fallbacks without changing their sighting data.
- Use actual credited species photographs and simple UI/map markers now. No procedural pixelation or generated placeholder pixel sprites in the active UI. Missing images receive a simple neutral icon; missing collection entries are faded and explicitly labelled.
- `config/appearance.ts` maps stable taxon IDs to custom artwork, with photo fallback. Each override declares its image URL, attribution, source, license and optional pixel-art rendering. The character and MapLibre map style have independent overrides. Collection logic, species identities, map coordinates and logging do not depend on an asset being supplied.
- Tony will provide final artwork later. Art direction is a skin, not a prerequisite for testing the app. Authored plant narratives remain untouched.

### Offline
- **Web build only:** request persistent browser storage when the user records a sighting, with a manual **Protect storage** action and visible grant/denial status in Settings. This mitigates eviction; it is not a guarantee against manual clearing or browser/device failure. Keep a compact, append-only sighting safety copy (names, times, actual coordinates; no JPEG bytes) in Local Storage. On startup, restore missing record IDs from that copy without replacing existing sightings. Browser data can still be lost; complete computer backups are the development recovery path.
- Passive: the service worker caches the app shell and displayed photos under the private testing image policy; the store keeps species queries, sightings and decoded visited map tiles in IndexedDB. Model caching begins in Phase 2. Phase 1 bounds the tile cache at about 96 MiB and the photo cache at 250 entries. Browser storage eviction can remove local data; notebook JSON export is available. Explicit "save this area" pre-fetch is on the backlog.
- App updates have an explicit **Update and reload** action in Settings; do not require clearing data or reinstalling. Applying an update keeps sightings, diagnostic queues and recognition files. Finish an active identification/save before updating.

### Personal device testing and diagnostics
- Following the reported collection losses, the same local development sync also backs up complete confirmed sightings, including exact coordinates, timestamps and photos, under ignored `data/diagnostics/notebooks/<storage-id>/<sighting-id>.json`. This is separate from coordinate-free event logging and governed by the existing automatic-send setting. Original backups are append-only; an empty/reset phone never deletes or replaces received records. Explicit corrections append a retraction sidecar, merged on restore. Settings can restore this device's backed-up sightings and missing photos without overwriting existing record metadata. No cloud service or cost is introduced. These protections do not reconstruct earlier records that were never backed up.
- User-authorised exception to “no backend”: a **local development/preview-only** receiver automatically receives Android photos, identification results and diagnostic events for debugging. This is Tony's explicit testing preference; it replaces the initial metadata-only, opt-in setup. Sending can be paused in Settings. The receiver is not deployed with the static app and introduces no cloud dependency or variable cost.
- Keep the latest 1,000 metadata events and up to 100 processed JPEG photos / 100 MB in a separate local store, independently of sightings. Rejected or abandoned identifications retain their successfully decoded photos. Oldest local photos expire at those limits. Automatically retry delivery to the same-origin web testing receiver or the configured Android testing computer when connected; acknowledge only successful writes. No image transmission until that receiver advertises photo-upload support. Production static hosting retains local diagnostics without a receiver.
- Record file names/sizes/dimensions, recognition stages/timings, provider/fallback, missing-reference counts and preparation time, candidate results, save outcomes and errors. Photo, session and operation IDs connect images to results. Reference generation has aggregate diagnostics rather than thousands of per-reference events that would crowd out the phone's log buffer. Descriptions and precise coordinates remain excluded from diagnostic events. Identification query embeddings are retained for replay, as explicitly described in the Pittosporum investigation.
- On the computer, retain complete received session journals under `data/diagnostics/sessions/` and JPEGs with metadata under `data/diagnostics/photos/`. These development archives are not automatically pruned; keep them ignored and remove when no longer useful. A separate live-view journal rotates at approximately 5 MB with one backup. Settings provides recent-photo downloads as another way to retrieve images; it does not promise automatic Android gallery insertion.
- Camera and existing-photo selection are separate actions. Identification automatically saves its revealed result, with correction/retraction available; recording uses fresh physical GPS, never photo EXIF.
- Sync failures expose the stage/error in Settings, alongside app address/build/storage identity. The local receiver keeps a bounded transport journal for rejected requests as well as successful uploads and accepts same-origin HTTP/1 and HTTP/2 requests plus the native HTTPS localhost origin through development CORS. A local update page can activate a waiting app update for older builds without resetting storage.
- For Android Chrome over home Wi-Fi, use trusted local HTTPS. WSL networking and generated certificate setup are documented in [Android testing](docs/android-testing.md). Actual phone performance and outdoor acceptance remain unverified until the owner tests them.

### Later / backlog
- "Save this area" offline pre-fetch · shinies · hand-drawn sprites · cloud sync · send-to-iNaturalist (via their observation API, user's own account — the honest way to feed data back) · silent notable-marker · Spain and further countries · insects, birds, mammals, fish as further group configs.

---

## 5. Architecture

```
useLocation()   wraps navigator.geolocation / native Capacitor Geolocation → lat/lng/accuracy + geohash cell
useHeading()    wraps deviceorientationabsolute (Capacitor Motion later) → degrees from north, smoothed
config/         countries { iNatPlaceId, bbox, tileExtract }; groups { iconicTaxa, weight, ignoreList, palette, notabilityStrategy }
species/        iNat client, normalisation to one Species type, cell-keyed cache with overlapping circles, fallbacks
stories/        curated per-country per-group JSON; read-only at runtime
rank/           "of note" scoring; strategy chosen per group from config
store/          Native SQLite / web Dexie schema v2: queries, species, sightings, settings, visitedCells, tiles, seasons, embeddings, ranges. Only module touching persistence
appearance/     credited photo fallback + per-species artwork, character and map-style overrides
identify/       BioCLIP in ONNX Runtime Web; candidate embedding cache per cell; photo + text queries; widening rings
map/            MapLibre + Protomaps, following Explore view, freely browsable fixed-zone/sighting views; physical habitat from tiles
screens/        Explore · Fieldbook (Species / Places / Sightings) · Identify action · Settings — consume hooks, store and config only
```

Rule: location/orientation access stays in the two hooks; persistence stays behind store/, with native/ handling preferences, exports and platform-specific presentation; nothing outside `config/` knows which country or group it's in.

---

## 6. Build order

### iPhone tester — 11 September

Tony approved a Home Screen web app for his wife, using the existing shared code and independent device collections. No Mac, login system or separate app implementation. This initial hosted build uses online recognition; offline inference/description downloads remain in the Android/desktop builds. Full-photo export/restore and visible storage-protection status are required. Explicit exports to Files/iCloud Drive are the hosted recovery path; no automatic hosted backup receiver is added.

Tony authorized the existing Boombop Cloudflare infrastructure/account for this testing phase, including its existing R2/Worker usage/quota. Deploy static assets only to Fieldbook's own prefix/address; do not change other sites or provision paid services/proxies. He also approved sharing the existing Pl@ntNet key and enabled browser exposure for the Fieldbook origin. Browser key embedding requires an explicit build opt-in; native requests send the same authorized client origin. Both phones share the provider quota. See `docs/iphone-testing.md`.

*Done when:* publish the shared web build at a stable HTTPS address; verify recognition and map range requests; verify separate device collections and original photo/date/location backup restoration in browser tests; then complete a real iPhone walk and Save to Files check. Automated results and real-device acceptance are reported separately.

Ordered by what the app *is*, not by effort. Each phase is usable on its own. **Initial build and acceptance scope: Portugal, plants — both as config.** Sea habitats and support for animal groups remain part of the mechanisms and config architecture; animal configs are added later, not required by the initial acceptance criteria.

### Phase 0 — Stories seed (before any UI)
1. Script: pull Portugal's most-observed plants from iNat (a few hundred first), save each taxon record, Wikipedia introduction and full article locally, print a keyword tally (edible, toxic, invasive, used to make…).
2. **In the coding session, no separate model API call** (the session itself reads the files): review a sample of the raw content and report what's actually there (interesting facts, candidate tags, thin summaries, Portuguese vs English names). **Editorial direction agreed with Tony:** readable summaries of the interesting things about each plant, with room for multiple facts and the tone of an enthusiastic, friendly educator. Write draft stories with supporting source sentences and URLs for him to review and lock. Let the material determine the length.

*Done when:* a stories file exists for Portugal plants that makes a walk in Portimão interesting on paper, in a shape Tony chose.

### Phase 1 — Field card, map, logging
**Implementation ready for the outdoor acceptance walk.** See `docs/phase-1-review.md` for tested behaviour and remaining device validation. This is not a claim that the physical done-when line has been completed.

PWA scaffold over HTTPS. `useLocation()` and `useHeading()`, cached local species and habitat-aware ranking, species pages, logging and a map of sightings. The original pixel treatment and background-map exploration are superseded by the UX rebuild below.

*Current outdoor acceptance:* open Explore on a walk, see your physical position and heading, read the nearby species, move between habitats and see the tile-derived habitat update, record a plant, reload and find its sighting where it was recorded.

### Phase 2 — Identification
BioCLIP via ONNX Runtime Web (WebGPU, WASM fallback). Explicit model download into private Android files (CacheStorage in the web build). Cached taxonomic reference embeddings. Camera-first "What was that?" with describe as secondary. Widening rings, log-by-name, photo kept on the sighting.

*Spike first:* load BioCLIP in the browser on Tony's actual phone, time one embedding.
*Done when:* photograph a plant on a verge, get a useful identification in a couple of seconds with no network (alternatives available when unclear), confirm it, and it lands on the map.

Functional wiring and desktop browser checks are complete; this actual Android/outdoor acceptance remains pending.

### Phase 3 — Collection

The lifetime fieldbook, country/zone checklists and personal sighting maps are implemented. Fixed-zone progress replaces the original visited-cell denominator. Physical visits remain history, never a collection gate.

*Done when:* open the Fieldbook, browse collected and missing entries, select another zone and see what it could add to your lifetime collection, inspect where a missing species occurs, and review all repeat sightings on your own map.

### Phase 4 — Season & depth
Seasonal labels and twelve-cell strip; habitat-aware ranking per map feature; OBIS/GBIF fallbacks are implemented. Only the requested plant group is configured. Additional groups and richer source-backed habitat detail remain later work.

### UX rebuild — current acceptance
The September discussion supersedes the original pixel presentation, remote Explore taps and visited-cell collection denominator. Done when: opening the app follows the walk; Identify records and returns to that map; Fieldbook is one tap away with global collected status, fixed-zone checklists, repeated sightings on its map, and replaceable imagery. Actual outdoor Android performance remains a separate acceptance check.

### Phase 5 — Native Android storage (current)
Capacitor retains the React experience; native Geolocation stays behind useLocation. SQLite owns sightings, visits and preferences. Private Android files own photos and recognition assets; a separate SQLite cache owns replaceable species/embedding/tile data. No native Local Storage sighting duplicate or browser persistence request. A stable app ID and signing key preserve data across APK updates. Desktop diagnostics still receive queued logs/photos and full sightings on the local computer. Browser exports can be imported without replacing existing sighting IDs.

*Done when:* build an installable APK; save repeated sightings with photos into native storage; retain their original coordinates, times and photos across process restart and an APK update; reuse downloaded recognition files offline; and send queued debugging records to the testing computer. Emulator checks and the owner's real-phone outdoor acceptance are reported separately. See [native Android](docs/native-android.md).

### Phase 6 — Long tail
See backlog above. Never done; that's the point.

---

## 7. Open items (not blocking)
- Name. Directions so far: field-notebook words (Fieldbook, Almanac, Ledger) or -dex coinages. Tony's to choose.
- Home becomes the densest patch on the map — revisit only if a shareable "my world" view ever exists.
- Interests break-through (something notable outside your interests appearing on the card): not now; revisit only if notability data proves rich enough.

### September experience update

The accepted game framing and current implementation are in `docs/experience-rebuild.md`. This supersedes any historical confirmation-first flow below or in earlier phase reviews. First-area discoveries use iNaturalist as a seeded game baseline. Walking uses close zoom, three stable suggestions, wanted species and today’s finds; themed collections share lifetime credit. Discovery reveals automatically record and support durable correction. All stories remain unchanged.
