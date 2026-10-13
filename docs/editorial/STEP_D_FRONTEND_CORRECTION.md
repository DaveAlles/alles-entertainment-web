# Staging frontend correction — executed October 13, 2026

**APPROVED AND DEPLOYED.** The owner approved this exact narrow allowance extension
on October 13. The one Hosting correction succeeded at 21:55:56 UTC; the conditional
recovery release was not used. The original backend corrective allowance remains
exhausted. The approved limits were one additional Staging Hosting correction and
one conditional Hosting recovery release if served-file checks failed, within the existing $10 planning
allowance; it is not a hard billing cap. No backend deployment, catalog write,
IAM/policy change, feature activation, Production or website-main publication is
included. The earlier policy exception stays closed.

## Exact candidate and target

| Item | Value |
| --- | --- |
| Website source | `77efc07c58a557b1b555264ffe2359610e660b07` |
| Backend, unchanged | `84004aee0066f574c6dfed4fb325f32aa61f5750` |
| Contract | `editorial-v2`, digest `2f58c00871da4579f30cb471867a00ce1196db7289406d7a71570dd1459a91d0` |
| Staging bundle | `e555cf8cc243f960de280120ff0ee850b140094299eb7771487ca837bef424bc` |
| Project / site | `misattribution-staging` / `misattr-editorial-staging` |
| Previous release replaced | `projects/misattribution-staging/sites/misattr-editorial-staging/channels/live/releases/1791767144327000` |
| Plan SHA-256 | `60e490243a892bde739b5ab57ee5d754b0370fe39e9b4b5a7f1f78809931f7b5` |

The change replaces misleading puzzle-override text for `VIOLATION_EXISTS` with
the violation-specific message. Existing reload and no-automatic-retry safeguards
remain. All other runtime behavior and the backend pin remain unchanged.

## Completed checks

The regression failed before the fix and passed afterward. Typecheck, lint,
112 unit/component tests, four release-guard tests, eight backend emulator groups,
13 website browser tests, contract parity and deterministic/negative artifact
checks passed. The isolated committed candidate rebuilt and verified all 24
Staging files with the same tested source and bundle digests.

The guarded `deploy-staging.mjs --dry-run` passed against the actual current
Hosting release, matching backend attestation, all 52 active function revisions,
invoker policies, matching rules and READY indexes. It performed zero writes.
The initial local dry-run correctly rejected dependency symlinks as untracked
files; copying the existing locked dependencies into ordinary ignored directories
resolved that without changing source or guards.

## Approved execution and recovery procedure

This records the consumed correction procedure. Do not replay its old-occupancy
plan or treat its successful release as authority for another publication.

Use the clean detached candidate at
`../.operations/step-d-frontend-correction-pair/alles-entertainment-web` relative
to the repository root, with the frozen backend next to it. The private exact plan
is `.operations/step-d/duplicate-violation-2026-10-13/staging-correction-plan.json`
in the primary website checkout. Rerun guarded dry-run immediately before apply.
Stop on changed Hosting occupancy, source, backend, rules, indexes or permissions.
Then use the same plan with `--apply`; do not publish from the primary dirty tree.

The wrapper verifies every served file. Repeat signed-out browser checks and verify
the served correction bytes, headers, routing and public-file preservation. These
checks do not replace an authenticated duplicate-violation interaction; retain that
distinction if no new bounded fixture is exercised. Preserve Dave and Jill's grants.

If the new release fails served-file checks, the one conditional recovery release
may restore only the preserved website `6dcae9fbc548b8d52a132643a27697a0c7037604`,
bundle `b43077c7cdb7f3f0daa81a9322b33fed077d21e9b5069b3853a498ed529d35f8`,
against the same backend. Capture the actual intervening release and use a newly
hashed plan with the existing guards. The recovery target is fixed here; this is
not authority to publish a different candidate. Stop after these bounded attempts.

## Verified result and limits

The new Hosting release ends in `1791928552813000`, version `1a8552430058af35`.
Every served file matches the approved artifact. Signed-out desktop/mobile, hash
refresh, headers, 404 and environment isolation checks pass. Dave's existing real
Safari Google session was refreshed onto this artifact and displayed the expected
backend/contract/epoch, all three capabilities, empty queues, zero pending Auth
changes and disabled release flags. No content mutation was performed.

Jill's reported checks passed on the preceding artifact; they are not represented
as a repeat on this correction. The authenticated duplicate-violation interaction
was not repeated live; the regression test and exact served correction bytes pass.
Private approval, dry-run, apply receipt and browser evidence are in
`.operations/step-d/duplicate-violation-2026-10-13/`.

This correction does not resolve the separate trusted-content, real
revoked-Google identity, live same-request retry, retention behavior or broader
release gates in the backend acceptance record.
