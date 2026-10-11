# Editorial website

Current checkpoint: [Step D progress](STEP_D_PROGRESS.md),
[release manifest](STEP_D_RELEASE_MANIFEST.json) and [website runbook](STEP_D_RUNBOOK.md).
The reconciled pair passed fresh local acceptance; live discovery/deployment and
real-user acceptance remain incomplete. No site/configuration change occurred.

The intended canonical frontend is now [editorial-app](../../editorial-app/).
Step C migrates and extends the existing backend-owned React portal. The old
portal remains intact for regression checks and rollback until Step D cutover.
Step C passes local acceptance. Nothing here has been deployed.

- [Frontend contract](frontend-contract.md): source, routes, auth, workflows and commands.
- [Step C acceptance](STEP_C_PROGRESS.md): inspected baseline, fresh checks and limits.
- [Sync acceptance](SYNC_ACCEPTANCE.md): committed backend pin, refreshed checks and safe Git destinations.
- [Step D handoff](STEP_D_HANDOFF.md): exact release prerequisites and owner actions.
- [Backend authority](../../../MisAttribution/docs/editorial/backend-contract.md),
  [Step B amendments](../../../MisAttribution/docs/editorial/STEP_B_CONTRACT.md), and
  [approved export](../../../MisAttribution/docs/editorial/export/manifest.json).
- Parent [architecture](../../../docs/editorial/architecture.md),
  [implementation plan](../../../docs/editorial/implementation-plan.md) and
  [verification](../../../docs/editorial/verification.md).

The website public repository carries only approved browser contracts, frontend
source, synthetic tests and public-safe engineering guidance. The assembled site
contains only the original public files and the compiled Editorial application.
Sibling links are for the local coordination workspace; CI needs no private repo.
Parent documents remain outside Git. No preservation migration was authorized.
