# Website release runbook — Staging deployed, acceptance pending

## Current execution — Staging published; real-editor acceptance pending

[Staging Editorial](https://misattr-editorial-staging.web.app/misattribution/editorial/)
is deployed from website `6dcae9fbc548b8d52a132643a27697a0c7037604` with backend `84004aee0066f574c6dfed4fb325f32aa61f5750`.
Bundle `b43077c7cdb7f3f0daa81a9322b33fed077d21e9b5069b3853a498ed529d35f8` is verified against served files. Real signed-out browser checks
pass for desktop/mobile, hash refresh, headers and 404 handling. Backend attestation
and all 46 authentication denials pass. The temporary policy exception is restored
and temporary administrator access removed; both approved new jobs are enabled.

The first Hosting attempt stopped before upload because Firebase generated an
unignored debug log. The committed `.gitignore` correction preserves all deployment
assertions; 115 tests and explicit dirty-source regression checks passed. Application
bytes are unchanged. Website main remains `6686514`; Production and public Pages
publication remain blocked. Dave completed real Google sign-in and the approved
Staging administrator/moderator grant on October 13. Jill's independent sign-in,
broader staff workflow acceptance and trusted-content tests remain pending or
blocked. See the backend-owned
[execution result](../../../MisAttribution/docs/editorial/STEP_D_EXECUTION_RESULT.md).
October 13 bounded moderation/recovery checks now pass; audit pagination and
fixture cleanup also pass, with test accounts/content removed and audits retained. The backend-owned
[bounded acceptance report](../../../MisAttribution/docs/editorial/STEP_D_BOUNDED_ACCEPTANCE.md)
records individual outcomes, the duplicate-violation error-copy defect and limits.
Documentation follow-ups do not change the deployed source pair. Earlier checkpoints
below are historical; parent coordination documents remain unversioned.

The commands below remain guarded procedures, not permission for another release.
For any future publication, capture the actual current Hosting release; the original
`previousHostingRelease: null` first-release plan must not be reused. Keep Firebase's
root debug logs and `.firebase/` cache excluded from Git; they are private generated
operator output, never deployment artifacts. Tracked/untracked source remains guarded.

## Jill's Staging sign-in — after Dave's access check

Dave's sign-in and server-assigned access have been verified. Jill should use her
own Google account; her exact address has not yet been supplied or granted access.

1. Tell Dave the exact Google email address you intend to use. Use your own browser
   profile. If sharing Dave's browser, first click **Sign out** in the portal.
2. Open [Staging Editorial](https://misattr-editorial-staging.web.app/misattribution/editorial/).
   The address ends in `/editorial/` with no comma or period after it. Confirm the
   page says **STAGING / BETA** and **misattribution-staging**.
3. Click **Sign in with Google** and select your own account. If it is absent,
   choose **Use another account**. Complete passwords and MFA only in Google's
   window. If a popup is blocked, allow popups for this Staging site and retry.
4. Confirm your own name/email appears in the portal header. On the first visit,
   **Your Google account is authenticated, but it does not have editorial access.**
   is expected. Tell Dave the email you used, that you completed sign-in, and the
   message displayed. Do not send passwords, codes or tokens.
5. Wait for the release operator to verify your real Staging Google identity and
   apply the already-approved access. Then click **Check access again** (or refresh).
   Open **Access and policy** and confirm **editor, moderator, admin**. The backend
   revision should be `84004aee0066f574c6dfed4fb325f32aa61f5750` and contract
   `editorial-v2` for this release.
6. Check that **Overview**, **Puzzles**, **Community moderation**, **Abuse and
   restrictions**, **Audit history**, and **Access and policy** are visible. For this
   sign-in check, leave content and decisions unchanged. Publication/provider
   controls remain disabled, and an empty queue is not a completed workflow test.
7. Click **Sign out** and confirm the workspace and your account details disappear.
   Sign in with your own account again, then report completion or the exact error.

Jill does not need Firebase CLI, Cloud Console, organization-policy access or an
administrator IAM role. The earlier temporary organization-policy exception is
closed and is not part of staff onboarding. Do not reopen it for this procedure.

The release operator must independently verify Jill's supplied email, enabled and
verified Google identity, fresh real sign-in, exact Staging UID and current access
revision. Use the backend's existing audited operator for the approved
`editorialAdmin`, active, `communityModerator: true` grant; retain the private plan,
dry-run/apply/readback and immutable audit evidence. Never reuse Dave's UID or his
grant request. The browser cannot assign staff permissions. Backend
[operations](../../../MisAttribution/docs/editorial/STEP_D_OPERATIONS.md) owns access
and recovery; [execution evidence](../../../MisAttribution/docs/editorial/STEP_D_EXECUTION_RESULT.md)
records each person's completion separately. CLI login is not app sign-in evidence.

## Before any publication

1. Recheck authenticated Pages publishing-source, branch/environment protections,
   custom domain and HTTPS settings. Discovery confirms legacy main/root publication
   and HTTPS. Pushing/merging its engineering tree can publish it; keep changes
   on the separate branch until artifact publishing is approved.
2. Select clean backend/website revisions, canonical export/pin and source/config
   hashes. A changed backend SHA requires explicit repinning and fresh acceptance
   even if export bytes do not change. Commit/push only with owner authorization.
3. Run the documented locked installs, contract/check, full emulator/browser and
   static build/verify gates. `dist/staging/` and `dist/prod/` are complete site
   artifacts. `editorial-app/dist/` alone omits the public website.
4. Use `scripts/deploy-staging.mjs` and its independent predeploy guard. Require
   clean source, exact pair/artifact, complete combined backend attestation, live
   backend revisions and configuration readiness. The old backend portal wrapper publishes its
   old root-path app and is not a deployment path for this website artifact.
5. Use only an authenticated, owner-approved existing Staging site/channel after
   inspecting occupants and preserving its release/version for recovery. Serve the
   actual `/misattribution/editorial/` directory without a catch-all SPA rewrite.
   Retain no-store/noindex, security headers and Google popup compatibility.
6. Prepare a manual guarded Pages workflow that uploads only `dist/prod/`, with
   approved exact source and Staging acceptance evidence. Transition publishing
   source only after the separate Production approval. Preserve CNAME/HTTPS and
   public-file bytes. Never publish repository root, docs, tests or source maps.

The existing `.github/workflows/editorial-validation.yml` is validation-only.
It provides no Pages deployment permission/job. Staging and Production hosting,
configuration, identity grants and publishing remain separate explicit approvals.
Actual runtime/source mismatches discovered later must be resolved before sealing
the release pair; no guard may be bypassed.

## Guarded Staging command

This operator-only wrapper imports the sibling backend's existing release helpers;
those modules and credentials are never copied into the browser artifact. It uses
the backend's locked Firebase CLI and the fixed existing dedicated Staging site.
No new Hosting site, domain or Google-provider configuration is required.

After scoped approval, commit the reviewed backend changes, repin this website to
the resulting backend SHA, commit on the existing release branch, then rerun full
local acceptance and rebuild. The original preliminary bundle was superseded by the exact deployed pair above;
never reuse a stale preparation artifact. Do not push website main.

Write the private plan under ignored `.operations/step-d/` with these exact fields:

```text
schemaVersion: 1
environment: staging
projectId: misattribution-staging
siteId: misattr-editorial-staging
backendSha: final clean backend commit
websiteSha: final clean website commit
bundleDigest: dist/staging/misattribution/editorial/build-manifest.json value
contractDigest: same verified manifest value
hostingConfigDigest: sha(JSON.stringify(hostingConfig())) from staging-hosting.mjs
previousHostingRelease: null for the verified empty first release
```

Run `node scripts/deploy-staging.mjs PLAN.json --dry-run`; it performs read-only
checks but requires the backend deployment to have passed already. Then run the
same plan with `--apply` only within Gate A. The generated config and independent
predeploy hook recheck the target, plan digest, clean pair, exact artifact,
attestation, active deployed functions, rules/indexes and previous Hosting release.
An intervening release or changed source stops execution. The generated config is
removed on exit. No command supports Production or bypasses the backend guards.

After upload, the wrapper hashes served files and records the Hosting release and
version in a private receipt. Real editor sign-in and browser acceptance remain
separate. The live catalog currently cannot supply trusted previews; do not report
positive puzzle workflows as accepted from an empty catalog or emulator result.

## Served-artifact verification

Fetch the live `/misattribution/editorial/build-manifest.json` without a cached
response. Compare exact website/backend SHA, source/contract/configuration identity,
project/environment and bundle digest to the approved manifest. Hash every decoded
file response in its inventory and compare it, then verify HTML references the
recorded JS/CSS names. Inspect direct navigation, slash/refresh/hash routes, 404s,
HTTPS, noindex and unchanged public navigation/sitemap. Pages may not expose CNAME
as a public file; verify source/build bytes and authenticated Pages domain settings.

In the actual signed-in browser, verify network destinations and validated context
project/backend revision/contract. Check real independent operator sessions,
unauthorized denial and protected-state clearing. A successful deployment job,
200 response or visible environment badge alone does not establish these facts.
Keep tokens and private request/response bodies out of public evidence.

## Recovery and ownership

Preserve the actual prior Pages deployment/artifact and Staging Hosting version
before replacement. Publish only a compatible full-site recovery artifact under
the approved rollback scope; a frontend rollback does not restore backend data.
The known public-source baseline is main `6686514`, with 17 served public-file hash
matches. The Staging site's live channel has no existing release or version; recovery
of this first publication means withdrawing it to its prior 404 state. No known-safe
live Editorial rollback pair has been verified yet. Backend downgrade requires a
reviewed compatible candidate; current recovery relies on approved safe-stop and
guarded forward correction. Never republish a mismatched old frontend.

Backend [operations/recovery](../../../MisAttribution/docs/editorial/STEP_D_OPERATIONS.md)
owns staff-access revocation, diagnostics and coordinated recovery. Do not add
provider calls, monitoring jobs, DNS changes or broaden IAM to work around failure.
Retain the original portal until accepted cutover and separate retirement approval.
Parent documents are unversioned; this public-safe summary does not contain private
identity or cloud operational evidence.
