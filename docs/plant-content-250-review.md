# 250-plant Sol high pilot — 13 September 2026

The reduced format produces compact drafts, but Sol high still needs source-scope and wording checks. The broad general-facts array was removed; paragraphs, qualified food-use/toxicity records, passage references and brief issue notes remain. Original model outputs are preserved for inspection.

Open the [reading copy](../data/analysis/plant-content-v2/review.html) to browse paragraphs, structured fields, source passages and the separate quality-review notes. These drafts have not been added to the app's authored stories.

## Measured result

**250 complete records: 243 paragraphs, six entries withheld for insufficient narrative and one for source-scope review.** All 250 passed structural/evidence-pointer checks. All ten sessions confirm Sol high in their recorded model settings.

Generation took **15 minutes 16 seconds** with up to three concurrent agents. Individual 25-plant batches took 145–215 seconds (mean 180 seconds); their summed working time was 30 minutes 2 seconds. Preparation, orchestration and the source review brought the full measured task to approximately 19 minutes. This observed throughput includes dispatch gaps and is not a controlled latency benchmark.

| Saved text, reference tokenizer | Total | Average per plant |
|---|---:|---:|
| Selected source text | 163,059 | 652.2 |
| Evidence packets, including metadata and passage IDs | 204,698 | 818.8 |
| Standalone packet plus prompt repeated for each plant | 403,698 | 1,614.8 |
| Complete compact output records | 40,273 | 161.1 |
| Paragraph text only | 19,006 | 78.2 per nonempty paragraph |

The 243 paragraphs average **59.7 words** (median 66; maximum 84). 185 fall within 50–90 words, and 27 have fewer than 35 words. 32 sources contain at most 100 tokens. Short outputs can therefore reflect a real shortage of source material.

The complete output record has a median of 152 tokens, a 95th percentile of 268 and a maximum of 435. The actual pretty-printed result files contain 50,152 reference tokens. Pretty-printed input batch files total 233,176 tokens; including the prompt once per batch adds 7,960. Neither is the complete agent usage below.

| Observed generation-agent usage | Tokens |
|---|---:|
| Input, including cached input | 8,948,398 |
| Of that input, cached | 8,417,792 |
| Of that input, uncached | 530,606 |
| Output, including reasoning | 129,060 |
| Of that output, reasoning | 34,066 |
| Of that output, other output | 94,994 |
| Total input + output | 9,077,458 |

**94.1% of agent input was cached.** This is why “the records contain 40,273 output tokens” and “the agents consumed 9,077,458 total tokens” can both be true. The former measures the artifact; the latter includes the repeated multi-turn working context. These usage totals exclude the coordinating agent's work.

Removing food-use and toxicity fields from the saved compact JSON would reduce it by **11,105 tokens (44.4 per record; 27.6%)**. Removing review flags would save **1,771 tokens (7.1 per record; 4.4%)**. These are measured artifact differences, not another generation trial. Empty food/toxicity blocks account for 26 tokens in the typical empty case; empty flags account for five. 191 records have both food and toxicity marked `not_documented`.

The model returned 41 `documented_use` food records, one `explicitly_inedible`, one `conflicting`, 204 `not_documented` and three `not_assessed`. Toxicity has 23 `reported`, one `explicitly_absent` (explicitly scoped to cats and dogs), 223 `not_documented` and three `not_assessed`. These are source-claim categories, not edible/safe decisions. 26 records have model review flags.

For scale, the existing census contains **5,188,836 evidence-packet tokens across 6,142 matched species**. This run's packet sizes match the census for every sampled plant. Adding the current prompt separately to every species gives **10,077,868 saved-input tokens**; sharing the prompt within batches would reduce that repeated text. Applying this sample's output mean gives roughly **0.99 million compact output tokens** for that cohort. This projection excludes reasoning, retries, tool overhead and source enrichment; it also precedes excluding species whose existing authored stories should be retained. It is a content-size estimate, not a subscription-usage forecast.


## What was sampled

250 species were sampled randomly without replacement from 6,125 eligible species with name-matched source text, excluding the earlier pilot's examples. This estimates behaviour on the matched-text cohort; it does not establish coverage or quality for the 416 species with unresolved source scope or the 792 species with taxonomy only. A matching article title also does not guarantee that every passage applies to the requested species.

