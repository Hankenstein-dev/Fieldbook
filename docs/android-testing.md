**Current phone path: native Android.** See [native-android.md](native-android.md) for the APK, install/update steps and SQLite/file storage. The HTTPS computer server below still supplies development diagnostics and model/map downloads. The PWA setup below remains available for browser comparison; installing the Android APK does not migrate or clear browser storage.

# Android testing and desktop logs

Use Android Chrome on the same home network as the computer. The computer can remain indoors while you photograph a plant. You can also take photos with the normal camera app and choose them in Fieldbook later. Recognition processes images on the phone. For this personal development setup, photos and debugging data are also sent automatically to the computer when its local testing receiver is reachable. You can pause sending in Settings.

## This computer: initial Wi-Fi setup

Prepared on 9 September 2026 for Windows Wi-Fi address **192.168.0.97**, with the repository in WSL Ubuntu. The phone app is **https://192.168.0.97:5174**. Keep this address stable: browser data and downloaded models belong to an origin, so changing the IP or port creates a separate collection/cache. A router DHCP reservation can keep the computer's address fixed.

The certificates and Windows scripts are already generated in `.certs/`. They are local, ignored files and never included in `dist/`. The phone server is started with `npm run phone`, serving the most recent production build. After editing the app, run `npm run build` and reopen it; if an update is waiting, use **Update and reload** in Settings. Finish any identification/save first. Older versions with only the close-and-reopen message can use **https://192.168.0.97:5174/__fieldbook_debug/update** in Chrome, then **Update and open Fieldbook**. This activates the waiting service worker without deleting IndexedDB, local storage or recognition caches. Closing just the installed window can leave another browser tab holding the old worker active; see [Chrome's update lifecycle guidance](https://developer.chrome.com/docs/workbox/handling-service-worker-updates). Do not clear storage or reinstall to update: that risks removing saved data and models. Restart `npm run phone` after changing receiver tooling.

Start `npm run phone` first. The networking script now verifies the running receiver before and after applying its rules.

