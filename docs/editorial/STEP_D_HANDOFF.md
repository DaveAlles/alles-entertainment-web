# Step D handoff — deployment and live acceptance

**Current checkpoint:** Step D has begun under the owner's October 10 request.
Read [progress](STEP_D_PROGRESS.md), [manifest](STEP_D_RELEASE_MANIFEST.json) and
[runbook](STEP_D_RUNBOOK.md) first. Fresh local acceptance passed, but authenticated
live inventory/Pages settings remain pending and no deployment has occurred. The original handoff
below is preserved; its statement that Step D has not begun is historical.

Step C has passed local acceptance. Step D has not begun. The owner subsequently
authorized committing and syncing all pending changes, including the separate
175-code-point system-story work. Deployment, live configuration, identity grants
and provider spending still require their exact approval. Start with the current
[sync acceptance](SYNC_ACCEPTANCE.md) and its machine-readable record, then inspect
both Git trees. The [original Step C evidence](STEP_C_PROGRESS.md) is preserved as
history for its earlier candidate.

## 1. Revisions and artifacts

Backend source pin: `3cf524c18f847d66fac236eb24f177d2f6dae835`.
Website source is synchronized on `codex/editorial-step-c`; use its exact committed
revision, not the unchanged published `main` baseline. Current source and artifact
hashes are recorded in `SYNC_VERIFICATION.json`. Contract: editorial-v2,
`2f58c00871da4579f30cb471867a00ce1196db7289406d7a71570dd1459a91d0`.

For a separately authorized deployment, record the exact website
commit and compatible backend deployment revision. Rebuild and rerun the gates for
that pair. A backend documentation commit changes HEAD too: explicitly review and
update the website pin and rerun acceptance; do not silently bypass the pin. Record
`backendSha, websiteSha, sourceDigest, contractVersion, contractDigest, environment,
projectId, bundleDigest` plus rules/index/deployment evidence. The runtime requires
an exact backend revision match. A local `local` marker is not live provenance.

## 2. Deployment dependencies and gates

1. Inspect current Pages publishing settings and protected branch behavior using
   authorized read access. GitHub's successful Pages run for website `6686514`
   confirms automatic publication of `main`; the settings page remains unverified.
   Source/docs/tests must not be published. The Git sync uses a separate branch.
   Obtain approval for a Pages Actions artifact publishing source (or an equally
   safe reviewed dedicated output branch) before pushing the new engineering tree
   to a branch that may auto-publish. Preserve CNAME and public bytes.
2. Extend the existing validation-only workflow with a separately approved guarded
   Pages deployment job/environment. Upload **only** `dist/prod/`. The current
   workflow has contents:read, no deployment job and no push trigger. It does not
   deploy when run. Retain source freshness/inventory checks before publication;
   never deploy `editorial-app/dist` alone because it omits the public site.
3. Transfer dedicated Staging hosting ownership deliberately. Backend `.firebaserc`
   currently maps target `editorial` in misattribution-staging to
   `misattr-editorial-staging`. A website-owned configuration must serve the
   assembled Staging directory, including `/misattribution/editorial/`, with
   no-store/noindex/security headers as supported. Do not reuse the old catch-all
   `/index.html` rewrite or single-backend-SHA predeploy wrapper blindly. Preserve
   its safety gates while replacing their bundle/pair assumptions. Do not create a
   new site or alter Production DNS as a shortcut.
4. Deploy the approved backend candidate to Staging through its existing guarded
   scripts before a client requiring that revision. Verify all 20 referenced
   callable operations, authorization, rules, index READY state, epoch/source
   fences, receipt/audit behavior, project configuration and runtime revision.
   Follow [backend rollout authority](../../../MisAttribution/docs/editorial/backend-contract.md)
   and [Step B amendments](../../../MisAttribution/docs/editorial/STEP_B_CONTRACT.md).
   No raw deploy or private endpoint invocation bypasses a failed guard.
5. Invocation/IAM scope must be explicit. Review browser invocation for only the
   required staff callables and the runtime Auth read/write needs, including the
   compensating restriction worker. Do not grant broad cloud access or make every
   function public. API invocation permission is distinct from staff authorization.
6. Run `npm ci`, `npm run setup`, `npm run contract:local`, `npm run check`, the full
   emulator suite and all three build/verify commands. Deploy the exact freshly
   verified environment artifact under the approved plan. Record deployed hashes,
   source revisions, epoch and smoke evidence. A local build is not a deployment.

## 3. Google authentication and staff access

Use separate Google/Firebase identities and server records in each project. Dave
and Jill must privately sign in with their intended Google accounts and verify
provider/UID, then receive independently audited **editorialAdmin plus explicit
communityModerator** permissions through the backend's guarded operator tool.
Admin does not imply moderator. No email/name allowlist or browser grant exists.
Do not put real UIDs, emails, credentials or tokens into public docs, fixtures or chat.

Verify Google provider enablement and Firebase authorized domains for each exact
origin. Staging intended origin is `misattr-editorial-staging.web.app` (plus only
other actually used dedicated preview hostnames); Production is
`www.alles-entertainment.com`. Keep each build's project-specific
`project.firebaseapp.com` authDomain. The Firebase SDK uses its hosted auth handler;
GitHub Pages does not automatically serve `__/auth/handler`.

