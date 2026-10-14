# Fit the approved witch hat yourself

The prepared replacement is `witch-concept.png` in this folder. It contains the
hat and ears extracted from the approved concept, with the paper, source cat,
and light fur fringe below the brim removed. Retained RGB pixels are unchanged.
This is a preview candidate; it has not replaced the game artwork.

1. Start the local server and open http://127.0.0.1:8080/tools/wardrobe-preview/.
2. Choose **Witch hat** in the top Hat selector. Its editor opens automatically.
3. Click **Load item PNG** and choose this folder's `witch-concept.png`. On a Mac,
   press Cmd+Shift+G in the file picker and paste this full path:
   `/Users/antonprisiazhniuk/luna_game/concepts/luna/wardrobe-review/witch-concept.png`.
4. As a starting fit, set **Across 775**, **Down 300**, **Size 1.75**. These are
   proposed values for adjustment, not an approved final fit. The keyboard arrow
   keys move a focused slider one step at a time.
5. Check Stand, Walk, Jump, and Blink, plus the actual-size view. Refine the fit
   until you like it. Hat and ears move as one piece.
6. Save **fit JSON** and **preview PNG**. Saving pauses the pose to keep the pair
   consistent. Place `luna-wardrobe-fit.json` and `luna-wardrobe-preview.png` in
   this folder, then tell the developer the files are ready to apply.

The JSON embeds the replacement PNG and every item's fit; the screenshot is the
whole reviewed character. Preview edits and downloads do not change the game.
If you already have a saved wardrobe draft, load that JSON before replacing the
hat so your other item adjustments are kept.

To reproduce the extraction, run `python3 tools/wardrobe-preview/extract_witch.py`
from the game folder. `witch-extraction.json` records the crop and masking method.
This script writes only the candidate PNG and its extraction record.
