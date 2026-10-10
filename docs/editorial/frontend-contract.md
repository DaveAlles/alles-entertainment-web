# Editorial frontend contract

Status: **proposed Step C implementation**, October 10, 2026. Website inspected at
`150f89abb1cb36bec4a10924ca9fdf423077a94d`, clean `main` before documentation edits.
No routing, application, package or deployment files changed in Step A.

Step B backend implementation has passed local acceptance; the owner subsequently
authorized committing and syncing both repositories. The backend is undeployed.
Before Step C, read the
normative [implementation amendments](../../../MisAttribution/docs/editorial/STEP_B_CONTRACT.md),
[wire manifest](../../../MisAttribution/docs/editorial/export/manifest.json),
[acceptance](../../../MisAttribution/docs/editorial/STEP_B_PROGRESS.md) and
[handoff](../../../MisAttribution/docs/editorial/STEP_C_HANDOFF.md). They supersede
proposed API shapes here. No website application source was changed in Step B.

## Existing site and reusable application

The [public site](../../README.md) is dependency-free static HTML/CSS with real
directory indexes, [CNAME](../../CNAME), [robots.txt](../../robots.txt),
[sitemap.xml](../../sitemap.xml) and a [404 page](../../404.html). There is no
package manifest, framework router, Firebase configuration or checked-in GitHub
workflow. Public HTTP headers observed on October 10 report `server: GitHub.com`
and HTTP 200. Repository documentation specifies branch-root GitHub Pages; live
publishing settings remain unverified because GitHub CLI is not authenticated.

The working portal to reuse is
[MisAttribution/editorial-portal](../../../MisAttribution/editorial-portal/package.json):
React 18, TypeScript, Vite 7, Firebase web SDK, Vitest/Testing Library and Playwright.
Its [App](../../../MisAttribution/editorial-portal/src/App.tsx),
[OverrideEditor](../../../MisAttribution/editorial-portal/src/OverrideEditor.tsx),
[SpeakerSearch](../../../MisAttribution/editorial-portal/src/SpeakerSearch.tsx),
[CommunityReview](../../../MisAttribution/editorial-portal/src/CommunityReview.tsx)
already provide most workflow components. Reuse forms, keyboard behavior, race
protection and tests. Do not start another portal from scratch.

Existing gaps: Production has no environment badge; Community has a separate raw
fetch adapter and coarse errors; initial access is discovered by trying individual
views; there is no full dashboard, audit screen, trusted quote picker, automatic
puzzle preview, confirmation of actual publication, or full violation history.

## Ownership and contract delivery — C1

The [backend contract](../../../MisAttribution/docs/editorial/backend-contract.md)
is the authority for operation names/shapes, auth, state transitions, policy,
concurrency and errors. Frontend code presents returned capabilities/actions and
state; it never reconstructs server policy, cooldowns, trust, date locks or roles.

Move the existing app to website `editorial-app/` in C1 and keep its independent
package/lockfile. Preserve public pages/assets and their static preview command.
Backend exports a deterministic browser-only contract bundle with version,
generation-base backend SHA and digest. Website stores the generated bundle plus
manifest and separately pins the actual reviewed backend checkout SHA; the
manifest's generation base is not the containing commit. No imports from a sibling
checkout at runtime, no Admin SDK and no duplicated handwritten wire spec. CI verifies the
export against that pinned revision using read-only repository access if needed.

Keep the old app until moved-app tests and a Staging build pass. Then remove the
duplicate implementation, redirect relevant backend checks to shared contract
tests, and transfer web CI/deployment ownership in one coordinated cutover.
Existing deploy wrappers cannot simply be run after moving source: they assume
one SHA and the old local bundle path. Replace that assumption with the revision
pair gate below; keep backend predeploy protections.

## Route and hosting — C1/C5

Production URL: `https://www.alles-entertainment.com/misattribution/editorial/`.
Create an actual `misattribution/editorial/index.html` in the **built Pages
artifact**, with assets beneath that prefix. Set Vite base explicitly to
`/misattribution/editorial/`. Use component state or hash locations for dashboard,
puzzles, review, users and audit; do not depend on `/editorial/reviews/123` server
rewrites. Any URL fragment containing a case ID is opaque and never includes text,
name, email or credentials. Test direct arrival, slashless redirect, refresh,
bookmarks, Back and nested asset loads on a plain static server and live host.

Keep `/`, `/misattribution/`, about/contact/privacy and public assets intact. The
website build assembles an allowlisted output directory from those existing files
plus the portal bundle, robots, sitemap, CNAME and 404. Never publish repository
root indiscriminately: new engineering Markdown, source, fixtures, internal
configuration, logs and source maps must stay out of the deploy artifact.

Recommended Pages Actions workflow builds/tests this artifact, uses a deployment
environment approval gate, and uploads only that artifact. Owner must approve any
Pages source/settings change. Until that approved switch, branch-root publishing
is a release obstacle: committing engineering docs into a branch that auto-publishes
may expose them. Step A does not commit or publish them.

