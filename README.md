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

The catalogue and classroom resources have no trackers, analytics or student accounts. The optional Presentation Studio uses Google sign-in through Firebase for teachers, stores a creator UID with each presentation, and uses authentication session storage. Shared presentations (including teaching notes) are public; drafts are creator-only. See the setup guide for details.

## Improving existing resources

You can continue developing a finished resource instead of creating a new one. For example:

`Improve the existing Year 3 fractions game: make it more mobile-friendly, add a second level, and keep the same URL.`

The skill will inspect the existing resource and modify it in place by default.

## Presentation Studio

Use **Create or edit a PowerPoint** in the catalogue to open the studio. It provides classic slides and Three.js zoom journeys, templates, draggable and resizable slide items, undo/redo, individually animated text boxes and images, freely arranged nested slides, slide ordering, keyboard/full-screen playback, simple `.pptx` import/export and JSON backups. Published presentations appear under the **PowerPoints** type filter.

**One-time configuration is required for Google login and saving:** follow [Presentation Studio setup](presentations/SETUP.md) to connect Firebase Authentication and Firestore and deploy the creator-only security rules. Until configured, the example presentation is available but creating/editing is disabled.

Development: `npm ci`, `npm test`, `npm run build:site`. The Pages workflow builds and publishes `_site/`. Existing resources retain their URLs.
