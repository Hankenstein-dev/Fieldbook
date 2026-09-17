# Photo inspection and missing catalogue images

9 September 2026. Tony requested photo enlargement wherever an image appears, especially while checking a species before recording. This is implemented through shared `SpeciesImage` and `LocalPhoto` presentation, keeping later artwork overrides in `config/appearance.ts`.

Tap the photo or its expand icon to open a full-screen viewer. Pinch, double-tap, use the mouse wheel or +/− controls to zoom; drag to inspect details; Fit photo restores the entire image. The close button or Escape returns to the underlying screen, including an open species sheet, without selecting or recording anything. List photos and species-navigation buttons are separate controls. Reference photos request iNaturalist's larger rendition only when opened and fall back to the existing thumbnail if unavailable. Local photos use their retained JPEG. Credits remain visible in the viewer.

## Missing photos

The old runtime and build-time normalisers dropped every default photo outside their Creative Commons allowlist, and did not inspect alternatives. Carob (`Ceratonia siliqua`, taxon 82742) had an all-rights-reserved default photo (74990935), so its image disappeared even though iNaturalist displayed it. The country import also used `setdefault`, preventing later records from filling an existing photo gap.

Ordinary photo elements also inherited `crossOrigin="anonymous"` from the former canvas workflow. Some images on `static.inaturalist.org` do not supply those CORS headers. Display-only thumbnails now use normal image loading, as the full-screen viewer does; actual carob thumbnail and large-image loading were checked against iNaturalist. The service-worker photo cache accepts opaque image responses as well as HTTP 200 responses, retaining its existing entry/time bounds. The 10 September marker fix below also removes that unnecessary requirement from display-only map icons.

## Sighting map photographs — 10 September

Sighting markers previously used only catalogue imagery, cached by taxon ID, and stayed green when that image was missing or failed its CORS request. They now use each sighting's saved photograph, including native private photos decoded by the existing store. Sightings without a usable photo fall back to catalogue imagery. Explicit custom artwork still takes precedence for future skins. Marker images are associated with individual sightings so separate encounters of the same species can display their own photos; clustering and tapping remain unchanged.

Temporary local photo URLs are revoked after decoding, and removed sightings release their cached marker images. Catalogue marker loading no longer requests CORS access: this canvas is used only for display, not pixel export. Photos therefore remain usable on hosts that support ordinary image display without CORS headers.

Web and Android builds pass. The offline recognition/save browser regression now also checks actual photo pixels inside the journal map marker, rather than merely checking that a marker exists; it passes. The updated APK is served at the existing Android download URL. Owner-phone confirmation of the marker appearance remains pending.

Tony explicitly authorised displaying available photos regardless of licence in this private testing app. The normalisers now retain those photos and their original attribution/licence; absent licence codes are labelled `all-rights-reserved`. This is a private-use product decision, not a claim of permission for a future public release. Keep the imagery review on that release's checklist. Authored stories and their licences are unchanged.

Rebuilding from saved raw responses restored 2,108 photos, including carob. A metadata-only check of the remaining 64 taxon records supplied another two. **8,461 of 8,523 catalogue entries now have a photo available; 62 have none in the taxon records checked.** This measures available photo metadata, not guaranteed reachability of every remote image.

`config/generated/species-photos.json` provides fallback presentation for older saved queries/sightings that lack the restored photos; it also holds the two additional images. It does not rewrite sightings or model/reference data. Custom artwork still takes precedence. Catalogue metadata is larger, so the PWA per-file precache limit is now 4 MB; model downloads and cache names are unchanged.

Regenerate using:

```sh
python3 scripts/prepare_catalogue.py --offline
python3 scripts/prepare_fieldbook.py --offline
python3 scripts/prepare_species_photos.py --offline
npm run build
```

Omit `--offline` from the last preparation script to fetch missing taxon metadata. It uses paced batches of 30 on the free iNaturalist endpoint and saves source URLs/timestamps in `data/species-photos/`; reruns reuse those responses. It downloads no images. Coverage results are in `data/species-photos/report.json`.

## Validation

59 unit tests and the production build pass. All 14 browser scenarios have passed: the existing 13 flows, plus mobile photo enlargement/zoom/return navigation. After the display CORS correction, the photo viewer and existing offline-reopen scenario were rerun successfully. The viewer test uses touch events for pinch, verifies the larger rendition, thumbnail fallback, nested-dialog Escape handling, local-photo enlargement and absence of nested buttons. A separate browser check loaded the actual carob image from iNaturalist in both the species sheet and full-screen viewer; the mobile viewer layout was visually inspected. Actual Android gesture ergonomics remain for the owner to try.
