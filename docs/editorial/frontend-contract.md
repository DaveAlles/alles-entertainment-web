# Editorial frontend contract

Current verification: [Step D progress](STEP_D_PROGRESS.md) and
[release manifest](STEP_D_RELEASE_MANIFEST.json). The existing contract/source pair
passed fresh local gates. The guarded website-owned Staging deployment/predeploy path is implemented locally;
publication and live acceptance await approval. The [runbook](STEP_D_RUNBOOK.md)
records exact-pair/attestation/served-artifact requirements and delivery ownership.

Status: implemented locally in Step C, October 10, 2026; undeployed. See the
[current sync acceptance](SYNC_ACCEPTANCE.md), [original Step C record](STEP_C_PROGRESS.md)
and [Step D handoff](STEP_D_HANDOFF.md).
This document owns browser behavior, packaging and testing. API semantics remain
in MisAttribution's [backend contract](../../../MisAttribution/docs/editorial/backend-contract.md)
and normative [Step B amendments](../../../MisAttribution/docs/editorial/STEP_B_CONTRACT.md).

## Ownership and migration

`editorial-app/` is the intended canonical UI. It reuses the original portal's
React 18, Firebase web SDK, session persistence, Google popup, override form,
canonical speaker combobox, validation feedback, date rows, dialogs, race guards,
styles and regression tests. `Puzzles.tsx` retains the original puzzle controller;
new workspace, preview, history and audit components extend it. Community now uses
the same validated callable transport as the rest of the app. No BFF, Firestore
client or Admin SDK is part of the application.

The backend's `editorial-portal/` stays untouched until a separately authorized
Step D cutover verifies live parity and a compatible rollback. Backend scripts
still reference it; moving those references and retiring its hosting is Step D
work. Do not develop two permanent frontends.

## Contract and environment

`editorial-app/backend-pin.json` pins the reviewed backend commit
`84004aee0066f574c6dfed4fb325f32aa61f5750`, `editorial-v2` and digest
`2f58c00871da4579f30cb471867a00ce1196db7289406d7a71570dd1459a91d0`.
The three byte-identical approved browser exports and manifest are in
`src/contract/`. The export generation-base SHA is not the containing backend SHA.
This pin includes the separately approved 175-code-point system-story limit.
The frontend displays complete story/evidence text without a 130-character cap;
Community submissions retain the backend's separate 280-grapheme contract.

`npm run contract:check` verifies the vendored bytes, manifest and pin without
private-repository access. Every build runs it. `npm run contract:local` additionally
checks the canonical source and pinned Git revision, export consistency, HEAD and
absence of backend implementation edits. Documentation-only backend changes are
allowed. An approved backend update requires a committed backend candidate,
review of the amendments, `npm run contract:sync`, diff review, tests and new pair
acceptance. Do not blindly sync a new version to silence a gate.

`backend.ts` validates the eleven new callable responses plus Community list and
decision; `api.ts` preserves validation for the seven existing puzzle operations.
The runtime envelope checks contract, environment, project, exact backend revision
and server time; epoch-bound requests and mutation receipts are correlated.
Local alone accepts the backend's `local` revision marker. Global restriction
detail legitimately issues a new actor-bound subject token, validated against the
returned target. Unknown/contradictory responses cannot enable actions.

`config.ts` requires an explicit build environment. Public Firebase web settings
are compiled from `environments.json`; these are not administrative credentials.
Local uses only demo-misattribution and fixed loopback ports. Staging targets
misattribution-staging; Production targets misattribution-aa1e2. No query or browser
storage override exists, and there is no fallback between projects. Every screen,
including sign-in, displays environment and project. Authorized screens show epoch.

## Static route and artifact

The intended Production URL is
`https://www.alles-entertainment.com/misattribution/editorial/`.
`npm run build:prod` creates `dist/prod/misattribution/editorial/index.html` and
hashed assets with that Vite base. Local/Staging builds have separate directories.
Only six screen names occur in hash navigation; no case, subject, note or token
enters a URL. Directory indexes, trailing slash, refresh and hashes require no SPA
fallback. Arbitrary child paths return 404. Public pages remain separate static HTML.

`scripts/site.mjs` copies the original public-file allowlist plus the compiled app,
CNAME, robots, sitemap, 404 and `.nojekyll`. It validates original files byte for
byte, inventories/hashes the complete artifact, scans environment and source
boundaries and rejects stale source or altered output. The public nav and sitemap
have no Editorial link. Entry HTML has noindex/nofollow/noarchive, no-referrer and a
meta CSP limiting scripts, frames and connections to the selected SDK/API origins.
No source maps, fixtures, engineering Markdown, backend source or credentials ship.
A public bundle is not an access-control boundary; the backend authorizes all calls.

The build manifest records backend pin, website base commit, frontend source digest,
environment/project and exact file/bundle hashes. While work is uncommitted, the
base commit alone is not the frontend revision. A later commit must be rebuilt and
recorded as the reviewed release pair. Builds are reproducible from the website
alone; the private repo is needed only for canonical parity and emulator integration.

