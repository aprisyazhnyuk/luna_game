# Luna · Little Adventures

A cozy, portrait, one-tap runner starring Luna: white chest and paws, a tabby cap, dark back patches, and a striped tail. Original monochrome pixel artwork takes inspiration from her owner's reference photos.

## First playable milestone

- One endless run on a minimal pixel ground line, with a steady, gentle pace.
- Tap anywhere in the play area to jump. Space / Up also work; P / Escape pause.
- The supplied Luna artwork with four moving paws, a front-paws-first jump, soft landing, occasional blinks, and a compact score display.
- Jump over yarn and boxes and collect little dark crispy bites.
- Three chances per run, forgiving collision bounds, brief recovery after a bump, and a small input buffer before landing.
- Best distance saved on this device. Automatic pause when switching away.
- A customisation store with three hats, three shoe styles, and three body marks. Single-run milestones from 30 to 135 treats unlock permanent rewards. Mix the three categories independently or choose the original look.
- Installable web app with all game assets cached for offline play.

Levels, double jump, increasing difficulty, and additional cosmetic items are **planned**. See [ROADMAP.md](ROADMAP.md).

## Luna’s little store

Use **Store** to preview and choose outfits. Switch between the visible **Hats**, **Body marks**, and **Shoes** tabs to see every option; the action buttons stay in view on short screens. Use Left/Right arrows, Home, or End to navigate the category tabs with a keyboard. Rewards unlock immediately upon reaching a treat target within a single run. Multiple short runs do not add up to a target. Unlocks and outfit choices are saved on this device, alongside the existing best distance, and work offline. There is no currency to spend; unlocked items stay available after selecting another outfit or restarting.

Hat, body mark, and shoes have independent selections. **Original look** restores no hat, Luna’s original Mickey-shaped mark, and bare paws while keeping every reward unlocked. Changes apply to the next run; opening the store during a run pauses it, and closing the store leaves it paused until the player resumes. Outfit items do not change physics or collision bounds. Clearing browser data removes locally saved progress.

| Item | Treats in one run |
| --- | ---: |
| Mickey body mark | Available from the start |
| Bowler hat | 30 |
| Star body mark | 45 |
| Runners | 60 |
| Witch hat | 75 |
| Crown | 90 |
| High heels | 105 |
| Sandals | 120 |
| Skull and bones body mark | 135 |

The three accessory choices plus no hat / bare paws allow 48 independent outfits. Older saves keep their progress: adventure boots become runners at the same 60-treat milestone. The store always shows the next reward in treat-target order.

## Run locally

No build step, dependencies, account, or API keys required. From this folder:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://localhost:8080. Do not open `index.html` directly as a file: modules and the offline worker require a web server. HTTPS is required outside localhost for offline installation.

Localhost loads current game files directly, clearing this game's old offline workers and caches before startup. Saved outfits, unlocks, and best scores are preserved. Hosted sites continue to use the offline worker.

