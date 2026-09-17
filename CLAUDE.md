**Plant content pilot (13 September):** Tony has now dropped the broad general-facts array. Keep a paragraph, qualified food-use/toxicity details, direct evidence references and brief review flags only for concrete issues. He authorised 250 fresh drafts on Sol high using subscription subagents, with token, elapsed-time and quality reporting. Read [250-plant pilot](docs/plant-content-250-review.md); the [earlier comparison](docs/plant-content-model-comparison.md) is historical. Exact copy remains draft; preserve existing stories. Saved-text counts and observed generation-agent telemetry are separate artifacts. `agent-usage.json` measures the generation sessions, including cached input and reasoning; it excludes parent work and is not subscription billing.

**iPhone web tester (11 September):** Tony approved a shared Home Screen web build for his wife, hosted on the existing Boombop Cloudflare demo infrastructure. Read [iPhone testing](docs/iphone-testing.md). Android remains primary. Hosted testing uses online recognition and explicit full-photo exports, with no automatic computer backup. Tony approved sharing the existing Pl@ntNet key with browser exposure; the updated native request sends the same authorized origin. Existing APKs need the compatibility update. Keep normal web, hosted web and Android builds separate.

**Walking diorama prototype (10 September):** Tony approved a game-like 3D Explore screen. Read [docs/walking-diorama.md](docs/walking-diorama.md): angled following camera, replaceable walking character, mapped building volumes, decorative woodland and a small Nearby chip. The three-species suggestions are hidden by default and open on demand at the top. Fieldbook maps stay top-down. The recognition flow is owner-tested and stays intact. Outdoor review of this walking prototype is pending.

**Online recognition is now the default on Android (10 September):** Read [docs/online-recognition.md](docs/online-recognition.md). Photos go directly to Pl@ntNet using the owner's free key; no computer or model download is required. BioCLIP remains available offline and for descriptions. Free quotas stop requests; no paid fallback. [The comparison](docs/recognition-comparison.md) explains the choice. The former guava examples were corrected to white sapote and loquat; never tune toward their superseded labels.

**Current experience (10 September):** Read [docs/experience-rebuild.md](docs/experience-rebuild.md). Tony chose an explicitly game-like walking/discovery loop: direct camera, automatic recognition/reveal/save with correction, meaningful achievements, three stable look-out suggestions, wanted species, today’s finds and themed collections. Remove redundant explainers, marketing copy and eyebrow headings. This supersedes historical confirmation-first UX; keep authored stories untouched.

**Native Android is now the chosen phone platform:** Tony explicitly chose an Android app with SQLite in app-owned storage. See [docs/native-android.md](docs/native-android.md). Keep the React interface via Capacitor. Native sightings use SQLite and private photo files; native recognition uses private files. The web build retains Dexie for desktop/PWA testing. Browser persistence requests and Local Storage sighting copies are browser-only stopgaps, not the Android architecture.

**Current UX rebuild:** read [docs/ux-rebuild.md](docs/ux-rebuild.md). This supersedes earlier navigation, pixel-art treatment and visited-cell collection progress.

**Photo inspection and private-use imagery:** all displayed species/local photos open a full-screen zoom viewer. Tony explicitly permits iNaturalist photos regardless of licence for this private testing app; retain actual attribution/licence metadata and review imagery before any public release. Do not reinstate the old licence-based photo omission. See [docs/photo-inspection.md](docs/photo-inspection.md).

**Android testing and diagnostics:** see [docs/android-testing.md](docs/android-testing.md). Tony explicitly requested automatic phone-to-computer debugging: local Vite tooling receives photos, results and logs into ignored `data/diagnostics/`. Photos are retained independently of confirmed sightings, including rejected attempts. This development-only exception is not a production backend. Wi-Fi testing uses locally trusted HTTPS with generated, ignored certificates.

**Collection loss investigation:** see [docs/storage-loss.md](docs/storage-loss.md). Phone evidence confirms zero IndexedDB sightings and a sharp storage-usage drop at the same origin and Local Storage ID. Cause remains unproven. New protection requests browser persistence at save time, keeps compact sighting metadata in Local Storage, and automatically backs up complete confirmed sightings (including coordinates/photos) to the same local testing computer. Never clear user storage as a debugging step or claim the earlier missing sightings have been recovered.

# CLAUDE.md

**Current build (9 September 2026):** identification, collection and depth are wired. Read [docs/phase-2-4-review.md](docs/phase-2-4-review.md) for functionality, validation and remaining Android/UX acceptance. The overnight pause has ended. Recognition now downloads about 397 MB of losslessly compressed assets (586 MB unpacked), including broader taxonomic references prepared on the computer. Never generate missing taxonomy vectors during identification. See [docs/recognition-preparation.md](docs/recognition-preparation.md); the original size breakdown is in [docs/recognition-size-review.md](docs/recognition-size-review.md).

Personal, for-fun, location-based wildlife encyclopaedia with a following map and lifetime collection. Owner: Tony (dev pseudonym Hankenstein). Read `SPEC.md` before doing anything; it is the source of truth for every decision below and carries the reasoning.

## Non-negotiables

