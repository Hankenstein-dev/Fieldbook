# Plant CLI batch: 2000/2000 attempted

[Read all outputs](outputs.html) · [Machine-readable report](report.json) · [Frozen manifest](manifest.json)

Model: gpt-5.6-sol; reasoning: high; existing ChatGPT subscription authentication.

199/200 completed CLI calls covering 1990 plants; 1990 passed format checks; 10 failed (including execution failures). 28 valid null summaries.

Elapsed wall time: 10711.2 seconds (178.52 minutes). Sum of CLI generation durations: 10682.6 seconds.

| Generation usage | Tokens |
| --- | ---: |
| input_tokens | 3,227,507 |
| cached_input_tokens | 1,088,000 |
| cache_write_input_tokens | 0 |
| output_tokens | 461,433 |
| reasoning_output_tokens | 245,862 |
| uncached_input_tokens | 2,139,507 |

Usage unavailable for 1 CLI calls. Usage is counted once per call, never multiplied by plants. Reported totals exclude unreported usage; cached input and reasoning output are subsets, not additional tokens. Coordinating-chat usage is separate and is not measured here.

One fresh bounded CLI process per group of up to 10 plants; no generation retries, replacements, tools, subagents, or LLM review. Requests, raw outputs, events, stderr, attempt markers, and reported usage are retained. The approved prompt and source packets were frozen before generation.

Validation: JSON object/schema, whitespace word counts, deterministic sentence-boundary heuristic, paragraph count, evidence-ID existence and required evidence; no LLM review.

Botanical accuracy has not been reviewed. These are local drafts; no app stories were changed or published.

## Failures

| Taxon ID | Species | Failure |
| --- | --- | --- |
| 402665 | Hypericum linariifolium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 493664 | Paphiopedilum villosum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 496549 | Viburnum macrocephalum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 342990 | Myosotis maritima | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 135400 | Howea forsteriana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122709 | Sadleria cyatheoides | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 320155 | Burchellia bubalina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 956048 | Chamaeleon gummifer | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 516757 | Rhododendron tomentosum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 437973 | Carex pilulifera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |

## Main batch so far

3,000 plants attempted; 2,907 passed their run’s format checks; 93 failed. Separate 20-plant and 50-plant tests excluded. See [main-batch-report.json](main-batch-report.json).

All 1,990 validated records from this run were imported into species-card content on user instruction (the original 1,500 plus the remaining 490). The ten failed records are excluded. Their import manifest is [card-import.json](card-import.json).
