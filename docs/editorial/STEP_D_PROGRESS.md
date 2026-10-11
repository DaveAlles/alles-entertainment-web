# Step D website acceptance

## Current execution — Staging publication blocked

The frozen release pair is backend `84004ae` / website `1c24076`, with Staging
bundle `b43077c7cdb7f3f0daa81a9322b33fed077d21e9b5069b3853a498ed529d35f8`.
All 52 backend functions are ACTIVE, but inherited organization policy rejected
the 30 new callable invoker grants. No successful backend attestation exists;
this site has **not** been published to Staging. The two new backend schedules
are paused. Production and website main remain unchanged and blocked.

Final-pair local acceptance passed 115 website tests, contract/static gates,
13 website browser tests and eight retained-portal tests. Real Google/editor
acceptance is NOT RUN. See the backend-owned
[execution result](../../../MisAttribution/docs/editorial/STEP_D_EXECUTION_RESULT.md)
and [additional policy plan](../../../MisAttribution/docs/editorial/STEP_D_POLICY_EXCEPTION_PLAN.md).
Documentation-only follow-up commits preserve the frozen candidate pin/artifact
identities; use clean paired checkouts of the release commits when resuming.
Earlier checkpoints below remain historical.

The current pin includes the narrow Firebase discovery correction: human-only
workers do not declare an unused OpenAI secret. Contract exports, browser behavior
and approved Staging scope are unchanged. The first backend attempt applied IAM
and indexes, then stopped before any function updates; no secret was provided.
The corrected source pair requires fresh sealed-pair gates before retry.

## Gate A authorized — October 11 UTC

The owner approved the documented bounded Staging deployment, exact source sealing
and release-branch synchronization. The execution pin is backend
`84004aee0066f574c6dfed4fb325f32aa61f5750`; contract exports remain identical after the worker discovery correction. Production and website-main publication remain
blocked. Final pinned-pair acceptance and live revalidation are required before
publishing. This is authorization, not deployment or real-editor acceptance.

## Current discovery and release-tooling checkpoint — October 10

**PARTIAL: discovery complete; Staging approval requested; no deployment.** Website
base is `f23f44356589dd150f607609765c46c7b2d1fbf0`, pinning backend
`6881f7132d98742c1eb7926743b105872af3db96`. New uncommitted Staging release tooling
requires a clean exact pair, complete backend attestation, matching indexes/rules,
unchanged Hosting occupancy and verified served bytes. Production is unsupported
by this wrapper. See the updated [runbook](STEP_D_RUNBOOK.md).

Authenticated discovery confirms main/root Pages publication with the existing
custom domain and HTTPS, and an empty dedicated Firebase Staging site. Neither
website main nor Production is included in Gate A. Local checks pass 111 UI/transport
tests plus four deployment-guard tests; deterministic/negative build checks and all
environment builds pass. Final sealed-pair integration remains mandatory before
cloud writes. The historical sync and acceptance records below remain unchanged.

Backend-owned live content prerequisites currently block positive trusted puzzle
acceptance; runtime deployment will not repair them. The private backend
[release plan](../../../MisAttribution/docs/editorial/STEP_D_RELEASE_PLAN.md) owns
the exact scope, cost, recovery limits and approval decision. No private account
identifiers, credential material or cloud discovery payloads are copied here.


## Repository sync follow-up — October 10

The owner subsequently authorized checking in and syncing the release documents
on the existing `codex/editorial-step-c` branch. Website main/publication is not
part of this sync. Firebase CLI sign-in has since succeeded; cloud inventory has
not been rerun and GitHub Pages authentication/settings remain pending.

The website now explicitly pins backend `6881f7132d98742c1eb7926743b105872af3db96`,
whose change is release-preparation documentation. Contract/export bytes remain
unchanged. Fresh unit, contract, build and full emulator/browser gates passed;
the retained-portal suite required an unchanged rerun after one intermittent
edit/generation timeout. See [current sync acceptance](SYNC_ACCEPTANCE.md) and
[exact verification record](STEP_D_SYNC_VERIFICATION.json) for results and limits.
No application or test source changed. Logs remain private under
`.operations/step-d/sync/`.

The dated manifest and checkpoint below preserve the original tested source pair
and pre-reauthentication/pre-commit observations. Repinning does not approve a
release candidate. Parent coordination documents remain outside Git.

## Original acceptance checkpoint


October 10, 2026. **PARTIAL — local acceptance passed; not deployed, live verified,
or operationally accepted.** The intended Editorial URL currently returns HTTP
404, also confirmed in a browser. Existing public pages remain available.

The accepted local pair is website `9cae97ce3d702164c57f0c7a8c0d4aebd908b680`
and backend `3cf524c18f847d66fac236eb24f177d2f6dae835`. Both began clean and their
live remote branch tips matched. The intervening repository sync already resolved
the historical Step C discrepancy. The browser contract remains `editorial-v2`.
Exact artifact/configuration identities are in the public-safe
[release manifest](STEP_D_RELEASE_MANIFEST.json).

Fresh local checks passed:

- Locked `npm ci` / `npm run setup`; `npm run contract:local`; `npm run check`
  (typecheck, lint and 111 tests).
- Full `EDITORIAL_LEGACY_TESTS=1 npm run test:emulators`: eight backend Editorial
  groups, 13 website browser tests, original backend integration and eight original
  portal browser tests. The isolated candidate recorded no source changes.
- `npm run test:build`, all three `build:*` and all three `verify:*`: deterministic
  standalone artifacts and all rejection gates, 24 files per environment.
- Browser accessibility/layout: zero automated axe findings on covered screens,
  390/768/1280 widths, 200% text and keyboard/dialog checks. Three representative
  screenshots were visually reviewed. Real assistive-technology acceptance is pending.
- Backend aggregate: 795 tests; six additional Auth/HaHa/Community Writing/daily/
  content/Beta epoch emulator suites, including 41 daily-player rounds.

Seventeen served public files match the original public-file hashes. `CNAME`
is unchanged in source/artifacts; its direct live path returns 404 and is not used
as proof of Pages settings. The five public pages return 200. Editorial has no
navigation/sitemap link; local artifacts pass noindex, environment, safe inventory,
secret-marker and private-source gates. No application, public page or asset was
changed during Step D.

Authenticated Firebase discovery is blocked by an expired CLI login. Authenticated
Pages settings are unavailable through the currently unauthenticated CLI/browser.
Connected GitHub reads confirm main `6686514` automatically published and the new
frontend stays on its separate branch. Backend CI succeeded with deployment skipped.
No commits, pushes, Pages settings, deployment, Auth/IAM, DNS or provider action
occurred. Do not infer live access from emulator identities.

Follow [the website release runbook](STEP_D_RUNBOOK.md) and the private backend
[release preparation](../../../MisAttribution/docs/editorial/STEP_D_RELEASE_PLAN.md)
after authentication is restored. Scope/hosting guard changes and exact Staging
approval still precede deployment; Production requires its own approval and real
acceptance. The [original handoff](STEP_D_HANDOFF.md) remains the procedural source.
Step D release documentation is uncommitted; the manifest's pair identifies the
tested source, not a new commit. Parent coordination documents remain unversioned.