Reuse the dedicated Firebase Staging site for preview with the same prefix; its
configuration/artifact publication becomes website-owned. No Production DNS move.
The old Firebase Production site is a temporary rollback destination only if its
bundle/backend are still compatible; retire or redirect it after acceptance.

No links in public navigation, site-wide search data or sitemap. Add editorial
HTML `<meta name="robots" content="noindex,nofollow,noarchive">`; consider robots
path exclusion only as crawl hygiene, understanding it exposes the path. Public
bundles are expected; no privileged data may be embedded in them. Pages does not
apply `firebase.editorial.json` rewrites/security headers. Test a compatible meta
CSP that permits only required auth/API/assets and avoids inline executable code;
direct text rendering, safe URLs and no dangerous HTML remain mandatory.
Frame restrictions/cache headers cannot simply be copied as HTML directives.
Revisit hosting only if a demonstrated security requirement cannot be met here.

## Authentication and scope — C2

Reuse [browserSessionPersistence and Google popup](../../../MisAttribution/editorial-portal/src/firebase.ts).
The account chooser, popup-cancelled/blocked recovery, sign-out and session restoration
already exist. Use one explicit environment per built artifact. Public `www` is
Production; the dedicated Staging preview is Staging. Local demo is loopback plus
`demo-misattribution` only. No query/localStorage environment override and no live
environment switch inside a working session.

After Firebase session restoration call `getEditorialContext`. Show loading while
authorization is unresolved; show access denied with Sign out for unlisted users.
Validate project/contract/backend compatibility before loading private data. Show
the signed-in account, **PRODUCTION** or **STAGING / BETA** text, Firebase project
and (where applicable) active data epoch on every protected screen. Production
must never be indicated by the absence of a Staging badge. Use text as well as color.

Capability UI supports puzzle-only and moderation-only future staff. Dave and Jill
get the full admin+moderator experience only after server provisioning. Do not
send role/email assertions or hide auth failures behind an empty queue. Google
provider, authorized domains and function invocation are external prerequisites
owned by the backend release plan, not frontend security controls.

On sign-out, auth revocation, project/epoch change or incompatible contract: unmount
protected state, invalidate pending requests, clear form/evidence data and require
fresh authorization. A delayed response must never populate another account's
screen. Keep moderation text in memory only; no service worker cache, localStorage,
analytics replay, public preload JSON or automatic downloads. Firebase owns token
persistence/refresh; never add a custom token cache.

## Workflow screens — C3/C4

| Screen | Required behavior and backend dependency |
| --- | --- |
| Overview | B5 summaries show open reviews/reports/appeals/restrictions, oldest/capped/as-of state, urgent reasons, publication deadline, provider-disabled and worker/Auth-sync/purge health. Actionable links remain within authorized UI |
| Puzzles | Existing server-selected date rows plus B2 preview: selected correct pair, full board/provenance as authorized, provisional vs published label, readiness and locks. Beta fixture caveat is visible so editors do not expect a Staging override to change normal Beta rounds |
| Override form | Reuse canonical speaker selection and validation; choose admitted quote revisions via B2. Display exact quote/source and trust failures. Save/update/cancel uses expected revision; rescheduling uses cancelled revision. No source URL bypass, generated-date edit or claim that Save publishes |
| Publish | Admin-only B2 operation; show exact project/date/selection, preview fingerprint and immutable lock consequence. Confirmation and recent-auth requirement; success must show authoritative puzzle/consumed revision. Scheduled publication countdown uses server time and explicit NY timezone |
| Review detail | B3 paged list/detail; distinguish name, contribution and source concern, screening evidence, exact reported revision vs current revision, reasons, expiry and prior decisions. Explicit actions from server capabilities; never rewrite a player's text |
| Appeals and restrictions | Show applicable reconsider/reinstate/unrestrict actions and why unavailable. Distinguish personal blocks, community limits and whole-account disable. Show queued/failed/confirmed Auth synchronization; do not present a queue receipt as Auth completion |
| User history | B4 private subject reference, confirmed/corrected violations and decisions, global restrictions and source epoch. No legal identity/email display. Human escalation/correction only, no automatic bans from counts |
| Audit | B5 paged stream/target summaries, actor labels, times, reason, before/after versions and related action IDs; link to authorized unexpired case detail. No raw text export or arbitrary Firestore query UI |

Production save/cancel/publish, approval/rejection/removal, restrictions and Auth
actions require a confirmation summarizing target, environment, current version,
reason and effect; backend validates corresponding confirmation/recent-auth
requirements. Do not make editors type long phrases for routine Staging review.
Whole-account disabling requires an additional explicit severity/effect confirmation.
Accessible dialogs restore focus, support Escape, and do not obscure the selected
target. Confirmation cannot broaden an account's server capabilities.

