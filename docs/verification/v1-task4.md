# Task 4 verification record

Date: 2026-10-14. Base: `a1e0338`, main after merged PR 5.
Branch: `codex/v1-attachment-rendering`. No merge or release authorized.

Baseline: 111 Node tests passed before work; no pre-existing suite failures.
Before modifying drawing code, captured 16 additional sheets of the old renderer
with all 48 neutral outfits and three representative combinations in seven poses
(standing, walking, takeoff, apex, reaching, landing, blink), each at native and
5× scale. Original Task 1 sheets and all approved art/review files stay unchanged.

Verification:

- New-shoe and arbitrary-ID attachment tests failed against the old renderer;
  custom-palette stamping and invalid PNG-as-grid review tests also failed before
  their changes. Final full Node suite: 119 pass, zero failures/skips/cancellations
  on bundled Node v24.19.0. Source rig/RNG/physics and save scenarios remain intact.
- Chrome 155.0.8059.40: all 14 original sheets and all 16 additional sheets match
  exactly after refactoring, using the same browser/version/camera/pose inputs.
  Additional sheets were captured from the pre-refactor source and not rewritten.
- The saved owner bowler reference is checked separately using its actual JSON
  and referenced original PNG. At the original 640×400 camera, all character pixels
  above row 365 match exactly. An initial whole-frame check reported 2802 differing
  pixels; inspection localized every difference to the decorative ground rows
  365–369, with zero head/flank/paw differences. The reference check excludes that
  historical stage decoration explicitly; it does not claim whole-frame equality.
- Isolated Chrome root/subpath Store/studio tests pass for all current items,
  import/reset/export, exact applied fits and save isolation. Synthetic catalog-only
  PNG items visibly render in every game category and agree with the studio at a
  neutral fixed pose. No synthetic item or replacement image is copied into active
  assets or the owner's browser profile.
- Worker v18 ships renderer/pixel helper updates. Current offline dependency,
  scope isolation, gameplay, animation, save migrations/48 outfits, loader failures
  and legacy review checks pass. No new runtime resource is needed for this task.
- Drawing/rig code has no item-ID condition. Grid data is read from the ready
  catalog snapshot. Historical art JS has no runtime/studio import; file content
  remains unchanged for independent parity assertions.

Grid reviews for a PNG-only applied source are rejected before draft state is
assigned rather than approximated with retired artwork. Existing actually exported
legacy bowler/v2 files still pass. Broader studio/review compatibility remains
Task 5; exact-byte application is Task 6. Real Android and installed-worker upgrade
verification remain later release tasks. User item adjustments remain deferred.

Independent read-only review found one minor contract gap: tailored-ear underlays
used palette `X` without requiring it. A regression renamed that key throughout
the catalog and failed before the fix. Validation now requires `X` only for
nonempty tailored-ear data, permitting other palettes otherwise. The reviewer
confirmed the fix and independently passed all 39 catalog-model tests; no findings
remain. The reviewer also independently passed the earlier 118-test suite and
inspected browser scripts/evidence, without rerunning Chrome comparisons.
