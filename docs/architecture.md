# Luna architecture audit and proposal

Status: proposed; no runtime changes in this branch. Audited 2026-10-14 at
`50ce765245d1d118883859dde7d67443c11b19f0` on a clean `main` checkout. Local
`main` and stored `origin/main` matched; the remote was not fetched.

## Current structure

| Boundary | Current files and behavior |
| --- | --- |
| Bootstrap/cache cleanup | `src/boot.js`, `src/local-cache.js`, `refresh.html`; localhost removes only the exact game's workers/caches, retaining localStorage |
| Simulation | `src/engine.js`; independent of art, injectable RNG; `src/app.js` drives a 1/120-second accumulator |
| UI/input/saving | `src/app.js`, `src/store.js`, `index.html`, `style.css`; best distance and wardrobe local saves, modal pause, installation UI |
| Catalog and rewards | `src/customisation.js`; shared `ITEMS` metadata, empty options, selection, v1 wardrobe saves, boots alias |
| Character/attachments | `src/animation.js` computes pose and rigs PNG; `src/cosmetics.js` draws hats, shoes, marks; `src/draw.js` renders playfield |
| Art and loading | `src/cosmetic-art.js` stores grids/default placement/ears; `src/pixels.js` stores palette and fallback art; `src/cosmetic-assets.js` loads only bowler PNG/JSON |
| Studio | `tools/wardrobe-preview/preview.js`, `review-model.js`, HTML/CSS; shares catalog, simulation, rig and draw functions, supplies isolated fit/image overrides |
| Offline | `sw.js` v15, manual `FILES`, cache-first scoped worker; `manifest.webmanifest` uses relative scope/start URL and local icons |
| Verification | Six test files, 30 Node tests; `.github/workflows/checks.yml` uses Node 22 on push/PR; no browser/device or image-diff CI |

The studio already offers independent drafts for all nine items, PNG import,
version 2 review export, saved pose, and legacy bowler import. It validates and
decodes an imported candidate before replacing draft state. Both game and studio
already use the same animation rig and cosmetic draw functions. The Store is
already driven by `ITEMS`. These capabilities should be extended, not replaced.

## Verified gaps and practical consequences

- `src/cosmetic-assets.js` fetches `bowler.json` and registers a hat-only map.
  The live game cannot load arbitrary approved raster shoes/marks or all saved
  fits through configuration alone. Studio overrides are not runtime defaults.
- Catalog metadata, grid designs, default fits and concept thumbnail crops live
  in different places. `review-model.js` special-cases bowler; `preview.js` seeds
  and resets a bowler-only image map and indexes a fixed crop table. Adding an
  item needs more than the otherwise generic Store catalog loop.
- `drawImageLuna` checks `heels` for paw clipping and enumerates three hats for
  ear masking. These useful attachment rules need data fields, not deletion.
  `drawShoes` requires a grid design even before rendering a PNG override.
- No general review-application command exists. The available extraction scripts
  produce candidate images, not a validated application transaction. Manual
  code/asset changes are still required for a full wardrobe review.
- `parseReview` checks fit ranges and asset strings, but PNG byte integrity is
  delegated to browser decode. It accepts a fixed defaults set and ignores extra
  entries. Runtime bowler validation checks finite coordinates/positive scale
  rather than the studio bounds. CLI and runtime need a shared semantic contract.
- Unlocks are inferred solely from `bestTreats >= current target`; raising a
  threshold can relock a formerly earned/equipped item. Current tests prove
  persistence with unchanged thresholds, not threshold-change preservation.
- `sw.js` manually lists bowler files and modules. Existing tests read listed
  resources and simulate worker events; they do not discover future catalog
  dependencies, prove actual Chrome cache behavior, or compare rendered pixels.
- `app.js` awaits bowler loading before startup; a missing file can stop startup.
  Offline installation failure reaches a catch message, but actual browser
  update/readiness behavior has no browser integration coverage.

Only the saved bowler pair is present in its review folder. The generic
`luna-wardrobe-fit.json`/`luna-wardrobe-preview.png` pair is not present in
`concepts/luna/wardrobe-review/`; that folder contains instructions and a witch
candidate/extraction record. This prevents claiming that all nine corrections
are approved or ready to apply. README's bowler pixel-agreement statement is
historical documentation; the current tests do not establish pixel agreement.

## Proposed shared contracts

Introduce a versioned JSON catalog at `assets/cosmetics/catalog.json` and a pure
shared validator/model module, proposed `src/cosmetic-model.js`. Keep IDs
`bowler`, `witch`, `crown`, `heels`, `runners`, `sandals`, `original`, `star`,
`skull`, plus empty `none`/`bare`. The catalog owns category/name/target, artwork,
fit, and attachment policy. Version numbers for catalog, review, and player saves
are separate contracts; changing one must not silently reinterpret another.

Suggested entry fields (final names fixed in task 1): `id`, `category`, `name`,
`target`, `art` (`none`, `grid`, or `png`), `fit` (`x`, `y`, `scale`), and
`attachment`. PNG art uses a project-relative `asset`; grids store the current
rows, pixel size, palette reference, and tailored-ear data as declarative data.
Move existing grid data exactly, without converting or redrawing it. The bowler
continues referencing the exact existing PNG; preserve its original fit/review
files as evidence. New items normally use PNG plus one catalog entry. The
catalog's art discriminator maps to the legacy review `kind` during import.

