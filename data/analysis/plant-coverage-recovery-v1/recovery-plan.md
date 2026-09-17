# Recover missing Fieldbook information

## What failed

The old run covered exact-title, source-matched species only. It did not cover all visible taxa. Common-name articles and synonyms were held for review, other ranks were skipped, and Wikipedia lookup failures were treated as corpus gaps. A single Portugal Red List dataset was the only supplementary botanical source. None of this establishes that information does not exist.

A separate display bug merged species and broader complexes sharing a scientific name, hiding 19 species cards with saved summaries. Collection identity now includes rank and group, preserving distinct notes and sightings.

## Auditable baseline

`coverage.json` is computed using the app's actual buildCollection and sortCollection functions. `recovery-queue.json` contains every missing card plus short-summary review candidates. Raw generated-record counts are not the coverage denominator. Device-only taxa require their own additional audit.

After correcting identity: 8,523 visible entries, 6,079 with a paragraph and 2,444 without. These are structural counts, not proof of botanical usefulness. Of the blanks, 977 have matched local sources, 484 have sources needing identity review, and 983 need broader retrieval. Another 880 short paragraphs are flagged for review; short length alone is not failure. Zero entries have had a defensible exhaustive no-information finding.

## Recovery workflow

1. Work from actual missing taxon IDs at every rank: species, hybrid, genus, complex and higher groups. Do not rerun successful content simply to increase attempt totals.
2. Recover local text first. Check scientific identity, rank and scope against source taxoboxes, introductory text, explicit synonyms and persistent taxon identifiers. A common-name article title is not a rejection criterion. Do not silently transfer species facts or edibility to a genus or complex.
3. Broaden discovery for unresolved records: accepted names and documented synonyms; Wikidata taxon IDs and available language editions; Kew POWO, World Flora Online, regional floras, botanical gardens, herbarium accounts, and primary botanical publications. Use morphology/ecology descriptions and relevant structured facts, not occurrence counts as prose. Expand GBIF descriptions beyond the single existing Red List dataset where appropriate.
4. Retain fetched originals, source URLs, retrieval times, hashes, citation/licence details and explicit taxon-match decisions in a new corpus. Keep successful existing runs and their frozen packets unchanged. Track not-searched, retrieval error, candidate requires review, supported source ready, and documented unresolved as distinct states.
5. Freeze source packets before summarisation. Use the existing bounded ten-taxon calls, saved responses and code validation, with the prompt adjusted for the supplied taxonomic rank. Resume without regenerating completed outputs; preserve failures and usage. No automatic generation retries or subagents.
6. Review for useful information as well as format: a supported account of distinguishing features, habitat, origin or relevant uses. Naming-only text and repeated generic filler do not close a gap. Retain food-use parts/preparation qualifications; an unknown food-use status does not require a visible sentence.
7. Publish validated additions, then compare every released ID to the rendered catalogue. Test ordinary alphabetical browsing and recorded problem searches, not just cards chosen from the successful-output set. Track blank cards and weak descriptions separately.

## Completion target

Aim for fewer than ten genuinely unresolved entries, with a named search log and explicit explanation for every exception. This is a target to test, not a claim that all obscure taxa necessarily have a full standalone description. The full collection stays on the work list until its source search and coverage checks are complete.

## Discovery proof

All three previously unresolved strawberry examples have botanical information outside the old corpus. Exact supporting URLs and the scope of their evidence are saved in `source-discovery-probes.json`. This is a three-case demonstration of retrieval failure, not a statistically representative estimate of full-catalogue coverage.

This audit and design phase made no new summarisation CLI calls. The source probes have not yet been turned into new published descriptions.
