# Luna first-release specification

Status: approved by the owner on 2026-10-14. Audit date: 2026-10-14.
Implementation is described in [the item plan](plans/v1-items.md). This document
sets release requirements, not a claim that all requirements are verified today.

## Scope and player experience

Ship the existing portrait, one-tap endless runner starring Luna. Retain the
JavaScript ES modules, Canvas renderer, static hosting, and build-free runtime.
No concrete reason to replace this stack was found in the audit.

Preserve the present controls: tap the play area to start/jump/resume/restart;
Space or Up jumps; P or Escape pauses/resumes. Opening help or Store pauses a run;
closing them does not resume it. Switching away pauses. Keep one jump, the landing
input buffer, three chances, recovery after a collision, yarn/box obstacles,
treat collection, current spawn behavior and fixed-step simulation. Cosmetic
changes must not affect collision bounds, speed, jump height, randomness, or scores.

The current simulation baseline is `src/engine.js`: width 390, ground 300,
cat x 94, speed 132, gravity 1050, jump speed 480, three chances; the app advances
at 1/120 second. Record deterministic scenarios before refactoring. Any proposed
change to these mechanics requires separate explicit agreement.

## Wardrobe

The release includes nine owner-reviewed items, selected independently across
three categories. No hat and bare paws are additional empty options.

| Category | Stable ID | Item | Treats in one run |
| --- | --- | --- | ---: |
| Hat | bowler | Bowler | 30 |
| Hat | witch | Witch hat | 75 |
| Hat | crown | Crown | 90 |
| Shoes | heels | High heels | 105 |
| Shoes | runners | Runners | 60 |
| Shoes | sandals | Sandals | 120 |
| Mark | original | Mickey | 0 |
| Mark | star | Star | 45 |
| Mark | skull | Skull and bones | 135 |

Retain these thresholds for this work. Unlocks use the maximum treats collected
in a single run, not cumulative treats or best distance. All 48 current outfits
must survive save/reload. Original look chooses `none`, `bare`, and `original`
without clearing progress. Store choices apply to the next run (and ready-screen
preview); they must not change the outfit of an already running or paused run.

“Corrected” means inspected and approved in the studio at actual and enlarged
size, including walking, takeoff, flight, landing, and blinking. It does not mean
that every present item is already visually approved. Retain approved pixels,
including the live bowler and its fit x=817, y=373, scale=1.91. Do not infer a new
approval from a concept board, extraction file, JSON status label, or screenshot.

## Editing and application

The owner can replace any item's transparent PNG and adjust x, y, and uniform
scale through `tools/wardrobe-preview/` without editing JavaScript. The game,
Store, and studio use one catalog, fit format, asset loader, and renderer. Adding
a PNG item to an existing category requires an asset and a catalog entry, with
no new item-ID condition in loader, rig, studio, Store, or cache code. Categories
and attachment behaviors may have generic code; a new category is outside scope.

Hat coordinates are top-left in Luna source space, shoes are offsets from each
paw's bottom-center, and marks use their center. Hats and tailored ears move
together; shoes follow all four paws; marks keep proportions through torso squash.
The studio exposes playback speed, stepping, fixed poses, blink, imports, resets,
and both preview sizes. Drafts and imports must not write live assets, localStorage,
or equipped items. Saving freezes a matching JSON/PNG pair. A preview PNG is a
whole-character reference, never an accessory sprite.

After the owner saves and explicitly instructs application, a documented command
validates the entire review and all images before touching active files, applies
all changed fits and exact image bytes, and reports item/path/fit/hash changes.
Invalid input produces a nonzero exit with no partial active writes. Repeating
application is idempotent. Preserve the saved pair and application evidence;
never redraw, resample, recolor, or recompress an embedded replacement PNG.
An approved review's selected outfit is for visual comparison, not a request to
change any player's equipped outfit.

## Progress and compatibility

Keep best distance (`luna.best.v1`), best single-run treats, equipped IDs, and all
previously earned rewards. Migrate old `boots` selections to `runners`. Threshold
changes later must not revoke existing unlocks: migrate legacy earned IDs using
the historical thresholds before consulting a new catalog. Corrupt data should
recover safely while retaining independently valid fields. Storage failures
must be visible and allow session play. Cache updates and review imports must
never clear progress. Browser storage eviction/clearing remains outside this
local-save guarantee; cloud saves are outside scope.

## Android and offline release criteria

Target Android Chrome, portrait play, home-screen installation, and offline
launch/play after required resources download. Serve over HTTPS outside localhost;
support both `/` and repository subpaths. All runtime modules, catalog/config,
images, icons, and required shell resources must be cached together. The offline
ready message must correspond to successful required-cache installation, not
merely a fetched catalog. Failed downloads must not announce new offline readiness.
Updates must not mix wardrobe generations during a run; preserve the old working
cache until the new worker activates after old windows close. Scope cleanup to
this game. Localhost continues bypassing game caches without touching saves.

Before release, run on a real Android device: controls, small-screen Store,
background pause, reload persistence, installation, airplane-mode cold relaunch,
all nine item assets, and update from the previous cached version with saved
progress. Record phone, OS, Chrome version, URL, date, and results. Desktop tests
and emulation cannot be labeled Android verification. No real-device verification
was performed during this audit.

## Deferred work and unresolved decision

Next iteration: levels linked to high score, more challenging obstacles, and
changing backgrounds. Additional items follow later. Do not implement these now.
Open question: does persistent high score unlock levels between runs, or does the
current run's score trigger stage transitions during a run? Existing roadmap
ideas about short levels, endings, double jump, checkpoints, and retries remain
uncommitted future options, not first-release requirements.

## Release acceptance

The owner can edit, review, save, and apply any of the nine items without rewriting
code; game and studio agree at the saved pose and throughout existing animation.
Tests cover schema/asset validation, save migration, generic item addition,
application failure isolation, and root/subpath offline coverage. Existing
mechanics and artwork are preserved unless separately approved. Owner review
and real-device evidence complete the release gate; merging and publishing each
require the owner's instruction.
