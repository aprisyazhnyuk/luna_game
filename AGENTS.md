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
`luna-bowler-preview.png`. Live PNG/fit: `assets/cosmetics/bowler.png` and
`bowler.json`. Keep the permanent preview easy to access; do not replace it with
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
