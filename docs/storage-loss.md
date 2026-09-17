# Repeated phone collection loss — 9 September 2026

## Evidence

At 16:28:04 UTC the Android installed app logged storage ID `017de765-9dce-42d4-a46b-8c5506648acc`, origin `https://192.168.0.97:5174`, **zero sightings**, 14,250 bytes estimated usage, and `persistent: false`. The preceding received storage sample at 15:52:49 UTC reported the same ID/origin with 716,843,648 bytes. This establishes missing database records, rather than just an empty collection UI. Local Storage identity survived; the database/cache storage appears to have been lost. It does not identify the deletion mechanism.

Tony reports no cleanup, cache-clearing or browser-data action. He confirms the earlier browser address was also the same. His mention of 7 GB in AICore concerns potentially removable system-service storage, not a confirmed measurement of current free space. Do not interpret the reported quota as physical free disk: [Chrome 138 changed the estimate to an artificial usage-plus-10-GiB value](https://developer.chrome.com/blog/chrome-138-beta).

Code inspection found no production path clearing the sighting database or recognition cache during updates. The schema remains version 2. Tests isolate their own browser contexts and fake IndexedDB; they do not connect to the phone's storage. The browser update test now includes an actual sighting record as well as a queued photo and model-cache probe.

Persistent storage was never requested. Browser eviction is possible, but **not established as the cause**. [Chrome's persistence guidance](https://web.dev/articles/persistent-storage) explains the protection and its limits; it also notes eviction of frequently used sites is uncommon. A public/native architecture decision needs further evidence, not a claim that all browser storage inevitably resets.

## Browser-only protections added before the native decision

- A sighting save requests persistent storage, once per loaded session; an explicit Settings → Protect storage action can request it again and shows the browser's decision. A denied/unavailable request does not block recording.
- A compact metadata safety copy in Local Storage preserves complete sighting identity, names, coordinates and time, without JPEG bytes. This uses the storage area that survived the observed loss. Startup merges missing IDs into IndexedDB; existing records are not replaced. Empty databases never overwrite the older safety copy. This is an additional recovery layer, not immunity to all clearing. A future deletion feature must deliberately update this append-only design.
- The authorised local testing receiver now keeps complete individual sighting backups, including JPEG and original GPS/time, under `data/diagnostics/notebooks/<storage-id>/<sighting-id>.json`. Automatic sending uses the existing setting and receiver capability check. The client sends one unsaved record per sync cycle. Atomic append-only files preserve earlier backups across retries, local resets and smaller collections.
- Settings shows computer backup counts and a Restore sightings from computer action. Restore adds missing IDs and fills missing photos, preserving existing record metadata. Ordinary diagnostic event logs still omit precise coordinates; full recovery files are a separate ignored local archive.

No model/cache/database names or versions changed. No user data was cleared. No paid service or cloud backend was added.

## Earlier missing records

The computer has the 445,058-byte processed grass photo and two successful-save events (taxa 64240 and 82600). Those earlier events contain sighting IDs and GPS accuracy but no coordinates, by the original diagnostics design. They cannot restore full original sightings. The first three reported sightings predate complete automatic receipt. Do not fabricate coordinates, mark them recovered, or silently re-record them at the current position.

**Superseded for Android:** Tony chose native SQLite and app-owned storage; do not ask him to manage browser protection in the native app. See [native Android](native-android.md). The following browser investigation remains historical. Verify a new confirmed sighting reaches the computer backup and survives closing/reopening. If data disappears again, compare the Local Storage safety copy, computer archive, persistent-storage grant, origin and fresh diagnostic events. Root cause and recovery of the earlier unbacked records remain open.

## Validation

60 unit tests and the production build pass. Seven browser scenarios pass: automatic photo sync, actual sighting retention across two service-worker updates, recovery after clearing IndexedDB/cache storage while leaving Local Storage intact, Explore recording, offline reopening, repeated country/zone collection sightings, and real offline recognition/photo logging. The wipe/recovery scenario verifies restored original coordinates/timestamp and then restores the complete JPEG from the computer archive. These are controlled reproductions of the loss pattern, not proof of the phone's deletion cause. Actual phone persistence approval and a fresh full sighting backup remain to be verified with Tony.
