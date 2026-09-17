# Plant CLI batch: 2048/2048 attempted

[Read all outputs](outputs.html) · [Machine-readable report](report.json) · [Frozen manifest](manifest.json)

Model: gpt-5.6-sol; reasoning: high; existing ChatGPT subscription authentication.

203/205 completed CLI calls covering 2028 plants; 2026 passed format checks; 22 failed (including execution failures). 66 valid null summaries.

Elapsed wall time: 12368.4 seconds (206.14 minutes). Sum of CLI generation durations: 12346.1 seconds.

| Generation usage | Tokens |
| --- | ---: |
| input_tokens | 4,828,403 |
| cached_input_tokens | 989,184 |
| cache_write_input_tokens | 0 |
| output_tokens | 528,630 |
| reasoning_output_tokens | 326,464 |
| uncached_input_tokens | 3,839,219 |

Usage unavailable for 2 CLI calls. Usage is counted once per call, never multiplied by plants. Reported totals exclude unreported usage; cached input and reasoning output are subsets, not additional tokens. Coordinating-chat usage is separate and is not measured here.

One fresh bounded CLI process per group of up to 10 plants; no generation retries, replacements, tools, subagents, or LLM review. Requests, raw outputs, events, stderr, attempt markers, and reported usage are retained. The approved prompt and source packets were frozen before generation.

Validation: JSON object/schema, whitespace word counts, deterministic sentence-boundary heuristic, paragraph count, evidence-ID existence and required evidence; no LLM review.

Botanical accuracy has not been reviewed. These are local drafts; no app stories were changed or published.

## Failures

| Taxon ID | Species | Failure |
| --- | --- | --- |
| 162822 | Euphorbia exigua | Sentence limit |
| 466086 | Tragopogon castellanus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 466732 | Thapsia nitida | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467116 | Asphodelus serotinus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467236 | Vicia pubescens | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467407 | Delphinium gracile | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467565 | Iberis pectinata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467577 | Linaria munbyana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 468007 | Corrigiola telephiifolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 468769 | Suaeda albescens | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 469091 | Allium massaessylum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 520178 | Helianthemum ledifolium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 520622 | Fumaria sepium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 520841 | Isoetes delilei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 521275 | Pilosella castellana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 521408 | Achillea pyrenaica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 524204 | Koeleria cenisia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 524205 | Helictochloa bromoides | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 524432 | Amphilophium buccinatorium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 524464 | Crassula expansa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 524877 | Cachrys libanotis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 638337 | Serapias strictiflora | Evidence IDs |
