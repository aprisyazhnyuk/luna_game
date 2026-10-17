# Luna development workflow

The owner has established a permanent review process for every change to Luna's
appearance, movement/animation, and wearable items. Preserve this process.

1. Prepare the proposed change in the interactive studio at
   `tools/wardrobe-preview/`, using the actual game renderer and animation rig.
   Keep candidate art, fits, or animation variants separate from the active game
   until reviewed. Extend the studio for each new type of change as needed.
2. Let the owner inspect it at enlarged and actual game size, including walking,
   jumping, landing, and blinking. Offer controls relevant to the proposed change.
3. The owner adjusts the preview, saves the fit/review JSON and preview PNG, then
   tells us to apply them. That instruction is approval; do not ask again.
4. Locate and read the saved files. Use the saved values and exact approved image,
   without redrawing/regenerating or substituting a similar design. Keep the saved
   review pair as evidence. A preview PNG is a screenshot, not a wearable sprite.
5. Apply the approved candidate to the game, verify preview/game agreement and
   existing animation, preserve saved unlocks/outfits, and update offline assets
   and the service worker version when needed.

Preview controls and imports must not change game files, player progress, or
equipped items. Downloading files does not automatically modify the repository;
the owner places the pair in the review folder or supplies its location.

Current approved bowler: `concepts/luna/bowler-review/luna-bowler-fit.json` and
`luna-bowler-preview.png`. Live PNG: `assets/cosmetics/bowler.png`; its active
fit is the bowler entry in `assets/cosmetics/catalog.json`. Keep the unchanged
`assets/cosmetics/bowler.json` as a compatibility/provenance record. Keep the permanent preview easy to access; do not replace it with
static concept images as the only review surface.

The studio now edits all nine current items independently. Generic review pairs
are `concepts/luna/wardrobe-review/luna-wardrobe-fit.json` and
`luna-wardrobe-preview.png`. Version 2 JSON records fits for all items, any embedded
replacement PNGs, the selected outfit, and the saved animation pose. Preserve
embedded PNG bytes when applying them. Grid fits describe the existing grid art
with a uniform scale; hat coordinates locate its top-left, shoe x/y values are
offsets from each paw (bottom-center), and mark x/y locate its center. Use the
renderer overrides in `src/cosmetics.js` to reproduce fits, including tailored
ears and paw attachment. The saved PNG is a full-character reference only.

The studio accepts older bowler-only files. Saving pauses the frame so JSON and
PNG can match. Applying a review must include all changed item fits, not just the
currently selected editor item. Do not alter source art to approximate a PNG.

## Development process and first-release scope

Communicate and write project documentation in English. Read
`docs/game-spec.md`, `docs/architecture.md`, `docs/development-workflow.md`, and
`docs/plans/v1-items.md` before implementation. These documents are a proposed
plan until the owner approves it; this preparation does not authorize runtime
changes or application of new artwork.

Once a task is approved, complete its scope autonomously. Ask only for essential
missing information or a significant decision. Use a separate `codex/` branch
and PR per complete task; do not merge into main or publish without instruction.
Do not combine major refactoring with gameplay changes. Preserve the current
JavaScript/Canvas stack unless an audit identifies a concrete reason to change it.

Customization must share catalog, configuration format, asset loader and renderer
between game, Store and studio. The owner must be able to replace any current
item's PNG and placement without editing JavaScript. Adding an item to an existing
category requires an asset and catalog entry, without item-name-specific behavior
branches. Historical save aliases are compatibility data. An approved review must
be applied by a reproducible command that validates all input before active writes,
transfers exact image bytes and all changed fits, preserves evidence and reports
changes. Validation failure must not partially modify active assets.

Verify studio/assets/game/saves/offline boundaries, use fixed poses for visual
checks and deterministic gameplay scenarios, and preserve earned rewards when
thresholds change. Record baseline failures separately. Do not claim Android
verification without real-device results. Use relevant Superpowers skills if
installed; otherwise continue under these requirements.

First release retains the existing endless runner, controls and mechanics, nine
reviewed items with independent categories, local progress/high score/equipment,
Android Chrome installation and offline play after downloads complete. Levels,
harder obstacles, changing backgrounds and more items are deferred. Open question:
does persistent high score unlock levels between runs, or does the current run's
score trigger stage transitions during a run? Do not resolve or implement that
choice without agreement. The visual approval requirements above remain permanent.

The shared v2 review contract is `src/wardrobe-review.js`; see
`docs/studio-review.md`. Use its adapters and the cosmetic model validation rather
than duplicating fit limits or parsing review fields in application tools. Preserve
exact embedded bytes and every supplied fit. Older reviews keep later catalog
items at applied defaults. Concept reference metadata is optional and never an
artwork source for application. PNG header/decode checks in the studio do not
replace full CRC and transaction validation in the application command.

For an approved saved pair, use `scripts/apply-wardrobe-review.mjs`; see
`docs/review-application.md`. Inspect its default dry-run before explicit `--apply`.
Keep the archived evidence and complete catalog/image/offline-inventory diff together. An
interrupted transaction retains `.luna-review-transaction/`; recover only after
its writer stopped, preserving any reported conflicting edits. Do not manually
substitute images or apply the preview PNG as a wearable.

Offline coverage is generated in `offline-assets.js`; see `docs/offline-assets.md`.
After runtime edits run `node scripts/generate-offline-assets.mjs --write` and
`--check`; commit the generated inventory with its source changes. Approved review
application stages this automatically. Do not restore a manual worker list/version
or force waiting workers to activate. Preserve local worker bypass and verify
installed-worker behavior separately from cache mocks and real Android checks.
