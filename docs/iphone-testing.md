# iPhone web testing

Stable address: **https://fieldbook.demos.boombop.io**. Deployment writes a verification record to ignored `artifacts/web-deployment.json`; this document alone does not establish that a build is live.

Android remains primary. The iPhone tester shares its interface, catalogue, walking map and collection logic, using the existing browser store. Each device has its own collection; no login or account sync was added.

## Install and walk

1. Open the address in a normal Safari session.
2. Share → Add to Home Screen. Enable **Open as Web App** if offered.
3. Open that icon **before saving the first sighting**. Keep using this address/icon; different origins have separate browser storage.
4. Allow location. Settings offers **Enable compass** if iOS needs separate permission.
5. Settings → **Protect storage** shows whether persistence was granted. It is a mitigation, not a guarantee.

The hosted build includes the map archives and fetches small ranges as needed over Wi-Fi/mobile data. The development computer can be off. New map areas, species queries and photo identification need connectivity. Offline photo and description recognition are excluded from this first hosted build; Android and the ordinary desktop build retain them.

## Recognition and the Android update

Tony approved sharing the existing Pl@ntNet key between both test apps. Enable **Expose my API key**, add `https://fieldbook.demos.boombop.io` to Authorized domains, and save. Both phones share the provider quota; no paid fallback is added.

In ignored `.env.web.local`, set:

```dotenv
PLANTNET_WEB_ENABLED=true
```

The build uses `PLANTNET_API_KEY` from `.env.local`. `PLANTNET_WEB_API_KEY` can optionally override it. The opt-in is required because the key becomes visible in browser assets. Never log it or commit environment files.

Enabling exposure also restricts requests without an Origin header: the provider rejected the old native request with `remote IP not allowed`. The updated Android build sends the authorized Fieldbook origin in native HTTP. **Install the [new APK](https://fieldbook-android.demos.boombop.io/Fieldbook.apk) over the existing app; do not uninstall or clear its data.** No Authorized IP wildcard is needed.

[Pl@ntNet browser access](https://my.plantnet.org/doc/getting-started/introduction).

## Backups

After each walk: **Settings → Export my fieldbook → Save or share backup → Save to Files**, then select iCloud Drive or another folder. **Download backup** is also available. The second tap follows preparation so iPhone sharing has fresh user activation.

Exports contain original sighting IDs, dates, coordinates and photos, plus preferences and visited areas. The app reports a prepared copy, not a confirmed external backup: verify the file in Files. Preparing another export captures newer changes; a prepared file is a snapshot.

Restore with **Import a Fieldbook export**. Records merge by original ID; existing metadata stays, missing photos can be restored, and retries do not duplicate sightings. Each person should import only their own backup to avoid mixing collections.

The hosted build has **no automatic computer/cloud backup**. Browser persistence and the extra Local Storage metadata copy cannot guarantee retention. Testing logs/photos remain local and can be exported for feedback; no private development receiver is contacted.

WebKit testing exposed a Blob-to-IndexedDB write failure. New browser photo records therefore store exact binary bytes and reconstruct Blobs on reads, including testing photos. Existing Blob records remain readable with no database reset or version change. Export format and native SQLite/private-file storage stay the same.

[WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/), [Apple installation instructions](https://support.apple.com/en-kw/guide/iphone/iphea86e5236/ios).

## Development and deployment

```sh
npm run build:web
npx playwright install --with-deps webkit
npm run test:iphone
npm run deploy:web
```

`npm run check:web:live` uses one real Pl@ntNet request in a disposable WebKit context to check the hosted capture/recognition/save/export flow. GPS is simulated; no real person's collection is used.

`build:web` writes `dist-web/` from staged `public-web/`, separate from Android and ordinary web outputs. Optional offline model assets are excluded. A build check rejects oversized assets, private files and accidental key inclusion without explicit browser opt-in. Map assets total about 227 MB on hosting; that is not an initial phone download.

`deploy:web` reads credentials from `~/.cloudflare.env` or `FIELDBOOK_DEPLOY_ENV`. It writes only `sites/fieldbook/built-site/dist/` in the existing Boombop R2 bucket, as Tony authorized. Hosting configuration is in `config/web-deploy.json`. It skips unchanged files, retains older assets for installed versions, uploads app entry points last, purges only Fieldbook's CDN URLs, compares live HTML/worker/manifest with the build and verifies a real PMTiles range response.

This uses the existing shared R2/Worker account's storage, requests and plan/quota. It is not unmetered free hosting. No new paid plan, Worker, inference proxy or backend is provisioned. The URL is publicly reachable; the existing router adds `noindex`. Personal device data is never deployed.

Updates use the **same address**. Rebuild and deploy, reopen the installed app, and use **Update and reload** when offered in Settings. Do not clear site data or remove/reinstall the icon to update.

To publish a new Android testing APK too: `npm run android:build`, then `npm run deploy:web -- --android`. This uploads the APK to `https://fieldbook-android.demos.boombop.io/Fieldbook.apk` and keeps the older `downloads/Fieldbook.apk` link available. The separate download host avoids interception by older installed web app service workers; APKs are excluded from the web app’s navigation fallback and offline cache. Both testing builds contain the shared client-visible recognition key.

## Acceptance

WebKit checks exercise the phone layout, storage status, full-photo backup/restore, separate browser contexts, duplicate imports and sharing activation. This Linux WebKit runner reports internal navigation/Blob errors under emulated offline mode even with an active service worker and populated precache; that check has not established offline support on iPhone. Real iPhone camera/GPS, the actual Save to Files sheet, mobile-data walking and offline reopening still require device acceptance. After a first sighting, export, close/reopen, and reimport the same backup; confirm one record with its original photo, date and location. Test on mobile data with the computer off.

Verified on 11 September: 98 unit tests, all three iPhone WebKit scenarios, and 13 relevant Chromium regressions passed (the two photo-storage assertions were updated and rerun for the new binary representation); the live hosted WebKit flow identified Arbutus unedo, saved it with simulated GPS and exported its JPEG. Deployment verified exact HTML/service-worker/manifest bytes and map range responses. The hosted APK matches the local build; its emulator upgrade retained 13 sightings, 12 photos and 64 recognition assets, and all three real-provider native recognition cases passed. These checks do not establish real-iPhone acceptance.
