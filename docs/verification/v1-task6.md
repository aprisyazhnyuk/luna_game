# Task 6 verification record

Date: 2026-10-17 (Europe/Moscow). Base `973876d`, main after merged PR 7.
Branch: `codex/v1-review-application`. No merge, release or real candidate apply.

Baseline: 126 Node tests passed on Node v24.19.0. No pre-existing failures.
Implementation suite: 155 tests pass, zero failures/skips/cancellations.
CI continues to run the complete Node glob on Node 22, including the new command,
PNG and interrupted-process tests. No dependency installation is required.

## Input and application tests

Tests run against temporary directories, with whole-tree hashes before/after.
The new PNG/application/CLI suites first failed because the implementation did
not exist. Subsequent targeted regressions failed before fixes for partial temp
writes, staging/committed cleanup recovery, foreign temporary file conflicts,
live-writer recovery, escaped duplicate JSON keys, high-bit PNG chunk names and
transparency order/sample bounds. All now pass.

Covered boundaries:

- Actual approved bowler PNG and a valid near-limit PNG; all CRCs/chunk order,
  truncated/trailing/critical/animated data, bounded inflate failures, exact
  scanline counts, all five filters, low/16-bit samples, indexed bounds and all
  seven Adam7 passes. Ancillary metadata bytes are preserved.
- Dry-run whole-tree equality; multiple category PNGs plus an unselected grid fit;
  exact source/destination image hashes; catalog attachment/target/default
  preservation; original images/provenance/source reviews retained; pair/report
  archival and manual cache paths/version; second apply changes no bytes.
- Unsupported/partial/late invalid reviews, malformed PNG, conflicting IDs,
  traversal, missing preview and screenshot-as-item rejection leave active bytes
  unchanged. Source/active symlinks are refused.
- Changed review/catalog between planning and publication aborts before writes.
  Injected publication failure restores every old file and removes staged evidence.
  Partial temporary writes can roll back without losing unrelated edits.
- A child process exits during publication after catalog rename; explicit recovery
  restores original bytes. A subsequent conflicting edit makes recovery refuse
  every write. Staging-only and interrupted committed-cleanup journals recover;
  foreign temporary bytes survive refusal. A live writer cannot be recovered.
- CLI defaults to dry-run; explicit apply/repeat works; invalid, missing, duplicate
  and unknown options return nonzero status without writes. Help is read-only.

A fault-injection test initially compared `/var/...` against its canonical
`/private/var/...` path, so its injection did not trigger. Canonicalizing test
sandbox paths fixed that harness issue; it was not a pre-existing game failure.

## Real browser boundary

Chrome 155.0.8059.80, isolated contexts, software Canvas backend fixed for both
sides of each comparison. `scripts/check-review-application.mjs` passed at `/`
and `/luna_game/` in disposable complete game copies:

1. Load a synthetic multi-category draft in the actual studio and save its PNG.
2. Apply the exact pair using the application module, preserving all image bytes.
3. Reload a fresh asset/module generation and compare normal applied rendering
   with reviewed overrides: seven fixed movement poses, native/enlarged sizes
   (14 captures per path), exact equality.
4. Re-import the pair and reproduce its saved 640×480 PNG pixels exactly.
5. Game reload preserves high score, earned IDs and outfit localStorage; studio
   imports/application do not modify it. Repeated planning has an empty file list.

Protected artwork, catalog, worker and approved bowler review hashes in the real
repository remain unchanged. No synthetic image was applied outside temporary
copies. Browser verification is desktop evidence, not Android or installed-worker
proof. Chrome has updated since earlier version-pinned fixture captures; these
comparisons fix the same current browser on both sides rather than rewrite them.

A read-only dry-run of the actual saved approved bowler pair reports zero changed
items and only a prospective evidence archive. That archive was not written.
The original approved PNG/JSON pair and compatibility fit remain intact.

Generated inventory/installed-worker scenarios remain Task 7. Owner corrections
and real Android checks remain Tasks 8–9. The command never treats JSON status or
successful validation as owner approval. See [application/recovery contract](../review-application.md).

## Independent review

A read-only whole-branch reviewer independently passed the 153-test suite and
inspected the browser evidence without rerunning Chrome. It found one important
evidence-safety issue: generic planning could overwrite a conflicting archived
JSON or PNG. Both regression cases failed before the fix. Evidence targets now
reject any differing existing bytes during planning, preserving the whole tree.
The final 155-test suite passes; no other findings were reported. Real interrupted
rollback resumption is also covered by a child exiting after writing a rollback
temporary file, followed by successful recovery to the original whole-tree hashes.
