# Task 9: real Android verification

Status on 2026-10-23: device checks in progress. The owner reports successful
readiness, home-screen launch after closing Luna/Chrome in airplane mode with
Wi-Fi off, starting/jumping, opening Store, best-distance persistence and
background pause on the Huawei P30. The previous-build test installation also
retained an equipped item after an offline relaunch. Landscape requires scrolling
to reach Store and Pause; the owner accepts that for now. Remaining scenarios
still need evidence.
The owner subsequently confirmed that every item is unlocked and loads correctly
offline in the older build, and reported that its mechanics work fine. This does
not verify the target build's updated witch asset or approve deferred artwork.
The fixed-address retest baseline is confirmed: offline relaunch retained HI 12
and Original look. After an interrupted-update attempt, the owner again confirmed
HI 12 and Original look. Target update completion, recovery and a reported
Store eye/body appearance change remain unresolved.
This record is not release acceptance. Seven Task 8 visual correction reviews
remain deferred; the existing bowler and applied witch approvals are preserved.

## Device and served build

| Field | Recorded value |
| --- | --- |
| Device | Huawei P30, reported by owner |
| Android / EMUI version | EMUI 12.0.0; underlying Android version not supplied |
| Chrome version | 155.0.8059.39 |
| Device test dates / observer | 2026-10-22 and 2026-10-23 / owner, remote self-report |
| Target merged commit | `a42e9a6fd235217677cfe211cea12eb47b924bc5` (PR #10) |
| Target offline identity | `ec6691ad50f5fd450d3262e56d2904dac1cc6e2a0bc1687510819672152d99ba` |
| Owner-tested root origin | `https://fa100d51ac87bd.lhr.life` (subsequently rotated by provider) |
| Upgrade test origin | `https://d1f892d4376a97.lhr.life` (subsequently rotated by provider) |
| Fixed-address retest origin | `https://luna-task9-p30-20261022.cometthyme6.chatgpt.site` |
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

## Fixed-address retest preparation

After the temporary tunnel expired, the owner approved proceeding with a fixed
HTTPS test site on 2026-10-22. This is a separate temporary, publicly accessible
game-only deployment. Its public access will be restricted to the owner after
testing. It does not serve the Luna repository, studio, review evidence or tests.
Existing phone installations are not cleared or migrated; this new origin has
its own saves and caches.

Both `/` and `/luna_game/` initially served the previous merged game commit
`a00836fadbac746b34988559035b9956049ff6d1`, with the previous offline identity
listed below. The new installation's score and outfit were confirmed before
preparing a target update at the same origin/scope. Earlier phone results remain valid
observations of their original installations; they do not prove this retest.

The first Sites static deployment failed desktop integrity preflight: Cloudflare
injected a JavaScript Detections script into the HTML. Luna correctly refused the
modified resource. The failure was caught before asking the owner to test that
address. Cloudflare documents that a
[`Cache-Control: no-transform` response directive prevents this injection](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/).

The separate test server now uses the supported Sites Worker ESM format, serving
the original runtime bytes embedded without alteration and adding
`Cache-Control: no-store, no-transform`. Local response checks verified all 54
root/subpath game responses against the original byte hashes, and checked that
repository/studio/review/test paths return 404. No Luna runtime source, renderer,
save logic, offline integrity validation or approved artwork was changed.

Sites server source commit: `a42820db496b01ef4010935647f93ecdede70a22`;
saved version **2**. A local archive was packaged, but its initial upload failed
before creating a version. Deployment used the pushed source and remote build
fallback. Deployment succeeded at the fixed URL. The
[hosted desktop preflight](v1-release/fixed-host-preflight.json) passed at both
root and subpath: every served game file matched its original hash, excluded
development/review paths returned 404, the installed worker reached readiness,
and offline reload/start/pause worked. The larger Luna PNG downloaded intact
but took about 40 seconds on this connection, exceeding the first desktop
request's 20-second timeout. The successful rerun allowed 90 seconds per request;
no game timeout or integrity rule was changed. This is desktop Chrome evidence,
explicitly `android: false`. The subsequent phone baseline is recorded below;
update outcomes remain pending.

For the new site's root `/` on the Huawei P30, the owner was instructed to wait
for readiness, install/add that copy to the home screen, finish a run and note
HI, then close Luna/Chrome and relaunch from the new icon in airplane mode with
Wi-Fi off. They first replied **12**, then explicitly confirmed:

> Yes, HI 12 remained; Original look

Record this fixed-origin baseline as passed by owner report. It establishes
HI 12 and the default outfit; it does not establish a nondefault equipped item
or preservation of the earlier origin's HI 661. Update interruption will precede
completion of the same update so the working previous generation can be checked.

## Controlled update download fixture

After the HI 12 / Original look baseline, the temporary test site was switched
at the same origin to the exact target game commit. Only the separate test
server delays GET responses for the new required witch PNG by 120 seconds;
Luna runtime bytes, integrity rules, saves and controls remain unchanged. This
gives the owner a defined interval to interrupt a required update download.
Interruption is checked before completing this same update. It is not yet a
successful update or recovery result.

Sites server source commit: `6bade8485844fdbc0476eb12f81daba18314f84c`;
saved version **3**, deployment `appgdep_6ada357b1b1081918268e14a144d8a6e`
succeeded at the existing fixed URL. Archive upload again failed before version
creation (170866 ms); deployment used the exact pushed source and remote build.
The [fixture preparation report](v1-release/delayed-download-preflight.json)
records 56 exact local root/subpath response hashes, excluded paths and the
GET-only delay. Live root checks matched target HTML, catalog, inventory and
worker hashes, confirmed the fixture response header, and received no PNG bytes
during an intentionally bounded eight-second GET. These are HTTP/local checks,
not a full installed-worker update result or Android verification.

An additional disposable desktop-browser attempt timed out after 150 seconds
waiting for previous-generation readiness, before exercising an update; its
cause was not established. An initial urllib HTTP probe returned 403; later curl
checks received exact target responses without changing access settings. Both
limitations are retained in the report. The earlier complete desktop baseline
preflight and the owner's explicit phone baseline remain separate evidence.

The owner has been instructed to reconnect the HI 12 installation, observe
**Preparing offline update…**, enable airplane mode with Wi-Fi off during the
controlled delay, note the status, then close Luna/Chrome and relaunch offline.
On 2026-10-23 the owner reported:

> Offline update unavailable. Then I closed everything while beeing offline,
> opened it again and saw Ready for offline adventures. The new version was up

Record the reported update-unavailable status and subsequent closed-app offline
relaunch reaching readiness. The owner describes the opened copy as the new
version, but has not supplied an identifying visual or worker/cache measurement.
The active-worker readiness check can also report **Ready for offline adventures**
for the retained previous generation after a failed update. Therefore this reply
alone does not establish target activation or completed recovery. The owner
then clarified:

> Yes, HI 12 and original look were there. No, I saw the unadjusted older witch
> hat, but the eyes were from the new version. The strange thing is when I chose
> a hat in the store Luna's eyes and image switched to he older version for some
> reason.

Record HI 12 and Original look preservation after the interrupted-update attempt
as passed by owner report. The older witch appearance is consistent with retaining
the previous working copy; target activation and completed recovery remain
pending. The reply does not explicitly identify observation of **Preparing
offline update…** or the exact disconnection instant. A reported eye/body change
when choosing a Store hat is an unresolved visual observation. Screenshots were
subsequently supplied and are analyzed below; the owner then confirmed HI 641
at the exact fixed test address while offline.

The [read-only comparison](v1-release/eye-rendering-investigation.json) of both
game commits confirms `assets/luna-custom.png`,
`src/animation.js`, `src/draw.js`, `src/store.js` and `src/app.js` are byte-identical.
The Store renders `lunaPose(createRun(),0,true)` (a still, open-eyed pose), while
the game uses the animation clock and can blink. Both supplied screenshots show
open eyes, so the earlier blinking explanation does not explain this pair. No appearance change or new artwork application is
authorized by these checks.

The deliberate delay was removed on the temporary server; exact target game
bytes remain unchanged. Recovery server source commit:
`5a879bf2863cff89b714e0ded45eea01ab833d77`, saved version **4**, deployment
`appgdep_6adb0d42b6c0819196552f7064673f26` succeeded at the same origin. This
version used its validated local archive successfully. Local checks verified all
56 root/subpath response hashes, excluded paths and removal of the timer. The
[hosted desktop recovery preflight](v1-release/recovery-preflight.json) passed at
both root and subpath: all target runtime hashes matched, development/review
paths returned 404, the worker reached readiness, and offline reload/play worked.
This is explicitly desktop evidence (`android: false`). The fixed-origin save has since been confirmed offline at HI 641.
Normal online completion and a subsequent offline target relaunch with HI 641
are the next phone checks and remain pending. Do not
force worker activation or clear saves.

### Screenshot follow-up: Store and eye appearance

The owner supplied two JPEG screenshots on 2026-10-23 and reported that the smaller,
rounder eye appears after leaving Store, while remaining uncertain about the exact
trigger. The [comparison](v1-release/phone-eye-comparison.png) enlarges only the
character area; original files remain unchanged in the local ignored evidence
folder. Their hashes and observations are in the
[investigation report](v1-release/eye-rendering-investigation.json).

Both phone frames show **Paused**, no hat and **HI 641**, with current distances
29 and 21 and different paw poses. Both eyes are open. They are not the same
frozen animation frame, and neither image identifies its URL or cache generation.
To identify the copy, the owner was asked to open the exact fixed-host root URL
while offline and report its HI. They replied **It shows 641** on 2026-10-23.
This confirms the fixed-origin save now shows HI 641, matching the screenshots;
use 641 as the current score for the forthcoming recovery check. Preserve the
separate earlier HI 12 baseline and interruption reports as historical results.
This identifies the origin by owner report, not the installed cache generation.
The screenshots themselves do not prove the network state.

A fresh desktop check using Chrome 156.0.8078.47 and the actual game found:

- Four captures after repeated Store open/close cycles at one paused game pose
  had identical hashes. Store exit alone did not reproduce the change there.
- The same body PNG and neutral pose produced different eye-region pixels with
  default Canvas versus explicitly software-backed Canvas. Moving the draw origin
  between y=298, 299 and 300 did not change the aligned eye pixels within either
  mode. This demonstrates rendering sensitivity without changing artwork.
- Rendered blink frames have a closed line, unlike either supplied phone image.

The phone trigger remains unresolved. A browser rendering-mode change is a
hypothesis, not an observed phone fact. The JPEGs and desktop results do not justify
changing active artwork or claiming mixed cached game generations. Any visual
correction still follows the permanent studio review/application workflow.

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
| C1 | On a controlled test scope, install the previous merged generation, earn/save progress and an outfit, and prove its offline launch before updating. | Previous-build offline relaunch with HI 661 retained and subsequent equipped-item persistence passed by owner report. New fixed-origin baseline at `/` retained HI 12 and Original look offline; nondefault equipment at the new origin and independently confirmed phone generation pending |
| C2 | Serve the target at the same origin/scope with the old app open. Wait for **Update downloaded · close all Luna windows to finish**. Existing clients keep the old generation. Close all Luna clients, reopen, and verify the target generation, witch art, progress and outfit. | Pending |
| C3 | Interrupt a required download during an update: the old working cache/saves survive and new readiness is not falsely announced. Restore network, finish the update, close old clients, and verify recovery. | Owner reported update unavailable, then readiness after closing/reopening offline on 2026-10-23; HI 12 and Original look retained, older witch appearance reported. Exact interruption timing, cache identity and completed online recovery remain unconfirmed |
| C4 | On a separate unused scope/profile, interrupt first installation: it must not claim readiness. Reconnect, wait for readiness and repeat offline launch. | Pending |

Upgrade checks need the same live hostname and scope throughout, with controlled
server switching. A hash-verified previous snapshot is prepared from
`a00836fadbac746b34988559035b9956049ff6d1`, offline identity
`4dca09896770bde92e4ff20a0617f6cb2ac9eaa932dd32462c2a9593fe1fd161`.
It remains staged locally at `/luna_game/`. The owner reported offline relaunch
with HI 661 retained, but the public origin expired before switching to the
target. C2 remains pending. The new fixed-address site supplies the stable origin
for a controlled retest at `/`; its phone baseline retained HI 12 and Original
look after an offline relaunch, confirmed by the owner.
The original root installation remains untouched.
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
