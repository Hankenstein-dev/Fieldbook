# Recognition size review — 9 September 2026

**September 9 update:** broader taxonomic coverage adds about 36.5 MB of compressed references. Current totals are 396.75 MB downloaded and 586.07 MB unpacked; model weights are unchanged. See [recognition preparation](recognition-preparation.md). The measurements below describe the earlier pack.

Tony raised the 545 MB download as too large for the eventual phone app. Lossless download compression is now implemented. Model replacement and the other size optimisations below remain assessment work.

## Measured current assets

| Part | Raw MB | Shipped gzip MB |
| --- | ---: | ---: |
| image | 306.92 | 202.06 |
| text | 124.55 | 78.69 |
| references | 85.56 | 72.54 |
| runtime | 25.80 | 6.39 |
| tokenizer | 2.22 | 0.57 |

Total: **545.05 MB raw; 360.24 MB shipped gzip**, saving **184.81 MB (33.91%)**. Sizes come from the generated `config/generated/recognition-downloads.json`. The earlier Python/zlib level-6 measurement was 367.86 MB (`data/models/size-audit.json`); the production Node gzip encoder produces slightly smaller files, with identical decompressed bytes.

This reduces transfer only. The current Cache API/IndexedDB design still stores decoded content and reference shards remain cached after their vectors are imported into IndexedDB. It does not reduce inference RAM. App shell, map tiles, species photographs, reference indexing and saved observations are additional. Removing duplicate references and keeping vectors in a compact binary representation can reduce storage further.

## Implemented transport

- `scripts/prepare_runtime.mjs` runs `scripts/prepare_downloads.mjs` before dev/build. It verifies source model/reference hashes, generates gzip level-6 assets in `public/recognition-downloads/`, and checks their decompression round trip. Unchanged compressed files are hash-checked and reused on later builds.
- The small generated manifest contains content-addressed download URLs, compressed/raw sizes and checksums. Models, tokenizer/config, runtime, reference metadata and vector shards all use this path.
- The client downloads ordinary static gzip files, decompresses with the browser's [DecompressionStream](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream), verifies the raw size and SHA-256, then caches under the original asset URL. Hosts that transparently decode gzip are also supported. No hosting-specific Content-Encoding configuration, server, API key or paid call is required.
- Existing decoded downloads and completed chunks remain reusable. Interrupted transfers retry the unfinished file; corrupt files never become valid cached assets. HTTP caching of the compressed payload is disabled to avoid retaining another copy there. The large downloads are excluded from the service-worker app-shell precache.
- Recognition and accuracy are unchanged because the model bytes are identical. Decompression adds one-time CPU work and temporary memory during setup, bounded by one file at a time (largest raw file about 26 MB); it does not recur during offline inference. Phone setup time has not yet been measured.
- Raw build inputs remain in `public/models/` and `public/runtime/`, and Vite currently includes both raw and compressed files in `dist/`. This increases build/hosting disk usage; the new client downloads only the compressed versions. Future native packaging should choose the required representation rather than embedding both.


Validation: 50 TypeScript tests and the production build pass. The production browser test downloads only the 51 compressed URLs, forces a failed second chunk, reloads and resumes without fetching the first chunk again, then identifies a real strawberry-tree photo and runs the text tower after an offline reload. An independent Python gzip pass verifies every compressed file against its raw SHA-256. Actual Android setup time and memory remain unmeasured.

The image encoder has 303,966,208 parameters and the text/other part 123,650,305, counted from the retained safetensors header. Model weights are already int8. Full precision weights would be much larger; changing them to float16 would not halve these int8 files.

## Headroom

- Make the text tower and tokenizer optional: save about 126.77 MB from photo setup. Precomputed taxonomic references suffice for photo matching of covered taxa. Describe-instead and on-device embedding of newly encountered taxa would require that optional pack or additional precomputed reference assets. Ordinary name lookup and logging do not require the text tower.
- The 25,067-taxon reference pack is 77,005,824 bytes of float32 vectors plus 8,556,300 bytes of metadata. Float16 would make it approximately 47.1 MB with unchanged metadata; per-vector int8 plus a float scale approximately 27.9 MB. The first 100 vectors showed mean/max cosine losses of approximately 0.000104/0.000168 with per-vector int8 rounding, and 0.000000022/0.000000029 with float16. These are vector reconstruction checks, not species classification accuracy tests.
- Keep country references optional after a local reference download. At 768 dimensions, one int8 reference is around 772 bytes including a scale; a thousand references are under 1 MB before metadata. This saves the initial download but reduces offline widening coverage until further packs are saved. It does not shrink the image encoder.
- Current reference taxonomy: 7,839 plants and 17,228 other taxa. A plant-only reference pack would shrink that component, but limit the agreed all-group identification coverage. The universal image model would remain about 307 MB; individual species are not removable weight modules.
- Same BioCLIP 2 image tower with int4 weight quantisation: theoretical main-weight payload about 152 MB, plus graph/scales/unquantised operators. A photo-only country setup might land around 200–230 MB raw. This is an engineering estimate requiring an export, browser/operator checks, and recognition evaluation. It is not a guaranteed halving or a measured working configuration.
- Smaller biology model: original BioCLIP and BioCAP use ViT-B/16. An int8 image tower of that scale is roughly 85–90 MB by parameter budget; a photo-only setup with compact 512-dimensional country references and the current runtime could plausibly fit around 120–150 MB raw. This is a target to benchmark, not a measured Fieldbook package. BioCAP is trained with descriptive captions as well as taxonomic labels and merits comparison with BioCLIP 2. Regenerate references for any different model; do not reuse incompatible embeddings.
- A custom runtime containing required operators can save part of the 25.8 MB, but cannot solve the dominant image-weight cost. Sub-100 MB would need a more aggressive model/quantisation/runtime combination or a trained smaller student, and should not be promised before evaluation.

Removing the text tower/tokenizer and quantising the full reference pack to int8 would bring the current image-model setup to roughly 361 MB raw, before runtime reductions or transport compression. The image model then dominates. Pure packaging improvements can therefore help substantially, but a substantially smaller shipping target requires measuring a smaller image model or stronger weight quantisation.

## Sources

- [BioCLIP family architectures and model comparison](https://imageomics.github.io/bioclip-ecosystem/pages/models.html)
- [BioCAP model card](https://huggingface.co/imageomics/biocap)
- [ONNX Runtime int4 operator support and quantisation](https://onnxruntime.ai/docs/how-to/quantization.html)
- [ONNX Runtime custom builds](https://onnxruntime.ai/docs/build/custom.html)

Recommended next work: benchmark photo quality and Android memory/time for a smaller biological image model and an int4 BioCLIP 2 candidate; compare to the existing model using the same plant photographs, close lookalikes and unrelated images. Separate the optional text feature from the default photo download. Keep all runtime inference free/on-device. No model or runtime pack has been replaced as part of this review.