1. Open **Windows PowerShell as administrator** and run this prepared script:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "\\wsl.localhost\Ubuntu\home\hankenstein\dev\SideBants\Fieldbook\.certs\connect-phone.ps1"
   ```

   It forwards ports 5174 (HTTPS app) and 5175 (public certificate download) to WSL, with a firewall rule limited to the local subnet. Administrator access is required by Windows for those networking changes. The execution-policy option applies only to this script process. Re-run after restarting WSL because its internal IP can change. This follows [Microsoft's WSL LAN forwarding guidance](https://learn.microsoft.com/en-us/windows/wsl/networking#accessing-a-wsl-2-distribution-from-your-local-area-network-lan).

2. On Android Chrome, open **http://192.168.0.97:5175** to download `fieldbook-ca.crt`. This small HTTP endpoint serves only that public certificate, not the app or private keys.

3. In Android Settings, search for **Install a certificate**, choose **CA certificate**, and select the downloaded file. The exact settings path varies by phone; on Pixel it is under Security & privacy → More security settings → Encryption & credentials. This explicitly trusts the local testing certificate authority. Keep `.certs/ca-key.pem` private on the computer; only the `.crt` goes to the phone. See [Google's certificate instructions](https://support.google.com/pixelphone/answer/2844832?hl=en).

4. Open **https://192.168.0.97:5174** in Chrome. It should open without a certificate warning. Allow location. A trusted secure context is needed for GPS, service workers and recognition's cryptographic verification; bypassing a certificate warning is not the finished setup.

If the certificate download will not connect, check that `npm run phone` is still running, the Windows script succeeded, and both devices are on the same network rather than a guest network with client isolation. The current WSL address (`172.31.…`) is not the phone URL. If the Windows Wi-Fi address changes, regenerate with `npm run phone:setup -- NEW_IP`, rerun the forwarding script and restart the phone server. The CA remains the same, so it need not be installed again. Remove the old forwarding entries using the old disconnect script before regenerating.

To remove this setup later, run `.certs/disconnect-phone.ps1` in administrator PowerShell and remove “Fieldbook local testing CA” from Android's user trusted credentials. Stopping `npm run phone` stops both local servers.

## Test a plant

**Following the collection-loss report:** update and open Settings → **Protect your sightings → Protect storage**, then check the browser's reported grant/denial. New sightings get an extra compact local safety copy and, while automatic sending is enabled, full computer backups including their original coordinates/photos. Settings shows how many are backed up and can restore them. See [the storage-loss investigation](storage-loss.md); earlier records without full backups have not been recovered.

1. Open Settings → **Testing & diagnostics** to check the connection and pending counts. **Automatically send logs and photos to this computer** is on by default for local testing; an explicit pause is remembered. No further export or send action is needed while the app can reach the computer.
2. Return to Explore and tap **Identify**. Tap **Download recognition files** while connected: approximately **360 MB downloaded**, **545 MB unpacked**, plus reference index and photo storage. It is a one-time preparation; a failed download can resume.
3. Tap **Take a photo** to open the camera, or **Choose a photo** for an existing image. Add up to three views if useful, then tap **Identify photo**. The first run includes model initialisation and may take longer than later runs.
4. Compare the best match with the actual plant, opening alternatives or widening the search if needed. Open the chosen species and explicitly record it. Check that the sighting appears on Explore and in Fieldbook → Sightings, with its photo. Record again to check repeat encounters.

Recording uses your physical location **when you save**, not the image's EXIF location. If choosing a photo taken earlier, save while still at the plant to test correct sighting placement. You can test identification at home without saving a sighting.

For an offline test, first open the app and local list while connected, finish the recognition download, and optionally install Fieldbook from Chrome's menu. Then turn off Wi-Fi and mobile data, reopen the cached app, and identify a photo. Saved lists and visited map tiles work offline; an area never loaded before needs a connection for its local list/map. The explicit country search is available from the downloaded reference pack. Return to home Wi-Fi with the server running and open Fieldbook to sync the buffered diagnostics. Outside home Wi-Fi the private app address cannot be reached over mobile data; the already-cached app can still work offline.

Actual Android speed and botanical accuracy are the purpose of this test; desktop results do not establish them.

The owner has now tried identification on Android. Speed varied and some matches were incorrect; these remain acceptance issues. The pasted log export was truncated, so only its complete prefix could be examined. See [the first phone test notes](android-first-test.md).

A later report of repeated downloads/preparation after installation is under investigation; see [recognition approaches and storage findings](recognition-approaches.md). Diagnostics now distinguish origin/display mode, storage identity, missing files, and cache reuse versus network downloads. Installing at the same origin should not itself require a fresh model download, but the phone's cause has not been established.

**Automatic sync fault resolved, 9 September:** the phone reached the HTTPS receiver, but every event POST returned 403. Node's HTTP/2 requests supplied `:authority` rather than `Host`; the receiver compared Origin only against Host and rejected valid Android traffic. The check now supports both protocols while continuing to reject foreign origins. After restarting the receiver, the actual phone automatically delivered its queued logs and 445,058-byte photo, including its pampas-grass save event. A regression test uses a real HTTP/2 connection for log/photo upload and foreign-origin rejection. The missing first three sightings remain a separate storage investigation; no user storage was cleared.

## See the phone's logs on this computer

Open **http://localhost:5173/__fieldbook_debug** while the dev server is running, or **http://localhost:4173/__fieldbook_debug** while ordinary preview is running. Both read the same local journal as the phone server, so the computer does not need to trust the testing CA just to view logs. The viewer is also available at `/__fieldbook_debug` on the phone HTTPS address.

The viewer polls every two seconds and can filter by filename, session ID, event or error. `session.start` identifies the browser, build time, secure context, model version and available runtime capabilities. A new app load starts a new session.

Settings also shows the failing sync stage and error, a **Sync now** action, and **App and storage details** (address, build, installed/browser mode, storage ID). Compare these between Chrome and the installed app when data seems different. The receiver writes `data/diagnostics/transport.jsonl` with one rotating backup at approximately 1 MB: diagnostic status probes, POSTs, update-page requests and failures, including HTTP status, host/authority, origin and browser. It excludes payloads and photos. This makes rejected uploads visible even when no client events can be accepted; server disk failures also print to the terminal.

Events include:

- `photo.selected`, `photo.dimensions`, `photo.prepared`, `photo.error`: filename, type, file size, original/processed dimensions, timing and a shared photo ID.
- `download.*`: model asset being fetched, reference import progress, completion and errors, including HTTP status/asset context when available.
- `model.*`, `inference.*`, `identify.*`: model setup, WebGPU/WASM path, fallback errors, candidate count, execution times and top five matches with similarity values. These values are not calibrated probabilities.
- `sighting.*`: save attempt/result, photo ID, taxon and sighting ID, reported GPS accuracy and errors. Exact coordinates are not put in diagnostics.
- `app.*`, `connection.*`: uncaught errors/rejections and connection changes. Normal caught identification/photo/save failures are explicitly instrumented too.

The phone retains its most recent **1,000 events** in a separate IndexedDB database, including offline events. It automatically sends batches once the local receiver advertises photo-upload support; failed requests retain their events and retry. An explicit pause in Settings stops both photo and log transmission. With the app open, the receiver is checked and the queue serviced every two seconds (network timeouts may extend this). Logs can also be downloaded with **Export diagnostics** in Settings. Retention is bounded, not an unlimited forensic history; browser termination or storage exhaustion can prevent the final event from being saved.

Received events are stored at **`data/diagnostics/events.jsonl`**, with one rotating backup (`events.jsonl.1`), approximately 5 MB each. The viewer shows the latest 1,000 rows from the current file. The assistant can read these files in the workspace to investigate your tests. Delivery can repeat an event if an acknowledgement is lost; its ID identifies duplicates and the viewer hides them. Complete received session journals are additionally retained under `data/diagnostics/sessions/<session-id>.jsonl`, independently of the rotating live view. Do not commit these personal test logs.

Successfully decoded identification photos are kept immediately as the processed JPEG used by the identification flow (maximum dimension 1200 px), even if you never run identification or reject its match. This does not add a sighting or change collection progress. The phone retains the most recent 100 photos, capped at 100 MB; older local photos expire at those limits. This is a testing buffer, not a permanent photo library. Previously discarded images cannot be recovered by this update.

JPEGs send one at a time to the local receiver, with retries and acknowledgement. The computer keeps them in **`data/diagnostics/photos/<photo-id>.jpg`**, with a JSON sidecar containing original filename, session, time and stored size. Names never become filesystem paths. Photos and complete session journals on the computer are not automatically pruned, so test evidence survives live-log rotation. Remove those ignored archives manually when no longer needed. The viewer shows images next to linked events and has a received-photo gallery. Its recent view is capped at 100 photos; older files remain in the folder.

On the phone, **Settings → Recent identification photos** shows the latest six retained photos with delivery status and a **Download photo** action. This downloads a JPEG; it does not automatically insert it into the Android camera gallery. Full gallery integration can come with the native wrapper if desired. **Export diagnostics** remains a metadata-only JSON fallback, and **Export my fieldbook** still exports confirmed sightings and their photos/coordinates.

Descriptions, embeddings and precise coordinates remain excluded from diagnostic event logs. The separate complete sighting backups now include exact coordinates and photos for recovery, under ignored `data/diagnostics/notebooks/<storage-id>/<sighting-id>.json`. They use the same automatic-send preference and a separate receiver capability flag. The files are append-only; an empty or reset phone cannot erase prior backups. Only the local testing receiver accepts these files; no cloud image service is involved. Browser storage exhaustion or termination before a write completes can prevent retention. A visible warning reports photo retention failures.

The receiver/viewer runs only in local Vite dev/preview tooling. Static production deployments have no logging backend and still support local diagnostic export. No cloud logging provider, API key or per-use cost has been added.

## Optional USB inspection

USB remains useful if a browser crash needs live DevTools. Enable Android USB debugging, connect the phone, approve the prompt, and inspect its Chrome tab through desktop Chrome's `chrome://inspect#devices`. [Chrome remote-debugging instructions](https://developer.chrome.com/docs/devtools/remote-debugging/).

Chrome's Port forwarding can also forward phone port 4173 to computer `localhost:4173`, allowing `http://localhost:4173` on the phone without a certificate install. That is a different origin from the Wi-Fi setup, so it has separate saved data/models. [Chrome local-server forwarding](https://developer.chrome.com/docs/devtools/remote-debugging/local-server/).

## Windows forwarding repair — 10 September

The computer retained the correct portproxy entries and firewall rule, and IP Helper was running, but neither Fieldbook port had a listener on the Wi-Fi address. Windows could reach the receiver directly at the WSL address, while its Wi-Fi endpoint refused connections. Recreating only the two Fieldbook forwarding entries restored the Wi-Fi endpoint; a service restart was not needed in this incident. The underlying reason Windows retained inactive forwarding entries is not established.

`scripts/phone-network.mjs` now generates the connection script. It verifies the WSL target, recreates the two exact Fieldbook rules, checks the listener, and verifies the diagnostics response through the Wi-Fi address before reporting success. If the listener still fails to appear, it restarts IP Helper and retests. The firewall remains restricted to the configured Wi-Fi address and local subnet. A local ignored `.certs/phone-connection.log` records the result. No certificate, app origin or phone data changes are required.
