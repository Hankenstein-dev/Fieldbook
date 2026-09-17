# Recognition comparison — 10 September 2026

**Adopted:** Pl@ntNet is now Fieldbook's normal online plant recogniser on Android, retaining the existing BioCLIP pack as an optional offline path. See [integration and validation](online-recognition.md). Tony explicitly reopened model selection, including online services; his no-variable-cost requirement remains in force.

## Actual field photographs

The same retained, downscaled JPEG bytes were submitted individually to both services, without coordinates or Fieldbook's local candidate list. Pl@ntNet used its `all` project with automatic organ detection. BioCLIP's results below are the actual phone results, using the country-supported candidate set. These compare complete recognition pipelines, including their different image preprocessing, not isolated neural-network architectures.

| Photo | Corrected expected identity | Current BioCLIP top match | Pl@ntNet top match | Plant.id top match |
| --- | --- | --- | --- | --- |
| Fruit tree, wider view | White sapote | California buckeye | White sapote | White sapote |
| Fruit held in hand | White sapote | Black sapote | White sapote | White sapote |
| Large-leaf close-up | Loquat | Leatherleaf viburnum | Loquat | Loquat |
| Earlier cheesewood | Pittosporum undulatum | Pittosporum undulatum | Pittosporum undulatum | Pittosporum undulatum |

Tony initially labelled the first three guava, then explicitly corrected them after checking the two close-ups separately in PictureThis: the fruit and leaves came from different trees. Preserve that label history separately from model outputs. The numeric historical guava ranks remain valid but are no longer a target for tuning. A local preference promoting guava on the leaf image would have reinforced an incorrect answer.

Plant.id calls loquat `Rhaphiolepis bibas`; Pl@ntNet calls it `Eriobotrya japonica`. These are synonyms, not a disagreement. [Kew's taxon record](https://powo.science.kew.org/taxon/urn%3Alsid%3Aipni.org%3Anames%3A724793-1/general-information).

Both services matched all four individual field-photo labels. A three-image combined request was also made while they were believed to show one tree. It mixed species, so its retained outputs are excluded and the combined case was removed from the runnable manifest. No phone sighting was automatically relabelled.

Pl@ntNet returned individual results in **0.27–0.75 seconds**; Plant.id took **0.77–0.97 seconds**, measured end-to-end from this computer. These are not Android/cellular latency measurements. Live versions were Pl@ntNet `2026-03-20 (7.5)` and Plant.id `plant_id:5.1.1`. Returned scores are not interchangeable calibrated probabilities.

## Original control set

Reran the original 21 source-labelled photographs across seven plant species. Current BioCLIP int8 inference used the installed text-reference vectors and **25,067 country candidates**, with no local weighting. These are existing convenience samples with possible training overlap, not an independent population accuracy estimate.

| Pipeline | Expected species first | Expected species in first five |
| --- | ---: | ---: |
| Current BioCLIP int8 + country references | 18 / 21 | 20 / 21 |
| Pl@ntNet API, `all`, automatic organ | 20 / 21 | 20 / 21 |

Pl@ntNet rejected one Oxalis photograph with HTTP 404 and no match; this counts as a failure, not an omitted case. BioCLIP ranked that photo's expected species eleventh, and also missed first place on one cork oak and one lavender photo. Pl@ntNet got those latter two right. Plant.id's limited trial was not used for the controls.

The earlier 19/21 BioCLIP result used only 977 candidates and must not be presented as the current country-wide benchmark. Local CPU timings are not a proxy for the phone's inference time.

## Practical options

- **Pl@ntNet:** documented external API and 500 free identification requests per account per day. Paid access requires a separate contract. Quota exhaustion returns HTTP 429 and resets at midnight UTC; the app must stop or use its offline path, never buy capacity automatically. Supports up to five photographs of the same plant. [Access policy](https://my.plantnet.org/terms_of_use), [quota documentation](https://my.plantnet.org/doc/api/quota), [identification API](https://my.plantnet.org/doc/api/identify).
- **Plant.id:** useful comparison, with a keyless agent trial limited to ten requests per IP per rolling day. Its normal API uses paid credits after the introductory trial, so it is not the recommended ongoing provider under the current cost requirement. [Agent trial documentation](https://www.plant.id/llms.txt), [pricing](https://www.kindwise.com/pricing).
- **BioCLIP:** existing offline capability remains valuable. The evidence compares this particular int8/text-reference implementation; it does not establish that every BioCLIP configuration would perform identically.

Pl@ntNet's offline model is described as exclusive to its own mobile app; its existence is not permission or a supported way to embed it in Fieldbook. [Offline documentation](https://docs.plantnet.org/en/tutorials/install-the-offline-embedded-mode/).

## Reproduce and inspect

`config/recognition-field-tests.json` retains stable photo IDs and corrected expected labels. Raw historical trial outputs and normalised API results are under ignored `data/diagnostics/investigations/online-comparison/`. Field photos remain in the independent diagnostic photo archive. `controls-bioclip-country.json` and `controls-plantnet.json` contain the complete control run; per-photo API reports retain status, model version, scores, image hash and latency.

The owner supplied a free Pl@ntNet key. Its source is ignored `.env.local`, with private file permissions. The subsequent private Android integration embeds it for direct requests; it is intentionally excluded from web builds unless browser access is explicitly configured. The benchmark makes no paid fallback and does not retry quota failures. Run commands from the repository root:

```sh
# List inputs without uploading.
node --env-file=.env.local scripts/compare-plant-recognition.mjs plantnet
# Submit missing field comparisons; existing reports are reused.
node --env-file=.env.local scripts/compare-plant-recognition.mjs plantnet --run
# The fixed 21-photo source-labelled controls.
node --env-file=.env.local scripts/compare-plant-recognition.mjs plantnet --controls --run
# Offline BioCLIP control replay with already-prepared model assets.
.venv/bin/python scripts/replay-bioclip-controls.py
```

Cached reports preserve the labels at execution time. Use the current manifest when interpreting old field runs. The mixed-tree combined reports are historical evidence only. The developer script is not part of the app. Syntax and dry-run inputs were checked; actual service calls and the local model replay completed. Taxon resolution, direct Android API access, quota/error handling and model-free online recognition are now integrated. Actual owner-phone latency remains an outdoor check.
