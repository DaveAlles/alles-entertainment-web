# Step C local implementation and acceptance

This is the original pre-sync acceptance record. The subsequent owner-authorized
check-in includes the 175-code-point system-story change, a new committed backend
pin and fresh combined validation; see [sync acceptance](SYNC_ACCEPTANCE.md).
The original pins, hashes and authorization statements below are historical.

Status: **PASS — local Step C implementation and acceptance complete.** The final
combined gate passed all frontend, backend integration and retained-portal checks.
This is not deployment readiness or live account acceptance; Step D has not begun.
Owner authorization: the Step C implementation request on October 10, 2026.
Step D, commits, pushes, deployments, real staff grants and provider calls are not authorized.

## Subsequent shared-checkout changes

After the accepted combined run and evidence capture, additional unrelated backend,
mobile and test edits appeared in the shared MisAttribution checkout (system-vignette
work). They were preserved untouched and are **not part of this accepted pair**.
The final `contract:local` against that shared dirty tree correctly fails closed.
An isolated `git archive` of the exact backend pin passed canonical contract parity
again, with a separate GIT_WORK_TREE and optional Git locks disabled. All three
website artifacts still match the accepted source digest. No gate was weakened.

PASS applies to the recorded tested candidate, not the subsequently changed shared
backend tree. Before another combined run or Step D, separately review/finish the
concurrent work and select the intended backend revision; do not reset or discard it.

## Inspected source and ownership

Both repositories began clean on main after the owner's Step B synchronization.

- Backend: `88f8208cf33d2fd2256d48752d7b21fef3823065`.
- Website starting commit: `668651491975317f38b4166aaf276153724b5b2f` plus the uncommitted Step C change set.
- Contract: `editorial-v2`, digest `2f58c00871da4579f30cb471867a00ce1196db7289406d7a71570dd1459a91d0`.
- Export generation base: `eea5f880f34d5014de869c0bf5c561b510913ec1`, distinct from the reviewed backend commit.
- Exact final source/artifact/log hashes: [verification record](STEP_C_VERIFICATION.json).

The website's `editorial-app/` was migrated from the existing portal, retaining its
React/Firebase architecture, form, speaker search, date state, style system,
dialogs, error handling and regression tests. It is the intended canonical
frontend. The backend portal, backend application and mobile source are unchanged.
Temporary duplication ends only after separately approved Step D live cutover.
No unrelated local changes existed at discovery; none were discarded.

Accepted frontend source digest:
`18b575346a2cc1f9f364c954853dd4eeb3bb35f7b257965af17114d3f4caa16d`.
All three artifacts were freshly verified against it after the successful combined
run. Original public files and retained portal code are unchanged. Step C did not edit backend application code; later concurrent source edits are excluded.
Owned emulator and preview processes exited normally at the end of acceptance.

## Implemented work

| Area | Implementation and backend use |
| --- | --- |
| Context and overview | getEditorialContext and getEditorialOverview authorize the workspace, identify scope, show bounded queues/publication/health and link to the correct selected queue. |
| Puzzle management | Existing list/get/create/update/delete/validateEditorialOverride and searchEditorialSpeakers; listEditorialContent trusted picker; getEditorialPuzzlePreview full board; publishEditorialPuzzle with fingerprint/version; source/provenance and audit links. |
| Community | listCommunityReviews/getEditorialReview/decideCommunityReview cover reviews, reports, appeals and global restrictions; exact evidence/current versions, reason, expiry, pseudonym, retained screening/history and returned actions. |
| Abuse | getEditorialUserHistory, recordCommunityViolation, correctCommunityViolation and setEditorialUserRestrictions; selected supporting decisions, confirmed/corrected totals, explicit separate sanctions, severe acknowledgement, Auth pending states and source-case return. |
| Audit and access | listEditorialAudit with authorized streams, target filters and paging; context capabilities/policy. Staff provisioning stays in the separately authorized backend operator tool. |
| Packaging | Vendored approved contract bytes/pin; complete static artifacts at the required directory prefix; hash-only screen routing; allowlisted public files; noindex and CSP; validation-only Actions workflow. |

The UI does not compute authoritative trust, publication locks, moderation outcomes,
roles or enforcement policy. Published snapshots stay immutable. Reports and model
results are not violations. Corrections do not remove restrictions or restore Auth.
Staging Beta's ordinary fixture rotation is explicitly distinguished from daily
editorial publication.

## Fresh local commands and outcomes

Run from `alles-entertainment-web` with Node 22.20.0. Dependencies were installed
from the lockfile using `npm ci` and `npm run setup`; npm audit reported zero known
vulnerabilities and `npm --prefix editorial-app ls --depth=0` succeeded.

| Command/check | Fresh result |
| --- | --- |
| npm run check | PASS: canonical vendored contract check, TypeScript, ESLint, 111 unit/component tests in five files. |
| npm run contract:local | PASS for the accepted run and final isolated pinned archive. The subsequently modified shared tree correctly blocks this gate; see the note above. |
| EDITORIAL_LEGACY_TESTS=1 npm run test:emulators | PASS: E01–E08, 13 website browser scenarios, original full backend integration and all eight original portal browser tests; one combined run exited 0. |
| npm run test:build | PASS: website-only temporary copy, deterministic duplicate local/Staging/Production builds; invalid environment, contract drift, stale source, changed asset and public-baseline drift rejected. |
| npm run build:local / build:staging / build:prod | PASS: independent explicit projects, 24 files per complete artifact, selected contract/source/bundle manifests. |
| npm run verify:local / verify:staging / verify:prod | PASS: exact artifact/source parity, public-file bytes, directory base, CSP/noindex, no engineering/test/server material, source maps, secret markers or cross-project routing. |
| git diff --check (each repo) | PASS. Step C edits are restricted to six backend Markdown guidance/status documents; subsequent unrelated edits are separately noted above. |

