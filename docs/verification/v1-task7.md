# Task 7 verification: generated offline coverage

Date: 2026-10-17. Branch: `codex/v1-offline-inventory`, based on merged main
`89be915` (PR #8). Baseline: 155 Node tests passed; no pre-existing failures.
Local Node: v24.19.0. CI runs the inventory check and suite on Node 22.

## Changes and boundaries

- Deterministic runtime/catalog dependency inventory with per-resource SHA-256
  and content-derived cache identity. Current game has 27 required URL entries.
- The review application command stages exact PNG/catalog/inventory changes in
  one recoverable transaction and snapshots runtime dependencies for concurrency.
- Worker downloads validate every required response before a completion marker;
  failed generations are removed after writes settle, preserving the old cache.
- Delayed activation and exact-scope cleanup remain. Missing required cache entries
  cannot be repaired with mismatched new-generation network bytes.
- UI readiness comes from a bounded installed-cache reply. Initial failures report
  unavailable setup; waiting completed updates ask the player to close Luna windows.
- No active images, catalog fits, concept/review evidence, simulation, input,
  renderer or save modules changed. The localhost bypass remains unchanged.

## Automated checks

Commands run with bundled Node (built-in dependencies only for the suite):

```sh
node scripts/generate-offline-assets.mjs --check
node --test tests/*.test.js
```

Inventory check passed; 171 tests passed, no failures, skips or cancellations.
New coverage includes deterministic graph/exclusions, nested literal imports,
catalog-only PNGs including paths with spaces, content invalidation, stale/missing
checks, root/subpath worker lifecycle, wrong/missing downloads, complete-cache
status, eviction/repair, generation isolation and same-generation reinstall.
Status tests cover initial failure, verified readiness, waiting/failing update,
bounded timeout and registration failure. Scanner regressions cover literal imports
after the real app’s numeric divisions, game-relative fetch paths and every
importScripts argument. Application tests cover inventory changes
and concurrent runtime edits alongside existing rollback/recovery cases. A deterministic
writer hook changes a validated PNG during preparation; rejection preserves every
other file and the original snapshot limits.

The red phase showed absent generator/status APIs and the former worker accepting
an install without a new required catalog PNG. The application integration test
also rejected the old manual-worker updater after worker format changed. These
failures preceded implementation; they are task development tests, not baseline
regressions. `git diff --check` passed.

## Actual desktop Chrome

Google Chrome 155.0.8059.80, headless, disposable persistent profiles. Playwright
and pngjs were supplied by the bundled workspace runtime; no project dependency
was added. Commands:

```sh
node scripts/check-offline-browser.mjs
node scripts/check-review-application.mjs
```

Both passed at `/` and `/luna_game/`. The offline script uses a loopback server,
Chrome's resolver mapping for `luna.test`, and a test-only secure-origin flag;
normal `127.0.0.1` continues through the unchanged local bypass. No owner browser
profile, progress or running development server was used.

Observed for each path:

1. Install exact v19 worker/application fixtures from base `89be915`, seed existing
   high score/unlocks/outfit, and verify the previous manual cache works offline.
2. Restart the entire browser with that profile and the server unavailable; old
   installation still launches. Restore network and download the generated worker
   with a new catalog-only PNG. Both old clients keep the previous catalog; closing
   one client still leaves the old worker active. Close all windows, then restart
   the browser with the server unavailable: new inventory/module scripts launch
   from the installed generation. Old same-scope cache disappears; unrelated app
   and scope caches survive.
3. Restart cold offline again, select an earned new hat and independent shoes/mark,
   and fetch the new PNG with the exact expected hash. Existing high score and
   earned IDs/outfit survive upgrades and reloads (only intentional Store selection
   changes equipment).
4. Interrupt a new asset response after ten bytes: install fails, UI reports the
   previous version retained, incomplete generation disappears, and the old catalog
   remains usable offline. Retry online, close clients and restart cold offline:
   recovered generation includes the new item and preserves saves.
5. A fresh install with a required icon returning 404 never reports ready and
   leaves no partial generation; restoring the icon and reloading recovers.
6. Ordinary localhost reports local development, removes only its own old cache,
   leaves unrelated cache/saves intact and has no registered worker.

The review-application script separately applies synthetic PNG replacements to
all categories in temporary copies. Exact image hashes, saved-pose pixels, fourteen
movement captures per path (seven poses at two sizes), unchanged saves and a
zero-change second application all passed. Existing approved art and review pairs
remain untouched. The live game's visuals are not revised by this task.

## Limits and next step

These checks prove desktop worker/cache transitions, not Android installation,
actual GitHub Pages delivery or a release. Real Android model/OS/Chrome, home-screen
installation and airplane-mode cold relaunch remain Task 9. Storage eviction can
remove downloaded data after a successful readiness check.

Next is Task 8: owner review of all nine items in the permanent studio, then the
saved JSON/PNG pair and instruction to apply. The generic owner-saved pair is still
absent; no artwork is inferred from screenshots or regenerated. Existing bowler
approval is preserved. No merge or publication is performed by this task.


## Independent review and fixes

One fresh-context whole-branch review found two important issues: repeated reads
could overwrite an earlier validated snapshot during preparation, and numeric
division could hide later imports from the scanner. Both were reproduced by failing
regressions before fixing the first-snapshot invariant and numeric-token handling.
The review also identified fetch-base and multi-argument importScripts omissions.
These were treated as dependency-completeness issues and fixed in the same pass,
with separate red-to-green regressions. No review findings remain deferred.
The final suite has 171 passing tests; generated inventory remains unchanged.

Review scope decisions: Android/production delivery remain explicitly pending,
since desktop profiles cannot establish device results. Arbitrary computed URLs
continue to require a declared dependency source/generator extension; otherwise
future features could omit assets. The current cosmetic loader’s computed paths
are covered by the catalog. These limits are documented in the offline contract.
