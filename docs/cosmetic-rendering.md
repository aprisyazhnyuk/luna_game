# Declarative cosmetic rendering

Task 4 makes catalog entries the active artwork/fit/attachment source for all
nine items and new items in existing categories. The rig, source PNGs, fit values,
controls, collision geometry and simulation are unchanged. Item adjustments and
approved-review application remain the later owner review workflow.

## Category rendering

`src/cosmetics.js` resolves each item through the ready snapshot. `resolveCosmetic`
merges isolated studio fit/image overrides with applied art/policies; the normal
renderer contains no item-name conditions or legacy grid lookup. It draws:

- Hats at the fit's top-left, with uniform scale. Grid hats draw catalog rows,
  palette and tailored-ear data; PNG hats draw their original decoded image.
- Grid/PNG shoes relative to each paw's bottom-center, within the existing four
  leg transforms. Every category item can be a PNG without a legacy grid entry.
- Grid/PNG marks around the fit center, using the existing character flank mask
  and catalog-declared counter-stretch to retain emblem proportions.

Offscreen grid rasters are cached by both palette identity and rows. The optional
palette argument to `stamp` leaves base-character/obstacle defaults unchanged.
`src/cosmetic-art.js` remains untouched as historical data for independent tests,
but has no game/studio imports. It is not an active fallback or editing source.

`src/animation.js` reads `earMaskY` and `pawClip` from resolved attachment data.
Non-null hat mask y clips the base torso above that source coordinate; positive
shoe clip depth removes the source paw bottom before drawing the shoe. Character
masks, transforms, layer order, gait, blink overlay and landing squash retain their
existing values and operations. Zero/null policies preserve the base parts.

The existing accessory callbacks (including the legacy hat-only callback) still
work. A `renderers.item(category, id)` resolver can supply complete descriptors
for isolated variants without modifying applied catalog data or saves. Ordinary
studio placement and PNG overrides use the same catalog policies as the game.
This is a development API, not a player setting.

A grid review requires grid artwork in the applied catalog. A PNG-only item cannot
silently substitute its retired grid approximation. Such invalid reviews are
rejected before draft assignment; genuinely exported legacy bowler and v2 reviews
continue to pass. Task 5 will finish broader version/catalog compatibility handling.

## Visual evidence

Original Task 1 fixtures remain unchanged. Before refactoring, Task 4 captured
additional images in `tests/fixtures/luna-v1/attachments/`: all 48 outfits at a
neutral pose and three combined outfits through seven fixed poses, at native and
enlarged size. The source/browser/input/output hashes in the manifest identify the
pre-refactor renderer; expectations were not recaptured after the code change.
These are engineering screenshots, not new wearable assets or owner approvals.

With Playwright, pngjs and Google Chrome available:

```sh
node scripts/check-attachment-parity.mjs --check tests/fixtures/luna-v1/attachments
node scripts/check-attachment-parity.mjs --check tests/fixtures/luna-v1/attachments --bowler-reference
```

The optional reference check reads the actual owner-saved bowler JSON and PNG,
uses the exact referenced accessory image and fit, and reconstructs the original
640×400 camera (scale 5, x 63, y 72). Character pixels above source screenshot
row 365 match exactly. The old stage's ground decoration differs from the current
reconstructed line at 2802 pixels below that row; it is explicitly outside the
character comparison. The reference contains no saved pose, but the neutral pose
reproduces the full character. This check is separate from refactor parity, which
compares complete baseline sheets byte-for-byte. No approved image or review pair
was modified to achieve either result.

Synthetic PNG entries routed only inside isolated browser tests visibly change
all three game categories and match the studio at a fixed pose. Node tests check
literal shoe/mark anchors, all four paw clips, arbitrary-ID ear policy, null/zero
masks and custom grid palette behavior. Existing pose/RNG/gameplay/save/offline
checks remain required. Android/device release checks are still later work.