The sample contains 208 English, 37 Portuguese, four Spanish and one German source selections. Source text ranges from tiny identity stubs to a long article. Preferred-language Wikipedia text and available matched botanical descriptions use the same selection/cleaning approach as the earlier census. Original source revisions, hashes and provenance are retained. Some foreign-language infobox templates remain in the cleaned input, so a further script-only cleanup could reduce wasted input.

The [frozen configuration](../config/plant-content-run-v2.json), [prompt](../config/plant-content-prompt-v2.txt) and [manifest](../data/analysis/plant-content-v2/manifest.json) record the sample seed, exact packets and prompt hashes. Ten fresh `gpt-5.6-sol` agents at `high` reasoning each handled 25 plants, with up to three agents running concurrently. The agents used the subscription, read their assigned sources and wrote their outputs locally. They did not browse or call a separate model API.

## How to interpret tokens and time

There are two different measurements:

1. **Saved-text counts:** `o200k_base` counts the evidence packets, fixed prompt, paragraph and complete compact JSON. These support a content-generation budget. Repeating the 796-token prompt once per plant gives a standalone input estimate; sharing it within a batch gives a different estimate.
2. **Observed generation-agent usage:** local Codex `token_usage_record` events record all model turns in the ten generation sessions. Per-response records are deduplicated and checked against cumulative usage. This includes system/tool context, repeated reads, code used to write files, validation and final messages. Cached input is already included in input; reasoning output is already included in output. It excludes the parent agent's preparation, orchestration and quality review, and is not a dollar bill or a measure of subscription quota consumption.

The large agent input count reflects repeated working context across tool turns. It should not be multiplied across the catalogue as though every plant needs that much source text. A future production generation budget should use the actual source packets and chosen request format, then measure model reasoning/output on that execution path.

Generation wall time spans the first generation agent's session start to the last agent's completion, including dispatch gaps. The per-batch timers include reading, writing and validation; they are not pure model inference latency. Preparation and the final quality review took additional time.

## Quality review

All outputs receive structural checks: expected IDs and counts, required fields and statuses, JSON types, passage-pointer validity, and frozen packet/prompt hashes. These checks do not establish that the source supports a claim.

25 records were randomly selected **before seeing outputs** for passage-by-passage review. Additional targeted checks cover food conditions, taxonomy, weak evidence and non-English sources. The [review log](../data/analysis/plant-content-v2/quality-review.json) keeps these groups separate and records findings per plant. This is a source-fidelity/editorial review by the coordinating model, not an independent botanical fact-check or human publication approval. No record outside that sample has received the same semantic review.

| Assessment in the random sample | Records |
|---|---:|
| Usable draft; no substantive issue found in source comparison | 12 |
| Editorial changes needed: jargon, emphasis or attribution | 6 |
| Thin evidence handled faithfully, including withholding | 3 |
| Claim, uncertainty or evidence correction needed | 4 |

The four source-handling corrections concern **Rotheca myricoides** (cultivar scope), **Ficus subpisocarpa** (lost uncertainty), **Stevia rebaudiana** (historical plant part not specified in its cited passage), and **Hibiscus elatus** (unaddressed disagreement about native range). All four have empty model review flags. Flags cannot serve as an automatic publication gate.

The nine deliberately targeted reviews found four further semantic issues, four editorial issues and one usable draft. Their selection was biased toward difficult records, so do not combine them with the random 25 to estimate an overall error rate. The full 34-record log is visible in the reading copy; original JSON has not been corrected in place.


Concrete findings:

- **Rotheca myricoides:** the draft calls the species evergreen, while the explicit evergreen statement in the source describes cultivar ‘Ugandense’. This is a scope error despite valid passage IDs and no model review flag.
- **Musa balbisiana:** food status is `conflicting`, but the source distinguishes seeded wild fruit from edible seedless clones. Different forms and conditions should not automatically be classified as contradictory evidence.
- **Oxalis debilis:** the paragraph changes an elastic seed integument into an elastic fruit capsule. It also mentions edibility without the quantity qualification preserved in the structured fields. A paragraph displayed alone should keep that qualification or omit the food claim.
- **Trithrinax acanthocoma:** the model withholds the whole paragraph because of historical taxonomic confusion, although passages explicitly attribute range and habitat to the requested taxon. A narrowly supported draft appears possible.
- **Sparse sources:** one species gets an accurate identity-only paragraph, while another with similar material gets no paragraph. We need an explicit minimum-content policy rather than assuming “matched text” means “interesting card”.

