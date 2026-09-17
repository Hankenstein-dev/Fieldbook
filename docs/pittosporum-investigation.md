# Pittosporum identification and Android toolbar — 9 September 2026

The automatic receiver retained the user's photo and its identification result. The reported plant is **Pittosporum undulatum** (iNaturalist 51594); the phone returned **Arbutus unedo** (82689). The photo is stored privately in `data/diagnostics/photos/751da04c-0294-445c-b1d1-6b2c2240137d.jpg`; the original operation is `05318e3d-6ea0-4b0a-a5e6-98062d4f2384`. A separate investigation record preserves the user's correction without rewriting the raw phone log.

## Findings

The phone compared 2,592 local candidates on the original native build, before the reference-preparation update. Its five recorded results were Arbutus unedo, Laurus nobilis, Pittosporum tobira, Morella faya and Corymbia ficifolia. That log did not retain all candidate IDs, the photo vector, or alternatives six through ten. We cannot prove the exact original exclusion or reproduce the reported chameleon's position from that log.

Using the retained JPEG with the app's canvas preprocessing and the existing model, the reported species ranks first against the country pack on desktop. A real Android emulator replay, offline, also ranks **Pittosporum undulatum first among 25,067 country candidates**, similarity 0.7247485898936152 versus 0.6929773652102982 for Arbutus unedo. No model replacement or species-specific adjustment was made.

This makes local candidate exclusion the leading explanation for the original result, while leaving the original phone's exact comparison unproven. Independently, using local observations as a hard exclusion was a design defect: supported species must remain recognisable even without a nearby record. The user explicitly confirmed this foundation; any future celebration of an unusual record is separate.

Identification still considers all groups, as specified. A fixed list of top similarities does not establish that every alternative is plausible. Country comparison resolves this sample without hiding animals through the user's plant interests; broader recognition accuracy remains a testing question.

## Changes

- First-pass recognition compares the downloaded country list plus saved area additions. Local records provide context, not permission to recognise a species. An uncached local query does not block this country comparison.
- Results distinguish saved nearby occurrence from no record in the saved area list. This never claims a species is absent or that the user is the first person ever to find it there.
- The wider-area action can add regional candidates. Name lookup and fresh-GPS logging remain available independently of recognition or previous occurrence.
- Diagnostics record the country pack revision, bounded batches of area candidate IDs, all displayed alternatives and the actual normalised photo/description vector as float64 bytes. This avoids guessing the candidate set or relying solely on a different device's inference during the next investigation.
- Matching reads the verified, already-downloaded binary reference chunks directly, with the SQLite index retained as a fallback for legacy additions or unavailable chunks. This avoids expanding the country reference vectors through the native JSON bridge. It never downloads or generates vectors during identification.

The Android replay initially spent **16.5 seconds** reading the country references through SQLite. Direct binary matching took **0.76 seconds** on the same emulator; total cold inference plus matching was **7.32 seconds**. These are emulator measurements, not measurements on the owner's Pixel. The same retained photo remained the top match.

## Toolbar

The owner's Pixel 10 Pro uses Android 16 / WebView 152. The earlier emulator used WebView 133. Capacitor handles these versions differently: newer WebViews pass safe-area insets through to the page, while the older version used native view padding. The app failed to apply a top inset, leaving controls under Android's status bar.

The interface now uses Capacitor's `--safe-area-inset-*` values with standard `env()` fallbacks for the app header, dialogs, floating actions and bottom controls. System-bar configuration is explicit. The toolbar fix was delivered first as requested, through an APK that can be installed directly from Chrome Downloads without opening app Settings. See [Capacitor's System Bars documentation](https://github.com/ionic-team/capacitor/blob/main/core/system-bars.md).

The normal APK always keeps app ID `com.fieldbook.app` and installs over the existing application; no uninstall or recognition model reset is required.

## Validation and delivery

79 unit tests pass. All 11 core browser scenarios pass with the new matcher; the photo/navigation scenario also passes with a simulated 48px top inset and 24px bottom inset. Its added Settings check initially missed the return-to-Explore navigation in the test and was corrected. The pre-existing, separately documented two-tab PWA update flake was not retested.

The final normal APK is 15,798,339 bytes and includes both the toolbar and recognition changes, with no acceptance hooks. The served installer hash matches the built artifact. Installing it over the previous build retained all five emulator sightings, four photos and 64 recognition files with identical metadata/photo/model hashes. Settings opens in the final installed native build. The emulator query-vector diagnostic was retained in the computer receiver and reproduced the emulator result score exactly.

The earlier toolbar-only installer was provided immediately as requested. Anyone who installed that intermediate build needs the subsequent APK update for the identification change; no model download is introduced by the new matcher.

## Follow-up screenshot — 10 September

The owner's screenshot shows *Pittosporum undulatum* first, above *Arbutus unedo*, with “No record in the saved area list”. This supports the intended country-first behaviour for that attempt; new diagnostic timings have not yet synced. It also shows the status bar overlapping the page and identification labels running together.

The earlier CSS inset was padding inside the scrolling document, so scrolling could remove the reserved space. `MainActivity` now pads the native WebView container using actual system-bar/display-cutout/keyboard insets and consumes them before the web page, with Capacitor CSS inset injection disabled. This reserves space for every screen and dialog independently of document scroll. System-bar style is `LIGHT` (dark icons). Result labels use a vertical layout.

Validation: Android build and web build pass; browser photo/navigation regression passes. `node tests/android/insets.mjs` verifies native bounds remain below the status bar after scrolling, shrink above the keyboard, restore on dismissal, and permit Settings navigation. On the Android 16 emulator the WebView bounds were `[0,136][1080,2337]`, shrinking to bottom 1517 with the keyboard. APK upgrade again retained five sightings, four photos and 64 recognition files byte-for-byte. The served APK matches SHA-256 `4b7268cdbdbc814e3d8971ed770efa1492c257fb810832c1efbf7e2002e67423`. Actual Pixel confirmation remains pending.
