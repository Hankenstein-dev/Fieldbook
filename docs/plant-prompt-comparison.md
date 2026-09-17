# Short versus long plant prompts — ten bounded calls

Five plants, two prompts each, ten fresh Sol high agents. Every session made **exactly one model response and zero tool calls**, verified from local telemetry. Both arms received the same source material for each plant. No retries or extra model reviews were run.

**Both prompts met the 75-word / three-sentence limits on all five plants, and their edibility labels agreed in all five pairs.** The short prompt produces substantially smaller outputs. The longer prompt is more cautious about cultivar scope and source disagreement, and explicitly requests food qualifications that the short output format does not request.

| Measurement | Longer prompt | Your shorter prompt |
|---|---:|---:|
| Prompt tokens | 507 | 170 |
| Average paragraph words | 39.0 | 44.4 |
| Average complete saved response tokens | 106.4 | 64.8 |
| Total saved response tokens | 532 | 324 |
| Average session time | 6.5 seconds | 5.8 seconds |
| Observed input, including cache | 100,123 | 98,443 |
| Of that input, cached | 85,376 | 92,160 |
| Of that input, uncached | 14,747 | 6,283 |
| Observed output, including reasoning | 1,316 | 888 |
| Of that output, reasoning | 754 | 534 |

The shorter prompt uses **66% fewer prompt tokens** and its saved responses use **39% fewer tokens**. Its actual generation output, including reasoning, was 33% lower. The output comparison includes a format difference: the long prompt requests JSON, evidence IDs and edibility notes; the short prompt requests prose and a single EDIBLE line. This does not isolate instruction length alone.

All ten generation calls together used **198,566 input tokens (177,536 cached, 21,030 uncached) and 2,204 output tokens, including 1,288 reasoning tokens: 200,770 total**. These counts exclude the coordinating agent's preparation and review. The fixed Codex context still contributes substantial input even with a single response; the much smaller prompt/output counts are not the total subscription usage. Cache-hit differences and five observations are too small a basis for a reliable quota or latency forecast.

The five cases were deliberately chosen to expose sparse-source, qualified-food and source-scope issues from the earlier run. They are not a representative sample. The notes below distinguish definite scope problems, source ambiguity, missing information not requested by the short format, and editorial preferences. This is my source comparison, not a blind or independent botanical assessment.

**Whole-comparison overhead:** the coordinating conversation had already consumed 2,461,706 tokens through 2026-09-13T11:17:02.702Z (2,361,472 cached input), in addition to the ten generation calls. The observed combined snapshot is therefore **at least 2,662,476 tokens**, mostly cached; subsequent finalisation adds more. Bounded workers removed their tool loops, but they did not remove dispatch/review overhead in this long Codex conversation. The 200,770 generation-token figure must not be presented as the entire allowance cost. See [coordinator usage snapshot](../data/analysis/plant-prompt-comparison-v1/coordinator-usage-snapshot.json).

## Full paired outputs

### 1. Dimorphotheca spectabilis

**Long prompt — 12 words; EDIBLE: unknown**

> Dimorphotheca spectabilis is a plant found only in South Africa’s KwaZulu-Natal Province.

**Your prompt — 35 words**

> A plant in the genus *Dimorphotheca*, the Showy Rain Daisy is native only to KwaZulu-Natal Province in South Africa. Its limited natural range makes it a distinctive local species. Its scientific name is *Dimorphotheca spectabilis*.
> 
> EDIBLE: unknown

**Comparison:** Both stay within the evidence and return unknown. The long prompt uses 12 words. The short prompt uses 35, repeating the name and adding a generic distinctive-local-species sentence. This is padding, not an invented botanical fact.

### 2. Musa balbisiana

**Long prompt — 45 words; EDIBLE: yes**

> Musa balbisiana is a wild banana plant native to eastern South Asia, northern Southeast Asia and southern China. It has upright clumps of lush leaves, red to maroon flowers and blue-green fruit filled with seeds. It is one of the ancestors of modern cultivated bananas.

Edibility note: Naturally occurring seedless clones produce edible bananas, although the usual seeded fruit is considered inedible because of its seeds.

**Your prompt — 46 words**

> A wild banana species, Musa balbisiana is native to eastern South Asia, northern Southeast Asia, and southern China. It has upright clumps of lush leaves, red-to-maroon flowers, and blue-green fruits filled with seeds. It helped give rise to modern cultivated bananas by contributing their B genome.
> 
> EDIBLE: yes

**Comparison:** Both yes labels follow the requested definition: some qualified human food use is documented. The long response specifies naturally seedless clones in a note; the short response describes seeded fruit and then says EDIBLE: yes without that restriction. This is information the short output format did not require, not an incorrect label under its definition. B genome is unexplained jargon in the short paragraph.

