# V1 customization implementation plan

Status: approved by the owner on 2026-10-14. Task 1 is complete on its separate
branch; see [verification evidence](../verification/v1-task1.md). Task 2 is complete on its separate branch with [save verification evidence](../verification/v1-task2.md).
Task 3 is complete on its separate branch with [loader verification evidence](../verification/v1-task3.md).
Task 4 is complete on its separate branch with [rendering verification evidence](../verification/v1-task4.md).
Task 5 is complete on its separate branch with [studio/review verification evidence](../verification/v1-task5.md).
Later tasks remain to implement.
Read [specification](../game-spec.md), [architecture audit](../architecture.md),
and [workflow](../development-workflow.md). Each numbered task is a separate
branch and PR; proceed in order. Paths below are proposed additions where absent.
Keep each intermediate runtime usable and update the offline worker whenever a
shipped file changes, even before the automated inventory task lands.

## Audit baseline

- Clean `main`, commit `50ce765245d1d118883859dde7d67443c11b19f0`; local stored
  `origin/main` matches. No remote fetch performed.
- All 30 existing tests passed on bundled Node v24.19.0 using
  `node --test tests/*.test.js`. CI uses Node 22; exact Node 22 local run pending.
- Pre-existing test failures: none observed. Environment issue: `npm test`
  could not start because npm is absent from PATH; the equivalent Node suite ran.
- Browser/Android/rendered parity not verified during preparation. Superpowers
  unavailable. No source art, reviews, runtime, saves or caches changed.
- Studio replacement/fits and shared rig already work; generic runtime loading,
  declarative attachment policies, application command, persistent earned IDs,
  and catalog-derived offline coverage remain to build.

## 1. Define the shared catalog and validation contract

**Goal:** establish one declarative source for nine items and empty options before
switching rendering. Capture exact existing data and deterministic baseline fixtures.

**Dependencies:** owner approval of this plan; no saved visual candidate needed.

**Affected files:** new `assets/cosmetics/catalog.json`, `src/cosmetic-model.js`,
`tests/cosmetic-model.test.js`, `tests/fixtures/`; read current `customisation.js`,
`cosmetic-art.js`, bowler JSON, review model; update architecture docs. Do not
switch active runtime consumers yet.

**Acceptance:** schema versions and attachment fields specified; unique stable
IDs/categories/defaults/targets enforced; finite fits, grid integrity, safe paths,
PNG/review limits and unknown-field policy documented. Copy present grid rows,
palette, ears, placement and mask policies without changing their values. Bowler
references existing exact PNG. Fixtures record legacy saves, legacy bowler and v2
reviews, current item data, fixed animation poses and seeded gameplay scenarios.
The new contract can describe another PNG in an existing category by data alone.
No active visual change; existing approved review files remain byte-identical.

**Verification:** run old suite and meaningful schema tests for valid nine items,
invalid versions/IDs/categories/fits/paths/attachments; cross-check catalog data
against old exports. Capture reproducible browser baseline images using the
existing renderer at native/enlarged sizes and record asset hashes/browser details.
Test synthetic additional-item data; do not ship an extra item to players.

## 2. Preserve earned rewards independently of thresholds

**Goal:** make later catalog/reward changes safe for existing saves.

**Dependencies:** task 1 stable IDs and historical fixture targets.

**Affected files:** `src/customisation.js`, `src/app.js` only for save integration
if needed, `tests/customisation.test.js`, save fixtures, docs, `sw.js`.

**Acceptance:** explicit versioned earned-ID save model; v1 migration uses frozen
historical thresholds, retains bestTreats and valid equipped items, maps boots to
runners, and leaves `luna.best.v1` untouched. Raising a target cannot revoke a
reward already earned, including after reload. Lower targets can grant rewards
normally. Original look retains earned IDs. Invalid fields recover without
silently discarding independently valid data. Document save-key and downgrade
strategy; do not change current targets or single-run reward rules.

**Verification:** legacy/default/corrupt fixtures, all 48 outfit round trips,
boots alias, target increase/decrease/reorder, repeated migration, storage-error
and reload browser checks. Run existing engine/animation/cache tests. Check next
reward UI still uses target order and current-run outfit remains unchanged.

## 3. Generalize asset loading and catalog consumers

**Goal:** game, Store and studio obtain item metadata/art/default fits from the
validated catalog through one loader.

