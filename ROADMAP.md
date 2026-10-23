# Luna's next little adventures

## Agreed direction

Portrait, one-handed Android play. Minimal black-and-white pixel art, with a lean,
white-and-gray Luna and matching pixel obstacles. Cozy and forgiving, with some
challenge in later levels. Static hosting on GitHub Pages, installable on the home
screen, playable offline after required resources have downloaded.

## First release: reliable runner and customization workflow

Retain the current simple endless runner: one jump, yarn/boxes, treats, three
chances, personal best, current controls and offline shell. Keep the
JavaScript/Canvas stack. Review readability and controls on a real Android phone
before claiming release readiness.

Implemented prototype: bowler, witch hat, crown; high heels, runners, sandals;
Mickey, star, skull-and-bones marks. Single-run treat targets unlock rewards from
30 through 135 in steps of 15; Mickey is available initially. Store supports 48
independent outfits, local persistence, and boots-to-runners migration. Shoes
follow paws, marks retain proportions, and collision bounds stay unchanged.
The approved bowler uses exact concept raster pixels and the owner-saved fit.
The permanent studio edits all nine items and supports replacement PNGs and
saved review poses. All appearance and movement work continues through studio
preview → owner adjustment and saved JSON/PNG → application of exact reviewed files.

Preparation completed on 2026-10-14: source/test/CI audit and proposed documentation
plan. Existing 30 tests passed with Node v24.19.0; real-device and fresh visual
parity checks remain pending. Generic runtime item loading, validated application and generated offline coverage
have since been implemented in Tasks 1–7. The generic owner-saved nine-item
review pair is not currently present, so nine corrected/approved items are still
a release requirement rather than a completed milestone.

Sequence approved by the owner on 2026-10-14:

1. Shared declarative catalog/validation and reproducible baseline fixtures.
2. Earned-ID save migration to preserve rewards across target changes.
3. Generic asset loading/catalog consumers, then declarative attachment rendering.
4. Shared studio model and backward-compatible review handling.
5. Reproducible, validated exact-byte application command.
6. Catalog-derived offline inventory and coherent cache updates.
7. Owner review/application of the nine-item corrections and real Android checks.

See [first-release specification](docs/game-spec.md),
[architecture audit](docs/architecture.md),
[development workflow](docs/development-workflow.md), and
[sequential tasks](docs/plans/v1-items.md) for acceptance criteria and verification.
Each complete implementation task uses a separate branch and PR. No merging or
release publication without the owner's instruction. Task 1 (shared catalog and
validation) is complete with baseline fixtures and verification evidence; active
consumers remain unchanged. Task 2 adds earned-ID save migration, preserving
legacy saves and current reward targets. Task 3 connects shared catalog consumers
and generic asset loading, with unchanged visuals/saves. Task 4 makes grid/PNG
attachments declarative with exact outfit parity. Task 5 unifies studio/review
validation and backward compatibility, with isolated exact-byte/pose checks.
Task 6 adds the validated exact-byte application command, dry-run, archived
evidence and recoverable catalog/image/worker transaction. All engineering
application tests use temporary copies. Task 7 generates the runtime/catalog PNG
inventory, stages it during review application and verifies complete-cache readiness,
v19 upgrades, cold offline starts and failed-download recovery in desktop Chrome
at root/subpath. Task 8 has applied the owner's saved witch-hat review, preserving
the prior bowler approval. The owner deferred the other seven item corrections;
full nine-item visual acceptance and Task 9 real Android verification remain
pending. See [Task 8 evidence](docs/verification/v1-task8.md) and
[Task 7 evidence](docs/verification/v1-task7.md).
Task 9 preparation is now tracked in the [real Android verification record](docs/verification/v1-release.md):
the owner has a Huawei P30 and authorized a temporary HTTPS test link. Readiness,
home-screen installation, closed-app airplane-mode launch, start/jump, Store,
HI persistence and background pause are reported working on EMUI 12.0.0 / Chrome
155.0.8059.39. The previous-build subpath installation also retained HI 661 and an
equipped item after offline relaunches. Its temporary hostname expired before the target update;
update preservation remains unverified. The owner reports all nine items unlocked
and loading offline in that older build, with mechanics working fine; this does
not approve deferred visual corrections or verify target artwork delivery.
Landscape scrolling is accepted for now. Remaining device scenarios are pending.
The owner has authorized a separate fixed-address temporary test site; its older
build passed a fresh offline phone baseline at `/`: HI 12 and Original look
remained after relaunch. On 2026-10-23, the interrupted-update attempt reported
update unavailable, followed by readiness and retained HI 12 / Original look
after reopening offline. The old witch appearance remains; target recovery and
a reported eye/body change when choosing a Store hat need clarification. The
deliberate server delay is removed and desktop target offline checks pass.

## Next iteration: destinations and increasing challenge

Levels linked to high score, harder obstacle arrangements, and changing
backgrounds; additional cosmetics follow later. Do not implement these during
the first-release workflow work.

Open question: does persistent high score unlock levels between runs, or does the
current run's score trigger stage transitions during a run?

Earlier ideas remain for discussion: short levels with endings, gentle difficulty
through obstacle arrangements rather than abrupt speed changes, double jump taught
in a safe later section, and whether levels use chances, checkpoints or unlimited
retries. These are future options, not agreed gameplay changes.

## Later decisions

Player feedback on treat milestone difficulty, sound/mute, more environments,
additional outfits, language options, final name, public code license, and an
export/import save option. Reference photos guide Luna's artwork and stay private
unless the owner chooses otherwise. Preserve existing approved art and review pairs.
