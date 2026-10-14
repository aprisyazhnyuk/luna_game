# Task 5 verification record

Date: 2026-10-14. Base: `2bfd297`, main after merged PR 6.
Branch: `codex/v1-studio-review`. No merge or release authorized.

Baseline: 119 Node tests passed; no pre-existing suite failures. The shared review
module was absent before the new contract tests. Its completed suite has 124
passing tests on Node v24.19.0, zero failures/skips/cancellations. Historical review
fixtures and active catalog/art/approved review files are unchanged.

The exact pre-task studio was served through isolated browser routes to verify
regressions: a missing concept board prevented startup, and a delayed import
changed a newer x=825 edit back to the imported x=900. Both checks pass with the
new studio. An initial test attempt encountered a missing export during an
intermediate module migration; this was not recorded as a baseline game failure.

Chrome 155.0.8059.40 verification:

- Studio starts without optional concept art. A catalog without bowler works;
  three additional catalog-only PNG entries need no crop metadata. Old v2 reviews
  retain those entries at their applied defaults.
- At `/` and `/luna_game/`, all nine PNGs upload and receive independent fit edits.
  All original PNG SHA-256 hashes survive JSON export/import, regardless of editor
  selection. Reset-one keeps other drafts; reset-all restores all applied art.
- Saved jump pose, playback speed and height reconstruct the complete 640×480
  preview exactly with the actual rig/renderer. Re-import reproduces its pixels.
  Malformed input preserves the draft. Older imports/uploads cannot overwrite
  later edits, and a newer successful import wins over a delayed earlier request.
- Active assets/catalog/review evidence hashes and player localStorage stay equal
  before/after all studio scenarios. Tests use isolated profiles and synthetic
  candidates; none are applied to the repository or owner's browser.
- Existing default-backend catalog checks pass: startup/Store/studio root/subpath,
  all categories, catalog-only PNG rendering and fixed-pose game/studio agreement,
  failure without partial snapshots, and save isolation.
- All 16 pre-refactor attachment sheets match on the default backend. Owner bowler
  character pixels match at the saved original camera, excluding documented
  historical ground decoration. This is not a new appearance approval.

An initial moving-PNG comparison used an animated GPU canvas against a newly
created comparison canvas and differed within rotated/scaled accessories. Using
one software Canvas backend for both eliminated the differences without changing
renderer or artwork. The saved-pose check explicitly records that backend rather
than promising cross-backend pixel equality. PNG byte hashes are a separate test.
Worker v19 invalidates the changed shared runtime validator/loader; no new runtime
resource is needed, and studio/concept resources remain outside offline inventory.
Full application transactions/PNG CRC validation remain Task 6; inventory and
installed-worker scenarios remain Task 7; owner corrections and real Android
verification remain Tasks 8–9. No gameplay, target, progress or approved art change.
