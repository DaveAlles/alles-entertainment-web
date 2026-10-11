# Alles Entertainment website

Initial public website for **Alles Entertainment LLC**, an independent game studio in Seattle, Washington.

## Editorial application

The migrated React Editorial frontend is in `editorial-app/`. It builds at
`/misattribution/editorial/` inside an allowlisted complete static-site artifact.
The public pages remain static and unchanged. Start at
[Editorial documentation](docs/editorial/README.md) for setup, local acceptance
and the separately authorized Step D handoff. No frontend or backend was deployed.

## Contents

- `/` — studio home
- `/misattribution/` — minimal public page for MisAttribution
- `/about/` — studio identity and founders
- `/contact/` — public company contact
- `/privacy/` — website privacy policy

The public pages remain dependency-free. Editorial build/test dependencies are isolated in `editorial-app/`.

## Local preview

From the repository root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages deployment

The inherited hosting arrangement is documented as main-branch-root Pages with
`CNAME` set to `www.alles-entertainment.com`; live settings were not verified.
Do not publish the new source tree indiscriminately. Step C adds a validation-only
workflow and reproducible `dist/local`, `dist/staging`, `dist/prod` site artifacts.
The deployable Production directory is **dist/prod/**, never the repository root.

The owner authorized Git sync after Step C. GitHub's successful Pages run for
`6686514` confirms that `main` has auto-published, so the new source is synchronized
on `codex/editorial-step-c` while the published branch stays unchanged. See
[sync acceptance](docs/editorial/SYNC_ACCEPTANCE.md) for the current candidate and
fresh tests. A merge into `main` remains a publishing action subject to Step D.

[Step D](docs/editorial/STEP_D_HANDOFF.md) must separately verify and approve the
publishing source, guarded artifact workflow and exact compatible revision pair
before pushing to an automatically published branch or deploying. No setting or
DNS was changed. Run `npm run build:local && npm run preview` to inspect the full
assembled site locally at `http://127.0.0.1:4174`.

## Before public launch

1. Make sure `hello@alles-entertainment.com` exists and can receive mail.
2. Review the public copy.
3. Enable GitHub Pages for the repository.
4. Point Squarespace DNS to GitHub Pages and configure the custom domain.
5. Confirm both HTTPS and the `www` URL work publicly.

## Branding

Alles Entertainment uses the **Deep Purple v2** brand system. The primary brand color is `#5B21B6`, paired with black and white. The website preserves the production logo geometry, typography, and spacing while using Deep Purple for the Alles mark and studio accents. MisAttribution keeps its own product identity within that studio system.
