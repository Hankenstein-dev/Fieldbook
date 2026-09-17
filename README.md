# Fieldbook

iPhone testing uses the shared web app with separate device data and full-photo exports: [iPhone setup and deployment](docs/iphone-testing.md). Build with `npm run build:web`, then publish to the existing Boombop hosting with `npm run deploy:web`.

Android Chrome testing over Wi-Fi, camera/gallery selection and desktop diagnostics: [setup and test guide](docs/android-testing.md). Use `npm run phone` after the documented local certificate/network setup; rebuild with `npm run build` to update that production preview.

**Current build:** identification, collection and seasonal/source depth are wired and ready for device testing. See [the UX rebuild](docs/ux-rebuild.md) and [Android testing](docs/android-testing.md). Android Chrome acceptance and further UX iteration remain next.

A personal wildlife fieldbook with plant stories, a following map, and a lifetime collection of sightings. Initial scope: Portugal, plants. Web/PWA first, Android via Capacitor later. See [SPEC.md](SPEC.md) for product decisions and [CLAUDE.md](CLAUDE.md) for working conventions.

## Run the app

The app opens in Explore, following your walk with nearby discoveries and a direct Identify action. Fieldbook is one tap away for the country catalogue, 20 fixed-zone checklists and all your personal sightings. Collected status carries everywhere; repeat encounters remain separate records. Photographs and map markers can be replaced with your own artwork later. Read [the UX rebuild](docs/ux-rebuild.md) for the current experience. The outdoor acceptance walk is still pending. [Phase 1 notes](docs/phase-1-review.md) describe the original field-card build; [the earlier functional review](docs/phase-2-4-review.md) covers the underlying plumbing.

Use Node 24 (see `.nvmrc`), then:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. For a local HTTPS development server:

```sh
npm run dev:https -- --port 5174
```

The generated development certificate needs to be trusted on a phone. A phone opening an ordinary LAN HTTP address does not get secure-context GPS/PWA capabilities. Production hosting must use trusted HTTPS.

```sh
npm run build
npm run preview -- --port 4173
npm test
npx playwright install chromium
npm run test:browser
```

The browser tests use the production build and its service worker. Install Chromium system dependencies with Playwright's documented setup if your machine lacks them. GPS is simulated in those tests; they do not replace a phone walk. Development mode does not register the production service worker.

No API key, production backend or paid runtime service is used. Local dev/preview tooling has an optional diagnostics receiver for phone testing. Recognition now has an explicit optional download of approximately 360 MB (gzip), unpacking to 545 MB of assets; ordinary browsing does not download it. Existing generated data and map extracts are ready to run. The starter cell has a dated, real **1,019-species query**, separate from the 300-species reference corpus and 176 authored stories. Elsewhere the app fetches every page of the appropriate nearby query.

## Rebuild the data

```sh
python3 scripts/prepare_catalogue.py
python3 scripts/prepare_catalogue.py --offline
python3 scripts/prepare_maps.py --pmtiles /path/to/pmtiles
python3 scripts/prepare_icons.py
```

