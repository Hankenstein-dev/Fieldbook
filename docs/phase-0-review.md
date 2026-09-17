# Phase 0 story review

Phase 1 is now implemented using these drafts. See [the Phase 1 handoff](phase-1-review.md) for the app and outdoor acceptance checklist. Tony’s copy review remains pending.

**Full-article pass complete: 176 draft stories, with an outcome recorded for all 300 taxa.** Tony's individual copy review remains pending. The agreed tone is an enthusiastic, friendly educator explaining the interesting things about each plant, with room for every worthwhile supported point.

Start with the [readable story collection](stories-pt-plants.md). Strawberry tree, lantana, mastic, olive, cork oak and the other drafted plants are all there. Edit the [authored JSON](../stories/pt/plants.json); quotations and editorial notes live in the separate [review sidecar](../stories/pt/plants.review.json).

## What the full articles changed

| Measure | Introductions | Full linked articles |
|---|---:|---:|
| Usable English texts | 283 | 283 |
| Minimum / median / maximum words | 10 / 57 / 390 | 13 / 447 / 5,976 |
| Texts under 60 words | 152 | 18 |
| Taxa with at least one keyword cue | 68 | 177 |
| Usable texts without a cue | 215 | 106 |

The introductory material was limiting the stories. The complete article extracts provide substantially more ecology, reproduction, history and practical uses. All available full articles were assessed, including the ones with no configured keyword matches. Two companion articles, **Olive** and **Myrtus**, supplement the unusually short linked species pages; they cover the same two taxa, not two additional plants.

Examples worth reading:

