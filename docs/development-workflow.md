# Luna development and verification workflow

Status: approved by the owner on 2026-10-14. The permanent visual workflow in
[AGENTS.md](../AGENTS.md) remains authoritative. Follow [the release specification](game-spec.md)
and implement one task from [the sequential plan](plans/v1-items.md) at a time.
All communication and project documentation use English.

## Start a task

For preparation, stop after presenting the plan. After a task is approved,
complete its authorized scope autonomously; ask only for an essential missing
input or significant decision. Plan approval authorizes engineering work, not
unreviewed appearance changes or a release. Do not merge or publish without the
owner's instruction.

Check `git status`, branch/base commit, AGENTS, relevant documentation, source,
tests and CI before editing. Preserve unrelated changes. Create a `codex/` branch
from the appropriate approved base, one branch and PR per complete task. If a
dependency is not merged, identify its base explicitly; do not silently bundle
several planned tasks. A complete task includes appropriate tests, docs, evidence
and cache updates, even when these span several files. Never combine major
refactoring with gameplay changes. Keep the current JavaScript/Canvas stack.

Run `node --test tests/*.test.js` (or `npm test`) before and after changes. CI uses
Node 22; prefer Node 22 for matching CI and record any other version used. No
package installation is needed for the current suite. Record baseline failures
separately, including command/runtime and whether caused by environment setup.
Do not label an unavailable command a failed game test.

## Implement and inspect boundaries

Read the task's goal, dependencies, files, acceptance criteria and verification
steps before coding. Keep runtime catalog/config validation pure and shared.
Exercise the actual game renderer in studio checks. Test saves using fixtures or
an isolated browser profile; never reset the owner's progress to unlock previews.
The studio exposes all items independently of game unlocks.

For any catalog/refactor task, compare the old and new outputs for standing,
walking, takeoff, apex, reaching/landing and blink poses at fixed values. Fix
browser version, canvas size, device scale and nearest-neighbor settings for
pixel comparisons. Store pose JSON and input asset hashes with comparison results.
Use the saved review pose for approved-image agreement, matching its camera,
scale and canvas geometry. Tests of draw calls alone cannot prove visual parity.
If a refactor produces visible differences, repair it or prepare the difference
as a studio candidate for owner review before application.

Gameplay regression scenarios use a seeded/injected RNG, fixed 1/120-second
steps, defined obstacles and timed inputs. Include jump/no double jump, buffered
landing, collisions and recovery, treat pickup, pause, restart and run outfit
snapshot. Compare physics and RNG behavior independently from cosmetic drawing.

Verify each relevant boundary:

| Boundary | Required evidence when affected |
| --- | --- |
| Studio → draft | PNG/JSON import, resets and switching items retain other edits; game files and localStorage unchanged |
| Draft → review | All item fits/images exported, pose frozen, JSON/PNG match, legacy reviews accepted |
| Review → active assets | All validation completes before writes; exact image hashes; all changed fits applied; invalid review changes nothing |
| Assets → game/Store/studio | One ready snapshot, same fits/attachments/renderer, fixed-pose parity, new catalog-only item works |
| Catalog → saves | Historical unlock migration, unchanged equipped IDs/high score, independent categories, no relocking on target increase |
| Assets → offline cache | Catalog dependency closure, missing-download failure, coherent update, scope isolation, root/subpath cold offline launch |

Choose tests that detect boundary failures rather than repeat implementation
logic. Extend CI for the shared contracts and command as they become available.
Browser/device checks supplement Node tests; record what actually ran.

## Owner visual review and application

1. Prepare candidates only in the permanent interactive studio. Keep candidate
   assets, fits and animation variants separate from active game assets.
2. Let the owner inspect enlarged and actual-size Luna walking, jumping, landing
   and blinking, with relevant position/scale/playback controls.
3. The owner adjusts and downloads the JSON/PNG pair, places it in the review
   folder or supplies its location, and instructs application. Downloads do not
   write repository files. That instruction is approval; do not ask again.
4. Locate/read both files and preserve them. Use every changed fit and exact
   embedded/project PNG bytes. A preview screenshot cannot be extracted as a
   wearable sprite or approximated with grid art. Existing bowler and generic
   wardrobe review paths remain supported.
5. Once implemented, run the documented application command in dry-run mode,
   inspect its validated change report, then apply it on the task branch. Dry-run
   is verification, not another owner approval gate. Retain the report/hashes with
   the saved review pair. Reproduce the saved pose and inspect all animation states.
6. Verify the live game/Store, saves and offline updates. Never write the review
   outfit to player localStorage. A malformed review must leave active assets intact.

Until the command exists, the studio is still available for review, but this
preparation task does not apply any candidate. The missing generic saved review
pair is an essential input for correcting the remaining items, not a reason to
block the preceding engineering tasks.

## Pull requests and completion

Create one PR per finished implementation task. State the concrete problem,
resulting behavior, task ID, validation performed, review evidence when applicable,
and material limitations. Include before/after images at fixed poses for changes
to rendering. Identify dependencies and unrun device checks. Use a draft PR if
required owner review is pending; do not report a task complete when its acceptance
criteria still need evidence. Attach created PRs to the Codex chat.

Before handing off, review the diff, run appropriate checks, verify only authorized
files changed, and update docs for the final implementation. Report observed
results and pre-existing failures separately. No merge, main update, or release
publication without instruction. This documentation branch is preparation only;
future commands/interfaces mentioned here are proposed until implemented.

## Release verification

On desktop Chrome, test gameplay/input, all categories and outfit combinations,
short/landscape layouts, app switching, storage-error behavior, review import/export,
and cold offline starts at root and a repository path. Hosted-worker tests need
HTTPS or a secure localhost origin configured to exercise the production path:
normal localhost intentionally bypasses workers. Do not disable that bypass in
shipped code merely to test offline installation.

On a real Android device, record model, OS, Chrome version, date, served commit,
URL/scope and outcomes. Test installation, online readiness, airplane-mode cold
relaunch, every item, reload persistence, background pause, and update from the
previous installed cache with an existing save. Also test an interrupted asset
download and recovery online. Preserve unrelated apps' caches. Label unavailable
device checks pending; emulation is not real-device verification.

The release checklist requires completed engineering checks, approved visual
evidence for nine items, preserved save fixtures and real-device results. The
owner then decides when to merge and publish.
