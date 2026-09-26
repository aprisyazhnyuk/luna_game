# Luna · Little Adventures

A cozy, portrait, one-tap runner starring Luna: white chest and paws, a tabby cap, dark back patches, and a striped tail. Original monochrome pixel artwork takes inspiration from her owner's reference photos.

## First playable milestone

- One endless run on a minimal pixel ground line, with a steady, gentle pace.
- Tap anywhere in the play area to jump. Space / Up also work; P / Escape pause.
- Four animated pixel paws, a ringed tail, and a compact score display.
- Jump over yarn and boxes and collect little dark crispy bites.
- Three chances per run, forgiving collision bounds, brief recovery after a bump, and a small input buffer before landing.
- Best distance saved on this device. Automatic pause when switching away.
- Installable web app with all game assets cached for offline play.

Levels, double jump, increasing difficulty, hats, and random cosmetic rewards are **planned**, not implemented. See [ROADMAP.md](ROADMAP.md).

## Run locally

No build step, dependencies, account, or API keys required. From this folder:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://localhost:8080. Do not open `index.html` directly as a file: modules and the offline worker require a web server. HTTPS is required outside localhost for offline installation.

## Publish on GitHub Pages

1. Create or choose your GitHub repository and push this directory to its `main` branch.
2. In repository **Settings → Pages**, choose **Deploy from a branch**, then **main** and **/ (root)**. Save.
3. Open the URL shown by GitHub Pages. This project uses relative asset URLs and supports repository subpaths such as `/luna-game/`.

See [GitHub's publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). `.nojekyll` keeps publishing static and build-free. No deployment has been performed simply by creating these files.

## Install and play offline on Android

Open the HTTPS Pages URL in Chrome while online. Wait for **Ready for offline adventures** in the **?** help panel. Use **Install game** if available, or Chrome's menu → **Install app / Add to Home screen** (the wording varies). Installation needs your browser's confirmation; visiting a page cannot silently install a home-screen app.

Launch once from the home-screen icon, then turn on airplane mode and relaunch to check your device. The game has no external font, script, image, or audio requests. Browser data removal or storage eviction can remove saved scores and downloaded assets; revisit online if needed.

The [manifest enables installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), and the [service worker caches game files](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation). Adding to the home screen and downloading the offline cache are separate browser actions.

## Development and verification

With Node.js 22 or later, run `node --test tests/*.test.js` (or `npm test`). Tests cover jump height, buffering, absence of double jump, collisions, recovery, treat pickup, pause, consistent physics, object cleanup, offline asset availability at root and repository paths, and cache isolation from other apps. Cache tests simulate service worker events; they do not replace real browser or phone checks.

The sprites are hand-placed pixel grids in `src/pixels.js`. The canvas uses nearest-neighbor display scaling to keep their edges crisp. To regenerate the SVG and PNG app icons from the current Luna sprite, run `node scripts/export-icons.mjs`; no extra packages are needed.

Manual device checks before release:

- Portrait phone: start, jump, collect bites, lose three chances, restart, pause/resume.
- Switch apps while running; returning must show a paused game.
- Reload and verify best distance persists.
- Install, go offline, close and reopen the game. Test both site root and repository path.
- Check a short screen and landscape fallback; controls should remain reachable by scrolling.

`src/engine.js` owns simulation, `src/pixels.js` defines the sprites, `src/draw.js` draws Luna and the playfield, and `src/app.js` handles input, interface, saving, and installation. `style.css` controls the page. The simulation uses a fixed time step.

When shipping changes, bump `VERSION` in `sw.js` and include any new offline assets in `FILES`. A new worker waits for existing game windows to close before activating. For local development, unregister the worker / clear site data in browser developer tools after asset changes to avoid testing an old cache.

## Rights and privacy

See [LICENSE](LICENSE), [CREDITS.md](CREDITS.md), and [PRIVACY.md](PRIVACY.md). A public open-source license has not yet been selected; no broad reuse license is granted in this prototype. The owner's original photos are not included in the published game or repository. `references/` is ignored if you later keep private local copies there.