The inherited README describes branch-root GitHub Pages. Live publishing settings
were not authenticated/verified. **Do not push this source tree to an automatically
published branch root.** The new validation-only Actions workflow uploads the
allowlisted artifact and has no deploy job, Pages write permission or push trigger.
Step D must verify/approve Pages publishing-source configuration and add the guarded
publication job. No Pages setting, DNS or live workflow was changed in Step C.
GitHub's [custom-workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
and [publishing-source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
documentation define the later artifact publishing path.

## Authentication, privacy and recovery

Firebase owns browserSessionPersistence and token refresh. Google popup/account
selection and reauthentication use its SDK. Before any private read, the shell
loads getEditorialContext and uses independent editor/moderator/admin capabilities.
Display names, emails and forged local roles cannot grant access. Dave/Jill require
separate per-project server provisioning later; no identity is hardcoded.

Signed-out/restoring/connecting/checking/authorized/denied/permission-missing,
network/expired/revoked and sign-out failure states are explicit. Sign-out clears
protected UI before awaiting SDK completion. Account generations and request guards
prevent old results restoring previous data. Fatal authority/scope failures unmount
protected state. Returning to a visible tab after a minute rechecks context and
active reads; changed epoch/capabilities/policy/features requires fresh authorization.
No permanent listeners or rapid polling are added.

Private evidence, notes, pending intents, cursors and subject refs stay in memory.
There is no telemetry, replay, service worker, localStorage evidence cache or raw
response logging. Untrusted text is rendered by React. Provenance links accept
HTTP(S), reject embedded credentials and use noopener/noreferrer. Read errors are
not empty queues. Temporary references must be refreshed after expiry.

Each deliberate mutation gets one request ID and the authoritative expected
versions. Confirmation states environment/project, target, version, reason and
effect. Production also sends the server-required confirmation and reauthenticates
before sending. Whole-account disable adds explicit acknowledgement. Duplicate
clicks are locked synchronously. On conflict, reload authoritative state; puzzle
drafts remain until the editor deliberately reloads. Unknown outcomes block new
actions, require successful current-state reconciliation, then offer deliberate
retrieval using the exact original request/ID. An accepted receipt remains accepted
when its subsequent refresh fails. Refresh and receipt errors stay visible.

Google popup is compatible with static hosting; keep the configured Firebase
`project.firebaseapp.com` authDomain, whose hosted handler the SDK needs. Adding the
public site hostname to Firebase authorized domains is a separate Step D action.
Do not change authDomain to GitHub Pages without a supported handler arrangement.
Real popup/domain/storage behavior remains unverified; see Firebase's
[Google sign-in](https://firebase.google.com/docs/auth/web/google-signin) and
[redirect guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices).

## Screen inventory

| Area | Implemented behavior |
| --- | --- |
| Overview | Authorized queue counts, oldest/capped/as-of indicators, publication status, feature flags and unknown/available health. Epoch failure is distinct from zero work. |
| Puzzles | Server-selected NY dates; existing create/edit/cancel/reschedule and speaker search; admitted quote picker/search/paging/provenance; blocking trust vs warning feedback; arbitrary date preview; complete board; admin publication confirmation and immutable locks; audit navigation. |
| Community | Priority/time paged reviews/reports/appeals/global restrictions, case-reference lookup, exact reported/current revision, retained evidence/context/pseudonym, screening/history, expiry and human notes. Only returned actions appear; confirm decisions and reload authoritative detail. |
| Abuse | Subject/reporter history, return to source case, bounded reports/appeals/recent decisions and paged global journal; confirmed/corrected counts; selected supporting decision; explicit violations, restrictions, reporter limits, A+M disable and correction; separate Auth pending state. Fresh global restriction discovery enables legacy recovery. |
| Audit | Capability-specific puzzle/community/access streams, target filter and bounded pagination; safe action/actor/reason/time/version/causal references. No arbitrary records, text export or legal identity lookup. |
| Access/policy | Current capabilities and finite policy/feature states; explicit separately authorized operator tooling requirement. No browser staff-grant action exists in the approved API. |

Violations never automatically sanction; corrections never silently reinstate
content/Auth. Reports are allegations, screening is advisory, and source concerns
remain distinct. Immutable published puzzles have no edit/undo action. Preview uses
server readiness; NY default date uses server time and has DST boundary tests.
Staging's normal player gameplay still uses fixture cycles; an editorial daily
snapshot is not proof of changed Beta gameplay.

## Reproducible local commands

Node 22.12+ (22.x), npm; run in this repository:

```sh
npm ci
npm run setup
npm run contract:local
npm run check
npm run build:local
npm run build:staging
npm run build:prod
npm run verify:local
npm run verify:staging
npm run verify:prod
npm run test:build
npm run preview
```

The app's `.npmrc` uses npm's legacy peer resolver to avoid an npm 10 recursion bug;
required Testing Library peers are explicit and the lockfile is committed material.
`check` runs contract parity, TypeScript, ESLint and component/transport tests.
`preview` binds 127.0.0.1:4174 and verifies artifact freshness before serving. Stop it
with Ctrl-C. Public-only preview can still use Python, but never expose the repository
root as the deploy artifact.

Full local integration needs the pinned sibling backend with its four package
installs, Java 21 and matching Playwright Chromium:

```sh
EDITORIAL_LEGACY_TESTS=1 npm run test:emulators
```

Set JAVA_HOME and PLAYWRIGHT_BROWSERS_PATH when not using the previously installed
local runtimes. The runner creates a hashed temporary backend copy, substitutes only
loopback ports, builds it and invokes the backend's credential-scrubbing emulator
helper. Ports: Firestore 28080, Auth 29099, Functions 25001, preview 4174. It does not
stop other processes or modify backend source. It clears only its guarded demo
Firestore/Auth emulator state between suites to isolate epochs and synthetic identities. E01–E08 precede the actual built-site
browser suite; the legacy flag also runs original generator/API and portal checks.
Debug-only EDITORIAL_BROWSER_ONLY/EDITORIAL_BROWSER_GREP do not count as full
acceptance. Logs/candidate hashes are ignored under `.operations/step-c/`.

Browser identities are synthetic Google IdP sessions issued by the Auth emulator;
the fixture installs SDK session state, then the real built Firebase client restores
it and calls the emulators. This proves local callable/session behavior, not a real
Google popup, real Dave/Jill access or deployed IAM. Provider quality, physical-device
and live player effects are separate release evidence.