If an older cached installation still shows a broken layout or an unresponsive Start button, open `http://127.0.0.1:8080/refresh.html` once (or `refresh.html` under your site's game directory). It refreshes only this game's offline files and returns to the game, keeping local saves.

## Publish on GitHub Pages

1. Create or choose your GitHub repository and push this directory to its `main` branch.
2. In repository **Settings → Pages**, choose **Deploy from a branch**, then **main** and **/ (root)**. Save.
3. Open the URL shown by GitHub Pages. This project uses relative asset URLs and supports repository subpaths such as `/luna-game/`.

See [GitHub's publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). `.nojekyll` keeps publishing static and build-free. No deployment has been performed simply by creating these files.

## Install and play offline on Android

Open the HTTPS Pages URL in Chrome while online. Wait for **Ready for offline adventures** in the **?** help panel. Use **Install game** if available, or Chrome's menu → **Install app / Add to Home screen** (the wording varies). Installation needs your browser's confirmation; visiting a page cannot silently install a home-screen app.

Launch once from the home-screen icon, then turn on airplane mode and relaunch to check your device. The game has no external font, script, image, or audio requests. Browser data removal or storage eviction can remove saved scores and downloaded assets; revisit online if needed.

The [manifest enables installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), and the [service worker caches game files](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation). Adding to the home screen and downloading the offline cache are separate browser actions.

## Permanent Luna review studio

Open **http://127.0.0.1:8080/tools/wardrobe-preview/** with the local server running, or use **? → Open Luna review studio** in the local game. This is the permanent review surface for every change to Luna's looks, movement, and items. The process is recorded in `AGENTS.md` for future development sessions.

1. Prepare a candidate in the studio, keeping it separate from the live game. Extend the relevant preview controls when introducing a new appearance or animation change.
2. Review enlarged and actual-size views, outfit combinations, walking, jumping/landing, and blinking. Slow playback or use **Step frame** to inspect movement.
3. Adjust the candidate and download **Save fit JSON** and **Save preview PNG**. Place both in `concepts/luna/wardrobe-review/` and tell the developer the saved files are ready to apply. The browser downloads files; it does not write them into the repository automatically.
4. Apply the exact reviewed image and saved settings, preserving the review pair. Verify that the game matches the saved preview and still animates correctly. Once the owner says to apply the saved files, no additional visual approval is required.

All nine items are editable, regardless of player unlocks: bowler, witch hat, crown; heels, runners, sandals; Mickey, star, skull and bones. Choosing an item in the top selectors also chooses its editor. **Adjust** switches between the currently worn hat, shoes, and mark. **Across**, **Down**, and **Size** affect only that item, and switching items retains their independent drafts. No hat and Bare paws have no artwork to adjust. Hats and their tailored ears move together; shoe offsets apply within all four paw transforms; body marks retain their proportions during torso squash. The studio includes extra headroom for the witch hat.

**Load item PNG** can replace the selected item's appearance using a local transparent PNG (up to 4 MB / 4096 × 4096). A hat PNG should include its ears. Its initial displayed width is matched to the existing item; the fit sliders refine it. The original PNG bytes are embedded in the review JSON so the approved artwork travels with the settings. **Reset item** restores just the selected item, keeping other drafts. **Reset all items** restores all applied/default artwork and fits.

**Save fit JSON** downloads `luna-wardrobe-fit.json`, a version 2 review containing all nine independent fits, any replacement PNGs, the selected outfit, and the current animation pose. **Save preview PNG** downloads `luna-wardrobe-preview.png`. Either save pauses the animation at the reviewed frame so the pair matches. Use Play to continue. **Load fit JSON** restores the complete review at the saved pose; Play restarts its animation. Earlier bowler-only JSON downloads still import. Malformed JSON, invalid placements, and missing/invalid images leave the current review intact.

Neither preview controls nor imports change equipped items, unlocks, best scores, or live artwork. Drafts live in the page until downloaded; save before refreshing. Future movement or character changes must also be prepared in this studio before application. The existing source-space animation rig remains the shared renderer.

### Applied bowler

The owner's saved pair is `concepts/luna/bowler-review/luna-bowler-fit.json` and `luna-bowler-preview.png`. The saved placement is **x 817, y 373, scale 1.91**. The approved hat and ears were extracted from `concepts/luna/04-approved-wardrobe.png`, preserving source RGB pixels. The live PNG is `assets/cosmetics/bowler.png`; its active fit is the bowler entry in `assets/cosmetics/catalog.json`. The unchanged `bowler.json` remains a compatibility/provenance record. Both game and studio load the catalog and PNG through `src/cosmetic-assets.js`. The live renderer matches the owner-saved preview PNG pixel for pixel.

The studio starts at the applied fit. Position uses full-size `assets/luna-custom.png` coordinates; increasing y lowers the hat. Scale is uniform. The renderer masks the original ear area above y=476 and draws the hat plus tailored ears together, leaving the face and blink intact. The PNG saved from the studio is evidence of the complete reviewed look, not a replacement for the transparent accessory PNG.

`tools/wardrobe-preview/extract_bowler.py` reproduces the source extraction without dependencies. It removes connected exterior cream paper and trims below the brim while preserving enclosed light inner ears. Its crop and mask are recorded in `concepts/luna/bowler-review/extraction.json`. The original `fit.json` / `preview.png` in that folder archive the initial proposal; the `luna-bowler-*` files contain the owner's final adjustments. Extraction never overwrites the active game asset.

### Other artwork

The remaining hats, shoes, and marks use `HATS`, `SHOES`, and `MARKS` in `src/cosmetic-art.js`. Pixel rows use X (charcoal), G (grey), L (light grey), W (cream), and . (transparent); colors are in `src/pixels.js`. The old `HATS.bowler` grid is a fallback; editing it does not change the approved raster bowler. To avoid further concept-to-game differences, future approved raster accessories should retain their exact PNG and placement.

`src/cosmetics.js` draws hats on the torso and shoes within each paw's transform. High heels replace the paw bottom to leave the gap between heel and toe empty; marks counter torso squash to retain their proportions. After applying reviewed files, reload the local game, select the unlocked item in Store, and start a new run. Include new runtime PNG/JSON/modules in `sw.js` and increment its version for offline updates. The studio itself is a development tool and is not bundled into the offline game.

## Development and verification

With Node.js 22 or later, run `node --test tests/*.test.js` (or `npm test`). Tests cover jump height, buffering, absence of double jump, collisions, recovery, treat pickup, pause, consistent physics, object cleanup, offline asset availability at root and repository paths, and cache isolation from other apps. Cache tests simulate service worker events; they do not replace real browser or phone checks.

The active Luna artwork is `assets/luna-custom.png`, the selected cute-face design with a more compact rear head contour. `src/animation.js` clips its four paws into separate moving parts at draw time, preserving the PNG. Diagonal paw pairs alternate during walking; front paws fold first on takeoff, the hind paws follow, and front paws reach down before landing. The torso briefly compresses on landing. Blinks use a separate visual clock so they also work on the start screen; pause freezes the pose and blinking. Reduced-motion mode suppresses the decorative animation. Animation does not change collision bounds, obstacle randomness, or jump physics. `src/cosmetics.js` draws hats, marks, and shoes at their attachment points; marks keep their proportions during torso stretch, and shoes follow each paw’s movement.

While the image loads, the hand-placed pixel sprite in `src/pixels.js` acts as a fallback; that file also defines the obstacles. The canvas uses nearest-neighbor display scaling to keep edges crisp. The current SVG and PNG app icons are based on the fallback sprite; to regenerate them after editing it, run `node scripts/export-icons.mjs`. No extra packages are needed.

Manual device checks before release:

- Portrait phone: start, jump, collect bites, lose three chances, restart, pause/resume.
- Switch apps while running; returning must show a paused game.
- Reload and verify best distance persists.
- Install, go offline, close and reopen the game. Test both site root and repository path.
- Check a short screen and landscape fallback; controls should remain reachable by scrolling.

`src/engine.js` owns simulation, `src/pixels.js` defines the base sprites, `src/cosmetic-art.js` defines the wardrobe artwork, `src/draw.js` draws Luna and the playfield, and `src/app.js` handles input, interface, saving, and installation. `src/customisation.js` owns the item catalog, unlock targets, selections, and versioned wardrobe save validation; `src/store.js` builds the store and preview. `style.css` controls the page. The simulation uses a fixed time step. Tests include every reward boundary, single-run counting, all 48 saved combinations, boots migration, invalid-save recovery, and offline store assets.

When shipping changes, bump `VERSION` in `sw.js` and include any new offline assets in `FILES`. A new worker waits for existing game windows to close before activating. Local development automatically bypasses the offline cache; `refresh.html` also provides recovery for older installed versions without clearing saved progress.

## Rights and privacy

See [LICENSE](LICENSE), [CREDITS.md](CREDITS.md), and [PRIVACY.md](PRIVACY.md). A public open-source license has not yet been selected; no broad reuse license is granted in this prototype. The owner's original photos are not included in the published game or repository. `references/` is ignored if you later keep private local copies there.

### Shared catalog development

The approved development plan is in [docs/plans/v1-items.md](docs/plans/v1-items.md).
Task 1 adds a validated declarative catalog and reproducible baseline fixtures.
Task 3 connects catalog metadata and asset loading to the game and studio;
declarative attachment rendering and approved-review application follow in later tasks. See [the catalog contract and baseline commands](docs/cosmetic-catalog.md).
Metadata and raster assets now load from the catalog; grid drawing and attachment policies still use the existing renderer until Task 4. Apply visual edits only through the owner review workflow. All visual candidates
continue through the permanent owner review workflow above.

### Permanent earned rewards

Wardrobe save version 2 records earned IDs so future threshold increases cannot
relock rewards. Existing saves migrate using historical targets; the original
`luna.wardrobe.v1` value remains intact, and best distance keeps its existing key.
See [save compatibility and rollback behavior](docs/wardrobe-saves.md), including
how older game versions handle post-migration progress.


### Catalog loader verification

The shared loader prepares the entire validated catalog/PNG snapshot before
publishing it. See [loader lifecycle and compatibility](docs/cosmetic-loader.md).
With Playwright available to Node and Google Chrome installed, run
`node scripts/check-catalog-integration.mjs` to verify root/subpath startup, studio
controls and save isolation in temporary profiles. It does not modify owner art
or browser progress.