The catalogue builder consumes the retained taxon corpus and queries the configured starter cell. The map builder uses the [PMTiles CLI](https://docs.protomaps.com/pmtiles/cli) with the dated source and coverage in `config/map-build.json`; it skips an unchanged complete build. `public/maps/` currently contains 18 archives, 226.9 MB in total, each under 24 MB, covering mainland Portugal, Madeira and the Azores through native zoom 13. Map bytes are requested in ranges and visited vector tiles are cached locally; the entire country is not downloaded on first open.

Deploy **only `dist/`** to a static HTTPS host that supports HTTP Range requests (`206` responses). Preserve the PMTiles files as binary assets and serve the map worker as JavaScript. Choose hosting whose free quota cannot turn into usage charges. The iPhone tester is deployed through the separate `dist-web/` build; see [iPhone hosting](docs/iphone-testing.md). Raw research under `data/raw/` is not copied to the app bundle.

## Stories drafted for review

The full-catalogue source-gathering pipeline is documented in [plant source collection](docs/plant-source-collection.md). Run `python3 scripts/collect_plant_sources.py` to collect original material for every configured plant entry, or add `--check` to validate the retained collection offline. This does not use an LLM or modify the existing stories.

The [250-plant Sol high pilot](docs/plant-content-250-review.md) measures the reduced paragraph/food/toxicity format, generation-agent tokens, elapsed time and a source-based quality sample. Browse the [draft reading copy](data/analysis/plant-content-v2/review.html). The [earlier content pilot](docs/plant-content-pilot.md) and [ten-plant model comparison](docs/plant-content-model-comparison.md) record the previous experiments. Analysis and model drafts are separate from the app's authored stories.

Phase 0 collected the raw material for the stories. Stories are readable summaries of the interesting things about each plant, written in an enthusiastic, friendly educator's voice. They include multiple interesting facts when the source supports them, with no fixed word count. Tony reviews and locks the final text; the seed script only collects the raw material.

The full-article pass is complete: **176 draft stories**, with all 300 taxa accounted for. Start with the [reading copy](docs/stories-pt-plants.md), or the [Phase 0 review](docs/phase-0-review.md) for findings. The [research list](docs/stories-pt-plants-research.md) records why the other 124 taxa still need sources or stronger material. This is a curated seed, not a promise of one story per catalogue entry.

The authored copy is in [stories/pt/plants.json](stories/pt/plants.json). Quotations, source-scope decisions and research notes live separately in [plants.review.json](stories/pt/plants.review.json). See [the story editing guide](stories/README.md) for the format and attribution rules. Tony's final copy review is still pending.

Python 3.10+ is sufficient; no dependencies or API keys are needed for the seed.

```sh
python3 scripts/seed_stories.py
python3 scripts/seed_stories.py --count 500
python3 scripts/seed_stories.py --offline
python3 scripts/review_stories.py
python3 scripts/review_stories.py --check
python3 -m unittest discover -s tests -v
```

The default selection and sample size (300) live in `config/seed.json`. Country/place IDs and group/taxon selections live in `config/countries.json` and `config/groups.json`. Runtime configuration also contains map coverage, appearance overrides, fixed zones, habitat mappings, starter location, interests and ranking strategies.

The script uses iNaturalist's `observations/species_counts`, ordered by local observation count, with no seasonal or quality-grade filter added. It batches taxon details with all names, then follows their Wikipedia links to fetch both complete introductions and full plain-text articles with section headings. Full articles are the source for story drafting; introductions are retained for comparison. It follows Wikipedia redirects and marks missing, empty, or disambiguation pages explicitly.

Requests run sequentially, at least 1.1 seconds apart, with bounded retries for transient failures and `Retry-After` handling. Responses are cached so interrupted runs can resume. `--refresh` fetches a fresh snapshot; `--offline` forbids network access and fails if any required response is uncached. Use the same `--count` for exact offline replay. `--output PATH` selects a separate corpus/cache for experiments.

## Output

Under `data/raw/<country>/<group>/`:

- `<taxonId>.json`: full taxon detail, original species-count record, local observation count, names, Wikipedia introduction and full article/page metadata, source URLs, retrieval times, rights metadata, and keyword-hit sentences.
- `manifest.json`: selected IDs in rank order, source queries, and config snapshot. This defines the current run; older taxon files may remain when reducing the sample.
- `report.json`: introduction length/status, naming coverage and keyword tallies; `articles` contains the equivalent full-article analysis and source-scope review IDs.
- `_http/`: replayable HTTP response cache, excluded from Git. Per-taxon files retain the data needed for manual review without this cache.
- `supplementary/`: retained article lookups, companion articles for olive and myrtle, and short additional-source excerpts used for editorial checks. These are source records, not runtime requests.

Raw text remains unchanged. Keyword matching is a heuristic: it catches words inside negated claims, misses paraphrases, and does not validate medicinal uses, edibility, lookalike identities, or local invasive status. Source sentence splitting is approximate. Full-article keyword matching excludes reference lists, external-link sections, galleries and their subsections. No keyword candidate is automatically promoted to a story tag. A "thin" text has fewer than 60 whitespace-separated words; this measures length, not value. Keyword analysis only runs on the configured summary language. Name coverage means a valid iNaturalist name exists in that language, not that it is locally preferred.

The review script never generates prose or calls an API. It validates coverage, IDs, tags, quotations, saved revisions and attribution, then renders the reading copy and research list. `--check` also detects stale generated documents. These are structural checks; they do not independently establish botanical truth. A refreshed source snapshot requires another evidence review before updating the sidecar.

The story seed preserves photo attribution and license codes without downloading images. Recognition experiments retain credited photos separately under data/models; the runtime reference pack contains text embeddings. Wikipedia page URLs, revision IDs (when supplied), and site rights metadata are retained for later attribution and source review. Raw material is build-time research data, not a frontend asset bundle.

Source API documentation: [iNaturalist API](https://api.inaturalist.org/v1/docs/), [iNaturalist recommended practices](https://www.inaturalist.org/pages/api+recommended+practices), [MediaWiki TextExtracts](https://www.mediawiki.org/wiki/Extension:TextExtracts).

Recognition downloads are compressed automatically before `npm run dev`, `dev:https`, and `build`. The build verifies source hashes, reuses unchanged gzip files, and generates `config/generated/recognition-downloads.json`; no model export or network request is needed. Serve `dist/recognition-downloads/` as ordinary static files alongside the rest of `dist/`. The client unpacks and verifies each asset before caching it, without requiring host-specific compression headers. Do not add the recognition pack to the app-shell precache. See [the size review](docs/recognition-size-review.md) for transfer versus storage details.

Fixed-zone and country metadata can be regenerated offline with `npm run prepare:fieldbook`. Source boundaries and dated API responses are retained under `data/zones/`; `config/zone-build.json` controls labels and the source place file.
