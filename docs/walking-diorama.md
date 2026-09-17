# Walking diorama prototype — 10 September 2026

Tony approved building a playable version of the game-like walking proposal. The camera/discovery flow is working well on his phone and stays intact. This iteration changes Explore's presentation, with its physical location, nearby suggestions, collection and direct camera action preserved.

## Experience

Explore fills the available phone screen with the real map. A north-up camera at 53 degrees and zoom 17.1 follows the player. A small backpacked 3D character faces the compass direction, or the direction of movement when compass data is unavailable. Short interpolated movements animate its arms and legs. Large location jumps snap rather than performing a fictional long walk. Recording still uses the actual fresh location; visual interpolation does not alter coordinates.

Mapped buildings have volume and directional lighting. A reported height is used when available, otherwise a decorative six-metre height. Woodland and scrub polygons receive simple faceted canopies and ground shadows. These are decorative representations of mapped habitat, not individually mapped trees or collectible species. Water, shorelines, paths and ground use a softer scene palette. No elevation dataset or measured terrain relief has been introduced.

After the first phone review, Tony found the floating tray obstructed the walk. Suggestions are now hidden by default behind a small Nearby chip at the top. Tapping it opens the three stable photographic suggestions; tapping again or using the close button clears the scene. Returning through the main navigation starts with the tray closed. Wanted species, full list/search, species details and image enlargement remain available. The camera button is always directly accessible. Today's count opens the sighting journal; the prior photo strip no longer consumes the walking screen. Fieldbook is one tap away, with ordinary top-down Places and Sightings maps. Returning restores the walking angle and location.

## Implementation and replaceable art

- `config/walking.ts` owns camera settings, colour choices, character scale and scenery limits. `config/discovery.ts` refers to that walking zoom.
- `src/map/walkingLayer.ts` builds a small Three.js scene in MapLibre's existing WebGL context, using its Mercator projection and shared depth buffer. It uses ordinary geometry and materials, with no downloaded character/texture pack. The [MapLibre custom-layer example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/) documents the integration pattern.
- Canopies, trunks and shadows use instanced meshes, capped at 160 decorative trees. A deterministic world grid keeps them anchored. Mapped road corridors, buildings and water are excluded. Geometry comes from the existing cached vector tiles.
- Walking interpolation requests frames only while moving; reduced-motion preferences disable the stride/interpolation. Hidden scenes stop drawing. Small compass changes are quantised for repainting, and stable sighting arrays avoid reloading marker art on every compass event. This is not yet a phone battery benchmark.
- Existing `appearance.character` overrides the prototype character. Species artwork overrides, saved sighting photos and the map skin continue to use the appearance configuration. The default geometry is a prototype asset, not a commitment to the final visual style.
- Native system bars remain outside the WebView. No new permissions, API keys, model files, server dependency, recognition behaviour or storage schema were introduced. Three.js adds roughly 0.54 MB of bundled JavaScript before compression.

The map's source data is still zoom 13, overzoomed for this view. Simplified outlines and sparse building detail are data limitations, not new measured detail. A street or field with little mapped vegetation will look quieter than woodland. Further art, richer terrain, haptics and social encounters remain later work.

## Validation and review

The production web and Android builds and all 95 unit checks pass. Mobile, desktop and Android emulator screenshots were inspected. A noisy-lighting issue on the emulator's older graphics driver was addressed by computing faceted normals in the geometry instead of fragment derivatives. Missing-photo placeholder sizing was fixed after a browser test found it could overlap a tray button.

The APK upgrade test retained 13 emulator sighting records, 12 photos and 64 recognition files, with every photo and recognition file byte-identical. Native walking/atlas navigation and visible controls passed, as did native system-bar space through scrolling and keyboard opening/closing. Tests are in `tests/android/walking.mjs`, `tests/android/insets.mjs` and `tests/android/upgrade.mjs`.

All 15 relevant browser scenarios pass, covering the walking camera's projection, map tapping, inland/sea rendering, full-list fallbacks, offline recognition/save/correction, photo markers, collection, diagnostics and navigation. The full 16-test run still times out in the previously documented multi-tab browser service-worker update scenario (`updates.spec.ts`, waiting for the load event). That browser-only issue was not changed by this prototype; native APK update/data-retention checks pass. It remains unresolved rather than being counted as a passing check.

The owner's actual walking feel and sustained graphics/battery performance remain the next acceptance check. The final native screenshot was re-inspected after the lighting fix and the scene renders cleanly.

Install the [updated APK](https://192.168.0.97:5174/__fieldbook_debug/android) over the existing native app while on home Wi-Fi. Do not uninstall or clear app data.

Served APK SHA-256: `e0514d3e0a0ac6785611df65b6524e8372bbbc4b434bf289a227ad0483655f93` (verified against the built APK).


## Nearby chip follow-up

The default scene now shows only the Nearby chip and, when applicable, Today’s count. The on-demand panel opens beneath those chips rather than above the camera. Full-list search, pinning, image enlargement and species details remain available inside it. The initial location-permission prompt remains visible until a fix is available. This is transient presentation state, with no storage changes.

Web and Android builds pass. Four relevant browser scenarios pass: opening/closing suggestions and map logging, mobile full-list/search/preferences, supplementary-source fallback, and returning from Fieldbook after resizing. Mobile open/closed screenshots were inspected. This follow-up was checked in the browser and built for Android; actual phone review remains pending. Served APK SHA-256: `1e0569bd773fe88ac31425e7e47b5567ee6080c145c87e711297bd6ae69ba8c3`.
