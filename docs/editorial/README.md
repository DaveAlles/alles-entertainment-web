# Editorial website

Current checkpoint: [Step D progress](STEP_D_PROGRESS.md),
[release manifest](STEP_D_RELEASE_MANIFEST.json) and [website runbook](STEP_D_RUNBOOK.md).
The approved Staging pair is deployed and served artifacts are verified. Dave's
real Google session and approved capabilities pass; bounded moderation/recovery
acceptance is recorded in the backend's
[October 13 report](../../../MisAttribution/docs/editorial/STEP_D_BOUNDED_ACCEPTANCE.md).
Jill's independent identity/grant verification and her reported browser checks pass.
Other release gates remain pending. Production and website-main publication
remain blocked.

The canonical frontend is [editorial-app](../../editorial-app/). The old
backend portal remains intact for regression checks and rollback; retirement
requires separate authorization.

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
