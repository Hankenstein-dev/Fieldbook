# Plant content pilot — 12 September 2026

The source corpus now gives us a measured input baseline. Separate extracted facts are the agreed direction; the paragraph template and individual drafts remain for editorial review. The next experiment compares ten identical plant packets across subscription subagents at different model/reasoning settings. Nothing here publishes or replaces the existing stories.

## Measured input size

These are a census of all saved catalogue records, not an extrapolation from a handful of popular plants. Counts use `o200k_base` via `tiktoken` 0.14.0. They count the specified text exactly under that encoding, **not the full billable input of an arbitrary model or this agent session**. See [token-counting guidance](https://developers.openai.com/cookbook/examples/how_to_count_tokens_with_tiktoken).

The table below covers the **6,142 species with name-matched narrative sources**. A name match is a research starting point, not verification of article claims.

| Input component | Mean / species | Median | 95th percentile | Whole cohort |
|---|---:|---:|---:|---:|
| All available source text, including alternative languages, before cleaning | 2,935 | 1,886 | 8,806 | 18.03M |
| Selected source text before cleaning | 2,103 | 1,328 | 6,271 | 12.92M |
| Selected readable source text | 674 | 398 | 2,196 | 4.14M |
| Evidence packet, including taxon metadata and passage IDs | 845 | 541 | 2,541 | 5.19M |
| Evidence packet + 790-token draft instructions | **1,635** | **1,331** | **3,331** | **10.04M** |

Baseline selection takes one preferred-language Wikipedia article with a matching scientific title, plus any retained botanical description. If only a scope-review article exists it is retained as a flagged candidate in a separate cohort. Language priority comes from source-collection config. Text is not truncated. This simple selection rule measures cost; it does not establish which language has the best evidence.

There are also **416 species with scope-review text**, making 6,558 species with some text, and **792 species with taxonomy only**. Including all 6,558 gives **11.11M** draft input tokens, averaging **1,693**. Across **all ranks with text**—7,540 entries including genera, hybrids and other ranks—the baseline is **13.59M**, averaging **1,803**. We should skip empty packets in production rather than pay a model to rediscover known gaps.

The earlier 1,000-input-token illustration was optimistic. Cleanup makes a large difference, but the first full-corpus extraction still approaches ten million input tokens. We can avoid repeating most of this work when changing layouts or rewriting paragraphs from saved facts.

API message framing, a future formally supplied JSON schema, retries, output and hidden reasoning are excluded. The longest matched-species request is 10,949 text tokens; the longest species scope-review candidate is 17,536. Do not use an average to set a hard context limit.

Raw wikitext remains untouched. Cleaning removes recognised backmatter, reference tags, file/category links and common metadata templates. Unknown templates remain verbatim, including units, warnings and some foreign-language infobox/media markup. Thus this is a conservative readable derivative, not a perfect Wikipedia renderer. Removed infobox/caption facts are outside this prose baseline; original attribution, revision URLs and full references remain in the source archive.

## Reusable facts

Keep the original source, the extracted fact record, and the display paragraph as three separate layers. Link every fact to source passages. Save extraction/prompt version, source revision/hash, model/settings and review status with each generated record. Changing the presentation should normally read existing fields; changing the paragraph should normally reuse the extracted facts. A genuinely new field may still require returning to the original source.

| Field | What it can support later | What the sample demonstrates |
|---|---|---|
| Growth form and life cycle | Tree/shrub/herb labels; perennial/annual | Cork oak, nightshade, Romulea, Stipellula |
| Native range | Origin sentence; region labels | Strawberry tree and Cook pine; separate native range from present occurrence |
| Habitat | Habitat text or future ranking inputs | Armeria's damp sandy meadows; moss on wet, lime-rich ground |
| Appearance | Recognition details alongside photos | Romulea's leaves/flowers; Cook pine's crown and bark |
| Flowering | Seasonal information | Bee orchid has different timing in continental Europe and Britain; preserve place |
| Ecological relationships | Pollination, seed dispersal, hosts, adaptations | Bee orchid's regional self-pollination; cork oak's fire response |
| Human use | Food, material, historical and cultural facts | Cork production, medronho, dye; medicinal history is not efficacy |
| Regional status | Introduced/invasive/conservation information | Sour fig invasiveness; Armeria's dated national assessment |

Most facts can use a small tagged record: `id`, `kind`, `value`, `scope`, `qualifiers`, `evidence`. This is reusable structured content, but `value` is still prose. If we later need reliable sorting by height, month or country, add typed numbers/units/region IDs and validate the conversion; do not pretend this first schema already supports every database query.

**Human food use and toxicity need their own objects.** Food use records the part, use, conditions, geographical/historical scope and evidence. The statuses distinguish documented use, explicitly inedible, not documented, conflicting and not assessed. Toxicity separately records the affected organism and reported effect, with its own unknown/unassessed states. A missing food claim is not “inedible”; an animal feeding claim is not human edibility; no toxicity mention is not proof of safety.

The distinction is concrete: cork oak's article describes feeding acorns to pigs; strawberry tree describes human fruit uses. Oxalis contains food claims alongside livestock toxicity and a warning that the hazards section includes original research. A flat `edible: true` would discard the most important qualifications. A future card can show a short food-use label while preserving the underlying details and editorial review.

## Proposed paragraph template

> What the plant is, with native origin when supported. Then explain its most worthwhile supported traits: ecology, adaptations, reproduction, uses or history.

One paragraph, initially around **50–90 words**, with shorter entries allowed when sources are thin. This is an editorial starting point, not a minimum or a locked word limit. The first sentence should orient the reader; the rest should explain what makes this particular plant worth knowing. Avoid forcing a “fun fact” or including every extracted fact.

For example, this draft follows that structure:

> The strawberry tree is an evergreen shrub or small tree native to the Mediterranean and western Europe. Its fruit takes about a year to ripen, so red berries can appear alongside the next crop of flowers. The fruit is used for jams and for medronho, the Portuguese spirit, while bees visit the flowers and birds help disperse the seeds.

Evidence: saved Arbutus packet, `s1:p2`, `s1:p11`, `s1:p13`, `s1:p16`, `s1:p33`. Origin detail remains qualified in the fact record because the article questions the history of its Irish populations.

By contrast, the selected English nightshade article supports only this:

> Whitetip nightshade is a shrub native to South America. It has become naturalised in North America, Europe, Australia and New Zealand.

Evidence: saved Solanum chenopodioides packet, `s1:p1`. We should compare its alternate-language material or find more sources before trying to make it more interesting. Neither a stronger model nor a word-count target creates missing evidence.

The [worked example records](plant-content-pilot-examples.json) contain ten paragraphs and three withheld outputs, with explicit source pointers. These are in-session editorial examples, not benchmark model responses. Their nonempty paragraphs average **64 tokens** (range 29–77); complete compact JSON records with paragraphs average **390 tokens** (range 218–510). Those figures demonstrate the split between prose and structured output; the sample is too small and deliberately chosen to establish a population output mean. The actual model comparison measures how much each model chooses to extract.

## Sample coverage

The reproducible review sample has **25 entries**: ten deliberate content/scope anchors and three seeded selections from each of five source-length/language/rank pools. It is designed to expose content and failure cases, not estimate population-level field availability. The full token estimate uses the census instead.

| Sample | Design finding |
|---|---|
| Oxalis pes-caprae | Food/poisoning coexist; warnings and preparation qualifications matter |
| Arbutus unedo | Rich culinary/ecological material; native-origin nuance |
| Quercus suber | Material use, fire adaptation and animal feeding; no automatic human-food inference |
| Nerium oleander | Article titled Nerium explicitly discusses this species; scope flag is a review task, not proof of a mismatch |
| Ophrys apifera | Regional pollination differences; historical salep claims need species attribution |
| Carpobrotus edulis | Food parts, invasiveness and citation warnings |
| Armeria gaditana | Portuguese article plus dated botanical assessment; national versus global status |
| Cistus umbellatus | No narrative evidence in saved packet |
| Marcus-kochia littorea | No narrative evidence in saved packet |
| Solanum chenopodioides | Very short source; do not infer food/toxicity from a familiar family |
| Romulea rosea | Small source still supports identity, origin and appearance |
| Stipellula capensis | Annual grass; historical festival association explicitly uncertain |
| Malephora lutea | Sparse description; flower visitation is not proof of pollination |
| Stylosanthes biflora | Habitat and butterfly host relationship; geographic flowering scope |
| Pentas lanceolata | Origin and butterfly-garden use; much of article is a taxonomic list |
| Araucaria columnaris | Clear high-interest trait: reported tendency to lean towards the equator |
| Neotinea conica | Spanish article under Orchis conica; resolve taxonomic scope before transfer |
| Ranunculus tuberosus | German article mainly concerns a broader taxon; withhold automatic species claims |
| Guilandina bonduc | Floating seed dispersal; medicinal use must not become efficacy |
| Taraxacum duplidentifrons | Portuguese occurrence/origin boilerplate, little distinctive narrative |
| Cratoneuron filicinum | Moss: useful habitat/appearance, flowering fields inapplicable |
| Cytinus ruber | Portuguese source is sparse; do not fill gaps from memory |
| Gerbera | Genus packet: genus-level content needs its own scope |
| Gaillardia | Genus description and species-specific insect relationships must remain distinct |
| Zygopetalum | Genus packet: “most species” is not “every species”; citation warning retained |

The three genus packets were triaged for scope; the species packets were read for candidate content. This is not botanical verification of the 25 articles, nor a census of how many species are edible.

## Model experiment and reproducibility

Tony requested using the subscription's OpenAI subagents. [Benchmark configuration](../config/plant-content-benchmark-v1.json) fixes ten taxa, the prompt hash and six model/settings combinations. [Comparison results](plant-content-model-comparison.md) are recorded separately from the editorial examples.

Compare extraction faithfulness, source-pointer correctness, missing useful facts, preservation of warnings/conditions, taxon/geographical scope, abstention and paragraph quality. Inspect summaries and extracted records separately: polished prose can hide a bad food-use field. The stronger model is a comparison candidate, not the answer key. This small development set is useful for selecting the next candidate; a fresh held-out sample is still needed before mass production.

Subscription agents have their own system/tool context and each processes ten plants within one task. We do not receive API input/hidden-reasoning billing telemetry. Visible compact JSON counts are comparable output-size measurements, not total tokens consumed by the agents. For an eventual API run, measure provider-returned input, cached input, output and reasoning usage. Reasoning tokens consume the output budget even when invisible; see [reasoning usage documentation](https://developers.openai.com/api/docs/guides/reasoning).

Reproduce the offline preparation:

```bash
.venv/bin/pip install -r scripts/requirements-content-audit.txt
.venv/bin/python scripts/audit_plant_content.py
.venv/bin/python scripts/review_plant_content_pilot.py
.venv/bin/python scripts/review_plant_content_pilot.py --benchmark
.venv/bin/python -m unittest discover -s scripts -p 'test_*plant_content*.py'
```

Outputs live in `data/analysis/plant-content-v1/`: the all-taxon CSV, token census, sample manifest, source packets, example counts, benchmark packets and original model results. Census metadata records tokenizer/parser versions, prompt/script/source-manifest hashes. Existing cards and source revisions remain separate from these derived artifacts.
