**Superseded experience details:** [10 September walking and discovery update](experience-rebuild.md) replaces the default long list and confirmation-first identification with the agreed game flow and minimal interface. The collection, geography and art infrastructure below remains applicable.

# Explore and Fieldbook rebuild — 9 September 2026

This implements the whole UX discussion: default walking mode, identification as an action, a lifetime collection with geographical checklists, repeat sightings, and replaceable imagery. It supersedes the navigation, procedural pixel art and visited-cell collection denominator in earlier phase reviews.

## Using it

- **Open the app:** Explore follows your physical position. The map leads, nearby species are immediately below on phones, and uncollected species are prioritised without hiding the others. Background map taps do not change the place you are exploring. Zoom and sighting inspection remain available. Without location permission, the app explains what is missing and offers Fieldbook browsing; it never claims the configured starting point is your location.
- **Identify:** use the floating action, take/choose a photo, inspect the suggestion and explicitly record it. After saving from Explore, the sheet closes and the sighting appears on the map. Fieldbook progress updates in the background. A repeat encounter follows the same path. Description and name lookup remain available; photo-to-name fallback retains the photo, including when returning to identification. Cancel creates no sighting. Starting identification from Fieldbook returns to that experience.
- **Fieldbook:** one tap from Explore. Species shows the country checklist plus extra recorded species, with search, collected/faded entries and links to occurrences or personal sightings. Places offers fixed zones and their checklists. Sightings shows every recorded encounter and its map; selecting a species can restrict that map to its own history. Nearby same-species records cluster with a count; the dated list retains each individual encounter.
- **Return to Explore:** the map resumes following your current physical position. Looking at a remote zone never changes recording coordinates or physical visit history.

## Checklists and zones

A species is collected globally. Country and zone checklists consult that lifetime status, so a sighting anywhere fills every applicable checklist. Regional travel never demands another encounter with an already-collected species. You can still record it again wherever you find it.

The current country catalogue contains **8,523 taxon records, coalescing to 8,496 exact scientific-name entries** before any personal records are added. It combines the existing national reference metadata with all taxa returned by the new zone queries. This is separate from both the 300-taxon story seed and the 25,067-taxon recognition reference pack. No model weights were changed.

The initial **20 fixed zones** use iNaturalist standard district/autonomous-island boundaries. Algarve uses the Faro district boundary with a friendlier display name; the remaining mainland labels are districts, plus Madeira and Azores. These are practical initial zones, not a claim that administrative boundaries perfectly describe habitats. `config/zone-build.json` and the retained source places make that choice reviewable and replaceable. Smaller habitats and the nearby lookup circles do not define collection progress.

Each checklist is a complete paginated snapshot of iNaturalist species-count results for its exact source place and configured groups. Dates and links accompany the checklists. Missing records are not proof of absence; recorded presence is not a promise of finding the species. The numbers describe these dated checklists, not an exhaustive inventory of all biodiversity.

- Sources: [iNaturalist places](https://www.inaturalist.org/places), [Algarve/Faro source boundary](https://www.inaturalist.org/places/13201), [species records for that place](https://www.inaturalist.org/observations?place_id=13201&view=species). Every zone also retains its own source URL.
- Raw place geometry and paginated query envelopes are retained under `data/zones/`.
- Rebuild deterministically from retained responses: `npm run prepare:fieldbook`.
- Refresh checklists deliberately: `python3 scripts/prepare_fieldbook.py --refresh`. This uses free public requests, paced at build time; it does not run during ordinary dev/build.
- Generated boundaries, checklists and country metadata live under `config/generated/`. The PWA precaches them so sofa browsing and country name lookup work offline after setup. The app shell plus metadata is now about **6.2 MiB raw**, before HTTP compression, with photos and map tiles cached separately. The optional recognition download remains **360 MB compressed / 545 MB unpacked**.

## Artwork later

Active screens use credited photographs, a simple location dot and normal-resolution map rendering. Missing photos use a neutral icon. Uncollected entries are faded and labelled; final silhouettes can be supplied later. No stories were rewritten.

Add a species asset by taxon ID in `config/appearance.ts`:

```ts
speciesArtwork[82689] = {
  url: '/art/species/82689.png',
  attribution: 'Your credit',
  sourceUrl: '/art/credits.html',
  license: 'Your chosen license',
  pixelArt: true,
};
```

Place files under `public/art/`. Entries without overrides keep their photographs. `appearance.character` replaces the location dot; `appearance.mapStyle` replaces the map style. `appearance.pixelMap` optionally selects low-resolution map rendering. Artwork resolution and credits belong to presentation; species identity, sightings and progress do not depend on it. Existing canvas pixelation code is retained as an unused utility, not part of the active visual treatment.

## Validation

- 53 TypeScript tests pass, including global checklist credit, repeated encounters, fixed denominators, zone geometry and complete metadata coverage.
- Production build passes. Vite notes large static catalogue chunks; each remains within the PWA's 3 MB per-file precache limit.
- Browser coverage includes walking follow, remote-tap isolation, real compressed model download/resume, offline inference, photo retention/export, lifetime country/zone credit, repeated sightings, physical-location integrity, and mobile layout. The full 10-test suite passed. Visual review then found and fixed a resize/re-entry centring issue; the new regression test and both existing map checks also pass (11 distinct browser scenarios verified). Mobile and desktop screenshots were inspected, with no horizontal overflow.
- Actual Android camera ergonomics, outdoor location/heading and inference time/memory remain phone acceptance work. Final artwork and finer regional design remain later layers.
