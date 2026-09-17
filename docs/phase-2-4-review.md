**Superseded UX:** [the UX rebuild](ux-rebuild.md) replaces the navigation, pixel treatment and visited-cell collection progress described here. The recognition, persistence and depth mechanisms remain in use.

# Identification, collection and depth — 9 September 2026

The functional build is ready for use and device testing. The current UI is a working interface for these features; the broader UX review remains next. Actual Android Chrome acceptance, outdoor recognition accuracy, and the final map silhouette presentation have not been signed off. Nothing has been deployed.

## What works

**Identification:** camera/file input, up to three photos, on-device BioCLIP 2 inference in a worker, best match first, optional alternatives, explicit regional/country widening, description matching, and name lookup. Confirming a species saves a downscaled photo with a fresh physical location; a model result never logs automatically. Identification ignores browsing interests. If a photo result is unhelpful, name lookup retains that photo. Offline name lookup includes the downloaded country catalogue.

The reference pack contains 25,067 taxa: 25,025 from the country query and 42 additional taxa in the dated starter list. Photo classification compares the query image against consistent taxonomic text embeddings. Mixing photo references for some species with text references for others would favour the species with photos. Missing text references can be computed and cached on-device. The worker is released when leaving identification, and cancellation stops inference. Concurrent requests for the same widening list share their work; a cancelled caller can leave that shared list request finishing in the background. Saved lists remain usable immediately while stale lists refresh.

**Collection:** one grid over the physical visited-cell union within current interests, seen/unseen treatment, progress counter, group/recency ordering, and visited-cell map patches for a species. Remote map exploration does not add to the denominator. Extra sightings outside visited catalogues remain in the book and are counted separately. Exact scientific names reconcile fallback and primary entries; this is not a general synonym-resolution system. Country observation-density tiles are available for iNaturalist taxa, with visited tiles cached offline. Empty/offline density tiles do not imply absence.

**Depth:** cached monthly observation histograms, twelve-month strips, evidence-based seasonal labels and small ranking nudges. Species are never removed for being out of season. Visible story cards receive background enrichment; the app does not request a histogram for every taxon. Labels describe observation frequency, not flowering dates, abundance or guaranteed presence. Habitat reads polygon geometry and mapped watercourse lines within a narrow ten-metre tolerance. Small unmapped verges remain a source-data limitation. Existing source-backed habitat affinities remain intact.

**Supplementary records:** sparse or unavailable iNaturalist queries use GBIF species facets and OBIS checklists over the same area. Both can be checked regardless of the tapped habitat: the circle may include marine ground, and habitat must not exclude local species. Group mappings remain config, with only plants enabled. Pagination has no application species cap. Repeated full pages and incomplete checklists fail explicitly. A successful first-radius list survives failed widening. Provider counts retain their provenance and use the maximum rather than a sum because observations may overlap. Partial results carry warnings, retry sooner, and do not support an “unusual here” assertion when logging.

**Persistence:** Dexie v2 migrates an existing notebook and retains species metadata independently of query caches. Notebook export schema v2 includes photo bytes, sighting/model provenance, visited areas, their stored species metadata and preferences. No import/sync feature has been added.

## Download and model evidence

The complete explicit download is now approximately **360 MB** using lossless gzip. It unpacks to **545 MB** of assets (the raw breakdown below); reference indexing and other browser storage are additional. See [the size review](recognition-size-review.md) for the compressed breakdown.

| Asset | Bytes |
| --- | ---: |
| Image encoder, int8 | 306,917,008 |
| Text encoder, int8 | 124,545,619 |
| Taxon reference pack | 85,562,124 |
| ONNX runtime | 25,801,280 |
| Tokenizer/config | 2,224,786 |

Ordinary browsing does not start this download. Completed model chunks survive cancellation and are reused on retry; all newly downloaded recognition assets have SHA-256 checks after decompression. Existing decoded cache entries remain usable. Browser storage overhead, cached maps and photos are additional. The runtime reads its cached module and WASM bytes directly, since worker module fetching did not reliably use the service-worker cache during the spike. It attempts WebGPU and falls back to WASM. The path running on a specific Android device still needs verification.

