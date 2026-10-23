# Hat-dependent face correction: studio candidate

Date: 2026-10-23. Base: `a42e9a6fd235217677cfe211cea12eb47b924bc5`.
Branch: `codex/hat-face-preview`. Status: awaiting owner visual review; not applied,
not deployed, not Android-verified. Task 9 evidence remains separately in PR #11.

## Reproduction and scope

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
