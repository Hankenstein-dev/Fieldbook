# Online recognition — 10 September 2026

**11 September — shared iPhone tester:** Tony enabled browser exposure on the existing key for `https://fieldbook.demos.boombop.io`. The hosted web build explicitly opts into that key, and updated Android native requests send the same authorized Origin. Older APKs need the [compatibility update](https://fieldbook.demos.boombop.io/downloads/Fieldbook.apk); the provider rejects their origin-free requests after this settings change. Both apps share the free quota. See [iPhone testing](iphone-testing.md).

Pl@ntNet is the default photo recogniser in the private Android app. BioCLIP remains optional for offline photographs and descriptions. The [comparison](recognition-comparison.md) records the corrected field-photo labels, results and limitations behind this choice.

## Behaviour

- A captured photo starts online recognition immediately when Android reports connectivity and a key is configured. Neither downloaded recognition files nor the development computer is required.
- Requests go directly from Android to Pl@ntNet using Capacitor's native HTTP support. They contain the downscaled photographs and automatic plant-organ selection, without GPS or a local species restriction. The global `all` project supplies up to ten suggestions, with English common names.
- Offline photographs use the existing downloaded BioCLIP pack. Recognition downloads are available through the existing menu and secondary identification options. Descriptions still require BioCLIP. Existing files are retained; installing this update does not require downloading them again.
- Quota, connection and no-match errors offer a deliberate retry, offline recognition or name lookup as appropriate. An online error does not silently substitute an offline guess. Requests time out after twelve seconds and are not automatically retried. A quota response blocks further online requests until the next UTC day; there is no paid fallback.
- Cancelled requests cannot reveal or save a result. An already dispatched native HTTP request can still finish at the provider and consume its request allowance.

The provider result uses an existing catalogue identity where the scientific name or a synonym matches. Otherwise its GBIF identifier creates a normal GBIF-backed species record. Exact iNaturalist name/synonym lookup is a bounded final fallback when neither identity is available. A winner absent from local records remains the winner; failed identity resolution never silently promotes a runner-up.

Fresh encounter location and local occurrence context are prepared alongside recognition. The result follows the existing reveal, achievement, SQLite save and correction flow. Diagnostic photo retention runs independently so writing a debug photo cannot hold up recognition. Native local-species queries now load only the requested rows instead of parsing the entire saved catalogue.

## Configuration

The owner supplied `PLANTNET_API_KEY` in ignored `.env.local`. `npm run android:build` embeds it in this private testing APK for direct native requests. It is consequently recoverable from the APK; it is not a server-side secret. Do not print it in logs or commit the environment file. Before any wider distribution, revisit account/key provisioning.

Ordinary web builds omit the key and retain BioCLIP. Browser Pl@ntNet testing requires configuring the provider's allowed origins and setting `PLANTNET_WEB_ENABLED=true` explicitly. No production proxy was added. See the provider's [browser access documentation](https://my.plantnet.org/doc/getting-started/introduction).

Provider/model version, returned names and scores, timings, status and remaining quota are logged with the identification operation. API keys, raw request URLs and image bytes are excluded from event logs. Photos remain in the separately authorised diagnostic archive, including rejected identifications. Computer sync can queue while the computer is unavailable.

## Validation

- All 95 unit tests across 22 files passed, including native multipart formatting, cancellation, sanitised errors, quota blocking and taxon mapping.
- All 12 browser regressions passed. After the final changes, the three relevant location/offline recognition/save/correction scenarios passed again.
- Android build and upgrade checks passed. The upgrade preserved all nine existing emulator sighting records, eight private photos and 64 recognition files; photos and recognition files were byte-identical.
- The real Android HTTP path recognised white sapote, loquat and cheesewood correctly with the emulator's model directory temporarily moved aside. Each result saved its provider identity and private photo, and correction restored the prior active collection. The model directory was restored afterward.
- With connectivity reported offline at the browser boundary, the updated Android app also recognised the retained cheesewood photo using BioCLIP, saved it to SQLite and retracted it correctly. This checks native routing and reuse of the local model files; it is not a radio-disabled outdoor test.
- Emulator capture-to-reveal times were 6.5 seconds for the first cold request, then 2.8 and 2.0 seconds. These include app work and fresh location preparation, unlike the shorter API-only comparison measurements. They are not owner-phone or cellular benchmarks.

Tests live in `src/identify/plantnet.test.ts`, `tests/android/online-recognition.mjs`, `tests/android/upgrade.mjs` and the existing browser suite. Android scripts target an emulator, never the owner's phone. Outdoor phone acceptance remains pending.

## Install

Open [the Android download](https://192.168.0.97:5174/__fieldbook_debug/android) on home Wi-Fi while the phone server is running. Install it over the existing native app; do not uninstall or clear its storage. Once installed, online recognition can use phone data and does not depend on the computer.

Built APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

SHA-256: `4dbeef8d951df4b28cc20e418f22b67f483b709d6ee40e25b3d54e81866ca06b`.
