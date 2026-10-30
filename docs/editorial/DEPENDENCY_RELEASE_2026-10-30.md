# Dependency release candidate — October 30, 2026

The owner requested scoped dependency synchronization and Staging deployment, then
Production promotion only after its gates pass. This candidate starts from website
`7e7dfa1` on `codex/editorial-step-c`; website main remains unchanged. Unrelated
primary-checkout frontend-contract edits are excluded.

Canonical frontend updates: Playwright 1.64.1, user-event 14.6.8, Node 22 types
22.20.5, TypeScript ESLint 8.72.1, Vite 7.3.7 and Vitest 4.1.12. Reviewed esbuild
0.28.2 install permission is version-pinned for npm 12.2.1. Fresh installation and
112 frontend + 4 release-script tests pass; the npm audit is clean.

The standard contract sync binds backend
`94c235ced122f5a25d814e89c95dc8ec13108f36`, containing dependency/toolchain updates
on backend base `1735920`. Contract bytes and digest remain unchanged. See
[backend maintenance](../../../MisAttribution/docs/DEPENDENCY_MAINTENANCE_2026-10-30.md)
for scope, security limits and the isolated backend's 893-test aggregate result.

A pin and local artifact are not deployment evidence. Staging publication requires
a clean pair, backend Staging attestation, current Hosting occupancy and the normal
guarded exact-artifact plan. Production remains conditional on successful Staging
acceptance and the existing publication/promotion gates. No website-main merge or
public-site deployment is established by this document. Final SHAs, local evidence,
remote parity and deployment outcome are recorded privately in the backend's
`.operations/dependency-release-2026-10-30/`.
