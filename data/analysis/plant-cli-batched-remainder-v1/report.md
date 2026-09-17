# Plant CLI batch: 3072/3072 attempted

[Read all outputs](outputs.html) · [Machine-readable report](report.json) · [Frozen manifest](manifest.json)

Model: gpt-5.6-sol; reasoning: high; existing ChatGPT subscription authentication.

306/308 completed CLI calls covering 3052 plants; 3052 passed format checks; 20 failed (including execution failures). 35 valid null summaries.

Elapsed wall time: 26199.7 seconds (436.66 minutes). Sum of CLI generation durations: 18335.3 seconds.

| Generation usage | Tokens |
| --- | ---: |
| input_tokens | 4,928,871 |
| cached_input_tokens | 1,488,640 |
| cache_write_input_tokens | 0 |
| output_tokens | 717,356 |
| reasoning_output_tokens | 391,611 |
| uncached_input_tokens | 3,440,231 |

Usage unavailable for 2 CLI calls. Usage is counted once per call, never multiplied by plants. Reported totals exclude unreported usage; cached input and reasoning output are subsets, not additional tokens. Coordinating-chat usage is separate and is not measured here.

One fresh bounded CLI process per group of up to 10 plants; no generation retries, replacements, tools, subagents, or LLM review. Requests, raw outputs, events, stderr, attempt markers, and reported usage are retained. The approved prompt and source packets were frozen before generation.

Validation: JSON object/schema, whitespace word counts, deterministic sentence-boundary heuristic, paragraph count, evidence-ID existence and required evidence; no LLM review.

Botanical accuracy has not been reviewed. These are local drafts; no app stories were changed or published.

## Failures

| Taxon ID | Species | Failure |
| --- | --- | --- |
| 129446 | Honckenya peploides | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58879 | Chenopodium berlandieri | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 168688 | Scolymus maculatus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 861367 | Scrophularia racemosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 381516 | Cephaleuros virescens | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 51988 | Physalis peruviana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467550 | Notobasis syriaca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 278703 | Clerodendrum thomsoniae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 51704 | Polemonium caeruleum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 51809 | Lysimachia nummularia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 76877 | Erica lusitanica | Interrupted attempt; recovered saved events without retry |
| 76226 | Cestrum parqui | Interrupted attempt; recovered saved events without retry |
| 276587 | Dasylirion cedrosanum | Interrupted attempt; recovered saved events without retry |
| 164439 | Lathyrus niger | Interrupted attempt; recovered saved events without retry |
| 281273 | Gomphocarpus physocarpus | Interrupted attempt; recovered saved events without retry |
| 50625 | Ptelea trifoliata | Interrupted attempt; recovered saved events without retry |
| 469472 | Malus domestica | Interrupted attempt; recovered saved events without retry |
| 340549 | Diplotaxis siifolia | Interrupted attempt; recovered saved events without retry |
| 319387 | Myosotis secunda | Interrupted attempt; recovered saved events without retry |
| 56462 | Riccardia chamedryfolia | Interrupted attempt; recovered saved events without retry |
