# Offline asset inventory and updates

The game stays static and build-free when hosted. Development uses Node 22+ to
keep a checked-in inventory synchronized with runtime files:

```sh
node scripts/generate-offline-assets.mjs --write
node scripts/generate-offline-assets.mjs --check
node --test tests/*.test.js
```

The npm aliases are `offline:generate` and `offline:check`. Run generation after
changing shipped HTML, CSS, modules, manifest, icons, legal/help documents, catalog
or images. Commit `offline-assets.js` together with those files. CI checks exact
output and fails on stale inventory or missing dependencies. No hand-maintained
worker file list or version increment is needed. The approved-review application
command generates the inventory within its existing staged transaction, using
pending catalog/image bytes; it snapshots runtime inputs to detect concurrent edits.

## Coverage and identity

`scripts/lib/offline-inventory.mjs` starts at `index.html`, `sw.js`, the manifest,
the cosmetic catalog and the three linked legal/privacy documents. It follows
HTML script/link references, CSS URLs/imports, JS literal imports/reexports,
literal dynamic imports, literal `new URL(path, import.meta.url)`, and literal
fetch/importScripts references. Fetch paths use the game document/worker
execution URL; module imports and import.meta URLs use the containing module.
All literal importScripts arguments are included. The catalog contributes every PNG art path in
any category. Grid artwork and fits travel in the catalog itself. Paths must be
local, bounded regular files without symlinks; dependencies outside the game
(such as studio/concepts) are rejected.

Use plain literal relative paths for new static dependencies. The scanner is a
small project-specific dependency scanner, not a complete JavaScript/HTML parser.
Computed asset paths need an explicit source of dependencies, as cosmetic paths
have in the validated catalog; extend the generator and its tests when adding
another such feature. Do not assume arbitrary computed URLs will be discovered.

Entries are sorted and include each resource's SHA-256. The cache identity hashes
the versioned list, so changes to any included bytes, including worker source,
change the identity. The root URL and `index.html` share the same content hash.
Studio tools, concept images, review evidence and unreferenced historical assets
are excluded. Old source assets/evidence remain in the repository.

The generated script is imported by the worker. It is excluded from its own
hashed list to avoid a hash cycle; Chrome persists imported worker scripts as
part of the installed worker. Browser restart tests verify that it loads when
the test server is unavailable. Registration uses `updateViaCache: 'none'` so
updates check both worker and imported inventory rather than an HTTP-cache copy.

## Installation, readiness and failure

The worker verifies inventory identity, then downloads and SHA-256 checks every
required response before writing a completion marker. Missing, truncated or
wrong-generation responses fail installation. All outstanding writes settle
before a failed new cache is deleted. The existing complete cache survives.
Reinstallation of an already complete identical generation keeps that cache.

A new generation waits until existing Luna clients close; there is no forced
`skipWaiting`. Each generation serves its own cached catalog/modules/images.
Activation removes only other generations for that exact registration scope.
If a required cached file has been evicted, network repair accepts only bytes
matching the installed generation, preventing silent mixing with a newer site.
The readiness reply requires the marker and every listed entry still present.
Storage eviction/data removal can still make offline play unavailable later.

`src/offline.js` displays **Ready for offline adventures** only after a completed
active worker replies. A completed waiting update displays **Update downloaded ·
close all Luna windows to finish**. Failed updates retain the previous version;
failed initial installs and bounded reply timeouts report unavailable offline
setup. Online play remains available when installation fails. The old v19 worker
does not support this status protocol; the v19 upgrade test exercises its actual
source rather than pretending it sends the new reply.

Localhost continues to clear only the local game's worker/cache and load current
files. It preserves saves and does not exercise deployed offline behavior. The
studio remains online/local only. No cache operation writes player localStorage.

## Reproducible desktop checks

With Playwright available to Node and Google Chrome installed:

```sh
node scripts/check-offline-browser.mjs
node scripts/check-review-application.mjs
```

These scripts use temporary project copies and disposable profiles. The offline
script maps `luna.test` to loopback and grants that origin secure-context status
only in the test browser, exercising the production worker path without changing
localhost behavior. It tests root/subpath v19 upgrades, old-client waiting,
browser-process restart with the server unavailable, a new catalog-only PNG,
category selections, preserved saves, failed/interrupted downloads and recovery,
scoped cleanup and localhost isolation. Review-application checks separately
verify exact multi-category replacements and saved-pose renderer agreement.

This is desktop Chrome evidence. HTTPS deployment, Android home-screen installation
and airplane-mode relaunch still require real-device checks in Task 9. See
[Task 7 evidence](verification/v1-task7.md).