The original roughly 90 MB estimate was incorrect. There is no backend or inference API, and no per-use model charge. User photos stay on the device. Static assets are served from the app’s own host.

A real desktop Chromium spike identified a strawberry-tree photo after a full offline reload in about 3.8 seconds end to end (cold load included); the text tower also ran offline. This is not a phone timing. A small convenience sample of 21 curated taxon photos across seven plants ranked the correct species first 19 times and in the top five 21 times, against 977 starter taxa. Those images may overlap model training. This does **not** establish field accuracy or a confidence threshold. The top result is a suggestion, and alternatives remain available; unrelated-photo rejection and calibrated certainty are not established.

Evidence: [browser spike](identification-browser-spike.txt), [sample and credits](identification-sample.json), [text export parity](identification-text-parity.txt). The text export loaded every original checkpoint key; the checked quantised text vector had cosine 0.991811 against the original encoder.

Description matching is a secondary narrowing tool. The integration test using a taxon name verifies the text tower; it does not establish accuracy for ordinary prose descriptions. Broader description evaluation is still needed.

## Validation and next use

- 50 TypeScript unit/integration tests cover ranking, migration, collection unions, source merging/pagination/partial failures, shared widening and cancellation, geometry, gzip decoding, corrupt/truncated downloads and cancellation.
- **9 production browser tests passed for the functional build; the real recognition test also passes again after the compression change**, covering compressed-only downloads and retry across a reload. The suite includes real offline model inference after reload, photo logging/export, photo-to-name fallback with interests off, collection persistence, physical-location integrity, map rendering and provider outages. Tests simulate GPS and selected source APIs; recognition uses the actual shipped weights, runtime and a credited image fixture.
- 17 Python tests pass; offline story checks validate 176 stories and account for all 300 seed taxa. Stories remain authored drafts, with Tony’s final copy review pending.
- Production build succeeds. The runtime dependency audit reports zero vulnerabilities. No new countries, animal-interest configs, paid services or deployment were added.

Run `npm run dev` for development, or `npm run build` followed by `npm run preview -- --port 4173` for the service worker and offline flows. On this machine browser tests require:

```sh
LD_LIBRARY_PATH=/home/hankenstein/.cache/pwdeps/root/usr/lib/x86_64-linux-gnu npm run test:browser
```

On Android Chrome, use a trusted HTTPS origin. Open Identify, download recognition files on a suitable connection, and prepare the local list while online. Photograph a plant, compare the result with its features, confirm, and check its map location. Then reload with the network off and repeat. A never-visited area’s local list is not automatically available offline; the downloaded country list and saved name search are the fallbacks. Please measure first and subsequent recognitions, and try leaves, flowers, whole plants, close lookalikes and non-plant images.

The next product discussion can now focus on UX: entry into the camera, how a result and story are presented, the role of collection/progress, and the map’s unseen-species presentation. Do not place unseen-species markers at invented observation coordinates. Outdoor acceptance and these presentation decisions remain separate from the completed functional wiring.

## Rebuilding recognition assets

Prepared assets are already on disk and are sufficient to run/build the app. The temporary Python environment used for the initial exports was removed by the overnight shutdown. To reproduce the model work, create a separate venv and install CPU PyTorch/torchvision, OpenCLIP, ONNX, ONNX Runtime, NumPy, Pillow and safetensors. The original successful versions included torch 2.14, torchvision 0.29, open_clip_torch 3.3, onnx 1.22 and onnxruntime 1.29. Follow the package projects’ installation instructions for the host platform; these are build tools, not runtime dependencies.

Run `scripts/prepare_identification.py` for pinned model chunks/tokenizer, then `scripts/prepare_references.py` for references. These reuse raw downloads under data/models. `scripts/evaluate_identification.py` reruns the convenience sample using configured taxon IDs; with all current references it searches more candidates than the original 977-candidate report. `node scripts/prepare_runtime.mjs` is already a predev/prebuild hook. Keep active manifests and their assets together. Model attribution is in public/models/NOTICE.md, with license texts beside the assets.
