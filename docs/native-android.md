# Native Android — 9 September 2026

**11 September — recognition compatibility update:** install the [latest testing APK](https://fieldbook-android.demos.boombop.io/Fieldbook.apk) over the existing app. It includes the authorized client origin required by the shared key's new browser restrictions. The emulator upgrade preserved all 13 existing sightings, 12 photos and 64 recognition files; three native online recognition checks passed. The owner's actual-phone installation remains pending. See [iPhone testing](iphone-testing.md).

Tony chose a native Android app with SQLite and app-owned storage after repeated browser collection loss. Capacitor retains the existing React experience; this is an installed APK with native storage, not a shortcut to the development website. The cause of the earlier browser losses remains unproven, and this change does not recover records that were never backed up.

## Install and update

For the latest published Android build, open **https://fieldbook-android.demos.boombop.io/Fieldbook.apk** in Chrome, then open the downloaded file and install over the existing app. This download works away from home and does not need the testing computer running. The main `fieldbook.demos.boombop.io` address opens the iPhone/browser app. The separate Android download host avoids older web app service workers intercepting the APK link.

The local development route remains available for unpublished builds:

1. On the computer, run `npm run phone` to serve the development receiver, maps and recognition downloads.
2. On the phone, on home Wi-Fi, open **https://192.168.0.97:5174/__fieldbook_debug/android** in Chrome. Download `Fieldbook.apk` and open it. Allow Chrome to install this APK if Android prompts.
3. Open **Fieldbook** from Android's app launcher. This is separate from the old Chrome-installed shortcut. Allow location access. Settings → App and storage details identifies it as **Android app**.
4. Download recognition once inside the new Android app. Chrome's earlier copy belongs to a different application and cannot automatically be reused. Models then stay in the Android app's private files across app restarts and APK updates.
5. For future builds, download/install the new APK **over the existing Android app**. Do not uninstall first. Keep the app ID and signing key stable.

The current debug APK trusts this computer's public development CA. It does not contain the private key. That trust is confined to debug builds; release builds do not use the development trust configuration. The existing trusted HTTPS browser setup still applies when downloading the APK through Chrome.

If the computer's address changes, update **Settings → Testing computer**. Its default comes from `.certs/phone.json` at build time; `VITE_COMPUTER_URL` can override it. No IP address identifies a collection: the Android package owns that data.

The computer needs to be reachable for initial model downloads, new map tiles and automatic debugging uploads. With the current local server that normally means home Wi-Fi and the computer running. Previously fetched map tiles, saved lists, the collection and downloaded recognition work offline. New third-party species queries still use the existing free endpoints when internet is available. Logs and testing photos queue on the phone and send when the computer is reachable again.

## Storage

- **`databases/fieldbookSQLite.db`:** sightings, physical visits and preferences. Each sighting preserves its original ID, species snapshot, time, GPS coordinates/accuracy and optional photo path. Repeated sightings have distinct IDs. Inserts reject duplicate IDs; restore only adds missing records or fills missing photos.
- **`files/photos/`:** private JPEG files. A file finishes writing before its path is committed to SQLite. A missing attachment does not hide the underlying sighting.
- **`databases/fieldbook-cacheSQLite.db`:** replaceable queries, species, ranges, seasons, embeddings, tile cache and bounded testing queues. Country ranges store species IDs rather than enormous repeated species objects.
- **`files/recognition/<model-id>/`:** verified, decoded model/runtime/reference files. Downloads retain the existing gzip transfer and SHA-256 checks, write bounded chunks to a temporary file, then rename into place. Inventory checks do not read the full model. The recognition worker reads native file URLs; it does not call an IndexedDB/CacheStorage fallback.
- **Native Preferences:** device identity, testing-computer address and automatic diagnostics preference. These are Android preferences, not browser Local Storage.

These are private application data, not Android's expendable cache directory. The native app neither requests browser persistence nor keeps a second Local Storage sighting copy. The web build retains its earlier browser protections for existing browser users.

The native schema starts at version 1. Tables have primary keys and JSON metadata, with recognition vectors stored as SQLite BLOBs. Values already representable as float32 use four bytes each; other values retain float64 precision. This preserves the numbers without further model quantisation. Prepared SQL values use the bundled SQLite implementation’s hex/BLOB conversion at the bridge boundary; bounded batch writes use SQLite transactions. Visit/import merges are serialised. Future schema changes must use non-destructive migrations. The large cache database is separate so Android backup rules can include the notebook, photo directory and preferences while excluding replaceable model/cache data. Android system backup remains subject to its device/account/quota behaviour; the authorised computer backup is independently visible in Settings.

Settings offers **Export my fieldbook** through Android's share/save sheet and **Import a Fieldbook export**. Import validates the full file before writing and merges original IDs, dates and coordinates without replacing existing sightings. Re-importing the same export is safe. Use this to bring across any surviving browser export; installing the APK does not clear or read the browser's storage.

## Build

Requires Node 22.12+, Java 21, Android SDK platform 36/build tools and the Gradle wrapper. Android Studio can provide the Java/SDK installation. The local command-line setup used here is under `~/.local/share/fieldbook-android/`; it is outside the repo.

```sh
npm ci
npm run android:build
```

`JAVA_HOME` and `ANDROID_HOME` override the local defaults. `android:build` stages only the interface assets, builds `dist-android`, syncs Capacitor and builds a debug APK. It excludes map archives, raw models and compressed recognition downloads from the APK. Output:

`android/app/build/outputs/apk/debug/app-debug.apk`

App ID: **`com.fieldbook.app`**. Builds use an increasing timestamp version code. Gradle's debug signing key is normally `~/.android/debug.keystore`; retain it when moving development computers so updates can keep the same identity. Release signing/public distribution is later work.

The development receiver exposes the APK at `/__fieldbook_debug/android`; diagnostics still go to ignored `data/diagnostics/`. Native-origin requests use narrowly scoped development CORS. No production backend, hosted inference or paid API has been introduced.

`npm run build` / `npm run dev` remain the browser workflow. Android's bundled interface changes only after rebuilding and installing the APK; it does not run the PWA update flow.

## Validation

The normal debug APK is **15,794,003 bytes (about 16 MB)**. Its download endpoint was checked against the built APK by SHA-256. The final install-over-update check preserved **5 sighting records, 4 saved photos and all 51 recognition files**, with exact metadata and matching file hashes. The normal APK excludes the emulator test hooks. Settings in that installed build confirmed 5 sightings, working GPS and a connected computer with an empty upload queue.

**67 unit tests and both web/Android builds pass.** The full browser suite passed 14 scenarios; its two-tab service-worker update scenario remains intermittent (passed alone, timed out in two combined runs). This browser issue remains open and is not presented as a clean full-suite pass. Android does not register that service worker; its actual APK update test passed. Browser storage-recovery checks passed again on the final web build.

An Android 16 emulator exercises the actual native plugins and app-private filesystem:

- SQLite writes, separate repeated sightings, duplicate-ID rejection and concurrent visit merges.
- Exact sighting locations/timestamps, JPEG bytes and device identity survive force-stop/reopen and WebView reload.
- Full recognition download and reference import, then model reuse after APK installation.
- A real strawberry-tree fixture recognised with networking disabled, using native files and SQLite references. No IndexedDB databases or CacheStorage entries were created. This is a plumbing check against four cached reference species, not an accuracy benchmark or a claim about phone speed.
- A photo and diagnostic events queued offline, then automatically reached the computer after reconnection. Confirmed sightings also reached the complete computer archive.
- “Take a photo” opens Android's camera activity. A sighting saved through the interface uses the native GPS coordinates.
- Binary reference vectors round-trip exactly, including generated double-precision values. The imported reference-vector payload is about 77 MB, plus metadata/index/page overhead; the model files remain about 545 MB unpacked. Offline inference passed again using those SQLite BLOBs.

The repeatable emulator scripts are `tests/android/acceptance.mjs`, `tests/android/offline.mjs` and `tests/android/upgrade.mjs`. They refuse to target a physical phone. Build with `VITE_NATIVE_ACCEPTANCE=true VITE_COMPUTER_URL=https://localhost:5174 npm run android:build`, install on the emulator, and use `adb reverse tcp:5174 tcp:5174`. The offline test requires a completed recognition download. Test-only entry points are excluded from the ordinary APK.

The owner's real-phone installation, camera-return behaviour, outdoor compass/GPS and long-term retention still need testing. Do not treat emulator validation as that acceptance walk.

Technical references: [Capacitor Android setup](https://capacitorjs.com/docs/getting-started/environment-setup), [native SQLite plugin](https://github.com/capacitor-community/sqlite), [app filesystem API](https://capacitorjs.com/docs/apis/filesystem).

## Reference preparation update

The reference pack now includes the broader taxa that can occur in local lists. Setup imports all shipped references; photo identification never generates missing taxonomy vectors. Existing models and imported references are reused when updating the APK. Current full transfer is about 397 MB (586 MB unpacked assets), with about 37 MB added to the previous download. See [recognition preparation](recognition-preparation.md).

## Toolbar and country comparison update

The latest APK reserves system-bar, display-cutout and keyboard space in the native Android container, outside the scrolling WebView. This replaces the initial CSS-only inset fix, whose top padding could scroll away. System icons are dark on the light background; identification names and occurrence labels have separate lines. See [Android’s WebView inset guidance](https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets). First-pass identification compares the downloaded country list plus saved area additions, without excluding a supported taxon because it lacks nearby records. Direct binary reference matching avoids the native SQLite bridge overhead for the full country pack. See [Pittosporum investigation and validation](pittosporum-investigation.md).