- **No variable running costs.** Free APIs and free API keys are allowed; runtime usage must not incur charges. Free tiers must stop at their quota rather than incur paid overages; no automatic paid fallback. No production backend or proxies; local testing diagnostics are the scoped exception described above. Android photo identification uses Pl@ntNet online, with on-device BioCLIP available offline and for descriptions. One-off build-time costs are fine; per-use costs are not. A key requirement alone is not a reason to stop.
- **Capacitor Android with SQLite and app-owned files; retain the web build for desktop testing.** Never Expo or React Native. Keep every hardware access inside `useLocation()` and `useHeading()`; nothing else may touch geolocation or orientation APIs.
- **Config over code paths.** Countries and species groups are config entries (`config/`). Nothing outside `config/` may know which country or group it is running in. Current scope: **Portugal, plants**. Do not add other countries or groups unless asked, but never write code that would make adding them harder.
- **Information, never gates.** No month filter, no radius control, no habitat toggle, no "show rare" switch. Season, radius and rarity are labels and ranking nudges, never filters. If you find yourself adding a filter control to a list, re-read SPEC §1.
- **Local is a prior, never a wall.** Online plant matching uses the global Pl@ntNet service; offline matching includes the downloaded country list plus saved area additions. Local observation lists never exclude a supported country taxon. Anything can be logged anywhere. Out-of-range sightings are flagged "unusual here", not blocked.
- **Logging is binary.** Seen or not. No uncertain/glimpsed state.
- **One lifetime collection.** Country and fixed-zone checklists share collected status. Repeat sightings remain separate records. Explore follows the walk; remote browsing belongs in Fieldbook. Place names may label geographical navigation and checklists.
- **Copy is Tony's.** Propose draft plant summaries, labels and onboarding text for him to review and lock. The stories file in particular is reviewed and locked by Tony line by line.
- **Stories teach.** Write a readable summary of the most interesting things about each plant, in the voice of an enthusiastic, friendly educator. Include all the interesting, supported points: if there are four, explain all four. Let the material determine length and paragraph count. No marketing hooks, teaser copy, forced silliness, arbitrary word limits, or one-fact quota. Explain what makes the facts interesting and how they connect; do not pad thin material. Keep evidence for every factual claim.
- **Evidence is editorial metadata.** Keep source quotations and review notes separate from the reader-facing story. Write summaries in our own words; required attribution also sits outside the narrative.

## How to work

- Before starting any phase, restate the phase's *done when* line from SPEC §6 and confirm scope.
- Prefer boring, well-trodden choices. Push back on over-engineering. Reusable infrastructure over point solutions, but only when the reuse is real.
- When a decision isn't covered by SPEC.md, ask rather than guess; when it is covered, follow it without re-litigating.
- Keep `SPEC.md` current: when a decision changes in conversation, update the relevant section in the same commit.

## Current implementation

Implemented and browser-tested; **the actual outdoor acceptance walk is pending**. Start at `docs/ux-rebuild.md`; earlier phase reviews are historical. Run `npm ci && npm run dev`, or build and preview to exercise offline caching. The app uses the authored drafts without claiming Tony has locked them. Identification, collection and depth are now implemented as described in the Phase 2–4 review. The rebuilt Explore/Fieldbook flow and fixed-zone occurrence display are implemented. Actual phone acceptance, final artwork and further UX iteration remain open.

Keep map data (`public/maps/`), generated catalogue/starter data (`config/generated/`), and the dated map-build configuration together. Only `dist/` is deployable. The private Android build uses the owner’s free Pl@ntNet API key; there are no paid fallbacks. The real starter list has 1,019 taxa; do not replace it with the 300-taxon story seed. Habitat is read from the same vector tile geometry as the map; source-backed habitat affinities only affect ordering. Tests cover cell overlap, ranking, grouping, persistence and production browser/offline flows.

## Phase 0 (drafting complete)

**Full-article drafting pass complete:** 300 taxon records, 283 usable linked English articles, two additional companion articles, and 176 authored draft stories. The remaining 124 taxa have specific research outcomes. Start at `docs/phase-0-review.md`; read the stories in `docs/stories-pt-plants.md`. `stories/pt/plants.json` is the editable prose; `plants.review.json` contains separate evidence and all-taxon coverage. Tony's line-by-line copy review remains pending. Do not overwrite authored stories by rerunning the seed. `python3 scripts/review_stories.py --check` checks provenance and generated documents offline.

1. Write `scripts/seed_stories.py`: pull Portugal's most-observed plant taxa from iNat (`species_counts` with the Portugal place id, `iconic_taxa=Plantae`, top N, N configurable), save each taxon record, its Wikipedia introduction and its full article under `data/raw/pt/plants/`, and print a keyword tally (edible, poisonous, toxic, invasive, "used to make", "cultivated for", medicinal…).
2. Review a sample of the raw files with Tony in-session (no separate model API call). Report summary richness, candidate-tag frequency, thin sources and English vs Portuguese naming. **This review has happened. Tony has chosen readable summaries covering the interesting facts, with an enthusiastic, friendly educator's tone.** The earlier short-hook proposals are superseded; do not ask him to choose among them again.
3. Generate draft entries for `stories/pt/plants.json` in that direction, retaining the source sentences and URLs supporting each summary and tag so Tony can review and lock the text line by line. Draft from full articles, not just introductions. Read uses, ecology, reproduction, history and other relevant sections, including material without keyword hits. Check article scope before applying facts from a genus page to a species. Source gaps remain research gaps, not an excuse to invent details or reduce a rich plant to a slogan.

## Repo conventions

- TypeScript strict. Vite + React. Persistence behind `store/`: native SQLite on Android, Dexie in the web build. Native preferences, sharing and platform UI helpers live in `native/`.
- Use photographs now. `config/appearance.ts` owns species, character and map-style overrides for later artwork; procedural pixelation is no longer active.
- MapLibre is rendered at normal resolution. Explore follows GPS; Places and Sightings maps browse freely. Never draw point sightings for unseen species.
- Tests where logic is non-trivial: ranking, cell/overlap geometry, render-time grouping.
- Commit messages: plain, present tense, one change per commit.
