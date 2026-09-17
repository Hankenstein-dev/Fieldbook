# Curated stories

`<country>/<group>.json` is the authored content. `<country>/<group>.review.json` is editorial material and should not be bundled into the frontend. The current seed has 176 draft stories from 300 Portugal plant taxa. Tony has chosen the format and tone; he has not yet locked these individual drafts.

## Editing and review

Edit `summary` in the main JSON. Paragraphs are separated by `\n\n`; there is no word count or fact quota. Write a readable account of the interesting supported material, with the warmth and clarity of an enthusiastic educator. The source is the full article, including ecology, reproduction, uses and history, rather than only its introduction or keyword matches.

Each entry has `taxonId`, `tags`, `summary`, `reviewStatus`, and `sources`. Source attribution belongs outside the narrative. Do not put quotations or numbered citations into `summary`.

The review sidecar records an outcome for all seed taxa. Drafts have a source-scope decision, editorial notes, and exact source passages with the surrounding context. The passages are a review pack, not an endorsement of every claim they contain or a substitute for checking individual claims. Additional authoritative checks and corrections are identified separately. Research gaps have a specific reason and a raw-source reference; they do not receive placeholder prose.

When changing a factual claim or tag, review the supporting passages too. Keep original source text unchanged. Wikipedia evidence includes the extract hash, source file, retrieval time and revision reference. A new seed snapshot can change those sources; inspect the changes before replacing evidence. The validator intentionally rejects stale or altered evidence. It checks provenance, not botanical truth or whether Tony has approved a draft.

Only after Tony locks an entry should its `reviewStatus` and matching coverage `status` both become `locked`.

```sh
python3 scripts/review_stories.py
python3 scripts/review_stories.py --check
```

These commands render/check the reading copy and research list under `docs/` with no network requests or prose generation. Country and group defaults come from `config/seed.json`; both can be overridden with the same CLI options as the seed script.

## Tags

Tags describe the story, not universal properties or permissions. The sidecar includes their definitions. `edible` concerns the particular food use described; `medicinal` can mean historical use or research, without established effectiveness. `invasive` requires evidence within the selected country, with island or other local scope retained in the wording. A statement about invasiveness abroad does not automatically earn this tag. `lookalike-of:<taxonId>` must resolve to the compared taxon. An interesting ecological story may have no tags.

An absent story or tag never excludes a plant from identification, logging, collection or the full catalogue.

## Attribution and reuse

The summaries are adaptations of Wikipedia text, rewritten for Fieldbook, and are supplied under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Each story credits Wikipedia contributors and links both the article and its recorded revision. Preserve those credits, license links and the indication of adaptation when displaying or reusing the summaries; place them outside the prose.

Verbatim Wikipedia passages retain their source license. Short excerpts from additional sources in the review metadata retain their original rights and attribution; the narrative license does not relicense those excerpts. It also does not apply to application code, iNaturalist data as a whole or photographs. Photo credits and individual licenses remain in the raw taxon records; no photos were downloaded for this pass.
