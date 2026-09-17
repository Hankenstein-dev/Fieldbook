# Recognition assets

BioCLIP 2 by Imageomics, MIT licensed. Original checkpoint revision: `2957b322090f9cb17ae72c71981c7218a28d81e0`.

- https://huggingface.co/imageomics/bioclip-2
- https://github.com/Imageomics/bioclip-2
- Text ONNX exported and quantised locally from that checkpoint.
- Image ONNX from `mahan-ym/bioclip-2-quantized`, revision `28df31a338efac8366d66660aed4753a528eae8b` (model repository declares MIT): https://huggingface.co/mahan-ym/bioclip-2-quantized
- Taxon names and reference metadata from iNaturalist contributors: https://api.inaturalist.org/v1/docs/
- Reference vectors are generated locally using the pinned text encoder. They are not a record of observed specimens or locations.

See BIOCLIP-LICENSE.txt and /runtime/ONNXRUNTIME-LICENSE.txt. Per-photo credits and license codes remain with the species metadata. No user photo is uploaded for recognition.
