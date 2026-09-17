# Recognition approaches and repeat preparation — 9 September 2026

**10 September update:** Tony has explicitly reopened model selection, including online recognition. A comparison against retained phone photos and the original 21-photo controls is complete for Pl@ntNet; Plant.id was also tested on the phone photos using its free agent trial. See [recognition comparison](recognition-comparison.md). The historical keep-BioCLIP-only evaluation direction below is superseded; the live app has not yet switched engines.

## PictureThis and offline identification

PictureThis's official FAQ says its identification requires a network connection. Photos taken offline are retained and identified after reconnection, or the user can later upload photos from the camera roll. This confirms online-dependent identification, consistent with the owner's server-processing hypothesis. The FAQ does not disclose model architecture, model size, or exactly how computation is divided between phone and servers. A small app download alone would not establish those details. [PictureThis FAQ](https://www.picturethisai.com/faq).

Offline recognition is nevertheless a practical approach used by other apps. Pl@ntNet documents a downloadable compressed model for offline use, with optional species thumbnails. Its documentation recommends re-identifying online because its online model is updated more frequently and generally performs better. This is a useful example of a combined online/offline design, not evidence that its model can be embedded in Fieldbook. Model distribution, licensing and technical compatibility would need separate verification. [Pl@ntNet offline instructions](https://docs.plantnet.org/en/tutorials/install-the-offline-embedded-mode/), [Pl@ntNet's embedded-model announcement](https://plantnet.org/en/2022/10/18/plntnet-offline-embedded-identify-plants-anywhere-without-connection/).

Pl@ntNet also documents an external REST identification API. That makes it a concrete online evaluation candidate; we have not enabled it, verified current cost/overage behaviour, or adopted a new runtime dependency. The free consumer app does not by itself imply free unrestricted API access. [API documentation](https://docs.plantnet.org/en/reference/api-plantnet/).

| Approach | Benefit | Trade-off for Fieldbook |
| --- | --- | --- |
| Online recognition | Avoids shipping recognition weights to the phone; computation can run on server hardware | Needs connectivity, uploads photos, requires a provider whose cost limits meet our rules |
| On-device recognition | Can identify during a disconnected walk, without per-identification server calls | Local model/reference storage, initial preparation, phone memory and speed constraints |
| Online plus optional offline pack | Connected convenience with offline capability for those who need it | Both paths require evaluation; more integration and model-maintenance work |

**Current direction, clarified by Tony:** keep BioCLIP and continue real plant testing. The question about other apps is an investigation of the original choice, not an instruction to switch engines or adopt a hybrid default. Keep the identification interface independent of its engine so a later comparison can use the same retained field photos. The present BioCLIP package is a particular implementation, not a lower bound on the size or latency of all on-device recognition.

## What supported the original BioCLIP choice

The project specified BioCLIP before the camera workflow was built. Its fit was offline/no per-inference cost, biological rather than general-purpose image recognition, potential coverage across configured organism groups, and image/text matching against changing taxonomic candidate lists. The implementation established a browser execution path using ONNX. Those are reasons to try it, not evidence that it is the best choice for this phone or plant collection. [BioCLIP 2 model card](https://huggingface.co/imageomics/bioclip-2).

The retained evidence shows a working desktop offline spike and a convenience sample of 21 photographs across seven plants: 19 first-ranked correct results, all 21 in the top five, against 977 candidates. Possible training overlap and the small curated sample limit that evidence. We found no recorded Fieldbook head-to-head benchmark of alternative models or services before implementation. Smaller BioCLIP/BioCAP options were discussed in the later size review without being benchmarked. The original roughly 90 MB size assumption was wrong, and the intended actual-phone spike was not completed before broader feature wiring. These are gaps in the selection/validation process, not proof that the selected model is unsuitable. See [the functional review](phase-2-4-review.md) and [size review](recognition-size-review.md).

## Why the repeated download/preparation is still unresolved

The owner reported a download prompt after home-screen installation, followed by minutes at “Checking reference species … / 2587”. Chrome PWA storage is origin-bound. In the same Chrome profile at the exact same scheme, host and port, installing should normally reuse origin storage; installation alone is not evidence of a separate fresh database. Storage can be affected by origin/profile changes, browser clearing/eviction and incomplete setup. [Google's PWA architecture guidance](https://web.dev/learn/pwa/architecture), [offline storage guidance](https://web.dev/learn/pwa/offline-data?hl=en).

Code inspection found:

- The recognition cache name still uses `bioclip2-int8-v1`; this investigation has not changed the model or reference version and found no code clearing that cache during updates/installations.
- Readiness needs both cached model/runtime/tokenizer files and the saved country reference marker. The previous single download prompt could not explain which was missing, and briefly appeared while readiness was still being checked.
- The download loop already skips cached files. Seeing the preparation screen does not establish that all 360 MB transferred again.
- After embedding the query photo, the engine checks each candidate's taxonomic reference. Missing references are generated one at a time and saved incrementally. Repeating this stage for minutes means expensive preparation is occurring; the counter itself also traverses cached entries, so merely seeing the counter is not proof of regeneration.
- All 1,019 plants in the bundled starter list have references in the 25,067-reference pack. This does not establish completeness for the owner's different location or its all-group 2,587-candidate list.

Actual Android logs and a photo arrived after fixing the receiver's HTTP/2 origin check at 15:49 UTC. They confirm that 317 of 2,587 local candidate references needed generation, taking 348.4 seconds during the latest attempt; image inference took 8.68 seconds. The owner confirms the original browser and installed app address were both `https://192.168.0.97:5174`. The earlier pasted Android export is incomplete, so we still cannot establish why the first three sightings disappeared or which files were absent at the later preparation prompt. See [the received-session findings](android-first-test.md#first-actual-automatic-delivery-1549-utc).

Added diagnostics now report origin, browser/standalone display mode, a local storage identity, estimated usage/quota/persistence, exact missing recognition assets and reference readiness. Download events distinguish cache reuse from network retrieval. Readiness is checked before displaying the preparation card, and check failures are logged explicitly. The already-added missing-reference count and timing will separate this preparation from photo inference.

The follow-up is to compare browser and home-screen sessions on the actual phone using those records. Desktop tests can verify cache reuse but cannot establish what happened on the owner's installation. Do not clear the phone's data as a troubleshooting step: that would destroy the evidence and force a real re-download.
