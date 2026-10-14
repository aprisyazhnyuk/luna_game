# Task 2 verification record

Date: 2026-10-14. Base: `fb7334f` (main after owner merged PRs 2 and 3).
Branch: `codex/v1-earned-rewards`. No merge or release publication authorized.

Task scope: explicit earned-ID saves, historical v1 migration, current-target
union, persistence/error handling and corresponding offline cache version. Item
metadata/targets, catalog, renderer/rig, images, owner review evidence, simulation,
input handlers and Store logic remain unchanged. Existing best-distance key and
saving behavior remain separate. The v1 wardrobe value is retained for rollback.
See [the save contract](../wardrobe-saves.md) for downgrade limitations.

Verification performed:

- Before work: all 84 tests passed on bundled Node v24.19.0; no pre-existing test
  failures observed.
- New reward/migration tests failed against the old model before implementation.
  The empty-v2-shell recovery regression failed (record 0 instead of legacy 60)
  before the read-preference guard was tightened.
- Final Node suite: 96 passed, zero failures, skips or cancellations, using
  `node --test tests/*.test.js`. Includes all 48 outfits, saved historical targets,
  exact expected v2 migrations, target increase/decrease/reorder, repeated reload,
  aliases, invalid fields, missing/reintroduced items and storage read errors.
  Archived v1 fixture values were not rewritten to fit the new representation;
  their valid progress/equipment fields still match, with new v2 expectations
  recorded separately.
- Chrome 155.0.8059.40, isolated profiles and temporary localhost server:
  `node scripts/check-wardrobe-saves.mjs` passed root and `/luna_game/` migration,
  startup persistence and reload, untouched v1/high-score values, next reward
  ordering, v2 precedence, corrupt/empty v2 recovery, denied read/write behavior,
  and current-run versus next-run outfit behavior. The paused run canvas remains
  byte-identical after changing Store equipment; a later restarted run's canvas
  matches the actual renderer with the selected outfit.
- The browser migration check was also exercised against a temporary archive of
  the pre-task code and failed because startup did not write a v2 save, proving
  the integration check detects the missing feature.
- `capture-luna-baseline.mjs --check tests/fixtures/luna-v1/rendered` reproduced
  all 14 sheets exactly, each with nine item presentations at seven fixed poses
  across native/enlarged size.
- Existing root/subpath offline availability, physics, animation, scoped cache
  cleanup and review-import tests passed. Worker v16 updates already-cached shipped
  modules; no new runtime module or asset needs adding to its manual inventory.
- Diff whitespace and documentation links checked before handoff. Real Android,
  installed-worker browser upgrade and release publication are not claimed here;
  the broader device/cache release checks remain later tasks.

Execution ruling: a valid best record or earned-ID array makes v2 the preferred
save, with independent field recovery. An empty recognizable version shell must
not hide an otherwise valid legacy save. Old raw data is never deleted. Storage
failure shows the existing notice and preserves session play. Scratch testing
uses temporary directories and browser profiles, not the owner's saved game.

Fresh-context read-only review completed with no Critical, Important or Minor
findings; the reviewer independently ran all 96 Node tests successfully. The
reviewer inspected browser-check code/evidence but did not rerun Chrome. Concurrent
tab progress merging remains the pre-existing behavior outside this task; downgrade
session merging is explicitly excluded by the rollback contract. These exclusions
do not change the threshold-preservation and migration guarantees above.