**Dependencies:** tasks 1–2.

**Affected files:** `src/cosmetic-assets.js`, `src/customisation.js`, `src/app.js`,
`src/store.js`, new loader tests, `sw.js`; minimal compatibility adapter for studio
until task 5. Retain old rendering interfaces until task 4.

**Acceptance:** loads PNGs for every category and supports exact existing grid
art through generic data. A complete asset snapshot is published only after
validation/decode succeeds. Root/subpath and studio-relative URLs work. Clear
errors identify missing/invalid assets. No name-specific loader conditions;
empty items need no artwork. Metadata consumers use the shared catalog without
changing saves or controls. Transitional adapters do not duplicate item lists.

**Verification:** injected fetch/image-decoder tests for all categories, missing,
corrupt and oversize PNGs, partial-load failure, and duplicate/conflicting entries.
Browser startup and Store/studio smoke checks using unchanged applied data; no
visual differences accepted. Verify catalog/modules/PNGs included in current
manual offline list; run complete suite.

## 4. Make attachment rendering declarative

**Goal:** remove item-name conditions while preserving current appearance and rig.

**Dependencies:** task 3 ready item snapshots and task 1 baseline captures.

**Affected files:** `src/animation.js`, `src/cosmetics.js`, `src/draw.js` if needed,
`src/cosmetic-art.js` (retire duplicated item data only after parity), renderer
fixtures/tests, catalog attachment fields, `sw.js`.

**Acceptance:** generic hat ear-mask policy and shoe paw-bottom clipping reproduce
current behavior, including heels and tailored ears. Raster shoes/marks render
without a required legacy grid entry. All four paw transforms, mark proportions,
blink, layering, and approved bowler remain unchanged. No new item-ID conditions
in rendering. No engine/input behavior edits.

**Verification:** fixed-pose browser image comparisons against task 1 for each
item, all 48 combinations at a neutral pose, and representative combinations
through walking/takeoff/apex/landing/blink at native and enlarged size. Record
saved-bowler-reference comparison separately from refactor-baseline comparison.
Use a synthetic PNG entry for each category to prove generic rendering. Run
seeded gameplay/animation tests and compare simulation/RNG independently.

## 5. Move the studio onto the shared model

**Goal:** all nine PNG replacements and fits start from applied data, survive
review round trips, and remain isolated from the game.

**Dependencies:** task 4 generic renderer.

**Affected files:** `tools/wardrobe-preview/review-model.js`, `preview.js`, HTML/CSS
as needed; `src/cosmetic-model.js` adapters, `tests/wardrobe-review.test.js`, docs.

**Acceptance:** no bowler-only seeding/resetting or required named crop table;
optional concept metadata cannot break new items. Preserve x/y/scale semantics,
limits, native/enlarged views, playback/step/blink and freeze-on-save. All changed
items export regardless of editor selection, retaining embedded PNG bytes. Game,
Store and studio share applied loader/renderer; studio drafts never write files
or saves. Import failures preserve the complete draft. Legacy bowler and existing
v2 pairs still import; decide/document any new version here before exporting it.
Old reviews retain later catalog items at defaults rather than erasing them.

**Verification:** browser replace/edit each of nine items, switch and reset one
item/all, save/reload pair and reproduce saved pose. Hash embedded PNG round trips;
compare localStorage and active files before/after. Test malformed assets, partial
reviews, concurrent imports, old versions and additional catalog-only items.
Run suite and fixed-pose game/studio parity checks.

## 6. Implement the validated review application command

**Goal:** make approved review application reproducible, exact and safe on failure.

**Dependencies:** task 5 shared review contract. Use synthetic fixtures for
engineering; only apply real live candidates after owner instruction.

**Affected files:** new `scripts/apply-wardrobe-review.mjs`, application helpers
and tests, fixture PNG/JSON pairs, package scripts if useful, workflow/README,
`assets/cosmetics/` and `sw.js` only through approved application or test sandboxes.

**Acceptance:** documented review/preview arguments and dry-run; validates all
inputs before active writes, with bounded PNG decode, CRC, base64, fit/pose,
compatibility and path/symlink checks. Applies all changed fits and exact PNG bytes;
never treats screenshot as sprite or review outfit as player equipment. Stages
changes, checks for concurrent edits, reports old/new paths/fits/hashes, preserves
review evidence, handles write-error rollback and interrupted-operation recovery.
Idempotent second apply changes nothing. Validation failure leaves all active
bytes unchanged. Update manual cache list/version in this staged transaction
until task 7 provides automatic inventory.