### 3. Oxalis debilis

**Long prompt — 39 words; EDIBLE: yes**

> A perennial, bulb-forming herb native to South America, large-flowered pink-sorrel now occurs across temperate and tropical regions on every continent except Antarctica. Its seeds can be flung from capsules, though European plants are sterile and spread only through bulbs.

Edibility note: The flowers, leaves and roots are edible; consume only small amounts because oxalic acid may cause calcium deficiency in larger amounts.

**Your prompt — 46 words**

> Largeflower pink-sorrel is a bulbous perennial herb native to South America. Its pink flowers and leaves with a zesty, lemony flavour make it easy to remember. Its flowers, leaves, and roots are edible, though it is best eaten in small amounts because it contains oxalic acid.
> 
> EDIBLE: yes

**Comparison:** Both return yes and preserve a small-quantity qualification, in different places. The long paragraph avoids the earlier elastic-fruit-capsule error. The short paragraph is approachable but adds easy-to-remember filler; pink flowers is suggested by the common name but is not explicitly documented species-wide in this packet. The long note uses an imperative consume only small amounts and omits the source's counterqualification that typical quantities are unlikely to cause the effect; this could be phrased as a source report.

### 4. Hibiscus elatus

**Long prompt — 46 words; EDIBLE: unknown**

> Blue mahoe is a flowering tree native to Cuba and Jamaica. Its flowers change from bright yellow to orange, red and finally crimson as they mature. Its durable wood can show blue, purple, green and grey tones and is used for furniture, carvings and musical instruments.

**Your prompt — 52 words**

> A flowering tree in the mallow family, blue mahoe is native to Cuba, Jamaica, Puerto Rico, and the U.S. Virgin Islands. Its flowers change from bright yellow to orange, red, and finally crimson as they mature. The polished wood has memorable blue-green streaks and is used for furniture, carvings, and musical instruments.
> 
> EDIBLE: unknown

**Comparison:** Both give readable flower-colour and timber hooks and return unknown. The long prompt limits origin to Cuba/Jamaica, which both relevant passages support. The short prompt also lists Puerto Rico and the US Virgin Islands from p2; p9 describes a narrower native range and first Puerto Rican plantings in the 1940s. That is an unresolved source tension rather than independently proven false botany. The long prompt takes the more cautious approach.

### 5. Rotheca myricoides

**Long prompt — 53 words; EDIBLE: unknown**

> Rough-leaved Cats-whiskers is a shrub native to mountains from Eritrea to South Africa. Its asymmetrical flowers vary from green and blue to mauve, white and blue, with long reproductive parts that curve upward. Pollinated flowers produce small black fruits that attract birds, while its often velvety leaves release an unpleasant scent when crushed.

**Your prompt — 43 words**

> Rough-leaved Cats-whiskers is an evergreen shrub native to tropical eastern Africa and mountains from Eritrea to South Africa. It produces masses of pale blue or mauve flowers shaped like butterflies, with long, curved stamens. Its velvety leaves release an unpleasant smell when crushed.
> 
> EDIBLE: unknown

**Comparison:** Both correctly keep medicinal drinking/animal feeding separate from documented human food and return unknown. The short prompt calls the species evergreen, but the explicit evergreen statement is about cultivar Ugandense. It also leaves stamens unexplained. The long prompt avoids evergreen and uses reproductive parts, which is plain but rather awkward wording. Neither paragraph needs the medicinal laboratory-study passage.

## My take

Use the short prompt as the starting point. Its core summaries are compact and its edibility classifications agree with the longer version. The longer prompt does buy some useful caution, but this small test does not justify every instruction or its output schema.

Two brief additions worth discussing are: keep sparse-source summaries short without repetition; preserve qualifications about varieties, disputed origin and edible parts/preparation. If the EDIBLE label is shown without the paragraph, decide how any essential food restriction stays visible. These are proposed changes, not prompts that were secretly added to this test.

The complete original responses and telemetry are in [results.json](../data/analysis/plant-prompt-comparison-v1/results.json). The exact prompt wording is saved as [long](../data/analysis/plant-prompt-comparison-v1/long-prompt.txt) and [short](../data/analysis/plant-prompt-comparison-v1/short-prompt.txt); the shared wrapper simply required a final response with no tools, file reads, delegation or commentary. No previous outputs or review findings were shown to the generating agents.

Source-transcription note: nonbreaking spaces were normalised in the two longer packets, and the same incidental “inhibited” → “had inhibited” change appeared in an unused Rotheca laboratory-study passage in both arms. Original source packets are retained alongside the results. Neither difference creates a difference between the paired prompts.
