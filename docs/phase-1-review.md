# Phase 1 — ready for a phone walk

Built on 8 September 2026. The app is implemented and tested in Chromium at desktop and phone widths. **The actual outdoor acceptance walk has not been performed.**

The agreed done-when line remains:

> Standing in Portimão, open the URL, see the pixel map with you facing the right way, read what's of note, tap a different zone (the wetland behind the beach) and get a different plant list using habitat from the tile feature, log a plant on the walk, reload, it's still on the map where you logged it.

Scope is Portugal and plants, both selected through configuration. Sea habitats and group strategies are mechanisms; camera identification, additional animal configurations and the full silhouette collection are later phases. Story copy is still Tony's draft review material.

## Try it

```sh
npm ci
npm run dev
```

Open **http://localhost:5173** on this computer. The app opens immediately with a real starter-area field card; granting location moves it to your physical position. Use “Explore map centre” or tap the map to browse elsewhere. Open a species, read the full story and press “I’ve seen this”. A fresh physical location is required to save.

For local HTTPS, `npm run dev:https -- --port 5174` serves **https://localhost:5174**. A phone needs a reachable network address and a trusted certificate. The local certificate is for development; a trusted public HTTPS URL still requires static deployment. No deployment or hosting account change has been made.

For the actual install/offline experience, use `npm run build && npm run preview -- --port 4173`. Vite development mode intentionally leaves the production service worker off. Browser data is separate for each origin/port, so sightings made in development do not appear automatically in preview or on a deployed URL.

## What is working

- **Around:** a cell-based, year-round list fetched across all iNaturalist result pages. Stories, habitat affinities and observation counts influence ranking; none exclude species. “See all” renders 50 entries at a time, with search across the entire result set.
- **Stories:** the existing 176 readable drafts, with multiple paragraphs and full length. Evidence quotations remain in editorial files. Sources, revision links and image attribution appear separately below the story. Species without stories have reference information and remain loggable.
- **Map:** real self-hosted PMTiles, north-up, quarter-resolution drawing, shared palette, GPS avatar, heading, zoom, overview, tappable geometry and saved sighting sprites. Same-species sightings cluster by screen distance and split as you zoom in. Tapping a saved sprite reopens its species.
- **Habitat:** tile polygon geometry, including holes, read at native zoom 13. Beach, wetland and sea taps were tested against actual extracted tiles. Water subtype attributes distinguish rivers and lakes; generic water stays generic. Fifty-three broad, source-backed plant affinities provide the initial habitat ranking.
- **Logging:** fresh actual coordinates, time, accuracy and a species snapshot stored in IndexedDB. Anything can be logged by name. An absent candidate gets “unusual here”; an unavailable local list does not block saving or produce an unsupported unusualness claim.
- **Interests and visits:** interests persist and shape nearby results and map sprites. Logging an existing configured interest while it is off offers to enable it. Explored cells do not enter the physical-visit union. The sightings history and JSON export are available; the richer collection grid comes in Phase 3.
- **Offline/PWA:** install manifest and icons, cached app shell, bounded photo caching, complete species queries and decoded visited tiles. An offline reload keeps the map and sightings. Export is available before changing devices or clearing browser storage.

The catalogue is deliberately larger than the stories. The bundled starter cell has **1,019 taxa within its 8.2 km centre-query radius**; 300 enriched reference records and 176 stories are separate datasets. A different cell gets its own live query or its previously saved query. A sparse query widens automatically to 25 km. Failed/incomplete downloads never become a supposedly complete list.

## Validation

