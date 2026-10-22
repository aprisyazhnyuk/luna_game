# Task 9: real Android verification

Status on 2026-10-22: device checks in progress. The owner reports successful
readiness, home-screen launch after closing Luna/Chrome in airplane mode with
Wi-Fi off, starting/jumping, opening Store, best-distance persistence and
background pause on the Huawei P30. The previous-build test installation also
retained an equipped item after an offline relaunch. Landscape requires scrolling
to reach Store and Pause; the owner accepts that for now. Remaining scenarios
still need evidence.
The owner subsequently confirmed that every item is unlocked and loads correctly
offline in the older build, and reported that its mechanics work fine. This does
not verify the target build's updated witch asset or approve deferred artwork.
This record is not release acceptance. Seven Task 8 visual correction reviews
remain deferred; the existing bowler and applied witch approvals are preserved.

## Device and served build

| Field | Recorded value |
| --- | --- |
| Device | Huawei P30, reported by owner |
| Android / EMUI version | EMUI 12.0.0; underlying Android version not supplied |
| Chrome version | 155.0.8059.39 |
| Device test date / observer | 2026-10-22 / owner, remote self-report |
| Target merged commit | `a42e9a6fd235217677cfe211cea12eb47b924bc5` (PR #10) |
| Target offline identity | `ec6691ad50f5fd450d3262e56d2904dac1cc6e2a0bc1687510819672152d99ba` |
| Owner-tested root origin | `https://fa100d51ac87bd.lhr.life` (subsequently rotated by provider) |
| Upgrade test origin | `https://d1f892d4376a97.lhr.life` (subsequently rotated by provider) |
| URL scopes to check separately | `/` and `/luna_game/` |
| Phone's installed / active generation | Pending; desktop delivery is not proof of the phone's cache |

The owner explicitly authorized a temporary HTTPS test link on 2026-10-22.
The test server served an isolated copy containing only the generated runtime
inventory plus `offline-assets.js`. Initially root and subpath were identical.
It did not serve the repository, studio, concepts, review pairs or test sources.
The target snapshot has 28 distinct files per scope. Source bytes were checked
against the inventory and the target Git commit before serving. For the upgrade
check, only `/luna_game/` on the replacement origin was staged to the previous
merged build; root files are unchanged. The previous snapshot has 27 files.

The HTTPS link used a temporary localhost.run tunnel. The free service can change its domain;
see [its free-tier limitations](https://localhost.run/docs/forever-free/).
A replacement hostname is a different origin with
separate saves and caches; do not use it to claim a successful upgrade of the old
installation. No permanent host configuration or release publication is included.
After the test domains expired, the temporary tunnel and its isolated HTTP server
were stopped. The permanent local game/studio server and phone installations were
left intact. The expired links are retained here as historical evidence only.

## Desktop preparation evidence

- Main was fast-forwarded to the merged target and a separate
  `codex/v1-android-verification` branch created. Untracked crown candidates are
  preserved and excluded.
- Baseline: `node --test tests/*.test.js` passed **172/172**, zero failures,
  using bundled Node v24.19.0 on 2026-10-22. No baseline failures observed.
- Final documentation-branch run on the same date and Node version also passed
  **172/172**, zero failures. No test or runtime source changes were needed.
- `node scripts/generate-offline-assets.mjs --check` verified 28 resources and
  the target identity above. No runtime changes are part of this preparation.
- The merged tree is byte-identical to the reviewed PR #10 head. Its Node 22 CI
  passed; [Task 8](v1-task8.md) records studio, saved-pose, movement, saves and
  installed-worker desktop checks. These remain desktop evidence.
- The isolated current copy passed desktop Chrome 156.0.8078.47 startup/pause,
  portrait/landscape Store access, exact HTTP hashes for every served runtime file
  and exclusion checks for repository/review/studio paths at both URL scopes.
- Cloudflare Quick Tunnel could allocate a URL but repeatedly failed edge TLS
  connection; its diagnostics reported outbound port 7844 unavailable. That
  process was stopped. A Pinggy SSH tunnel served exact bytes to HTTP clients,
  but Chrome failed after its entry page with `ERR_SSL_PROTOCOL_ERROR`; changing
  the local HTTP protocol version did not fix that. It is not the test URL.
  localhost.run served Luna directly through SSH forwarding. An initial domain
  rotated during preflight; its root worker had reached readiness, but subsequent
  HTTP checks failed with **no tunnel**. That incomplete run is not a passed check.
  The owner-tested root origin passed the complete
  [desktop HTTPS preflight](v1-release/https-preflight.json): exact hashes for all
  runtime files, excluded private/development paths, worker readiness and offline
  reload/play at root and subpath. This used disposable desktop contexts and
  simulated network disconnection; it is not a phone cold-launch result.
- The [previous subpath preflight](v1-release/previous-subpath-preflight.json)
  verifies the staged old catalog, old worker identity, readiness and offline
  reload on the upgrade origin in a disposable desktop context.

## Owner observations

On 2026-10-22, after being asked to open the root URL in Chrome on the Huawei P30
and report the help-panel status, the owner replied:

> It works. And the local download worked.

This first reply established reported page load and download only.

The owner was then instructed to confirm **Ready for offline adventures**,
install/add Luna to the home screen, enable airplane mode with Wi-Fi off, close
Luna and Chrome completely, launch from its icon, and try starting, jumping and
opening Store. The reply was:

> Yes, everything works as expected/ Great!

Record those instructed checks as passed by owner report. No device
screenshot or direct device instrumentation has been supplied; the phone's cache
identity has not been independently measured.

The owner next confirmed all three requested checks: finish a run and retain HI
after closing/reopening, return paused after switching apps during a run, and
reach Store controls in landscape. They reported EMUI **12.0.0** and Chrome
**155.0.8059.39**. In landscape, Store and Pause require scrolling up; the owner
explicitly accepted this for now because portrait play is intended. No layout fix
is authorized or required for that accepted observation. Unreported scenarios
below remain pending; this confirmation does not establish all nine item choices,
earned-reward/equipment persistence or cache-update behavior.

For the previous-generation subpath check, the owner was instructed to load the
prepared older build, wait for readiness, add it to the home screen, finish a run,
then close it and reopen in airplane mode with Wi-Fi off. The owner replied:

> It survived, HI 661

Record offline relaunch and persistence of **HI 661** on that test installation
as passed by owner report. No independent measurement of the phone's installed
generation was supplied. Before the server could be switched
to the target build, the upgrade origin returned HTTP 502 with `no tunnel`.
The provider had rotated the hostname. No target update was served at that
origin; this is not evidence of an update preserving progress. Keep the existing
phone installation and its saved score intact. A different hostname cannot
complete this installation's update check.

The owner was then asked to equip any unlocked item, close Luna completely and
reopen while offline to check the outfit and HI 661. They replied:

> Yes, it retains the item.

Record equipped-item persistence after the offline relaunch as passed by owner
report on the existing test installation. The specific item was not identified;
this does not establish all nine assets, combinations or reward thresholds. The
reply confirms the item; the recorded HI 661 result remains the preceding report.

Asked whether opening Store during a run and then closing it leaves Luna paused
until explicitly resumed, the owner replied **Yes**. Record this Store pause
check as passed by owner report. Help-panel behavior remains unreported.

The owner was then asked to check that a second tap in midair does not cause
another jump, three collisions exhaust the three chances and end the run, and
tapping afterward starts a new run. They replied **Yes** to all three. Record
these checks as passed by owner report; landing input buffering and collision
recovery timing were not separately confirmed.

Asked to try each unlocked Store item while offline and report which remained
locked, the owner replied:

> I unlocked every item, they load correctly, but it's the old version, so we'll
> adjust them later. Mechanically, everything works fine

Record all nine items loading correctly offline on the previous-build test
installation, with none locked. The owner explicitly identifies this as the old
version. This does not establish that the target witch PNG was delivered to the
phone, verify every outfit combination or animation pose, or approve any pending
visual corrections. The broad mechanics report supplements the specific checks
above; it does not turn unreported input-buffer or recovery checks into passes.

## Guided device checks

Record each outcome as pass, fail or pending, with observations/screenshots and
the date. An instruction below is a planned check, not an observed result.
Begin in ordinary Chrome rather than an incognito tab. Keep existing progress;
do not clear storage or edit save values to make a check pass. Root/subpath have
separate worker/cache scopes and manifest identities, but localStorage is shared
on the same origin. A new hostname has separate saves and caches.

| ID | Check and expected result | Android result |
| --- | --- | --- |
| A1 | Record Android/EMUI and Chrome versions. Open the root HTTPS URL; Luna appears without broken images. | Page load, EMUI and Chrome reported; underlying Android version and image details unrecorded |
| A2 | In **?**, wait for **Ready for offline adventures**. A preparing/failed status is not readiness. | Passed by owner report |
| A3 | Tap to start/jump; second tap in midair does not double-jump. Observe yarn/boxes, treats, three chances, recovery, end and restart. Try a jump just before landing for input buffering. | Initial target-root starting/jumping passed by owner report. Later previous-build checks passed: no midair double-jump, three collisions exhausting chances and ending the run, and tap-to-restart. Obstacle/treat details, recovery timing and landing input buffering pending |
| A4 | Pause/resume works. Opening help or Store pauses; closing leaves the run paused. Switch apps and return: the game stays paused. | Initial target-root background pause passed by owner report; later previous-build Store check passed: closing Store leaves the run paused until explicit resume. Help-panel behavior pending |
| A5 | Store tabs and Done/Original look remain reachable in portrait and landscape/short layout, using scrolling where needed. | Reachability passed by owner report; scrolling up to Store/Pause in landscape accepted for now |
| A6 | Note best distance, best single-run treats, earned items and outfit. Reload: values persist. Original look retains rewards; category selections are independent. During a paused run, outfit changes affect the next run. | HI persists after closed-app reopen by owner report; equipped-item persistence also reported on the previous-build offline test installation; rewards and other save checks pending |
| A7 | Inspect all nine Store item entries; exercise every earned choice, including combinations and animation. Record locked choices as pending, not passed. Do not change the owner's saves to unlock them. | All nine unlocked and loading correctly offline in the previous build by owner report; target artwork, combinations and detailed animation checks pending |
| A8 | Use the offered installation action or Chrome menu to add/install Luna. Launch from its home-screen icon and record the actual launch mode. | Icon installation/launch passed by owner report; exact launch mode unrecorded |
| A9 | After readiness, enable airplane mode and ensure Wi-Fi is off. Close all Luna tabs and remove Luna/Chrome from recent apps. Launch from the icon: the game loads and plays with retained progress/outfit and all available item art. | Closed-app airplane-mode launch, start/jump and Store passed by owner report; HI 661, an equipped item and loading all nine items reported on the previous-build test installation; target-build offline save/art checks pending |
| A10 | Repeat offline launch after a phone restart if practical; record separately from the closed-app check. Restore connectivity afterward. | Pending |
| B1 | Repeat first load/readiness, installation, saves, Store assets and closed-app offline launch at `/luna_game/`. Record scope isolation from the root installation. | Previous-build offline relaunch with HI 661 retained, subsequent equipped-item persistence and all nine items loading passed by owner report; target build and independently confirmed phone scope/generation pending |
| B2 | Keyboard checks (Space/Up jump, P/Escape pause/resume) if a keyboard is available; otherwise record unavailable. | Pending |
| C1 | On a controlled test scope, install the previous merged generation, earn/save progress and an outfit, and prove its offline launch before updating. | Previous-build offline relaunch with HI 661 retained and subsequent equipped-item persistence passed by owner report; independently confirmed installed generation pending |
| C2 | Serve the target at the same origin/scope with the old app open. Wait for **Update downloaded · close all Luna windows to finish**. Existing clients keep the old generation. Close all Luna clients, reopen, and verify the target generation, witch art, progress and outfit. | Pending |
| C3 | Interrupt a required download during an update: the old working cache/saves survive and new readiness is not falsely announced. Restore network, finish the update, close old clients, and verify recovery. | Pending |
| C4 | On a separate unused scope/profile, interrupt first installation: it must not claim readiness. Reconnect, wait for readiness and repeat offline launch. | Pending |

Upgrade checks need the same live hostname and scope throughout, with controlled
server switching. A hash-verified previous snapshot is prepared from
`a00836fadbac746b34988559035b9956049ff6d1`, offline identity
`4dca09896770bde92e4ff20a0617f6cb2ac9eaa932dd32462c2a9593fe1fd161`.
It remains staged locally at `/luna_game/`. The owner reported offline relaunch
with HI 661 retained, but the public origin expired before switching to the
target. C2 remains pending and needs a stable test origin. The original root
installation remains untouched.
Coordinate switching and failure injection
before C1–C4; casual airplane-mode timing alone does not establish which required
download was interrupted. Do not substitute desktop results for these rows.

## Completion gates

Task 9 remains pending until device details, served/installed generation evidence
and scenario outcomes are recorded. Missing device capabilities and unrun
scenarios remain explicit gaps; no items are reported locked in the older build.
Discovered defects receive their own bounded fix branch/PR
before rechecking. Seven visual correction reviews remain a separate release gap.
The owner decides merging and permanent publication after reviewing the evidence.
Prepare this evidence as a draft Task 9 PR while those gaps remain; do not label
Task 9 or release verification complete. No runtime, control, artwork, save or
offline-inventory changes are included in this documentation branch.