Attachment behaviors are category-based: hats attach to torso with optional
original-ear mask at source y=476; shoes attach to each paw's bottom-center with
an optional paw-bottom clip depth (currently 24 for heels); marks use the current
flank mask and counter torso stretch. Fixed character masks belong to the rig;
item-specific enablement/parameters belong to data. No item-ID branches remain
in normal rendering/loading/editing paths. A migration alias is deliberately
historical compatibility data, not a rendering condition.

Validate version, unique IDs, known categories, valid empty/default choices,
integer nonnegative targets, finite category-bounded fit values, supported art
and attachment fields, grid/palette integrity, and portable PNG paths. Reject
unknown/contradictory fields in new formats. Use the present category limits as
the initial bounds to preserve existing reviews. Avoid arbitrary limits on art
that unnecessarily change previously supported files: replacement PNGs retain
the 4,000,000-byte and 4096-by-4096 limits, with bounded total review input too.
Specify the total bound in task 1 and test all nine maximum-size inputs.

A generalized `src/cosmetic-assets.js` loads the validated catalog and all
referenced PNGs into an item map before committing a ready asset snapshot. Use
module-relative root resolution for game, studio, and repository paths. A failed
load must not expose a partially replaced map. Report actionable errors; do not
silently substitute different art for an approved PNG. Grid rendering and the
existing base-character fallback remain supported.

The game/Store render applied catalog data; the studio starts from that same
snapshot and layers an isolated draft on top. Shared fit parsing must not import
DOM code, letting Node application tools use it. Keep v2 and unversioned
bowler-only import through explicit adapters. Introduce a new review version
only if attachment metadata or catalog identity cannot be represented safely in
v2. Preserve old evidence untouched and reject unsupported future versions.
Concept references become optional catalog metadata, so lack of a crop cannot
break a newly added item. Importing old reviews should overlay their known item
set onto current defaults so later items are retained; reject unknown referenced
IDs and validate completeness against that review's known schema.

## Reproducible application boundary

Proposed interface, not available yet:

```sh
node scripts/apply-wardrobe-review.mjs --review PATH.json --preview PATH.png --dry-run
node scripts/apply-wardrobe-review.mjs --review PATH.json --preview PATH.png
```

Application is allowed only after the owner's instruction; a status field is not
approval. Parse the whole review, validate catalog compatibility, every fit,
pose, preview PNG, and every referenced/embedded item PNG before active writes.
Verify PNG signature, structure/CRC, bounded decoded dimensions and successful
decode; support the valid PNG forms Chrome accepts rather than reuse the
RGB-only concept extractor as a general decoder. Reject path traversal, external
URLs, escaping symlinks, ambiguous IDs and malformed base64. Decode embedded
bytes once and preserve them byte-for-byte. Copy project-referenced approved
PNG bytes rather than changing them. The preview is evidence only: it cannot
prove which accessory bytes were approved without the JSON and owner instruction.

Stage outputs outside active paths, compute a deterministic change manifest
with before/after hashes and fit differences, and finish validation before any
commit. Update all reviewed item changes; do not limit work to the selected editor
item. Do not equip the review outfit in player saves. Re-check input/active hashes
before commit to reject concurrent edits. Use a rollback journal/backups for
multi-file write errors; multiple filesystem renames are not a single atomic
transaction. Test rollback and document interrupted-operation recovery. At a
minimum, every validation failure leaves active bytes unchanged. Generate/update
offline asset inventory and cache version as part of the same staged operation;
archive review hashes and report outside the original evidence pair. Reapplication
with no changes must not churn the cache version or report spurious changes.

## Saves and offline boundaries

Introduce a wardrobe save version recording earned IDs plus bestTreats/equipped.
Migrate v1 using frozen historical targets and boots alias; retain the existing
save key or define an explicit read-old/write-new strategy with rollback fixtures.
Never infer legacy earned IDs from revised targets. Union later earned IDs;
keep unrelated valid values. Best distance remains at `luna.best.v1` untouched.
Downgrade behavior must be documented before shipping a new save version.

Use a generated checked-in offline inventory derived from static shell/modules
and the catalog's PNG dependencies. Generate/check it in Node, keeping deployment
static and runtime dependency-free. The worker must install the complete set
before readiness; keep scoped cleanup and delayed activation. Include catalog,
shared modules, fits and all PNGs; exclude concepts, reviews, studio-only tools,
and data URLs. CI detects missing assets and stale inventory. Content/cache
identity must change whenever shipped content changes.

## Audit verification and limits

`npm test` could not launch: npm is absent from the shell PATH (environment
limitation, not a game test failure). The equivalent CI command ran with bundled
Node v24.19.0: `node --test tests/*.test.js`; 30 passed, zero failures, skips, or
cancellations. CI specifies Node 22; that exact version was not run locally.
No pre-existing test failures were observed. No browser, Android, live deployment,
or fresh pixel comparison was performed. Superpowers was not found in the
available skills catalog or installed skill/plugin directories. No dependencies
were installed and no extraction scripts were executed during this audit.

## Task 1 implementation status

The approved catalog/validation task adds the inert catalog and pure model, with
exact current art/config data and fixed renderer/gameplay/save/review fixtures.
See [the implemented version 1 contract](cosmetic-catalog.md). Runtime consumers
still use the original sources; no visual, save, gameplay or offline-cache changes
are introduced by Task 1. Superpowers became available after the preparation audit
and its execution, TDD, debugging, review and verification guidance is now used.
