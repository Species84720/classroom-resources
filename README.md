# Classroom Resources — GitHub Pages

A public, static catalogue of classroom web resources designed for a teacher in Malta.

## One-time setup

1. Create a **public GitHub repository** and copy this starter repository into it.
2. Put the `malta-classroom-pages` skill in `.agents/skills/malta-classroom-pages/` in this repository, or install it in your Codex skills location.
3. Push to GitHub.
4. In GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Run or re-run the included **Deploy GitHub Pages** workflow.
6. Use Codex in this repository and ask for a resource, e.g.:
   `Create a Year 2 interactive resource for practising number bonds to 20 using a frog theme, then publish it.`

The skill creates a resource under `resources/<slug>/`, writes searchable metadata, rebuilds `resources.json`, validates the page, commits, and pushes. GitHub Actions publishes the updated static site.

## Catalogue metadata

Resources are searchable independently by:
- year group
- learning intention
- subject
- academic topic
- theme/context
- free-form labels
- resource type
- language

This means two resources can teach the same concept but have different themes such as frogs, cars, football, space, or a current classroom interest.

## Privacy

The starter site has no trackers, cookies, analytics, accounts, or student-data collection.

## Improving existing resources

You can continue developing a finished resource instead of creating a new one. For example:

`Improve the existing Year 3 fractions game: make it more mobile-friendly, add a second level, and keep the same URL.`

The skill will inspect the existing resource and modify it in place by default.