**Verification:** run in temporary copies, hash whole active tree before/after
invalid late-item input, malformed PNG, traversal, escaping symlink, missing
preview, unsupported version, conflicting IDs and concurrent edits. Inject write
failure and verify rollback. Successful multi-item and legacy-bowler cases must
match source hashes and fits, leave unrelated assets/reviews intact, and preserve
save fixtures. Re-run application for zero diff; compare game/studio saved pose.
Do not apply the synthetic test artwork to the live repository.

## 7. Derive and verify offline asset coverage

**Goal:** catalog additions/application automatically include all runtime assets.

**Dependencies:** task 6 application transaction.

**Affected files:** `sw.js`, new inventory generator and checked-in inventory
(format chosen here), command integration, `src/app.js` only if readiness evidence
requires it, `tests/offline.test.js`, CI, package scripts/docs.

**Acceptance:** static inventory includes shell/modules/catalog/all referenced
PNGs and excludes studio/concepts/review evidence. Generate deterministically;
CI check fails for stale inventory/missing asset. Integrate generation and cache
identity changes into command staging. Every changed shipped file invalidates
cache identity. Retain delayed activation and scoped cleanup; failed required
asset download cannot announce a newly ready cache or replace the old good cache.
No player-save changes; deployed game remains static and build-free.

**Verification:** root/subpath worker tests with a new catalog-only PNG and
missing-download rejection, old/new cache activation/isolation, and unchanged
saves. Actual Chrome online install → cold offline launch, all categories, upgrade
from previous cache, close old windows, interrupted download and online recovery.
Confirm localhost bypass separately. Run CI commands and full suite.

## 8. Review and apply the nine-item correction set

**Goal:** complete visual acceptance using owner-saved evidence through the new
workflow. No art regeneration is implied by this task.

**Dependencies:** task 7; owner adjusts/saves review pair and instructs application.
Currently the generic pair is absent. Existing bowler approval remains valid.

**Affected files:** owner review evidence under `concepts/luna/wardrobe-review/`,
application report, exact approved assets/catalog fits, generated offline files,
README/verification record. Preserve existing bowler review and artwork.

**Acceptance:** owner inspects all nine items and combinations at both sizes
through walking, jumping, landing and blinking. Apply every approved changed fit
and exact PNG with the command; unchanged items retain bytes/settings. Evidence
identifies which items were reviewed, input hashes, saved pose and command output.
Do not infer missing PNG art from a screenshot or concept crop. Game/Store/studio
agree with saved review; no save or mechanic regression.

**Verification:** dry-run and application hash report, saved-pose image comparison,
movement inspection, reload outfits/high score/unlocks, repeat application for no
changes, full tests and offline asset check. If owner review is pending, finish
engineering evidence and leave visual application pending rather than substitute
art or seek repeated approval for an already approved pair.

## 9. Verify the release on real Android hardware

**Goal:** establish first-release device/offline evidence without publishing.

**Dependencies:** task 8, access to a real Android device and a secure test URL.
Request device access/details only if unavailable; do not claim emulation as proof.

**Affected files:** new `docs/verification/v1-release.md`, README/ROADMAP status.
Any discovered defect gets its own bounded fix branch/PR before rechecking.

**Acceptance:** record device/OS/Chrome, served commit/date/URL, all required
scenarios and outcomes; first-release requirements pass or are explicitly pending.
No release, merge, or new gameplay features in this verification task.

**Verification:** first start, taps/keyboard as applicable, jump/buffer/chances,
restart, all Store choices, short/landscape screen, background pause, reload
progress/equipped outfit, install, ready status, airplane-mode closed-app relaunch,
root/subpath where hosted, all nine assets, upgrade with old saves/cache, interrupted
download/recovery. Review complete Node/CI/browser evidence alongside device results.
Owner decides merging/publishing only after this evidence is presented.

## Recommended next task

Tasks 1–5 establish catalog data, save compatibility, loading, declarative
rendering and shared studio/review handling. Next is Task 6: build the reproducible
validated approved-review application command in temporary test repositories.
The future level-progression decision remains open: persistent high score unlocks
between runs, or current-run score drives stage transitions during a run?