Complete real popup/account selection/session restoration/sign-out/reauthentication
on those target domains, including normal browser popup/privacy settings. Inspect
CSP/connect/frame requirements from the actual browser and change only demonstrated
requirements. Chrome emulator restoration is not proof of a real Google flow,
Safari/Firefox behavior, authorized domains, third-party storage or live IAM.

## 4. Scoped Staging acceptance

Prepare an exact disposable-data plan, action list, limits, owners and stop/rollback
conditions for approval. Keep two independent admin/moderator sessions. Verify:

- Direct preferred path, slash/refresh/hash navigation and assets; unchanged public
  pages/CNAME/404/nav/sitemap, noindex, safe static inventory and environment badge.
- Dave and Jill separately restore/sign out/sign in, view authorized content and
  perform an approved reversible override and human review. E-only/M-only/unlisted,
  revoked/disabled and forged-role requests fail appropriately; direct Firestore
  access remains denied. No player data is copied between projects.
- Trusted selection, preview board/provenance, readiness, create/update/cancel,
  concurrency loser preserving draft, original-ID receipt recovery and publication
  lock. Any publication is an explicit approved irreversible test.
- Approval/rejection, exact report revision, appeal and unchanged reinstatement,
  expiry/deletion, reporter/subject history, independently chosen violation,
  restriction/correction/release, and severe Auth disable/enable compensation.
  A queued receipt is not confirmed Auth completion. Use disposable accounts for
  destructive account tests with their own approval.
- Audit causal links, bounded pages, access streams, actor/version/reason/time,
  no duplicate effects after receipt replay, and retained evidence privacy.
- Keyboard-only interaction, dialog focus, screen-reader labels, 390/768/1280 widths,
  200% text, long evidence and target desktop/mobile browsers. Local automated axe
  checks do not substitute for this short real-user acceptance.

Record backend state/audit assertions as well as visible results. Ordinary Beta
player rounds still use rotating fixtures. Staging publication proves the editorial
snapshot/projection only; it cannot prove Production daily-player consumption.

## 5. Production and provider boundaries

Production promotion needs its own exact pair/deployment/configuration approval and
an accepted Staging record. Verify current live source and settings; Step B was
never deployed during B or C. Do not infer readiness from historical function
metadata, synthetic Google sessions or existing cloud credentials.

After approved hosting, verify the real public URL and access boundaries. Prefer
read-only smoke checks. Any real puzzle publication needs an approved future NY
date and later genuine player projection verification; do not rewrite immutable
puzzles, alter scores, shift the clock, or reset data to manufacture proof.

Live Community Writing, auto approval, paid OpenAI dispatch and scheduled
publication stay disabled. Preserve preexisting Staging HaHa policy. Provider,
minor-safety/consent/privacy/moderator-coverage and physical-device gates remain in
the backend feature acceptance documents. No paid evaluation or activation is
implicit in an Editorial UI deployment.

## 6. Rollback and legacy retirement

Retain the original portal and an accepted compatible website artifact pair through
Staging and Production acceptance. The old portal's pre-v2 mutation requests are
not a universal replacement for new safeguards; recheck compatibility for the
specific backend before relying on it. If no compatible client exists, stop new
privileged actions and repair forward. Restore only a reviewed website artifact;
never roll back by resetting epochs, restoring player data, deleting receipts or
rewriting published puzzles/audit history. Check cached old clients fail closed
against a mismatched backend.

After accepted live parity and owner-approved cutover: redirect/retire legacy web
hosting as appropriate, remove the duplicate source only in a separate reviewed
change, repoint backend portal tests/deploy references to contract and website
acceptance, and update both ownership docs. Preserve backend guards.

## 7. Dave's required involvement

No Dave action is needed for completed local Step C checks. Step D requires review
and authorization of the exact commit/publishing/deployment plan, intended Google
accounts and per-project grants, needed domain/IAM settings, and the short real-user
Staging session. Production and paid-provider actions need separately explicit
scope. Parent coordination docs remain unversioned; approve a preservation strategy
before assuming a Git sync captures the whole workspace. Never send credentials or
authorization codes through chat.

## 8. Verify the actually published artifact

After an authorized deployment, fetch the published
`/misattribution/editorial/build-manifest.json` without relying on a cached copy.
Compare its backend SHA, website commit, source digest, contract digest, environment,
project and bundle digest with the approved release record. Fetch every path listed
in `files`, hash the decoded response bytes with SHA-256 and compare each hash;
check that `index.html` references the recorded hashed JS/CSS assets. Verify the
public CNAME content and original-public-file hashes too. A 200 response or matching
page title alone is insufficient. Repeat with an ordinary browser cache to check
mixed older HTML/backend behavior fails closed.

In the real signed-in browser, inspect network destinations and the validated
getEditorialContext response: Production must use misattribution-aa1e2, Staging must
use misattribution-staging, and backendRevision/contractVersion must match the pair.
The visible badge and build manifest are useful corroboration, not runtime proof by
themselves. Do not log the Authorization header, private bodies or Firebase ID token.
