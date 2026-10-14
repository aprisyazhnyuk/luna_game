# Task 3 verification record

Base: `746674b`, main after merged Task 2. Branch: `codex/v1-catalog-loader`.
Owner defers item adjustments to the later review task. No art regeneration,
approved-candidate application, merge or release publication is part of this task.

- Baseline: 96 Node tests passed on bundled Node v24.19.0, no pre-existing suite
  failures. Loader tests failed against the missing factory before implementation.
- Final Node suite: 111 tests pass. Loader tests cover all PNG categories, root
  and subpath resolution, empty/grid entries, failed/late decode, missing/invalid/
  oversize PNGs, header/decoded dimension agreement, oversized/invalid/duplicate
  catalog data, immutable metadata/dictionaries, shared-path deduplication,
  concurrent loading and retry without partial publication.
- Existing save migrations, all 48 outfits, gameplay/animation scenarios and review
  adapters pass. Metadata expectations in the catalog test use the frozen historical
  fixture instead of comparing the catalog with its own newly derived exports.
- Root/subpath offline tests fetch the catalog, validator and every current PNG
  dependency from installed simulated caches. Worker version advances to v17;
  inventory remains manual until Task 7. Installed-worker/device upgrades are not
  claimed by these Node simulations.
- Chrome 155.0.8059.40: all 14 baseline sheets (seven poses, native/enlarged, nine
  item presentations each) matched original recorded PNG bytes exactly.
- `check-catalog-integration.mjs` passes root/subpath startup and Store, all nine
  studio items, PNG import/reset/export, saved JSON defaults and localStorage
  isolation. Only catalog JSON and bowler PNG load at startup; old bowler JSON is
  no longer fetched. Synthetic catalog-only PNG entries appear in the loader and
  both UIs for all categories, with optional concept references. Actual invalid
  PNG bytes stop startup/studio clearly, leave snapshot null and do not write saves.
- Save browser checks pass with existing progress/equipment, root/subpath reloads,
  storage denials and current/next-run outfit isolation. A prior whole-canvas test
  failed intermittently because it expected neutral animation time after a random
  run while the game retains its visual clock. Its scenario now uses deterministic
  RNG/clock and reduced decorative motion for that assertion. Game code was not
  changed to satisfy this test; normal motion remains independently captured.
- Diff whitespace checked. Existing catalog data, approved PNGs/JSON/PNG review
  pairs, engine, rig and cosmetic drawing functions remain unchanged.

The shared loader validates runtime PNG headers/bounds and uses browser decode;
full application input/CRC validation is later work. Generic attachment rendering,
complete studio adapters and exact-byte application remain Tasks 4–6. No new
synthetic test item becomes a live game item.
