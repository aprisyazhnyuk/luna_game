# Apply an approved wardrobe review

Requires Node 22 or later, using built-in Node modules only. No package install or
runtime game build is required. Engineering examples/tests use temporary copies;
apply a real candidate only after the owner instructs application of its saved pair.
The JSON status label, a download, or a successful dry-run is not visual approval.

## Inspect, then apply

From the repository root:

```sh
node scripts/apply-wardrobe-review.mjs \
  --review concepts/luna/wardrobe-review/luna-wardrobe-fit.json \
  --preview concepts/luna/wardrobe-review/luna-wardrobe-preview.png \
  --dry-run
```

After owner approval, run the same command with `--apply` instead of `--dry-run`.
Omitting both switches defaults to dry-run. `--root DIR` selects a checkout for
application/testing; the default is the repository containing the script. Review
and preview arguments resolve from the current working directory and may point to
explicit files outside the checkout. Use `--help` for the complete interface.
The equivalent npm alias is `npm run review:apply -- ...` when npm is available.

Stop servers/build jobs and other checkout writers before applying. The journal
serializes this command, and hashes detect intervening edits; this is a repository
file transaction, not a deployment mechanism or an atomic switch for a running
HTTP server. Review the Git diff and commit the complete result together. Do not
merge or publish a release without the owner's instruction.

Both modes print a JSON report. It names each item, before/after art paths,
placements and PNG SHA-256 hashes, whether that item changed, and each planned
file's before/after hash. A null hash means the file did not previously exist.
All supplied fits apply, regardless of the selected editor or review outfit.
The outfit is visual evidence; the command does not read/write player saves.

## Validation and exact images

The command reads the validated applied catalog and delegates review semantics
to `src/wardrobe-review.js`. Version 2, legacy bowler files, later-item defaults,
fit bounds, pose/playback rules and unknown-field policy match the studio.
UTF-8 errors, duplicate JSON keys (including escaped spellings), excessive nesting,
malformed base64, unsafe project paths and symlinks fail before any active write.
Input sizes remain bounded: review 56,000,000 bytes, PNG 4,000,000 bytes and
4096 pixels per dimension. Catalog reads are limited to 1,000,000 bytes.

Every required cosmetic and preview PNG is checked for signature/header values,
chunk bounds/order, every chunk's CRC, critical chunk support, palette/transparency
structure, complete IEND and absence of trailing bytes. Bounded zlib inflation
must produce the exact scanline length with no extra compressed stream data.
All five PNG filters and noninterlaced/Adam7 passes are decoded; indexed pixels
must reference the palette. Valid grayscale/RGB/indexed/alpha color types and
PNG bit depths are supported. Ancillary metadata is preserved verbatim; the
validator does not apply color-profile transformations. Animated PNGs are rejected:
this workflow applies static wearables and preserves the existing animation rig.

Replacement PNG bytes are copied exactly, without rendering, resampling, changing
metadata, or recompression. A replacement equal to the full-character preview is
rejected; a screenshot is never extracted into a sprite. The tool validates and
hashes the pair, but does not establish visual approval or compare its composition
automatically. Owner inspection and the saved-pose browser check establish that
boundary. The saved pair must describe the candidate the owner actually reviewed.

If replacement bytes equal the item's current applied PNG, retain its current
path and bytes. Otherwise copy to
`assets/cosmetics/<item-id>-<full-sha256>.png`. A conflicting existing destination
is rejected. Old PNGs, provenance JSON and prior review files are not deleted
or overwritten. Replacing grid art changes its active catalog discriminator;
its previous exact rows/fit remain in the archived before-art report and existing
historical art sources. The new catalog references exact copies and updated
x/y/scale values, retaining IDs, rewards, defaults and attachment rules.

The manual worker list gains every referenced PNG without removing old resources.
A deterministic `review-<digest>` cache identity changes with catalog/asset updates.
Catalog, new images and worker changes publish in the same transaction. Source
modules and normal localhost worker bypass stay unchanged. Generated inventory
and actual installed-worker upgrade checks remain Task 7.

## Evidence and idempotence

The command preserves the original input files. An exact JSON/PNG copy plus the
first application report is archived under
`concepts/luna/applied-reviews/<pair-digest>/review.json`, `preview.png` and
`report.json`. The pair digest derives from both input SHA-256 values. Existing
archive bytes must match; an existing report must identify the same pair.
The archived report lists application changes; its own content hash appears in
the command's outer file report to avoid a self-referential hash.

Repeating an applied pair yields an empty file list and changes no bytes, including
worker identity and archived report. Even a pair already matching active artwork
may need an initial evidence-only archive; it does not change the worker. Old
bowler artwork/fit provenance files remain untouched.

## Interrupted application and recovery

Before active writes, the command creates `.luna-review-transaction/` exclusively,
stages original/new bytes, flushes files and writes a durable manifest. Publication
uses flushed temporary files and renames, rechecking targets/inputs. The manifest
moves through prepared, committing and committed phases. Any active write error
triggers rollback. If rollback encounters an intervening edit or corruption, it
retains the journal and reports the conflict instead of overwriting that edit.

After the writer has stopped, run:

```sh
node scripts/apply-wardrobe-review.mjs --root /path/to/checkout --recover
```

Recovery refuses an owner PID still running during prepared/committing phases.
A completed transaction can finish cleanup without rolling back applied assets.
Before rollback, every target and temporary file is checked. Partial temporary
bytes must be a prefix of their staged bytes; different bytes are a conflict.
Recovery can resume a partially restored transaction. A staging-only journal can
be cleaned without touching active files. A committed journal can be cleaned even
if earlier cleanup already removed some backups.

Do not edit/remove a journal to bypass a reported conflict. Preserve it, inspect
the named paths/hashes, and resolve which version should survive before recovery.
Checks protect a cooperative local checkout, not hostile concurrent filesystem
replacement or filesystem/hardware corruption. A corrupt ownership/manifest file
requires inspection. Never recover another live application process.

## Verification

`node --test tests/*.test.js` runs CRC/decode, CLI, application, rollback,
concurrent-edit, symlink, failure-isolation and interrupted-process scenarios in
temporary directories. No source artwork is applied to the live repository.

With Playwright, pngjs and Chrome available, run
`node scripts/check-review-application.mjs`. It applies synthetic replacements in
all categories in disposable copies, checks exact byte hashes and saved-pose
pixels, compares seven movement poses at native/enlarged size, and verifies
root/subpath reload, save isolation and a zero-change second plan. Pixel checks
use matching software Canvas backends. Desktop results do not establish Android
or installed-worker verification. See [Task 6 evidence](verification/v1-task6.md).

PNG filter/pass/chunk rules follow the [W3C PNG specification](https://www.w3.org/TR/png-3/).
