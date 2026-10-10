# Alles Entertainment website

Initial public website for **Alles Entertainment LLC**, an independent game studio in Seattle, Washington.

## Editorial integration design

See [docs/editorial/README.md](docs/editorial/README.md) for the Step A design and
the proposed private editorial route. No editorial application or route has been
added to this repository yet. Backend authority remains in MisAttribution.
Step C proposes an allowlisted Pages build before publishing engineering docs or
the app; the existing branch-root publishing model must not expose internal files.

## Contents

- `/` — studio home
- `/misattribution/` — minimal public page for MisAttribution
- `/about/` — studio identity and founders
- `/contact/` — public company contact
- `/privacy/` — website privacy policy

The site is deliberately static and dependency-free so it can be deployed quickly and maintained with essentially no infrastructure.

## Local preview

From the repository root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages deployment

This repository is designed to be published directly from the `main` branch root using GitHub Pages. The included `CNAME` file sets the intended custom domain to:

`www.alles-entertainment.com`

After enabling Pages and configuring DNS, enable HTTPS in GitHub Pages settings.

## Before public launch

1. Make sure `hello@alles-entertainment.com` exists and can receive mail.
2. Review the public copy.
3. Enable GitHub Pages for the repository.
4. Point Squarespace DNS to GitHub Pages and configure the custom domain.
5. Confirm both HTTPS and the `www` URL work publicly.

## Branding

Alles Entertainment uses the **Deep Purple v2** brand system. The primary brand color is `#5B21B6`, paired with black and white. The website preserves the production logo geometry, typography, and spacing while using Deep Purple for the Alles mark and studio accents. MisAttribution keeps its own product identity within that studio system.