The review also found ordinary editorial issues: unexplained terms such as “keeled leaves”, “tepals” and “sporophytes”, unnecessary gene identifiers, and paragraphs padded with naming history or measurements. More reasoning alone is unlikely to resolve a preference that needs to be expressed more clearly in the template.

## Example paragraphs, unchanged from the model

**Common dandelion**

> The common dandelion is a herbaceous perennial native to Eurasia, now established across several other continents. Its yellow flower heads mature into silver-tufted fruits carried by the wind, while many lineages also produce seeds without fertilisation. This combination of prolific seed production, long-lived buried seed and regeneration from taproot fragments helps it colonise disturbed ground. Its flowers provide early pollen, although that pollen can lack nutrients essential to bees.

**Drooping sheoak**

> Drooping sheoak is a small tree endemic to south-eastern Australia. Its long hanging branchlets carry leaves reduced to tiny scale-like teeth, and its woody cones contain winged seeds. It grows in grassy woodland, on rocky coasts and on dry inland ridges. Aboriginal Australians have made tools such as boomerangs from its timber, while on Kangaroo Island its seeds are the preferred food of the glossy black cockatoo.

**Dimorphotheca spectabilis — sparse source**

> Dimorphotheca spectabilis is a plant in the genus Dimorphotheca. It is endemic to KwaZulu-Natal Province in South Africa.

The last example illustrates the source limit: its saved article contains only 33 reference tokens. Higher reasoning cannot supply an interesting sourced fact that is absent.


## What I would change before expanding

1. Tighten the prompt using these actual failures: cultivar/subspecies traits stay scoped; different food conditions are not contradictions; source structures cannot be substituted for similar ones; food qualifications must survive in standalone prose.
2. Define a simple source-sufficiency rule. Decide whether identity-only material warrants a very short card or should enter a source-enrichment queue. Do not spend extra reasoning trying to invent interest absent from the evidence.
3. Keep only the structured fields that support a planned feature. Food use and toxicity have distinct purposes; the general facts array still appears unnecessary. If we keep the stored schema, a later experiment could have the model omit empty fields and let a script restore default empty values after successful assessment. That would measure a real reduction in generated output, without sacrificing the final data format.
4. Recheck the failed examples under the revised prompt before another broad batch. Keep original outputs, source references and prompt versions so future presentation changes do not require recollecting evidence.

This run supports continuing with Sol high for draft generation, with the corrections above. It does not establish that high reasoning is necessary: this 250-plant run used one setting, so a smaller identical-input comparison would be needed to quantify savings from a lower setting.

## Reproduce the analysis

Do not rerun preparation into the existing directory: it deliberately refuses to overwrite frozen inputs. New generations need a new version/output location. Existing artifacts can be remeasured without model calls:

```sh
.venv/bin/python scripts/review_plant_content_run.py --require-complete
.venv/bin/python scripts/measure_plant_content_agents.py --require-complete
.venv/bin/python scripts/render_plant_content_run.py
```

The usage exporter reads only the matching generation sessions' metadata from local Codex logs and saves a portable aggregate; it does not copy conversation transcripts. Another machine can read the saved [agent usage](../data/analysis/plant-content-v2/agent-usage.json) without those private logs. [Measurements](../data/analysis/plant-content-v2/report.json), [per-plant CSV](../data/analysis/plant-content-v2/measurements.csv), [original results](../data/analysis/plant-content-v2/results), and [review sample selection](../data/analysis/plant-content-v2/quality-sample.json) accompany the report.

Validation: 11 existing content-cleaner/validator tests passed. The standalone reading copy rendered all 250 records, its search/navigation/filters and source links passed browser checks, it made no remote requests, and it had no JavaScript errors or horizontal overflow at a 390px viewport. See [browser check results](../data/analysis/plant-content-v2/browser-checks.json). The 176 existing authored stories remain separate and untouched.
