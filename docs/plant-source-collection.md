# Plant source collection

This is the source-gathering foundation for broader plant cards. It downloads original material using scripts only: no LLM calls, summaries, inferred facts, or runtime services.

The scope is every plant entry in `config/generated/country-catalogue.json`, including species, hybrids and broader ranks supported by identification. It is a snapshot of the app's catalogue, not a list of every plant worldwide. Source availability and botanical review are separate from collection completeness.

## Completed snapshot — 12 September 2026

All **8,523 catalogue entries** are accounted for. The collection contains **11,135 distinct available Wikipedia article revisions** across English, Portuguese, Spanish and German, from 18,590 title lookups. The supplementary botanical dataset contains 772 records, including 400 descriptions; 229 catalogue entries have an exact name/rank match to description material. These supplementary matches overlap Wikipedia coverage.

| Source material outcome | Catalogue entries |
|---|---:|
| Text with an automated taxon-name match | 7,045 |
| Text found, but taxonomic scope needs review | 495 |
| Taxonomy retained; narrative sources still missing | 983 |
| Total | 8,523 |

For species-rank entries alone, 6,558 of 7,350 have some source text (416 require scope review), and 792 have taxonomy only. The remaining catalogue entries are hybrids, genera and other ranks.

The historical-name pass retained full iNaturalist name evidence for 1,062 entries, tried 1,318 additional article titles and recovered text for 58 previously taxonomy-only entries. Names marked invalid/historical were used for discovery only, not accepted as verified synonyms.

The retained corpus and HTTP caches occupy approximately **404 MiB on disk**, entirely outside the frontend bundle. No model API was called, and no summaries or card copy were generated. Existing authored stories and their evidence remain unchanged.

The full offline rebuild completed with **zero network requests**. Integrity checks passed for all 8,523 taxon records and 18,590 article references; 29 relevant unit tests passed, as did the existing 176-story evidence check. These checks establish file consistency and provenance, not botanical truth or editorial approval.

Review the [coverage spreadsheet](../data/raw/pt/plants/sources/coverage.csv), [machine-readable report and remaining gaps](../data/raw/pt/plants/sources/report.json), and [manifest](../data/raw/pt/plants/sources/manifest.json). The 983 taxonomy-only entries still need alternative botanical sources or further name resolution; they are not ready to be treated as researched plant cards.

## Run and resume

```sh
python3 scripts/collect_plant_sources.py
python3 scripts/collect_plant_sources.py --check
python3 scripts/collect_plant_sources.py --offline
```

The supplementary botanical dataset pass can run independently; run the main collector again afterwards to incorporate its index (cached Wikipedia responses are reused):

```sh
python3 scripts/collect_botanical_sources.py
python3 scripts/collect_plant_sources.py --offline
python3 scripts/collect_plant_sources.py --check
```

The configured initial dataset is the GBIF/Plazi digitization of *Lista Vermelha da Flora Vascular de Portugal Continental* (2020; assessments 2016–2019). Original dataset metadata, citation, licence and complete paginated taxon records with descriptions are retained under `supplementary/gbif/`. Only exact canonical-name **and rank** matches are linked to catalogue entries; unmatched source records are retained for subsequent synonym research. Its regional conservation statements describe mainland Portugal at the assessment date, not current global status. No assessment or factual claim is approved by downloading it.

The first command resumes from saved article records and HTTP responses. Saved article hashes are checked before reuse, and article reuse is independent of batch boundaries: adding catalogue entries does not force existing article downloads. Requests are sequential, at least 1.1 seconds apart, and respect `Retry-After` for rate limits. Wikipedia `maxlag` responses are retried with backoff. Interrupted or failed requests are not cached as successful source lookups. A failed run leaves `collectionComplete: false`; rerun the same command to complete it.

`--check` validates the manifest, taxon IDs, content hashes, article references, revision provenance and coverage totals entirely offline. It does not assess botanical truth. `--offline` rebuilds the outputs from retained upstream taxonomy caches and HTTP responses and fails on any cache miss.

For a small separate experiment:

```sh
python3 scripts/collect_plant_sources.py --limit 50 --output /tmp/fieldbook-source-pilot
python3 scripts/collect_plant_sources.py --output /tmp/fieldbook-source-pilot --check
```

`config/source-collection.json` controls catalogue input, reusable taxonomy cache locations, output directory, languages and batch size. Country and group come from `config/seed.json`. A limited run requires a separate output directory to avoid replacing the full manifest with a pilot.

## Retained material