- Production build and strict TypeScript checks pass.
- 24 TypeScript logic tests cover overlapping coverage, polygon holes, ranking without exclusion, clustering, pixel quantisation, compass wraparound, persistence, pagination, rate-limit backoff, query reuse, widening and offline fallback.
- Six production browser checks cover real habitat taps and changed leading plants, fresh-coordinate saving while exploring, reopening a persisted sprite, an uncapped mobile catalogue, unusual name-based logging, persistent interests, cached photos, offline reload, denied-location handling, exploration versus physical visits, and rendered inland/sea pixels.
- 17 existing Python tests pass. `review_stories.py --check` still validates all 176 stories and all 300 research outcomes without network access.
- Local HTTPS was verified as a secure context, with location permission and a synthetic absolute orientation event producing the expected 90° heading.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
python3 -m unittest discover -s tests -q
python3 scripts/review_stories.py --check
```

Chromium needs its normal system libraries. In this coding environment they are unpacked under `~/.cache/pwdeps/root/usr/lib/x86_64-linux-gnu`, so browser tests were run with that directory in `LD_LIBRARY_PATH`. On a standard development machine use Playwright's system-dependency setup if needed.

Browser location is simulated. Chromium 153's CDP location override returned `POSITION_UNAVAILABLE` for `maximumAge: 0`; tests therefore stub the fresh-fix hardware call while retaining native simulated location watching, real application logic, map data, IndexedDB and the production service worker. The app itself still requests a fresh fix. Real GPS responsiveness, sensor accuracy, permission behaviour and battery use remain phone checks.

## Data and implementation notes

`config/map-build.json` pins the 7 September 2026 Protomaps build. Eighteen archives cover the mainland and islands, totalling 226.9 MB; each is below 24 MB. The browser reads ranges rather than fetching the country. Roughly 2.9 MB of uncompressed app assets, including the local content, are precached separately. Native map data stops at zoom 13; display zoom goes to 17. A tiny verge or stream drawn only as a line may not have its own habitat polygon. The broader Phase 4 habitat work is still planned.

A follow-up map rendering check caught false inland lakes: the mixed water tile layer contains line features as well as polygons, and its unfiltered fill was closing stream lines into blue areas. All area fills now require polygon geometry; waterways remain separate lines. The regression test reproduces the old failure on two inland points and checks that actual sea still renders blue. Habitat lookup already excluded line geometry, so this fix changes rendering rather than recorded locations or habitat classification.

Only `store/` imports Dexie. Geolocation and orientation access stay in their hooks. Country/group selection, source configuration, affinities and palette live in `config/`. MapLibre transfers tile buffers to its worker, so the renderer sends a copy and preserves the shared habitat/cache buffer. The worker uses [MapLibre's Vite worker bundling setup](https://maplibre.org/maplibre-gl-js/docs/).

There are no runtime keys, paid APIs, proxies, analytics or model calls. iNaturalist requests are serialized with a 1.1-second minimum interval; quota exhaustion stops requests temporarily. Cached queries live for 14 days and can be served stale when refreshing fails. The app-shell service worker excludes whole PMTiles archives. Decoded visited tiles have an approximate 96 MiB cap; photos have a 250-entry/90-day cap. Browser eviction still applies. Photographs without a suitable derivative licence use a generic pixel illustration instead.

Rebuild catalogue, maps and icons using the commands in [README](../README.md). The map script skips an unchanged complete build and changes output names when build configuration changes. Retired archives can be removed after confirming a new build; they are never required by the new generated manifest. Raw research remains build-time material and is not copied into `dist/`.

## Outdoor acceptance, then Phase 2

1. Serve the production build on trusted HTTPS, open it on the phone and allow location. Check that the avatar follows the walk. Check heading while facing known directions; grant compass permission in Settings if the browser requires it.
2. Read several stories and their sources. Confirm the text size and map controls work in sunlight and with one hand.
3. Tap the beach and then the wetland behind it. Confirm the habitat labels and leading plants change. Return to your position.
4. Recognise and log a plant. Walk away so the avatar no longer covers its sprite, reload and tap the sprite to reopen the species.
5. After browsing the area online, reopen it offline. Check sightings, the visited map and cached list. Export the notebook and inspect the saved coordinates and timestamps.

Once that walk is satisfactory, the next build step is the **Phase 2 phone spike**: load BioCLIP on the actual device and time one embedding before building the camera workflow.