- [Strawberry tree](stories-pt-plants.md#taxon-82689): overlapping flowers and ripe fruit, medronho, preserves, bitter honey and birds carrying seeds.
- [Mastic](stories-pt-plants.md#taxon-82600): resin, chewing gum, food flavouring, birds and hybridisation.
- [Cardoon](stories-pt-plants.md#taxon-57563): wild thistles, artichokes, vegetable stalks and Portuguese cheesemaking.
- [Dwarf fan palm](stories-pt-plants.md#taxon-132759): fire recovery, weaving, leaf scent, pollinating weevils and mammal seed dispersal.
- [Cork oak](stories-pt-plants.md#taxon-50868): repeated harvesting, cork's structure, fire insulation and woodland relationships.
- [Crescent-cup liverwort](stories-pt-plants.md#taxon-55703): rain splashing tiny propagules out of crescent-shaped cups. No food or medicine keyword is needed for a good natural-history story.

The new keyword counts are still **unverified cues**: edible 56, toxic 62, invasive 79, cultural/uses 88, medicinal 78, possible resemblance 30. They guide reading; they do not determine the final story or automatically become tags.

## Coverage and research outcomes

| Outcome | Taxa |
|---|---:|
| Authored draft story | 176 |
| Usable full article, but further research needed | 107 |
| No Wikipedia link from iNaturalist | 16 |
| Linked English page missing | 1 |
| Total | 300 |

The [research list](stories-pt-plants-research.md) names all 124 remaining taxa and records why each needs more work. Some full articles still contain little beyond measurements and range; some rely on weak medical claims; others cover the wrong taxonomic scope. These are gaps in this source pass, not claims that the plants lack interesting stories. No plant is removed from the catalogue or given filler copy.

All 16 taxa without a link also received an exact scientific-name article lookup, which returned missing pages. This does not establish that no article exists under another name, or that Portuguese botanical sources lack information.

Eleven linked pages triggered a scope check. Monotypic genus pages explicitly covering the selected species were usable. Bellardia viscosa links to the species article under Parentucellia viscosa. Broad genus material such as the Solanum page linked for Solanum chenopodioides was not treated as species evidence. Common-myrtle passages were separated from the other species on the companion Myrtus page.

## Evidence and editorial decisions

Stories use our own words. Original passages, source URLs, recorded Wikipedia revisions, retrieval times and notes are kept outside the prose. Full contextual passages are available for line-by-line review; their presence does not mean every statement in an article is accepted. The reading copy puts required attribution after each story.

Additional checks resolved or qualified several claims: Kew supports **digitoxin** for foxglove; NCCIH provides current context for milk-thistle research and St John's wort interactions; RHS corroborates water-dropwort and ragwort toxicity. The source links and short excerpts are retained in [additional evidence](../data/raw/pt/plants/supplementary/primary-evidence.json). No runtime model or paid API was used.

An invasive tag needs evidence within Portugal, with island scope preserved where relevant. An edible tag concerns the parts and uses actually described; it is not a blanket statement that a plant is safe to eat. Medicinal history is not represented as established treatment effectiveness. Empty tags are valid.

## Handoff

Phase 0's done-when line is: “a stories file exists for Portugal plants that makes a walk in Portimão interesting on paper, in a shape Tony chose.” The authored file and reading copy now exist in that agreed shape. Tony's judgment and line-by-line locking of the copy remain his; the research backlog is visible rather than silently filled with invented material.

The deliverable is the full-source draft collection, ready for copy review before the UI phase. See [the editing guide](../stories/README.md). Rebuild the reading documents with `python3 scripts/review_stories.py`; run `--check` to check provenance and generated-file consistency without changing anything. These checks do not independently validate botanical claims.

Validation: all 17 standard-library unit tests passed. The 300-taxon full-article seed replayed with 311 cache hits and zero network requests. Story validation accounts for all 300 IDs and checks quotations against the saved sources, revisions, attribution and lookalike references; both generated reading documents pass the freshness check.

## Initial findings, retained for comparison

## Initial introduction-only corpus

Fetched on 2026-09-08: the 300 most-observed plant taxa in iNaturalist's Portugal place (7122), out of 7,798 returned taxa. Country scope includes the islands; this is not a list of the most-observed plants around a particular town. Story entries promote matching local candidates later, so country-wide inclusion is not a local-occurrence claim.

The [manifest](../data/raw/pt/plants/manifest.json) defines this selection and records source queries and configuration. The [machine report](../data/raw/pt/plants/report.json) contains the full tallies and affected taxon IDs.

| Measure | Result |
|---|---:|
| Taxon records saved | 300 |
| Usable Wikipedia introductions | 283, all English |
| No Wikipedia link supplied by iNaturalist | 16 |
| Linked Wikipedia page missing | 1 |
| Short introductions, under 60 words | 152 of 283 |
| Introduction length: minimum / median / maximum | 10 / 57 / 390 words |
| Taxa with at least one configured keyword cue | 68 |
| Usable introductions without a cue | 215 |
| English common name present | 286 |
| Portuguese common name present | 288 |
| Both languages present | 276 |
| Neither language present | 2 |

This initial analysis used introductory extracts only. Full articles now form the basis of story drafting; these introduction figures are retained for comparison. Length is an imperfect measure: a 57-word introduction can contain an interesting fact, while a longer introduction can be largely taxonomy and distribution. Absence of a keyword is not absence of a story.

## Keyword evidence

Counts are taxa containing a cue; categories overlap. They are not approved tags.

| Candidate category | Taxa | Examples of matched cues |
|---|---:|---|
| Edible | 20 | edible: 20 |
| Toxic | 14 | poisonous: 6; toxic: 8; toxicity: 1; poisoning: 2 |
| Invasive | 24 | invasive: 23; invasiveness: 1; pest plant: 1 |
| Cultural / uses | 14 | used to make: 1; cultivated for: 6; used for: 5; traditionally: 1; symbol: 1 |
| Medicinal | 13 | medicinal: 2; medicine: 11; medicines: 0 |
| Possible resemblance / confusion | 8 | confused with: 7; resembles: 1 |

The source text supplies several reasons to keep these as candidates. The false yellowhead introduction's invasive claim explicitly concerns Australia. The naked-man orchid's resemblance is to a human figure, not another taxon. The pokeweed introduction contains both edible and poisonous cues in qualified passages. None can safely become an unqualified app tag from keyword matching alone. Historical medicine references also remain source claims, not treatment advice.

## Initial introduction-only sample

The initial review read 26 raw records, selected across high ranks, rich and short introductions, cue categories, unmatched entries, and missing sources. This historical sample preceded the full-article pass; it is retained to show what the introductions missed.

| Taxon | What the saved material supports or reveals |
|---|---|
| [Oxalis pes-caprae](../data/raw/pt/plants/53169.json) | 103 words; name origins and underground propagation; English name list is much longer than Portuguese. |
| [Acacia dealbata](../data/raw/pt/plants/53343.json) | 88 words; morphology, origin, and an introduced/invasive cue with broad geographic wording. |
| [Galactites tomentosus](../data/raw/pt/plants/545482.json) | 20 words; mainly taxonomy. |
| [Cistus salviifolius](../data/raw/pt/plants/76365.json) | 18 words; names and family only. |
| [Quercus suber](../data/raw/pt/plants/50868.json) | 180 words; cork uses and repeated bark harvesting. Strong story material with zero keyword hits. |
| [Arbutus unedo](../data/raw/pt/plants/82689.json) | 135 words; strawberry-name explanation and Italian national symbolism. No spirit-making claim in this introduction. |
| [Pistacia lentiscus](../data/raw/pt/plants/82600.json) | 57 words; cultivation for aromatic resin provides an interesting use despite the short length. |
| [Olea europaea](../data/raw/pt/plants/57140.json) | 21 words; the linked taxon article provides very little cultural material. |
| [Carpobrotus edulis](../data/raw/pt/plants/49322.json) | 32 words; growth form, family, origin, names. No invasiveness or edibility claim in this introduction. |
| [Cistus ladanifer](../data/raw/pt/plants/76362.json) | 32 words; names and distribution. Resin-use details are absent from this extract. |
| [Digitalis purpurea](../data/raw/pt/plants/53983.json) | 115 words; distinct toxicity and medicine-source sentences, plus a two-year lifecycle. |
| [Dittrichia viscosa](../data/raw/pt/plants/82646.json) | 390 words; ecology, dye, folklore and traditional-use claims. Invasive cue concerns Australia. |
| [Salvia rosmarinus](../data/raw/pt/plants/636795.json) | 56 words; flavouring use is present but missed by the current keyword phrases. |
| [Ruscus aculeatus](../data/raw/pt/plants/82904.json) | 155 words; apparent leaves are flattened shoots, with flowers growing from their centres. No current keyword hits. |
| [Orchis italica](../data/raw/pt/plants/59315.json) | 89 words; flower-shape naming story. The resemblance cue is not a species lookalike. |
| [Papaver rhoeas](../data/raw/pt/plants/54404.json) | 164 words; remembrance symbolism and disturbed-soil ecology. |
| [Pinus pinea](../data/raw/pt/plants/63621.json) | 100 words; one source sentence supports both cultivation history and an edible cue. |
| [Phytolacca americana](../data/raw/pt/plants/48599.json) | 267 words; multiple overlapping and qualified food/toxicity cues demonstrate why automated tags need review. |
| [Crithmum maritimum](../data/raw/pt/plants/82602.json) | 40 words; linked article covers a genus with a single species. Sparse material for an interesting summary. |
| [Ricinus communis](../data/raw/pt/plants/56739.json) | 124 words; oil and a toxin are mentioned, but the keyword list lacks “toxin” and returns no hits. |
| [Pancratium maritimum](../data/raw/pt/plants/78334.json) | 114 words; beach/dune growth and the name's meaning offer field-relevant context. |
| [Ceratonia siliqua](../data/raw/pt/plants/82742.json) | 110 words; chocolate-alternative and food-thickener uses provide concrete material for a summary. |
| [Corema album](../data/raw/pt/plants/326752.json) | 77 words; a historical consumption claim is phrased without the configured keywords. |
| [Genista triacanthos](../data/raw/pt/plants/341026.json) | No linked summary or common name in either requested language. |
| [Simethis mattiazzi](../data/raw/pt/plants/338417.json) | Both common-name languages exist, but the supplied Wikipedia link targets a missing page. |
| [Phelipanche nana](../data/raw/pt/plants/803979.json) | 10 words; species and family only; no Portuguese name supplied. |

Examples of paired names in iNaturalist: cork oak / Sobreiro; strawberry tree / medronheiro; Rosemary / Alecrim; carob tree / Alfarrobeira. These are source-provided names, not a chosen UI naming convention. The all-names response can mix regional variants; the presence of a Portuguese name does not establish preference in Portugal. Scientific names remain available for every selected taxon.

## Agreed editorial direction

A story is a readable summary of the most interesting things about the plant. Write with the warmth, enthusiasm and clarity of a friendly educator. Explain the facts and their connections. If the plant has four interesting things worth explaining, include all four.

Let the material determine the length and number of paragraphs. Avoid marketing phrasing, teaser openings, forced jokes, fixed word counts and a one-fact quota. A short source may support a short summary; a richer source deserves room. Do not pad sparse material or omit interesting facts just to make entries uniform.

Store the taxon ID, tags, summary text and source evidence. A summary can contain multiple paragraphs. Retain the original source sentences and URLs supporting each claim and tag. Keyword matches remain research aids; they do not define which facts deserve inclusion.

The story itself is written in our own words. Source quotations and the evidence notes below are separate editorial material for checking the drafts; they are not part of the reader-facing story. Required attribution remains separate from the narrative.

