# Plant CLI batch: 1095/1095 attempted

[Read all outputs](outputs.html) · [Machine-readable report](report.json) · [Frozen manifest](manifest.json)

Model: gpt-5.6-sol; reasoning: high; existing ChatGPT subscription authentication.

18/110 completed CLI calls covering 180 plants; 180 passed format checks; 915 failed (including execution failures). 9 valid null summaries.

Elapsed wall time: 3896.0 seconds (64.93 minutes). Sum of CLI generation durations: 1783.4 seconds.

| Generation usage | Tokens |
| --- | ---: |
| input_tokens | 911,324 |
| cached_input_tokens | 76,544 |
| cache_write_input_tokens | 0 |
| output_tokens | 66,420 |
| reasoning_output_tokens | 46,369 |
| uncached_input_tokens | 834,780 |

Usage unavailable for 92 CLI calls. Usage is counted once per call, never multiplied by plants. Reported totals exclude unreported usage; cached input and reasoning output are subsets, not additional tokens. Coordinating-chat usage is separate and is not measured here.

One fresh bounded CLI process per group of up to 10 plants; no generation retries, replacements, tools, subagents, or LLM review. Requests, raw outputs, events, stderr, attempt markers, and reported usage are retained. The approved prompt and source packets were frozen before generation.

Validation: JSON object/schema, whitespace word counts, deterministic sentence-boundary heuristic, paragraph count, evidence-ID existence and required evidence; no LLM review.

Botanical accuracy has not been reviewed. These are local drafts; no app stories were changed or published.

## Failures

