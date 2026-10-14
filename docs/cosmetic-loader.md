# Shared cosmetic loader and consumer lifecycle

Task 3 connects `assets/cosmetics/catalog.json` to runtime metadata and asset
loading. Item targets, names, categories, default outfit and studio default fits
come from the validated catalog. The handwritten `ITEMS` table is removed;
historical reward migration constants deliberately remain frozen separately.
No item fit, PNG, grid pixels, category choice or current reward target changes.

## Ready snapshot

`loadCosmeticAssets()` fetches and validates the catalog, downloads each unique
PNG path once, checks its signature/IHDR and byte/dimension bounds, then awaits
browser image decoding. Only after every item succeeds does it configure wardrobe
metadata and publish the ready snapshot. Concurrent callers share a transaction;
a failure exposes no partial snapshot, includes the affected asset path in its
error, and can be retried. A successful snapshot is reused for the page lifetime;
reload to load a new catalog. There is no in-run live catalog replacement.

The factory `createCosmeticAssetLoader({root, fetch, decode})` supports isolated
Node tests with explicit IO. `getSnapshot()` returns null before success. Its
ready result has frozen catalog data and an immutable item dictionary; each
entry contains `id`, `category`, `art`, `attachment`, compatibility `fit`, and
an optional decoded `image`. Images are browser resources; callers must not
change their source. Empty options have null fits and no image. Grids retain exact
rows, pixel size and ear data without raster conversion.

`getCosmeticSnapshot()` exposes the browser singleton's ready result;
`getCosmeticItem(category, id)` performs category-safe lookup. `getRasterHat(id)`
remains a thin compatibility adapter for the existing renderer, using category
and presence of an image rather than a named-item condition.

The catalog response is bounded to 1,000,000 bytes before JSON parsing. PNGs are
bounded to 4,000,000 bytes and 4096×4096. Header dimensions are checked before
image decoding and must agree with decoded dimensions. PNG CRC/full-structure
validation for reproducible application remains Task 6; this runtime uses actual
browser decode and does not claim the header check alone validates an image.
Decoded images are created from the original fetched bytes through temporary
Blob URLs, which are revoked after decode. No resizing/recoloring/recompression
or image generation occurs.

URLs resolve relative to the module's project root, supporting `/`, repository
subpaths, and the nested studio. Runtime validation and catalog JSON are included
in worker v17's manual offline list. All current referenced PNGs are covered;
Task 7 will generate/check the full future dependency inventory automatically.
The worker's scoped cleanup/delayed activation and local-development bypass remain.

## Consumers and transitional rendering

`src/customisation.js` exports live `ITEMS` and `ORIGINAL` bindings. They are
configured from validated catalog data after loading; creating a wardrobe before
configuration throws instead of silently saving an empty item set. The app already
awaits cosmetic loading before reading saves or building Store, so its existing
startup order remains. Store's existing generic item/category loops now consume
these bindings. Help text refers players to Store targets instead of hardcoding
one reward sequence. The version 2 save migration and frozen historical targets
are unchanged.

Pure Node consumers explicitly call `configureWardrobe(catalog)` or use
`tests/helpers/catalog.js` for file-based test setup; importing modules performs
no network or image loading. Configure validates completely before replacing
metadata. It is an integration API, not a studio edit control.

The studio derives all initial fits and PNG images from the same ready snapshot.
Item/all resets restore those applied values. Missing concept thumbnail crops are
harmless for new catalog entries. Existing nine items, controls, starts-at-bowler
outfit, legacy bowler reviews, v2 review import/export and fixed-pose behavior are
preserved. The optional old `defaultFits(bowler)` argument remains a compatibility
adapter; normal startup calls it without a named bowler fit. Studio controls,
PNG imports, resets and exports do not write player localStorage or active files.

Task 3 retained existing drawing APIs and grid/attachment code; Task 4 now consumes the shared entries.
The active bowler and every grid/PNG item now use their catalog fits/art/policies.
Task 4 removes named masking conditions and grid prerequisites; new PNG items
render through the same category paths as current ones. Task 5 completes generic studio handling; Task 6 applies
approved reviews. No new cosmetic is shipped or approved by synthetic tests.

The approved bowler PNG and both owner review files are unchanged.
`assets/cosmetics/bowler.json` stays unchanged as compatibility/provenance;
the catalog is now the active raster fit source. A legacy review must eventually
be transferred into the catalog by the application command, not merely copied to
the old fit JSON. Do not extract a wearable from a full-character preview PNG.

## Verification commands

```sh
node --test tests/*.test.js
node scripts/check-catalog-integration.mjs
node scripts/check-wardrobe-saves.mjs
node scripts/capture-luna-baseline.mjs --check tests/fixtures/luna-v1/rendered
```

The last three need Playwright available to Node and installed Google Chrome.
In Codex, set `NODE_PATH` to the bundled node_modules directory. They use isolated
profiles/temporary local servers, with synthetic entries routed only inside test
contexts. Node tests inject fetch/decoders to exercise partial failure, invalid
catalogs/PNGs, size bounds, URL resolution, deduplication and retry. Actual Chrome
checks exercise original bytes, studio controls, safe failure, saves and all
fixed-pose images. Browser save scenarios use a seeded RNG and controlled clock;
the next-run outfit comparison disables decorative motion so an unrelated blink
cannot invalidate its expectation. Normal animation remains covered separately.
Android/installed-worker release checks remain later work.
