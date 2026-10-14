# Cosmetic catalog contract, version 1

Implemented in Task 1 on the approved development plan. The catalog at
`assets/cosmetics/catalog.json` is validated by the pure `src/cosmetic-model.js`.
Task 3 connects it to shared asset loading, game/Store metadata and studio
defaults. Existing approved artwork and owner review evidence remain unchanged.
Task 4 consumes catalog grids and attachment policies; approved
review application is Task 6. See [loader compatibility](cosmetic-loader.md).

## Data and APIs

`validateCatalog(value)` validates and returns an independent deeply frozen JSON
snapshot. It rejects unsupported versions, unknown fields, invalid items, fits,
palette/grid data, defaults and attachment combinations. Failure does not mutate
the input. No DOM, image decode, fetch, localStorage or filesystem access occurs.
The caller must parse bounded JSON before invoking the validator.

The root contains exactly `version` (1), `palette` (one-letter uppercase keys
mapped to six-digit hexadecimal colors), `earRows` (the existing ear pixel grid),
`defaults` (`hat`, `mark`, `shoes` IDs), and `items`. Grid dimensions are 1–256
cells per axis; `.` is transparent. Item count is 3–1000. IDs are globally unique,
1–64 characters, lowercase letters/digits/hyphens starting with a letter, with
`constructor` and `prototype` reserved. Names are trimmed nonempty strings up to
100 characters without control characters. Reward targets are nonnegative safe
integers. Defaults must refer to zero-target items in the matching category.

Each item contains exactly `id`, `category`, `name`, `target`, `art`, `fit`, and
`attachment`. Category is `hat`, `shoes`, or `mark`. Art is one of:

- `{ "kind": "none" }`: zero target, `fit: null`, `attachment: {}`.
- `{ "kind": "png", "asset": "assets/cosmetics/item.png" }`: a local asset.
- `{ "kind": "grid", "rows": [...], "size": 12 }`: exact palette pixels,
  optionally `ears` for hats only. Each ear is `[dx, dy, size]`; offsets are in
  the historical hat grid's size-12 coordinate system, scaled by art.size/12.
  Nonempty `ears` require palette key `X` for their underlay color.

`fit` contains exactly finite numeric `x`, `y`, and uniform `scale`:

| Category | x | y | scale | Anchor |
| --- | --- | --- | --- | --- |
| hat | 350–1250 | -150–700 | .01–4 | top-left in Luna source space |
| shoes | -150–150 | -150–150 | .01–4 | offset from each paw's bottom-center |
| mark | 400–850 | 550–900 | .01–3 | center in Luna source space |

Grid `size` and ear size are .01–256; ear offsets are -4096–4096. No raster
conversion was performed. The unused historical bowler fallback remains in
`src/cosmetic-art.js`; the catalog's bowler uses the exact approved live PNG.

Nonempty attachment objects contain only the relevant category parameter:

| Category | Parameter | Meaning |
| --- | --- | --- |
| hat | `earMaskY`: null or 0–4096 | null retains base ears; a number clips the base torso image above that source y, then draws hat/tailored ears |
| shoes | `pawClip`: 0–4096 | depth removed above each paw's bottom before shoe drawing; current heels use 24, others 0 |
| mark | `counterStretch`: true | retain emblem proportions through torso stretch, using the existing flank mask |

These fields describe current rendering behavior. Task 4 consumes them without changing the rig or current pixels. New PNG entries can use these same behaviors
without new ID branches. Concept reference metadata is deferred to Task 5 and
must be introduced with explicit schema compatibility handling, rather than
silently accepting unknown fields now.

`validateFit(category, fit)` returns a frozen independent fit.
`validateAssetPath(path)` accepts project-relative PNGs under `assets/`, with
portable ASCII components; rejects traversal, absolute paths, external/data URLs,
query/fragment strings, percent encoding, backslashes, empty components, and
trailing spaces/dots. The runtime resolves paths relative to the module project root. The application CLI must resolve paths within the project
and reject escaping symlinks; lexical validation alone cannot check filesystem
containment. Review adapters may separately permit `concepts/` and embedded PNGs;
the active catalog must never contain candidate paths/data URLs.

`validatePngMetadata({byteLength, width, height})` checks positive integer sizes:
up to 4,000,000 bytes and 4096×4096. It does not verify PNG signatures, CRCs or
decoded pixels. Those checks belong to loading/application tasks and must use
metadata from actual bytes, not trusted caller claims.
`validateReviewByteLength(length)` checks positive integer input up to 56,000,000
UTF-8 bytes before parsing JSON. This supports nine maximum-size embedded PNGs
(approximately 48 million base64 bytes) plus bounded JSON overhead. Catalog and
future review consumers must enforce their input bounds at ingress; exporting a
larger future wardrobe will require an explicit compatible limit decision.

## Baseline fixtures and verification

`tests/fixtures/luna-v1/` records legacy saves, frozen historical reward metadata,
legacy bowler and v2 reviews, seven serialized poses, and three seeded gameplay
scenarios. Test reviews are fixtures, not new owner approvals. The copied legacy
bowler review preserves the original bytes. Gameplay uses an explicitly recorded
LCG seed, 1/120-second ticks and defined jump inputs. Pose checks compare serialized
values: JSON cannot distinguish -0 from 0.

`rendered/` contains 14 sheets: stand, walk, takeoff, apex, reach, landing and blink
at native and enlarged size. The 3×3 sheet order is bowler/witch/crown,
heels/runners/sandals, original/star/skull. Each image uses the actual unchanged
`drawImageLuna` renderer. Native cells are 150×110 with x=73, y=96; enlarged
cells are 640×480 at scale 5 with x=63, y=88, matching studio character placement.
No UI/ground line is captured. The camera holds the character in view through
jumping; fixtures also record game height for later full-scene comparisons.

`manifest.json` records Chrome version, device scale, input hashes, outfit order,
pose hash and output hashes. These are engineering baselines, not wearable art
or evidence of approval for new appearance changes. Task 4 compares against them;
a visual difference must not be hidden by recapturing expectations.

With Playwright available to Node and Google Chrome installed:

```sh
node scripts/capture-luna-baseline.mjs --check tests/fixtures/luna-v1/rendered
```

The command starts a temporary loopback-only server and isolated headless Chrome,
checks the recorded browser version, and compares rendered PNG bytes. It does
not open the player's browser profile or write game saves. `--capture OUTPUT_DIR`
is for deliberately recording a separate baseline; use a new output directory
when investigating differences. The browser version must match the manifest;
on another version, collect a separate comparison and document the environment
rather than overwrite the committed baseline. Playwright is a dev-tool dependency,
not a game runtime dependency and not installed by this task. In the Codex bundled
runtime, set `NODE_PATH` to its provided node_modules directory.

Run `node --test tests/*.test.js` for schema, legacy fixture, physics, animation,
review and offline tests. Browser captures are an additional check, not part of
the dependency-free Node CI suite. Android checks remain a later release task.