The fresh E01–E08 integration covers independent staff capabilities and player
denial, trusted catalog/preview, publication transactions and replay, audit cursors,
exact-revision review, violations/correction/restrictions and real emulator Auth
compensation, rules denial, epoch changes and erasure. The historical 785-test and
nine-suite Step B report is not counted as fresh Step C evidence; the backend's
aggregate suite was not rerun because its application source was not edited.

## Acceptance coverage

| Required group | Fresh evidence and result |
| --- | --- |
| Migration and old behavior | Original form/controller/components/test patterns retained; new unit suite and separate original portal regression command; no backend source deletion. |
| Session/access | Signed out/restoration, authorized and unlisted identities, E-only/M-only, forged roles, account switching, revoked/disabled sessions, sign-out/late response, failed sign-out and popup/network errors. Unit + built-site + E01/E07/E08. |
| Puzzle lifecycle | List, admitted picker/provenance, invalid/blocked vs warning, create/edit/cancel/reschedule, full preview, publish, immutable lock, concurrent draft preservation, original request identity and NY/DST boundaries. Unit + website + E02/E03. |
| Human moderation | Genuine local submission/consent pipeline, approval/rejection, reports/appeals, unchanged reinstatement, old-report exact revision, stale concurrent decision, expiry/deletion privacy and lost-response receipt reconciliation. Website + E05/E08. |
| Abuse | History, allegations vs confirmed count, explicit restrictions and corrections, original-ID deduplication, unauthorized enforcement denial, severe acknowledgement and Auth compensation. Website + unit + E06/E08. |
| Audit | Authorized streams, denied stream/cursor ownership, resource filter and 20-item pagination, redacted evidence and no private-text dump. Website + E04/E07. |
| Environment/privacy | Separate local/Staging/Production builds; bad mode/project/epoch/contract fail closed; no browser Firestore/Admin, telemetry or evidence persistence. Hostile HTML is text. Direct privileged rules writes denied. |
| Public/static integration | Actual built directory, slashless redirect, refresh/hash/assets/404; all five public routes load; all 18 original public files unchanged including styles/logos/CNAME/robots/sitemap. Editorial absent from navigation/sitemap; noindex present. |
| Accessibility/layout | Axe WCAG 2/2.1/2.2 A/AA-tag checks have zero violations on sign-in, puzzles/preview, moderation, history, audit, overview/access; long evidence at 390/768/1280 px, no horizontal overflow at 200% text, keyboard combobox and dialog focus/Escape/return. Screenshots visually inspected. |
| Safe delivery | Build freshness, deterministic website-only builds, exact revision pair and manifest; no deployment workflow/settings change; detailed Step D order, domains, identity/IAM/index gates, rollback and retirement handoff. |

New coverage lives in `backend.test.ts`, `workspace.test.tsx`, the migrated
`portal.test.tsx`/`api.test.ts`/`community.test.tsx`, and `website.e2e.spec.ts`.
Copied obsolete backend-relative browser harness files were replaced only in the
new website copy; the originals remain untouched and runnable in MisAttribution.

## Resolved findings during the loop

- Global restriction detail reissues actor-bound references; the validator now
  validates the returned subject/target rather than requiring the old token.
- Structurally valid preflight may still be publication-ineligible; save stays blocked.
- Acknowledged mutation receipts remain accepted if the following refresh fails;
  failed reconciliation cannot enable a blind retry.
- Capability refresh/account races clear private state; subject history returns to
  the source case and overview links select the intended queue.
- Expanded axe scans caught low-contrast footer text and transient navigation
  colors; both were corrected without reducing the checks.
- Test setup now waits for completed post-mutation reads before revocation, handles
  the real preflight warning step, and clears only the guarded demo Firestore DB and synthetic Auth accounts
  between suites because E08 intentionally rotates its epoch.
- npm 10 optional-peer recursion required the app's legacy peer resolver; required
  peers are explicit. The final clean online locked install passed after an offline
  attempt reported an uncached package. Compatible Vite/Vitest/transitive security
  updates removed reported advisories; Firebase and React majors were retained.

## Evidence limits and scope

The test runner uses the backend credential-isolation helper and a temporary hashed
copy with recorded loopback-port substitutions. Application acceptance traffic is
local demo only; package downloads and official public documentation lookups are
separate. No live Firebase application read/write, real identity, provider inference,
IAM, DNS, authorized-domain change, deployment, commit or push occurred.

Synthetic Google identities restore through the real Firebase SDK and use actual
local callables. They do not prove a real Google popup, Dave/Jill grants, deployed
rules/indexes/IAM, Safari/Firefox, physical-device accessibility or provider quality.
Automated Chromium checks and visual inspection are local acceptance, not universal
WCAG certification. Those external/user checks remain explicitly in Step D.

Live source flags remain disabled for Community Writing, auto approval, paid
screening/dispatch and scheduled publication; preexisting Staging HaHa is preserved.
Local demo writing is enabled solely by its existing test configuration. The current
public Pages publishing settings remain unverified. Do not publish repository root;
Step D must approve the artifact workflow/publishing source before a potentially
publishing push. Live backend/frontend acceptance remains NOT RUN / NO-GO.

Local full logs, candidate hashes and screenshots stay ignored under `.operations`
and `editorial-app/test-results`; only safe aggregate hashes/status enter the
verification JSON. Parent coordination docs are still unversioned. The frontend
work is uncommitted; a later approved commit/pin change requires a fresh release
record and build. No remaining local implementation blocker is intentionally deferred.