| Taxon ID | Species | Failure |
| --- | --- | --- |
| 55571 | Larix | Interrupted attempt; recovered saved events without retry |
| 55668 | Ornithopus perpusillus | Interrupted attempt; recovered saved events without retry |
| 55725 | Symphytum | Interrupted attempt; recovered saved events without retry |
| 55839 | Cochlearia | Interrupted attempt; recovered saved events without retry |
| 55842 | Helleborus | Interrupted attempt; recovered saved events without retry |
| 55869 | Cyclamen | Interrupted attempt; recovered saved events without retry |
| 55883 | Hedera | Interrupted attempt; recovered saved events without retry |
| 55892 | Erysimum × cheiri | Interrupted attempt; recovered saved events without retry |
| 56009 | Zantedeschia | Interrupted attempt; recovered saved events without retry |
| 56020 | Agapanthus | Interrupted attempt; recovered saved events without retry |
| 56459 | Pelliaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 56477 | Bazzania | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 56484 | Calypogeia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 56497 | Cephaloziella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 56519 | Frullania | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 56917 | Hydrocotyle | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 56955 | Helianthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57022 | Eleocharis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57067 | Melilotus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57115 | Lepechinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57156 | Avena sativa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57159 | Brachypodium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57168 | Eragrostis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57182 | Hordeum vulgare | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57185 | Leymus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57187 | Koeleria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57191 | Phalaris canariensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57193 | Phleum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57251 | Physocarpus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57355 | Schinus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57357 | Amorpha | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57857 | Romanzoffia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57861 | Utricularia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57863 | Rhynchospora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57870 | Inula | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 57983 | Helianthus annuus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58068 | Arabis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58073 | Descurainia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58103 | Herniaria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58126 | Bassia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58227 | Paeoniaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58228 | Paeonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58300 | Punica granatum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58333 | Lycium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58335 | Nicotiana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58363 | Hesperoyucca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58365 | Alopecurus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58374 | Echinochloa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58388 | Sorghum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58389 | Sorghum bicolor | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58390 | Triticum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58461 | Satureja | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58465 | Dahlia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58728 | Berberis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58756 | Cystopteris | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58789 | Apium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58791 | Berula | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 58869 | Githopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59033 | Calibrachoa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59096 | Muhlenbergia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59280 | Asperula | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59432 | Levisticum officinale | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59554 | Trollius | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59713 | Chlorophyceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59901 | Melissa officinalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59923 | Helianthella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59933 | Trachystemon orientalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 59942 | Libertia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60115 | Isoetes | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60126 | Cicuta | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60237 | Samolus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60290 | Rostraria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60303 | Parapholis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60311 | Puccinellia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60321 | Ruschia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60329 | Oscularia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60448 | Metrosideros | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60580 | Forsythia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 60958 | Gamochaeta | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61040 | Morella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61064 | Glyceria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61092 | Ruppia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61178 | Dichondra | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61182 | Thermopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61186 | Crocosmia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61398 | Ocimum basilicum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61400 | Osteospermum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61433 | Conopodium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61758 | Felicia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61774 | Nothoscordum × borbonicum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61885 | Moehringia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 61936 | Scleranthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62206 | Alcea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62339 | Verbascum densiflorum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62379 | Sempervivum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62652 | Mentha spicata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62742 | Rudbeckia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62819 | Ceiba | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62832 | Sapindus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62834 | Parkinsonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62844 | Tamarindus indica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62852 | Delonix | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62854 | Laguncularia racemosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62855 | Tamarindus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62928 | Crinum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62941 | Ipomoea batatas | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 62946 | Cardiospermum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 63115 | Dennstaedtia punctilobula | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 63190 | Solanum melongena | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 63205 | Arachis hypogaea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 63213 | Echinopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 63366 | Limonium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 63573 | Picea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 63632 | Bryopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 63974 | Calycanthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64047 | Pinus attenuata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64059 | Microsorum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64086 | Orthotrichaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64109 | Venegasia carpesioides | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64192 | Kickxia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64274 | Trisetum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64518 | Banksia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64675 | Cyatheaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 64696 | Elaeagnus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67669 | Gelidiaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67675 | Hypnea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67679 | Gracilaria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67711 | Sansevieria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67715 | Capparis spinosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67757 | Dendrobium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67759 | Coriandrum sativum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67848 | Marsupella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67856 | Antitrichia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67867 | Bryum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67879 | Dicranaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67882 | Ditrichum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67906 | Orthotrichum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67916 | Syntrichia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67918 | Plagiotheciaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 67925 | Isothecium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68038 | Marantaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68039 | Calathea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68059 | Timmiella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68192 | Mammillaria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68298 | Ptychostomum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68314 | Bombax | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68320 | Medinilla | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68611 | Trentepohlia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68612 | Ceramium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68615 | Hildenbrandia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68662 | Pterocarpus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68663 | Dendrocalamus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 68716 | Grewia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 69177 | Pilea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 69234 | Alocasia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 69757 | Chamaecyparis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 69776 | Clivia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 69821 | Cedrus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 69913 | Neckera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 69936 | Prunus amygdalus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 69974 | Annona | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 70025 | Pandanus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 70027 | Artocarpus altilis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 70037 | Sophora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 70054 | Citrullus lanatus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 70055 | Citrullus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71047 | Rhytidiadelphus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71148 | Cryptomeria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71215 | Launaea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71244 | Heteranthera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71407 | Basellaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71483 | Costaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71606 | Posidoniaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71939 | Hyparrhenia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71956 | Aloe | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71970 | Anisodontea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71981 | Arctotis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71983 | Argyranthemum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 71997 | Bacopa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72008 | Billardiera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72016 | Bothriochloa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72028 | Camelina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72040 | Cestrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72042 | Chaetopappa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72046 | Chamelaucium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72055 | Cinnamomum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72061 | Colutea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72073 | Cota | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72082 | Cyclospermum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72090 | Delosperma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72095 | Dimorphotheca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72108 | Echinodorus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72113 | Empetrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72123 | Eruca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72129 | Eulobus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72131 | Eustoma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72140 | Gaudinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72154 | Gunnera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72156 | Gypsophila | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72180 | Holosteum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72190 | Iberis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72194 | Ipheion | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72196 | Ixia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72197 | Jacaranda | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72217 | Limnobium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72225 | Malephora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72232 | Melaleuca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72257 | Nolina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72293 | Phaseolus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72340 | Salvinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72344 | Scabiosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72349 | Sclerochloa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72365 | Sium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72378 | Stipa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72384 | Syagrus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72388 | Syzygium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72396 | Thlaspi | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72427 | Wolffia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 72432 | Zannichellia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 75292 | Aegilops neglecta | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 75363 | Allium sativum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 75445 | Anethum graveolens | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 75867 | Brasenia schreberi | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 75869 | Brassica napus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 75900 | Bromus commutatus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 76445 | Coreopsis tinctoria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 77295 | Glycyrrhiza glabra | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 77623 | Landoltia punctata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 78465 | Petroselinum crispum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 78537 | Phalaris coerulescens | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 78555 | Phoenix dactylifera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 78755 | Prunus persica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 79021 | Secale cereale | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 79146 | Solanum xanti | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 79432 | Trifolium striatum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 81507 | Adansonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 81755 | Malcolmia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 81794 | Glandularia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 81805 | Sabal | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 81837 | Tephrosia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 81938 | Alstroemeria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82006 | Stenocereus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82305 | Acorus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82321 | Spathoglottis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82470 | Melampodium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82541 | Astrocaryum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82602 | Crithmum maritimum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82651 | Carthamus caeruleus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82826 | Hemerocallis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82853 | Cydonia oblonga | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82864 | Plantago serraria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 82888 | Jasminum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 83020 | Cryptanthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 83080 | Eugenia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 83445 | Diospyros lotus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 83521 | Plectranthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 83583 | Piper nigrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 83711 | Rhodospatha | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 83965 | Lophocolea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 84004 | Vriesea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 84084 | Spinacia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 84092 | Spinacia oleracea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 84579 | Encyclia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 84780 | Plinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 84826 | Ceropegia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 84986 | Euryops | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 85126 | Pericallis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 85411 | Epiphyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 85436 | Tibouchina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 117436 | Sicyos | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 117507 | Sobralia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 117771 | Callithamnion | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 117812 | Gelidium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 117828 | Corallinaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 117829 | Lithothamnion | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 117836 | Polysiphonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 118731 | Woodwardia areolata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 118972 | Anigozanthos | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119092 | Picea pungens | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119100 | Jatropha | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119141 | Dioscorea polystachya | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119160 | Racomitrium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119218 | Albuca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119219 | Lachenalia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119246 | Nemesia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119267 | Curcuma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119324 | Ornithoglossum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119386 | Curcuma longa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119657 | Diascia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 119898 | Rhipsalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 120053 | Cleretum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 120201 | Hesperantha | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 120236 | Melianthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 120250 | Eucomis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 120836 | Scapania | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 120943 | Malvaviscus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 120945 | Ageratum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 121263 | Tipuana tipu | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 121588 | Volvox | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122303 | Brachychiton | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122355 | Aloe zebrina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122362 | Telopea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122520 | Russelia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122526 | Freycinetia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122659 | Leucobryum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122715 | Melicope | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122771 | Trigonella foenum-graecum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122774 | Trigonella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122835 | Colocasia esculenta | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122854 | Cicer arietinum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122903 | Glycine | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122965 | Ananas comosus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122967 | Ananas | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122971 | Zingiber officinale | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122972 | Zingiber | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122975 | Pistacia vera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122976 | Lactuca sativa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 122988 | Anacardium occidentale | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123001 | Garcinia mangostana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123003 | Artocarpus heterophyllus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123116 | Ceratodon | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123119 | Leucophyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123120 | Dicranum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123138 | Ulota | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123353 | Jubaea chilensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123356 | Citrus medica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123443 | Plagiothecium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123616 | Morella faya | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123622 | Peperomia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123640 | Philonotis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123643 | Pohlia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123645 | Pseudoscleropodium purum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123725 | Carum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123736 | Alpinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123741 | Citrus hystrix | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123793 | Fontinalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123847 | Zygnema | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123850 | Zygnemataceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123851 | Spirogyra | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123852 | Closterium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123856 | Hydrodictyaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 123947 | Plagiochila | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 124357 | Gagea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 124387 | Aulacomnium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 124833 | Caralluma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 124842 | Adenium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 125137 | Pulmonaria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 125397 | Aspidistra | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 125432 | Paeonia × suffruticosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 125625 | Miscanthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 125675 | Glandularia bipinnatifida | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 126186 | Photinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 126405 | Begonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 126638 | Hyacinthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 126736 | Fatsia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 126844 | Gardenia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 126846 | Vitex | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 127043 | Pogonatum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 127280 | Canna | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 127364 | Celosia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 127428 | Pleuridium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 127668 | Entada | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 127909 | Phlebodium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 128032 | Broussonetia papyrifera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 128238 | Laurencia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 128571 | Anacolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 128588 | Globularia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 128700 | Desmanthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 128754 | Berlandiera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 128971 | Bulbophyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 128976 | Cymbidium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129035 | Thunbergia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129077 | Erepsia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129116 | Knautia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129322 | Coreopsis verticillata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129371 | Dasylirion | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129449 | Honckenya | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129733 | Disphyma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129799 | Platycladus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 129854 | Calceolaria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 130676 | Pleurozium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 130871 | Iresine | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131338 | Champia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131340 | Amphiroa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131368 | Galaxauraceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131373 | Peyssonnelia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131377 | Jania | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131379 | Delesseriaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131381 | Griffithsia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131384 | Galaxaura | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 131832 | Spermacoce | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 132112 | Bambuseae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 132450 | Zinnia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 132452 | Tithonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 132850 | Leonotis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 132896 | Tabernaemontana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 133212 | Dicliptera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 133215 | Rhodymenia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 133457 | Polyscias | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 133556 | Macaranga | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 134209 | Ternstroemia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 135337 | Phlomis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 135348 | Wodyetia bifurcata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 135454 | Howea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 135546 | Saxegothaea conspicua | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 135549 | Tetraclinis articulata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 135553 | Thujopsis dolabrata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 136317 | Abies fraseri | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 138020 | Blechnum nudum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 139204 | Diphysa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 139444 | Cajanus cajan | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 140245 | Zygopetalum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 140284 | Vanda | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 140299 | Trichopilia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 140477 | Phalaenopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 140934 | Brassia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 141298 | Pitcairnia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 141303 | Guzmania | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 141327 | Bromelia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 141388 | Chamaedorea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 141394 | Homalomena | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 141488 | Cryptocoryne | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 141506 | Caladium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 141512 | Aglaonema | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142081 | Achyranthes | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142103 | Liriope | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142339 | Greigia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142340 | Billbergia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142346 | Gloriosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142372 | Rumohra | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142455 | Ctenanthe | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142472 | Gomesa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142562 | Pleioblastus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 142793 | Cephalotaxus harringtonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 143891 | Ozothamnus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 145588 | Coix lacryma-jobi | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 145601 | Fagopyrum esculentum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 146817 | Lablab | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 147263 | Crescentia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 147272 | Dieffenbachia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 147468 | Xerochrysum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 147472 | Pimelea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 147922 | Columnea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 148217 | Didymodon | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 152661 | Ahnfeltiales | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 153047 | Erysimum bicolor | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 153104 | Weigela | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 153164 | Mesophyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 153166 | Characeae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 153990 | Echeveria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 154033 | Montanoa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 154339 | Mylia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 154544 | Cunila | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 154862 | Pachira | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155567 | Abelia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155606 | Aethusa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155616 | Aloina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155694 | Weissia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155847 | Thinopyrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155903 | Amphidium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155914 | Thladiantha | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155961 | Streblus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 155985 | Stokesia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156059 | Sideritis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156119 | Sematophyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156122 | Selenicereus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156133 | Barbula | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156162 | Andreaea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156178 | Antidesma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156202 | Aristea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156204 | Arnelliaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156230 | Schistidium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156241 | Sageretia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156248 | Roldana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156254 | Rhodobryum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156306 | Blindia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156382 | Pterygoneurum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156407 | Pterolepis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156451 | Pseudocrossidium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156464 | Pseudogynoxys | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156551 | Ptychomitrium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156564 | Pritchardia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156572 | Platygyrium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156595 | Pityopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156599 | Pinellia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156602 | Pilosocereus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156609 | Phellodendron | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156623 | Petrea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156632 | Periploca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156634 | Pentzia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156664 | Pachycereus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156688 | Omphalodes | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156707 | Nertera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156732 | Myrcianthes | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156942 | Bunias | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156955 | Callistephus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156988 | Cedronella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 156996 | Caucalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157029 | Deutzia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157052 | Cyclanthera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157119 | Cololejeunea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157134 | Cnidium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157153 | Claoxylon | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157161 | Choisya | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157164 | Duranta | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157223 | Gymnostomum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157249 | Entosthodon | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157423 | Furcraea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157526 | Heterocentron | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157583 | Jungermannia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157621 | Hypopterygium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157634 | Hygroamblystegium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157648 | Hippophae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157692 | Lejeunea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157700 | Lagenaria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 157765 | Abelmoschus esculentus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 158103 | Agave sisalana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 158190 | Allium porrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 158434 | Anthriscus cerefolium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 159906 | Carex caryophyllea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 161570 | Cyrtomium fortunei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 162691 | Erodium laciniatum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 162845 | Euphorbia pulcherrima | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 163451 | Gymnocladus dioicus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 165138 | Manihot esculenta | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 165925 | Origanum majorana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 165944 | Orthotrichum anomalum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 166064 | Palustriella commutata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 168382 | Salvia lemmonii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 168442 | Satureja montana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 169794 | Torilis leptophylla | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 170458 | Abelia × grandiflora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 170774 | Helianthus × laetiflorus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 170837 | Leucanthemum × superbum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 170852 | Lonicera × heckrottii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 170883 | Musa × paradisiaca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 170914 | Petunia × atkinsiana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 170939 | Populus × canescens | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 170968 | Primula × polyantha | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 171084 | Rosa × alba | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 171131 | Spiraea × vanhouttei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 171203 | Viola × wittrockiana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 179306 | Rhaphiolepis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 180180 | Arenga | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 180225 | Butia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 180572 | Rhizoclonium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 180574 | Nitella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 180685 | Chara | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181136 | Radermachera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181280 | Rothmannia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181465 | Crocosmia × crocosmiiflora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181525 | Mentha × piperita | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181600 | Mentha × villosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181672 | Bauhinia × blakeana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181681 | Photinia × fraseri | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181684 | Populus × canadensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181686 | Typha × glauca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 181924 | Symphytum × uplandicum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 182814 | Prasiola | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 182984 | Audouinella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 182990 | Bonnemaisonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 183048 | Callophyllis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 183253 | Aeschynanthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 183447 | Exacum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 183493 | Eriocephalus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 183664 | Dombeya | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 183848 | Debregeasia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 184498 | Buchanania | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 184500 | Brunfelsia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 185032 | Phylica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 185693 | Nautilocalyx | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 185785 | Mimusops | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186006 | Mandevilla | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186054 | Macadamia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186060 | Loropetalum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186097 | Lithops | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186126 | Lithodora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186287 | Klasea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186574 | Huernia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186637 | Wimmeria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 186781 | Tephrocactus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 189766 | Berberis maderensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 190367 | Catha edulis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 190857 | Convolvulus massonii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 191503 | Dimocarpus longan | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 193722 | Ilex paraguariensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 200071 | Citrus trifoliata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 200854 | Hydrodictyon | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 200871 | Coelastrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 200891 | Oedogonium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 200915 | Staurastrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 201021 | Phyllophora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 202155 | Castanospermum australe | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 202172 | Consolea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 202342 | Cenchrus americanus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 202618 | Mougeotia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 203646 | Cosmarium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 203647 | Eudorina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 203680 | Pilosella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 204204 | Atocion | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 204205 | Avenula | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 204586 | Magnolia × soulangeana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 204927 | Beaucarnea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 204952 | Rhynchostele | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 206219 | Stanhopea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 206240 | Guarianthe | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 206271 | Spathiphyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 206408 | Disocactus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 206730 | Aporocactus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 206960 | Beschorneria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 207427 | Phymosia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 208078 | Plagiomnium undulatum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 208677 | Lophocereus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 209306 | Catananche | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 209889 | Casimiroa edulis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 210574 | Cassinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 210612 | Myrmecophila | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 211065 | Cypripedioideae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 211285 | Gennaria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 244025 | Kniphofia × praecox | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 244525 | Iris × hollandica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 245689 | Orobanche caryophyllacea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 246064 | Gasteria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 246103 | Sphagneticola | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272592 | Microbryum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272612 | Rogiera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272629 | Chrysanthellum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272659 | Polaskia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272756 | Solenostoma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272826 | Davallia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272837 | Pachyphytum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272914 | Haworthia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 272942 | Rhapis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 273015 | Jarilla | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 273247 | Colletia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 273378 | Podachaenium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 273537 | Handroanthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 276077 | Sedum × rubrotinctum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 284503 | Annona muricata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 285332 | Cuphea ciliata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 290889 | Agave tequilana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 311382 | Chlorella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 317752 | Tritonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 319115 | Batrachospermum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 319116 | Batrachospermaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 319675 | Erodium chium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 320033 | Leucospermum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 320273 | Phygelius | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 320739 | Cyathea dregei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 321045 | Philotheca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 321151 | Solenopsis laurentia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 322689 | Gerbera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 322946 | Farfugium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 323538 | Brachyscome | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 323724 | Abrophyllum ornans | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 323827 | Leucophyta brownii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 323942 | Cyathea australis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 324241 | Draparnaldia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 325556 | Micrasterias | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 326087 | Portulacaria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 326268 | Oocystaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 326269 | Desmodesmus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 326761 | Thymus × citriodorus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 326880 | Limbarda crithmoides | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 326881 | Limbarda | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 327644 | Smallanthus sonchifolius | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 331093 | Crinum × amabile | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 331107 | Bougainvillea × buttiana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 331121 | Citrus × aurantiifolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 331122 | Citrus × aurantium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 331124 | Citrus × limon | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 332552 | Tetradium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 332906 | Cyatheales | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 333717 | Andryala integrifolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 334041 | Colchicum montanum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 334489 | Lomelosia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 338319 | Aloe parvibracteata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 338327 | Aloe macrocarpa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 338842 | Hymenocarpos | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 339054 | Plocamium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 339077 | Derbesia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 340160 | Markhamia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 340800 | Fabiana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 341039 | Iris albicans | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 341115 | Ornithogalum orthophyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 341578 | Cachrys | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 341591 | Romulea ramiflora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 341979 | Reichardia intermedia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 342001 | Pycnocomon | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 342035 | Delphinium halteratum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 342555 | Goniophlebium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 343016 | Agrostis congestiflora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 343018 | Agrostis reuteri | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 343506 | Streptocarpus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 343885 | Rhododendron × pulchrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 344588 | Nematanthus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 348212 | Gymnocalycium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 354018 | Westringia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 355509 | Cleistocactus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 359493 | Ferulago | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 361962 | Mesotaenium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 362547 | Onychium japonicum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 363441 | Espostoa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 365657 | Manicaria saccifera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 367278 | Zamioculcas | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 370272 | Pyropia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 372245 | Yucca recurvifolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 372389 | Orbea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 372452 | Brugmansia × candida | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 374421 | Ursinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 379255 | Reynoutria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 410339 | Elaeagnus reflexa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 410499 | Tilia × europaea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 411276 | Forsythia × intermedia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 415501 | × Fatshedera lizei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 415524 | Citrus × latifolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 415590 | Pithophora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 415892 | Cistus × purpureus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 417619 | Rubus × loganobaccus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 418641 | Pterygota | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 421619 | Ajania | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 423895 | Oncidiinae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 426563 | Robiquetia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 428365 | Ziziphus jujuba | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 428544 | Adromischus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 428558 | Rhoicissus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 429186 | Lobivia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 430729 | Blechnum brasiliense | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 430783 | Canistrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 431083 | Guettarda uruguensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 431261 | Mandevilla × amabilis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 431412 | Paullinia cupana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 431651 | Seriphium plumosum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 434785 | Sparrmannia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 437996 | Leontodon tuberosus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 446668 | Oxybasis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 446744 | Blechnum parrisiae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 448524 | Crinum × powellii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 450392 | Geranium × oxonianum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 460858 | Cistus × laxus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 461042 | Pericallis aurita | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 464556 | Dolichandra | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 465137 | Pyramimonadales | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467463 | Cosentinia vellea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467566 | Micromeria graeca | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 467887 | Ischnolepis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 468154 | Lemanea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 468155 | Lemaneaceae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 468356 | Klebsormidium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 468484 | Microspora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 469095 | Melilotus segetalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 469317 | Chaetachme aristata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 470765 | Cochliasanthus caracalla | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 471788 | Hylocereeae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 474119 | Leptospermeae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 476049 | Begonia × tuberhybrida | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 478638 | Aesculus × carnea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 479849 | Aloe distans | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 484302 | Ismelia carinata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 487634 | Rosa abietina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 489422 | Haplophyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 489435 | Paralemanea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 489609 | Pericallis × hybrida | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 490222 | Curtisia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 492914 | Matricaria aurea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 493154 | Ziziphora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 493958 | Asterococcus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 495207 | Fenestraria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 495238 | Salix × fragilis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 495547 | Pleiospilos | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 495872 | Gastroclonium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 496467 | Fumaria flabellata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 502646 | Lemnoideae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 508774 | Nidularium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 510965 | Alcantarea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 512008 | Orobanche densiflora | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 513833 | Orobanche clausonis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 514126 | Miltoniopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 516062 | Silene bellidifolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 518424 | Kalanchoe × houghtonii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 518473 | Prunella × intermedia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 524208 | Helictochloa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 524317 | Glottiphyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 524560 | × Beallara | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 545878 | Capparis orientalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 550603 | Cautleya | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 552449 | Platanus × hispanica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 553486 | Merwilla | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 557098 | Neoorthocaulis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 565962 | Tritonia securigera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 567947 | Gonialoe | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 568528 | Aloiampelos | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 570618 | Zygopetalinae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 574056 | Corpuscularia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 575102 | Alkekengi officinarum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 575209 | Saintpauliopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 575610 | Artemisiopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 575712 | Helichrysopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 576592 | Freylinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 576771 | Haworthiopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 577404 | Lewinskya | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 579597 | Aloe candelabrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 580226 | Aristaloe aristata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 584316 | Dymondia margaretae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 590725 | Oedipodiella australis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 594639 | Spergularia bocconei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 601907 | Laeliinae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 624926 | Equisetum × moorei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 631579 | Quercus × rosacea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 632325 | Stapeliinae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 632795 | Helenieae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 634625 | Filago germanica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 701524 | Furcellaria lumbricalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 706825 | Rohdea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 708697 | Citrus × microcarpa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 709635 | Iris × germanica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 714412 | Hosta undulata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 734821 | Petrosedum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 746115 | Ismene | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 765426 | Citrus deliciosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 765587 | Alkekengi | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 768555 | Ammoides pusilla | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 772088 | Erica × darleyensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 790575 | Annesorhizeae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 790858 | Pistacia × saportae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 797969 | Trihesperus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 801794 | Narcissus cuneiflorus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 823397 | Pleroma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 825778 | Begonia × albopicta | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 829210 | Trichocereus macrogonus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 850573 | Limnobium laevigatum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 850784 | Reynoutria × bohemica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 858331 | Melanthieae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 861416 | Ruscus streptophyllus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 862656 | Sansevieria suffruticosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 863646 | Hyacinthoides × massartiana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 866390 | Sicyos edulis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 868716 | Acalypha herzogiana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 868721 | Berberis × hortensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 870017 | Trichocereus bridgesii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 870039 | Trichocereus spachianus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 870436 | Oeosporangium | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 871625 | Rhipsalideae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 880433 | Camellia nitidissima | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 883652 | Anemone | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 883677 | Eriocapitella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 889494 | Caroxylon | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 911045 | Fuscocephaloziopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 918919 | Westringieae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 919362 | Passiflora × violacea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 928732 | Erodium aethiopicum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 931442 | Arthroceras | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 950339 | Eriocapitella × hybrida | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 954525 | Nekemias | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 956490 | Asplenium azomanes | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 962704 | Hibiscus × archeri | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 968782 | Gongrosira | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 985690 | Thaumatophyllum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 985726 | Thaumatophyllum xanadu | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 994381 | Potamogeton × angustifolius | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1004926 | Prunus × subhirtella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1019110 | × Triticosecale | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1021084 | Trocdaris | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1065446 | Caesalpinia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1078677 | Nepenthes × kinabaluensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1090496 | Rubus fruticosus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1093017 | Cistus × incanus | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1105913 | Quercus × hispanica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1122770 | Flexitrichum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1122991 | Pavonia × gledhillii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1150362 | Weingartia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1203981 | Camellia × williamsii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1230245 | Begonia × hiemalis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1238857 | Heptapleurum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1252131 | Ophrys × heraultii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1263326 | Trocdaris verticillata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1270506 | Echeveria × imbricata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1275720 | Citrus × limonia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1317476 | Bulbophyllum bolsteri | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1341071 | Feijoa sellowiana | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1356123 | Hera | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1363872 | Alchemilla microcarpa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1367002 | Crataegus germanica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1375470 | Vicia lens | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1383488 | Nymphaea × khurooi | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1393593 | Aloe × nobilis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1411955 | Spartina | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1416463 | Nymphaea × marliacea | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1435379 | Rhipsalidopsis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1443129 | Calceolaria × herbeohybrida | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1446403 | Viola × williamsii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1448975 | Prunus × cistena | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1454183 | Elaeagnus × submacrophylla | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1455863 | Rosa × damascena | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1456784 | Orchis × bivonae | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1457030 | Freesia × kewensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1458348 | Cynanchica | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1493090 | Neltuma | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1524773 | Crataegus × lavalleei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1525262 | Paleoagave bracteosa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1552025 | × Heucherella | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1555489 | Mutarda nigra | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1564212 | Agrostis × fouilladei | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1569054 | × Pachyveria | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1579705 | Bergera koenigii | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1584272 | Autonoe madeirensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1586229 | Brachypodium hybridum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1588568 | Harpephyllum afrum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1599165 | Rosa × centifolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1611056 | Citrus reticulata | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1628098 | Hibiscus × rosa-sinensis | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1639001 | Echeveria purpusiorum | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1645811 | Agrostula truncatula | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1656026 | Ciliochloa | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
| 1687652 | Sabdariffa gossypiifolia | CLI execution failure: exit=1, turns=0, messages=0, tool events=0 |