Reversal is operation-specific: cancel/update before puzzle publication; human
appeal or exact unchanged-version reinstatement for content; explicit unrestrict
for account controls. After an immutable puzzle is generated, show locked history
and the documented escalation path; never offer a misleading Undo button.

## Requests, freshness and feedback

Use one typed/validated callable adapter with a 30-second UI timeout and safe
error mapping from the backend contract. Reuse Firebase token refresh. Unknown
or contradictory responses fail closed and retain a safe correlation ID.

States to test: restoring/signing in/checking permission/loading, empty queue,
partial unavailable summary, offline, stale data, validation warning vs blocker,
conflict, expired evidence, policy/epoch change, access revoked, server unavailable,
rate limited, saving, action committed and outcome unknown. Never render denied,
failed or stale data as “No work”. React text rendering is mandatory for untrusted
content; validate external HTTP(S) source URLs and use safe external-link attributes.

Reuse explicit Refresh and visible-tab return refresh (current puzzle view checks
after one minute). Add the same behavior to queues and dashboard; no permanent
Firestore listeners or high-frequency polling. Display “as of” time and stale
indicator. Clear stale evidence on lost authority; background-tab time does not
extend authorization or cached public visibility.

Disable duplicate clicks while sending. Allocate one request ID per deliberate
action, retain original ID/payload for a bounded retry after a lost response, and
do not silently retry with a new ID. A conflict requires reload with draft warning,
not automatic merge. After reload or scope change reconcile authoritative detail/
audit before deciding again. Never persist sensitive pending payloads to browser
storage merely to make reload recovery convenient.

## Revision-pair deployment and recovery — C5/D

Release identity is `{backendSha, websiteSha, contractVersion, contractDigest,
environment, projectId, bundleDigest}`. Build manifest contains only non-secret
identifiers. Backend checks own service/rules/index provenance; website checks its
own clean commit, exported contract and built environment. A successful Staging
acceptance record must cover this exact pair before Production promotion. Separate
bundles per environment are expected; a Production rebuild must preserve the same
source pair/contract and pass its environment scan. An editable UI label is not
deployment evidence.

The website deploy workflow must verify protected backend deployment evidence
using existing read-only smoke/attestation mechanisms; `getEditorialContext` is a
runtime compatibility check, not permission for the browser to approve release.
Do not grant the Pages job Firebase backend deployment or database mutation powers.
Staging hosting permissions are scoped separately; never put deployment credentials
in Vite variables. Backend browser invocation and Pages authorized-domain changes
need exact external approval before D's live tests.

Rollback restores a previously accepted compatible website artifact/revision pair.
Backend should remain additive during migration. If incompatible, show maintenance
and stop privileged actions; do not serve a stale client that silently drops
required concurrency/safety fields. Preserve database/audit records; rollback
never resets Beta epochs or rewrites published puzzles. Test mixed cached bundle
and newer backend behavior because static hosting may cache HTML/assets.

## Frontend acceptance

Step C must establish package build/typecheck/lint/unit and Playwright scripts,
migrating the existing tests. Publish the exact runnable commands in this document
when those scripts exist; no placeholder command is executable today. Extend the
[existing portal tests](../../../MisAttribution/editorial-portal/tests/portal.e2e.spec.ts)
and [Community tests](../../../MisAttribution/editorial-portal/tests/community.e2e.spec.ts).
Use backend emulators and synthetic fixtures; no live provider call is needed.

- Static server at the actual prefix: direct URL/reload/hash navigation/assets,
  slashless behavior and correct 404; all original public links still work.
- Signed out, unlisted Google/player, revoked/inactive account, both authorized
  admins, E-only and M-only capability experiences; late-response/sign-out isolation.
- Two browser contexts race review/override actions; loser gets conflict, uncertain
  response replay uses original ID, and wrong project/old epoch cannot mutate.
- Review approval/rejection/appeal/reinstatement, exact old-report evidence,
  expired evidence, account restriction/correction and Auth-pending feedback.
- B2 trusted selection/preview/readiness, validation failures, publish lock,
  pre-publication cancellation and no rewrite of generated content.
- Explicit Production/Staging scope, keyboard-only dialogs/speaker search, focus,
  screen-reader names/status, text scaling and 390/768/1280 px layouts.
- Artifacts contain no source maps, fixtures/test auth, Admin SDK, credentials,
  private content or engineering docs; editorial route absent from public nav and
  sitemap, with HTML noindex. Safe rendering tested with hostile contribution text.
- Typed response/schema mismatch, empty vs failed queues, offline/timeouts, provider
  unavailable, recent-auth prompt, auth error vs service error, rollback compatibility.

Live Google sign-in, Pages settings and actual browser/publication/provider effects
remain separate D evidence. A passing mock login or local browser test cannot
establish that Dave and Jill have live access.
