# Website release runbook — pre-release

**Not yet executable as an approved deployment.** Read [Step D progress](STEP_D_PROGRESS.md),
the [manifest](STEP_D_RELEASE_MANIFEST.json) and [original handoff](STEP_D_HANDOFF.md).
The backend owns live scope, authorization, schema, IAM and promotion authority;
this document owns website delivery. No deployment mechanism was added or changed
in this discovery-blocked checkpoint.

## Before any publication

1. Verify authenticated Pages publishing-source, branch/environment protections,
   custom domain and HTTPS settings. Main currently has successful automatic Pages
   deployments. Pushing/merging its engineering tree can publish it; keep changes
   on the separate branch until artifact publishing is approved.
2. Select clean backend/website revisions, canonical export/pin and source/config
   hashes. A changed backend SHA requires explicit repinning and fresh acceptance
   even if export bytes do not change. Commit/push only with owner authorization.
3. Run the documented locked installs, contract/check, full emulator/browser and
   static build/verify gates. `dist/staging/` and `dist/prod/` are complete site
   artifacts. `editorial-app/dist/` alone omits the public website.
4. Prepare and test website-owned Staging hosting configuration and two-repository
   predeploy guards. Require clean source, exact pair/artifact, live backend revision
   and configuration readiness. The old backend portal wrapper still publishes its
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
matches. No known-safe live Editorial rollback pair has been verified yet.

Backend [operations/recovery](../../../MisAttribution/docs/editorial/STEP_D_OPERATIONS.md)
owns staff-access revocation, diagnostics and coordinated recovery. Do not add
provider calls, monitoring jobs, DNS changes or broaden IAM to work around failure.
Retain the original portal until accepted cutover and separate retirement approval.
Parent documents are unversioned; this public-safe summary does not contain private
identity or cloud operational evidence.
