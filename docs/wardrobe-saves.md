# Wardrobe saves and threshold compatibility

Task 2 introduces save version 2. It changes persistence, not reward targets,
controls, artwork or gameplay. `src/customisation.js` owns the pure restore,
selection and reward rules. `src/app.js` reads and saves browser state.

## Stored state

The primary key is `luna.wardrobe.v2`, containing:

```json
{
  "version": 2,
  "bestTreats": 60,
  "unlocked": ["none", "original", "bare", "bowler", "star", "runners"],
  "equipped": {"hat": "bowler", "mark": "star", "shoes": "runners"}
}
```

`bestTreats` is the best treat count in one run; counts from different runs are
never added. `unlocked` explicitly records earned stable IDs, including default
zero-target options. A later higher threshold cannot remove an ID. Rewards are
reported once in target order; selecting Original look changes only equipped IDs.
Safe unknown earned IDs are retained when absent from the current catalog, so
reintroducing an item restores its availability. Unknown items cannot be equipped.

Restoring a supported save retains independently valid fields: a nonnegative safe
integer bestTreats, deduplicated valid IDs, and known unlocked equipped choices
in their correct category. Invalid list entries are ignored; a malformed list
can be reconstructed from the valid best record and current targets. This recovery
cannot recreate an earned ID when both its explicit list and qualifying record
are corrupted. Unsupported versions or unparseable JSON recover via the legacy
save if available. Direct pure restoration without a legacy source uses defaults.

On restore, current targets at or below bestTreats can grant lower/new rewards.
Already earned IDs are never filtered by current targets. Targets remain 30–135
in this task. The optional `items` argument on model functions lets later catalog
integration and tests supply metadata without mutating the live item table.

## Migration and rollback

`loadWardrobe(storage, items)` reads v2 first. A version 2 save with a valid best record or an earned-ID array takes
precedence over the old save; individual corrupt fields are recovered independently.
If v2 is absent, unparseable, unsupported, or has no usable progress fields, read `luna.wardrobe.v1` and migrate.
`restoreWardrobe(saved, items)` is pure and does not access browser storage.

For version 1, derive earned IDs from frozen `LEGACY_TARGETS`, never revised
catalog targets. These historical targets match the committed Task 1 fixture.
Then union rewards justified by the current best record and targets. Historical
`boots` IDs become `runners` in earned and equipped data. Empty options and the
original Mickey mark remain available. Unknown/locked equipped choices fall
back per category while retaining valid other choices.

The app writes the resulting version 2 state at startup, so migration and earned
IDs persist even if the player does not open the Store or collect more treats.
It never deletes or overwrites `luna.wardrobe.v1`. The best-distance key
`luna.best.v1` remains governed by existing high-score code. Studio imports do
not access these keys.

Downgrading to an earlier game version reads its last v1 wardrobe snapshot.
Post-migration choices/rewards are not mirrored into that old format; re-upgrading
loads the retained v2 progress. Changes made in the old game while downgraded are
not merged into an existing v2 wardrobe. Best distance remains shared across
versions. This policy avoids fabricating a treat record to represent rewards
that an old format cannot express. Do not delete v1 as “cleanup.”

An unsupported future value under the v2 key is treated as unusable by this
version and may be replaced by recovered/default v2 state on startup. Future
save migrations must use a new primary key and retain v2, as this migration does
for v1; forward compatibility is not inferred from a version number.

## Failure behavior and verification

If reads fail, the app shows the existing saving-unavailable notice and allows
session gameplay with defaults. If a v2 write fails, the migrated/unlocked state
and choices still work in memory; the notice explains that they last for the
session. The old save remains intact and is available on the next load. Browser
storage deletion/eviction can remove both formats; this remains a local save,
not cloud backup.

Node tests cover historical/default/corrupt migrations, target changes/reordering,
all 48 outfits, aliases, repeated restoration, missing/reintroduced items,
read precedence and storage failure propagation. The archived v1 fixtures remain
unchanged; new expected migrations are in `tests/fixtures/luna-v2/migrations.json`.

With Playwright available to Node and Google Chrome installed, run:

```sh
node scripts/check-wardrobe-saves.mjs
```

This dev-only command uses a temporary loopback server and isolated profiles.
It checks root/subpath migration, reload persistence, untouched legacy/high-score
values, next-reward UI, corrupt-v2 recovery, denied reads/writes, and that Store
changes affect the next run while keeping the paused run's rendered outfit intact.
It does not write the owner's browser data. In Codex's bundled runtime, set
`NODE_PATH` to the supplied node_modules directory. Browser verification does not
replace Node CI or real-device Android checks.

`sw.js` advances to v16 so hosted offline clients receive the new saving code.
Existing file inventory, delayed worker activation and scoped cleanup remain
unchanged; no new runtime asset is required by this task.
