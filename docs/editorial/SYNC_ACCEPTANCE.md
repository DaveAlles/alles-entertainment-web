# Editorial repository sync acceptance

The owner authorized committing and synchronizing all pending changes after Step C,
including the separately implemented 175-code-point system-story limit. This record
supersedes the shared-checkout blocker in the historical
[Step C acceptance](STEP_C_PROGRESS.md). Deployment and live acceptance remain Step D.

## Candidate and destinations

- Backend: `3cf524c18f847d66fac236eb24f177d2f6dae835`, on `main`.
- Website: `codex/editorial-step-c`, based on published `main` at
  `668651491975317f38b4166aaf276153724b5b2f`. Resolve the exact source commit from the
  commit containing this record and confirm a clean checkout before release.
- Website source digest:
  `797ae3be4a01e5faef5625c78b2acba91a1c29f8072164944326102e691c4f68`.
- API contract remains `editorial-v2`, digest
  `2f58c00871da4579f30cb471867a00ce1196db7289406d7a71570dd1459a91d0`.

The approved export bytes did not change. The website explicitly repinned only after
the backend source/tests were committed. The backend's new system-story validator
accepts 175 Unicode code points and rejects 176; Community submissions retain their
separate 280-grapheme contract. The Editorial UI already preserves complete evidence
text and has no 130-character cap. The legacy portal and live feature flags are unchanged.

## Local verification

Fresh check-in checks use Node 22.20.0 and credential-free demo emulators. The current
machine-readable evidence is [SYNC_VERIFICATION.json](SYNC_VERIFICATION.json).

| Check | Result |
| --- | --- |
| Backend `npm run test:all` | PASS: 795 tests, typechecks, lint, builds and both retained-portal security gates. |
| Backend generated-story source parity and isolated UI typecheck | PASS. |
| Website `npm run contract:sync` / `contract:local` | PASS against committed backend and canonical export. |
| Website `npm run check` | PASS: 111 tests in five files, TypeScript and ESLint. |
| `EDITORIAL_LEGACY_TESTS=1 npm run test:emulators` | PASS: E01–E08, all 13 website browser scenarios, full original backend integration and all eight original portal browser tests; combined exit 0. |
| Website `npm run test:build` | PASS: repeatable standalone builds for all three environments and all negative artifact gates. |
| Local, Staging and Production build/verify | PASS: 24 files per artifact; exact contract/source/project/bundle checks. |
| Whitespace, original public bytes and change-scope review | PASS. |

The static/browser checks do not prove native fit at the new maximum or real Google,
provider, Apple, live Firebase or Production readiness. The existing native and live
acceptance limits remain explicit; no provider requests, feature activation or
deployment were part of this synchronization.

## Why the website uses a separate branch

Read-only GitHub inspection found a successful
[Pages build and deployment for current main](https://github.com/DaveAlles/alles-entertainment-web/actions/runs/38094013106),
at `668651491975317f38b4166aaf276153724b5b2f`. The settings page could not be read while
signed out, but that run establishes that `main` has auto-published. The website
check-in therefore uses a separate branch and leaves `main` unchanged. The new
workflow is validation-only, has no push trigger and grants no deployment permission.
The backend's latest inspected main CI run completed with its Staging job skipped.

Publishing-source settings and a deployment workflow that uploads only `dist/prod/`
must be approved under [Step D](STEP_D_HANDOFF.md) before merging the engineering
source into a publishing branch. No Pages, DNS, IAM or Firebase settings were changed.

## Parent coordination documents

The five parent Markdown files remain outside both Git repositories. This sync
does not capture them. The previously proposed preservation migration has not been
authorized or performed; no third repository or repository restructuring was added.
Keep the parent workspace when handing off, and do not describe Git synchronization
as a backup of the entire coordination directory.
