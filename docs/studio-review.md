# Shared studio and review contract

Task 5 keeps the existing version 2 JSON format. A new version is unnecessary:
placements and embedded assets already express the required nine-item edits.
`src/wardrobe-review.js` is the pure contract for studio imports/exports and the
future application command. It accepts an explicit validated catalog; importing
it in Node performs no browser IO and does not configure player state.

## Applied data and independent drafts

`src/cosmetic-model.js` owns fit bounds, the catalog-to-review fit adapter and PNG
header/bounds checks. The runtime loader and studio defaults use that same adapter.
Catalog placement is `{x, y, scale}`; the compatible review wrapper adds `kind`
(`grid` or `raster`) and, for raster art, `asset`. Coordinate semantics remain
unchanged: hat top-left, shoe offsets from each paw's bottom-center, mark center.
The game renderer and four-paw animation rig remain shared.

Every editable item starts from its applied catalog fit and decoded artwork.
Initial hat selection uses the first nonempty catalog hat; reset-one and reset-all
restore applied data. A catalog with no bowler still works. Optional concept-board
metadata is in `tools/wardrobe-preview/concept-references.json`; missing metadata,
malformed crops, unavailable artwork, or a slow reference request cannot prevent
editing. New items need no crop entry. Concept crops are reference images only.

Uploads embed the original PNG bytes as a data URL. They preserve the approximate
visible width when switching artwork, after which the owner can adjust x/y/scale.
No PNG is resampled or rewritten. Shared header/bounds validation and the same
browser decoder used by applied cosmetics validate imported/uploaded images.
Limits remain 4,000,000 bytes and 4096 pixels per dimension. Review imports are
bounded to 56,000,000 bytes before reading/parsing. Full PNG CRC validation and
filesystem transaction safeguards belong to Task 6; header checks alone are not
a claim of complete PNG validation.

## Saving and importing

Save fit JSON includes every currently editable item, including unselected items
and their embedded replacement PNGs. Saving freezes the pose; Save preview PNG
captures the enlarged full character. Saving and re-importing preserve motion,
playback speed, jump height, pose, outfit and editor category. Play restarts an
imported animation; stepping, jumping, landing and blinking remain available.

Version 2 requires the three fit-category maps, outfit, selectedCategory and
review metadata. Each fit has exactly kind/x/y/scale and, for raster, asset.
Unknown fields, categories, IDs, contradictory grid asset fields, invalid fits,
invalid poses and noncanonical base64 are rejected. Project assets and preserved
legacy `concepts/` PNG paths are supported; URL/traversal paths are rejected.
`status` is an optional informational label, never evidence of owner approval.

The original unversioned bowler JSON still imports its exact referenced PNG and
placement. Other items start from applied defaults, and its outfit uses current
catalog defaults with bowler selected. Historical version 2 reviews require all
of the original nine editable items still present in the current catalog. Those
IDs are compatibility data, not item-specific rendering or editor logic. Later
catalog items omitted from an older review retain applied defaults. Exports
always contain all current editable entries. An absent later item's prior draft
is therefore reset to its applied state on successful import, not silently kept.
Reviews naming removed/unknown items fail rather than discard their edits.

Version 2 grid fits reference applied grid art. If that art is no longer present
because the item has become PNG-only, the import fails rather than drawing retired
art as an approximation. The existing saved bowler and historical v2 fixtures
remain supported. Review JSON does not embed an independent grid-art generation.

Parsing and every PNG decode finish in a temporary candidate before any draft
assignment. A failure preserves fits, images, outfit, editor, pose and playback.
A newer import, upload, fit edit, reset, selection or playback action invalidates
older pending work. Stale success/failure callbacks cannot roll back newer state
or overwrite its status. File inputs clear at capture, allowing the same file to
be chosen again without clearing a newer request later.

The studio never writes game files, player progress or equipment. Downloads alone
do not apply artwork. Keep the saved JSON/PNG pair in the review folder, inspect it,
and instruct application when ready. The reproducible application command is the
next task; no owner artwork adjustment or candidate application happened here.

## Verification

Run `node --test tests/*.test.js`. With Playwright, pngjs and Chrome available,
run `node scripts/check-studio-review.mjs` and
`node scripts/check-catalog-integration.mjs`.
The new check exercises all nine uploads/fit edits, exact embedded byte hashes,
reset-one/all, saved-pose PNG reproduction and JSON/PNG re-import, malformed and
concurrent imports, delayed uploads, additional items, root/subpath URLs, unchanged
localStorage and active asset/review hashes. These are isolated browser contexts.

Saved-pose pixel comparisons use Chrome's software Canvas backend explicitly
(`--disable-accelerated-2d-canvas`) so both an animated canvas and a newly constructed
comparison canvas follow the same rasterization path. Comparisons decode PNGs
before checking pixels. Default-backend game/studio catalog smoke tests remain
separate. Neither constitutes real Android or installed-worker upgrade evidence.
