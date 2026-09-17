# Ten-plant CLI batches

`config/plant-content-prompt-v4.txt` keeps v3’s content rules and requests one JSON array of ten records, each keyed by integer `taxonId`. A final shorter group is supported. `scripts/prepare_plant_cli_run.py` freezes packets and groups before execution, excluding IDs in every previous `plant-cli-*` manifest, including tests.

The runner uses Sol high and existing Codex ChatGPT authentication. Each group gets one fresh, tool-free, bounded call (300 seconds). No retries or replacements. Actual request text, raw response, events, stderr, usage and attempt records live at batch level; individual results reference their batch usage. Reports count usage and duration once per call. Resume skips attempted calls and restores individual records from saved batch results. Legacy single-plant manifests still use their frozen prompt and original execution format.

The 50-plant test used five calls: all 50 passed code validation. The subsequent 2,000-plant run used 200 calls: 1,990 passed; one failed CLI call left ten failures without retry. Code checks establish structure, IDs, limits, saved-input integrity and usage accounting, not botanical accuracy.

```sh
.venv/bin/python scripts/prepare_plant_cli_run.py --count 2000 --seed 20260918 --output data/analysis/plant-cli-batched-2000-v1
.venv/bin/python scripts/run_plant_content_cli.py --output data/analysis/plant-cli-batched-2000-v1
.venv/bin/python scripts/audit_plant_cli_batch.py data/analysis/plant-cli-batched-2000-v1
```

The example run already exists; preparation refuses to overwrite it. Execution resumes without regenerating saved responses. Use a new output path for a new selection.

On user instruction, all 1,990 validated results from this run are imported into `stories/pt/plants.cli.json`. `config/app.ts` overlays these records on the original story index for species-card display. Original authored stories and review evidence remain intact. Cards show the returned summary, qualified human food-use status/note and original source credits. Twenty-eight null summaries retain the basic reference facts. Imported entries remain drafts.

```sh
.venv/bin/python scripts/import_plant_cli_content.py --run data/analysis/plant-cli-batched-2000-v1 --count 2000 --skip-failed
node scripts/check-species-card-content.mjs
```

The browser check covers food-use statuses, qualifications, null-summary fallback, source links and mobile layout using four imported records. An optional URL argument checks the deployed version; a second argument selects the starting record for sampling (1500 checks the newly added remainder). The ten failed records are explicitly excluded; the original 1,500 imports remain unchanged. Generation reports and readable outputs are retained in each run directory; coordinating-chat usage is excluded.
