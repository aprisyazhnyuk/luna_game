# Luna · Little Adventures

A cozy, portrait, one-tap runner starring Luna: white chest and paws, a tabby cap, dark back patches, and a striped tail. Original monochrome pixel artwork takes inspiration from her owner's reference photos.

## First playable milestone

- One endless run on a minimal pixel ground line, with a steady, gentle pace.
- Tap anywhere in the play area to jump. Space / Up also work; P / Escape pause.
- The supplied Luna artwork with four moving paws, a front-paws-first jump, soft landing, occasional blinks, and a compact score display.
- Jump over yarn and boxes and collect little dark crispy bites.
- Three chances per run, forgiving collision bounds, brief recovery after a bump, and a small input buffer before landing.
- Best distance saved on this device. Automatic pause when switching away.
- A customisation store with permanent rewards: 30 treats in one run unlock a bowler hat, 45 unlock a star mark, and 60 unlock adventure boots. Mix the three categories independently or choose the original look.
- Installable web app with all game assets cached for offline play.

Levels, double jump, increasing difficulty, and additional cosmetic items are **planned**. See [ROADMAP.md](ROADMAP.md).

## Luna’s little store

Use **Store** to preview and choose outfits. Rewards unlock immediately upon reaching a treat target within a single run. Multiple short runs do not add up to a target. Unlocks and outfit choices are saved on this device, alongside the existing best distance, and work offline. There is no currency to spend; unlocked items stay available after selecting another outfit or restarting.

Hat, body mark, and shoes have independent selections. **Original look** restores no hat, Luna’s original Mickey-shaped mark, and bare paws while keeping every reward unlocked. Changes apply to the next run; opening the store during a run pauses it, and closing the store leaves it paused until the player resumes. Outfit items do not change physics or collision bounds. Clearing browser data removes locally saved progress.

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

## Editing the hat

The bowler is pixel artwork in `src/cosmetics.js`, separate from Luna's PNG. Edit the `HAT` rows to change its shape: `X` is dark outline, `G` is grey, `W` is cream, and `.` is transparent. Keep every row the same length. Colours are defined in `PALETTE` in `src/pixels.js`.

`BOWLER_FIT` controls how it sits on Luna: `{x:970,y:480,pixelSize:15}`. The point is the centre of the bottom brim row in the full-size `assets/luna-custom.png` coordinate system. Increase `y` to lower the brim, increase `x` to move it right, and change `pixelSize` to resize around that contact point. Try changes of 10 image pixels at a time. After drawing the hat, `HAT_EARS` redraws Luna's two ears from the PNG over it so they poke through. If you move the ears in the source image, update these rectangles too. The hat and ears share Luna's body animation, so their fit follows walking, jumping, and landing automatically.

Save the file, reload `http://127.0.0.1:8080`, and select the bowler in Store to preview it (it must already be unlocked). Start a new run to check its fit during movement. When publishing an adjustment, increment `VERSION` in `sw.js` so installed games receive the updated artwork.

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

`src/engine.js` owns simulation, `src/pixels.js` defines the sprites, `src/draw.js` draws Luna and the playfield, and `src/app.js` handles input, interface, saving, and installation. `src/customisation.js` owns the item catalog, unlock targets, selections, and versioned wardrobe save validation; `src/store.js` builds the store and preview. `style.css` controls the page. The simulation uses a fixed time step. Tests include reward boundaries, single-run counting, saved combinations, invalid-save recovery, and offline store assets.

When shipping changes, bump `VERSION` in `sw.js` and include any new offline assets in `FILES`. A new worker waits for existing game windows to close before activating. Local development automatically bypasses the offline cache; `refresh.html` also provides recovery for older installed versions without clearing saved progress.

## Rights and privacy

See [LICENSE](LICENSE), [CREDITS.md](CREDITS.md), and [PRIVACY.md](PRIVACY.md). A public open-source license has not yet been selected; no broad reuse license is granted in this prototype. The owner's original photos are not included in the published game or repository. `references/` is ignored if you later keep private local copies there.
