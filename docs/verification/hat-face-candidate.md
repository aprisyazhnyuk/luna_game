# Hat-dependent face correction: studio candidate

Date: 2026-10-23. Base: `a42e9a6fd235217677cfe211cea12eb47b924bc5`.
Branch: `codex/hat-face-preview`. Status: candidate 1 rejected by the owner; candidate 2 awaiting visual review. Not applied,
not deployed, not Android-verified. Task 9 evidence remains separately in PR #11.

## Correction after owner feedback (2026-10-25)

The owner reported that Current game and candidate 1 both show the unwanted
circular eyes. They explicitly selected **phone screenshot 2, run score 21** as
the desired visual reference. Candidate 1 is not an accepted eye correction.

The earlier face-region test included the nose/outline. Native mask differences
were found there; that did not establish the cause of the reported eye change.
A new test isolates the actual eye (7×7 pixels at x=128, y=262 in the neutral
390×380 game draw). Repeated canvas readback is a controlled desktop trigger:
the original candidate changes the eye when returning to no hat. This does not
prove that readback or the same backend transition occurs on the Huawei.
The enlarged studio artwork is rendered again at 5× source scale; it is not an
enlargement of the game's already sampled pixels. It was therefore an inadequate
comparison for this report.

Candidate 2 (`stable-face-layer-v2`) preserves a dedicated, unread body sampling
canvas for the eye with and without a hat. It copies the original face pixels
through a pixel-aligned window; the existing blink is drawn afterward. The window
uses the game's existing off-white background to avoid double alpha blending.
All artwork bytes and placements remain unchanged. The old ear-mask candidate is
retained for historical review imports, labeled as unresolved.

**Face pixels ×8** copies the native preview directly, without redrawing the
character. Candidate 2's saved PNG is 1280×520: enlarged artwork on the left,
actual game pixels magnified 5× on the right, both at the saved pose. The existing
JSON variant identifies that presentation; legacy pairs retain their prior format.
Candidate 2 is still rejected by the application command before any active writes.

Fresh checks pass in default and explicitly software Canvas modes: 42 mask-region
comparisons, initial Original-look equality, original-ear hiding, seven cycles
through hat/no-hat with unchanged actual eye pixels during readback, exact native
magnification, and JSON/PNG import restoring both saved views. The old implementation
failed the added eye-cycle check before revision. Full Node suite: 174 tests pass.
The normal studio integration checks also pass. Cached studio modules were observed
in the in-app browser and the revised entry/module/style URLs are versioned to
ensure this comparison loads the new code.

This stabilizes the sampled eye within each tested backend; different initial
backends can still sample the source differently. The target face still needs
owner review in the native-pixel view and a real-phone recheck. Do not claim the
phone defect is fixed or treat candidate 1's passing mask tests as eye verification.

## Earlier candidate 1 reproduction and scope (superseded for eye diagnosis)

The owner reports HI 641 and adjusted witch art after the fixed-origin update and
closed-app offline relaunch, but selecting a hat changes the face. Desktop Chrome
156.0.8078.47 reproduces a face-region difference with all three hats. A mask-only
draw reproduces it without hat art; removing the extra ear clip restores the base
face. The source PNG is identical across the old and updated game generations.

The candidate keeps the original body clip/sampling, then removes the original
ears from a separate reusable canvas. It uses the same animation rig and all
existing artwork/fit data. A body callback exposes this only to the studio; game
and Store default paths retain current behavior. Review JSON explicitly identifies
the candidate; historical pairs restore current rendering. The application command
rejects rendering candidates until reviewed activation support exists.

No owner PNG, catalog fit, approved evidence, controls or player saves were changed.
The generated offline identity reflects the generic renderer hook; the candidate
module is not shipped in the inventory. It has not been hosted on the phone site.

## Verification

Environment: Node v24.22.1, desktop Chrome 156.0.8078.47.

- Baseline: 172 Node tests passed; original 28-resource offline inventory passed.
- New review-contract and application-isolation tests failed before implementation,
  then passed. Full suite: 174 tests passed.
- `scripts/check-hat-face.mjs --baseline` intentionally fails on current rendering,
  including native-size face pixels and enlarged landing. The candidate passes
  42 combinations (three hats, seven fixed poses, native and 5× size), in default
  and software Canvas modes. It preserves Original look and removes original ears.
- Candidate JSON/PNG save/import restores exact saved-pose pixels. Older JSON
  restores Current game. Studio operations preserve localStorage.
- `scripts/check-studio-review.mjs` passes all nine PNG/fit round trips, saved pose,
  failed/concurrent imports, resets, later items and root/subpath save isolation.
- The existing catalog integration check had a baseline failure: a hard-coded
  expectation of four decoded PNG items now encounters five after the approved
  witch became PNG art. The same failure reproduced in the unchanged Task 9
  checkout. The assertion now derives the expected count from the test catalog; the full catalog
  integration check then passed.

The pixel regression uses the actual opaque game/studio background. A wider
transparent diagnostic had one-level RGB rounding at one or two semitransparent
nose-edge pixels at 5× scale after layer compositing. On the actual background the
face comparison is exact. These are desktop results, not Huawei graphics evidence.

The final offline inventory check covers 28 resources and excludes the studio
candidate. Read-only code review found no blocking issues and independently
passed contract/application and candidate browser checks.

## Remaining work

Owner inspection in the permanent studio and a saved JSON/PNG pair are required
by AGENTS.md before activating a visual change. After instruction to apply, retain
that exact pair, complete validated activation, verify game/Store saved-pose and
movement agreement, saves, generated offline coverage and idempotence, and repeat
the hat-selection check on the Huawei P30. Keep the fix in its own PR; do not
merge or publish a release without the owner's instruction.
