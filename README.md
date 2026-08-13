# Alles Entertainment website

Initial public website for **Alles Entertainment LLC**, an independent game studio in Seattle, Washington.

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

The current boxed `A` and typography are intentionally temporary. They provide a restrained studio identity for V1 without locking Alles Entertainment or MisAttribution into a final logo system.
