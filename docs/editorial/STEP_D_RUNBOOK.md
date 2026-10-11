# Website release runbook — pre-release

October 11 execution status: backend code is deployed but its release attestation
is blocked by 30 missing invoker grants under inherited domain policy. Dedicated
Staging Hosting is still unpublished. Resume only after the backend-owned
[policy exception plan](../../../MisAttribution/docs/editorial/STEP_D_POLICY_EXCEPTION_PLAN.md)
is explicitly approved, implemented and restored by an organization-policy admin.
Use the frozen pair `84004ae` / `1c24076`; documentation commits are not new
release candidates. All existing Staging predeploy/served-byte gates remain required.

**Not yet executable as an approved deployment.** Read [Step D progress](STEP_D_PROGRESS.md),
the [manifest](STEP_D_RELEASE_MANIFEST.json) and [original handoff](STEP_D_HANDOFF.md).
The backend owns live scope, authorization, schema, IAM and promotion authority;
this document owns website delivery. The Staging wrapper is now implemented and
locally tested; this document is not permission to publish.

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
local acceptance and rebuild. The current preliminary bundle still pins the base
revision and must not be deployed. Do not push website main.

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
