# Editorial website integration

Status: **Step A design; no editorial route implemented here yet.**

This repository owns the public website and future editorial UI/routing/browser
auth/deployment. Authoritative backend data contracts, security policy and
editorial business logic belong to MisAttribution.

- [Frontend contract](frontend-contract.md): verified hosting, migration, screens and acceptance.
- [Backend authority](../../../MisAttribution/docs/editorial/backend-contract.md): API operations, permissions, workflows and data boundaries.
- [Cross-repository architecture](../../../docs/editorial/architecture.md) and
  [implementation plan](../../../docs/editorial/implementation-plan.md): decisions and Steps B/C/D.
- [Existing portal source](../../../MisAttribution/editorial-portal/src/App.tsx)
  and [original portal report](../../../MisAttribution/docs/backend/EDITORIAL_PORTAL.md): reuse before replacement.

The parent documents are not Git tracked. Until their recommended relocation into
an existing repository is authorized, preserve/share the whole coordination folder.
Backend API details are intentionally not repeated in this repository.