Under `data/raw/<country>/<group>/sources/`:

- `manifest.json`: catalogue identity/hash, selected taxon IDs, settings, collection method and completion flag.
- `taxa/<id>.json`: original iNaturalist taxon record and retrieval provenance, app catalogue identity, source references and coverage status.
- `articles/<language>/<requested-title-hash>.json`: complete Wikipedia revision wikitext, canonical page title/ID, revision ID/time/link, SHA-256 content hash, rights metadata, original API request URLs and retrieval timestamps. Missing/disambiguation/empty results are retained too.
- `report.json`: aggregate counts and entries needing additional sources or scope review.
- `coverage.csv`: one row per catalogue entry, with source availability, rank and links; suitable for spreadsheet review.
- `name-lookups/<id>.json`: complete iNaturalist taxon-detail responses used to discover historical scientific names, with original retrieval provenance and record hashes.
- `_http/`: resumable original API response cache; excluded from Git.

Taxonomy is reused from actual provider responses already retained by the app, with original retrieval dates. Missing taxonomy records are fetched in batches. Image URLs and rights may be present inside taxon records; images themselves are not downloaded.

The Wikipedia pass looks up the scientific name in English and any existing iNaturalist Wikipedia link. It follows redirects and retrieves linked articles in the configured second language. Entries without an article whose title matches the scientific name also receive an exact scientific-name lookup in that language. The default second language is Portuguese. Entries still lacking a potentially relevant article or matched botanical description receive scientific-name lookups in `fallbackLanguages` (initially Spanish, then German). A genus redirect does not prevent this fallback. Foreign-language text is retained as originally published; this step does not translate it.

When `lookupHistoricalNames` is enabled, remaining gaps receive batched iNaturalist detail lookups with all names. The collector tries associated scientific names (including names marked invalid/historical) in English Wikipedia, as well as the latest provider Wikipedia link and scientific name. Common names are not guessed. Names marked invalid can include misapplied names: these are search candidates, **not verified synonyms**. Articles found under other names remain flagged for taxonomic review. The source record links the retained name evidence used for these lookups.

The [MediaWiki revisions API](https://www.mediawiki.org/wiki/API:Revisions) allows batch retrieval of full source wikitext, unlike the single-full-extract constraint of TextExtracts. The collector follows API continuation rather than accepting truncated batches. It keeps the full text, including section headings, citations, external links and template markup. **It does not expand templates or download their transcluded bodies.** This is original source material, not rendered plain text. Future deterministic parsing can produce a reading derivative while retaining this original evidence.

## Reading coverage correctly

- `article_title_matched`: an available article's canonical title matches the scientific name after basic whitespace normalization. Hybrid markers are preserved. This is an automated routing hint, not verified taxonomic equivalence or approved claims.
- `articles_need_scope_review`: articles were found, but none has that title match. Common-name pages and synonym redirects may be useful; genus pages may be too broad.
- `taxonomy_only`: a provider taxonomy record exists, but the configured Wikipedia lookups found no available narrative article. This remains a research gap, not a completed plant card.

All records remain `unreviewed`. The report makes no claim that every species has enough material for an overview or interesting fact. A completed collection means every selected entry has been accounted for and its configured lookups have finished. Additional botanical sources, synonyms and languages can be added in later passes without discarding the retained material.

`coverageStatus` reports Wikipedia coverage specifically. `botanicalSources` links supplementary descriptions. `sourceMaterialStatus` and the report's `sourceMaterialCoverage` combine both sources: `taxon_matched_text`, `text_needs_scope_review`, or `taxonomy_only`. A Wikipedia gap may therefore already have botanical description material.

## Relationship to the existing stories

The original 300-taxon seed, its cached extracts, and `stories/pt/plants*.json` are preserved. The collector does not refresh their evidence, alter authored text, or bundle research into the frontend. It is intentionally independent of the current story review validator.

Wikipedia source text retains its original attribution and licensing. Preserve the stored rights, credits and revision links when deriving future content; see [Wikimedia reuse terms](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use). Taxonomy and photographs are separate source material and are not relicensed by the Wikipedia licence.

## Checks

```sh
python3 -m unittest tests.test_collect_plant_sources tests.test_collect_botanical_sources tests.test_seed_stories tests.test_review_stories -v
```

Tests cover full revision retrieval, continuation, redirects, missing/disambiguation/hidden content, genus-versus-species scope, historical-name candidates, retained provider provenance, maxlag retry handling and detection of altered evidence or incomplete runs.
