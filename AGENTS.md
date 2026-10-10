# Website engineering instructions

- Read `README.md`, `docs/editorial/README.md` and the parent `../AGENTS.md`.
  Inspect this repository's Git status and preserve unrelated changes.
- The public site is currently static HTML/CSS with GitHub Pages hosting. Do not
  introduce a site-wide framework or change hosting/DNS without task authority.
- This repository owns editorial presentation, browser authentication, routing,
  feedback and web deployment. MisAttribution owns authoritative schema, APIs,
  security policies, game behavior, moderation, abuse enforcement and audit.
- Before changing editorial API usage or backend assumptions, read
  `../MisAttribution/docs/editorial/backend-contract.md`, inspect its source
  contracts and coordinate the producer/consumer change. Never implement trusted
  role, publication, moderation or environment decisions in the browser.
- Follow `docs/editorial/frontend-contract.md` and parent
  `../docs/editorial/implementation-plan.md`. The existing portal remains in
  MisAttribution until the separately authorized Step C migration.
- Keep privileged content out of static artifacts, source maps, telemetry,
  browser persistence and public navigation/sitemaps. A hidden route is not an
  access control. Validate every backend response and clear state on sign-out.
- Keep backend and website revision/contract evidence together. Test real
  directory routing without SPA rewrites and verify public-page regressions.
- Update the owning document and cross-links when interfaces change; do not copy
  the backend specification here. Parent documents are currently unversioned.
- No commit, push, deployment, credential/IAM/provider action or live mutation
  without user authorization. Step A permits Markdown changes only.
