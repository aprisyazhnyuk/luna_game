# Task 1 verification record

Date: 2026-10-14. Base: approved documentation commit `dbf26dd`.
Branch: `codex/v1-item-catalog`, based on `codex/v1-development-plan`.

The catalog and model are inert until Task 3. A Git diff against the base confirms
no changes to existing runtime consumers, bowler PNG/fit, Luna PNG, concepts/review
pairs, player saves, cache worker or gameplay. No cache-version bump is required
for new files that are not loaded by the game. Catalog data was copied from the
existing metadata/art exports and applied bowler JSON, without rasterizing or
regenerating approved images.

Verification:

- Baseline before work: all 30 existing tests passed on bundled Node v24.19.0.
- TDD: validator availability and valid-data tests failed before implementation;
  valid catalog/schema suite then passed. Non-string category regression failed
  before adding explicit type validation, then passed.
- Final suite: 84 tests passed, zero failures, skips or cancellations. Commands
  use `node --test tests/*.test.js`; CI separately uses Node 22.
- Chrome 155.0.8059.40, headless isolated profile, device scale 1: captured and
  independently re-rendered 14 sheets with nine item presentations each. Every
  PNG matched exactly. Capture version/source/pose/image hashes are in the
  fixture manifest. Enlarged walking and native standing sheets inspected.
- Baseline-check failure scenario: stale image hash in a temporary manifest was
  incorrectly accepted before the fix; now exits nonzero with a hash mismatch.
  The real committed manifest continues to pass. Capture configuration (outfit
  order/device scale) is checked, while source hashes remain historical provenance
  to allow subsequent rendering-preserving refactors.
- All nonempty fits, grid rows/sizes/ears and category attachment policies compared
  against current sources. Synthetic new PNG IDs validate in all three categories.
- Diff whitespace check passed. No package installation, live review application,
  real-device Android verification, merge or release publication performed.

A fresh-context read-only review found no Critical/Important issues and verified
catalog parity, fixture hashes, test results and change scope. Its three minor
findings (category coercion, manifest hash checking, full fit/attachment assertions)
were addressed and verified before final handoff.

Execution rulings: use a dedicated branch in the clean shared checkout, as the
owner requested, rather than seek an additional worktree preference; use an
external scratch ledger to avoid unrelated ignore/config edits. PNG-byte decoding,
review adapters, consumer integration and offline inventory remain later tasks,
not incomplete Task 1 implementations. The original preparation audit's statement
that Superpowers was absent is historical; it became available before this task.
