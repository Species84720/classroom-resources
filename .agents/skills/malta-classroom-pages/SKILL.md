---
name: malta-classroom-pages
description: Create, catalogue, validate, commit, and publish child-oriented static lesson resources to a public GitHub Pages repository for a teacher in Malta. Use when asked to create, adapt, duplicate, label, publish, or update a classroom web resource. Requires a year group for every resource; asks for it if missing. Defaults to UK English and English language unless another language is requested.
license: MIT
compatibility: Intended for OpenAI Codex with shell, filesystem, git, and network access to an authenticated GitHub repository. Python 3 is used for catalogue and metadata validation scripts.
metadata:
  author: classroom-resource-workflow
  version: "1.0.0"
---

# Malta Classroom Pages

Build static, child-oriented classroom resources and publish them into the configured public GitHub Pages repository.

## Non-negotiable defaults

- Context: teacher in Malta.
- Written English: UK English spelling and conventions.
- Resource language: English unless explicitly requested otherwise.
- Every resource MUST have a `year_group`.
- If the user does not provide a year group, ask for it before creating the resource.
- If another essential instructional detail is genuinely required to make a safe/useful resource, ask for it at the same time. Do not ask for optional details that can be sensibly inferred.
- Keep resources developmentally appropriate for the specified year group.
- Pages must work well on phones, tablets, laptops, and interactive whiteboards.
- No advertising, analytics, trackers, cookies, fingerprinting, social embeds, or third-party telemetry.
- Do not collect names, email addresses, identifiers, free-text student submissions, or other personal data.
- Prefer local assets and browser-native HTML/CSS/JavaScript.
- Do not use external JavaScript libraries unless the user explicitly requests one and it is genuinely necessary.
- Do not require student accounts.
- Avoid unnecessary external network requests.
- Accessibility is mandatory: semantic HTML, keyboard operation, visible focus, sufficient contrast, readable type, labelled controls, and no interaction that depends only on colour.

## Required intake

Before building, establish:

1. `year_group` — REQUIRED. Ask if missing.
2. `learning_intent` — what learners should practise, understand, recognise, create, or demonstrate.
3. `resource_type` — infer when obvious (game, quiz, sorting task, matching, interactive explanation, flashcards, simulator, story activity, etc.).
4. `theme` — optional surface context such as frogs, cars, space, farms, dinosaurs. A theme must never distort the learning objective.
5. `language` — default `en-GB`; use Maltese or another language only when requested.
6. Any content constraints explicitly supplied by the teacher.

Do not force the teacher to supply curriculum codes. Generate useful catalogue labels from the request.

## Metadata model

Every resource lives at:

`resources/<slug>/`

and contains:

- `index.html`
- optional `style.css`
- optional `script.js`
- `meta.json`

`meta.json` MUST conform to [references/METADATA.md](references/METADATA.md).

Important distinction:
- `learning_intent` describes what is being taught/practised.
- `subjects` describes broad curricular areas.
- `topics` describes academic content.
- `themes` describes contextual skins/interests, e.g. `frogs`, `cars`.
- `labels` contains extra retrieval terms useful for emergent curriculum.

This separation is deliberate so the same pedagogical activity can be duplicated with different themes while remaining searchable by the same learning objective.

## Workflow

## Decide whether to create, adapt, or enhance

Before making changes, determine which mode the teacher intends:

### 1. Create new resource
Use when the teacher explicitly asks for a new resource or when no suitable existing resource exists.

### 2. Adapt or duplicate an existing resource
Use when the teacher wants the same underlying activity with a different theme, language, year group, pedagogical level, or substantially different presentation. Preserve the source resource and create a new slug unless the teacher explicitly asks to replace it.

### 3. Enhance an existing resource in place
Use when the teacher asks to improve, fix, extend, polish, modernise, simplify, enrich, debug, redesign, make more accessible, make more mobile-friendly, add questions/features, or otherwise develop an already finished resource.

For enhancement requests:
- Search the repository for the named or most relevant existing resource before creating anything.
- Prefer editing the existing resource in place when the teacher's intent is improvement rather than duplication.
- Preserve the existing folder/slug and therefore its public URL unless the teacher explicitly requests a rename or replacement.
- Preserve the original `created` date in `meta.json`.
- Update only the `updated` date.
- Preserve existing learning intent, year group, subjects, topics, themes, and labels unless the requested enhancement genuinely changes them.
- Add or refine metadata only when it improves discoverability or accurately reflects new functionality/content.
- Inspect the current HTML/CSS/JS before deciding what to change.
- Keep working features unless there is a good reason to replace them.
- Avoid unnecessary rewrites: make the smallest coherent set of changes that fulfils the request.
- Re-run validation and rebuild the catalogue after enhancement.
- Commit with a message such as `Enhance Year 4 fractions resource accessibility` or `Improve frog phonics activity`.
- If the requested change would materially alter the learning objective, difficulty, year group, language, or theme, explain through the implementation choice whether this is better treated as an adaptation/duplicate rather than an in-place enhancement. Prefer preserving the original when both versions are pedagogically useful.

If the user refers to "this resource", "the existing page", "the finished project", "the fractions game", or similar wording, inspect existing resources first instead of automatically scaffolding a new one.

### A. Inspect the repository

1. Confirm you are inside the teacher's classroom-pages repository.
2. Read `README.md`, `resources.json`, and a small number of relevant existing `meta.json` files.
3. Search existing resources by title, slug, learning intent, year group, topic, theme, and labels before deciding whether to create or modify.
4. If the request appears to target an existing resource, inspect that resource's HTML/CSS/JS and metadata before changing anything.
5. Duplication is allowed when the user wants a different theme, presentation, language, year group, or variant. Give the duplicate its own slug and metadata.
6. Enhancement is allowed and encouraged when the user wants to continue development of an existing resource. In that case, preserve the slug/public URL unless explicitly asked otherwise.

### B. Create the resource

1. Choose a short lowercase kebab-case slug.
2. Create `resources/<slug>/`.
3. Build a fully static resource using HTML/CSS/JS.
4. Make the first screen immediately understandable to a child in the specified year group.
5. Include a short teacher-facing learning intention in the resource where useful, but do not expose answers unintentionally.
6. Prefer playful, calm, age-appropriate interaction over visual clutter.
7. Use robust touch targets (roughly 44 CSS px minimum for primary interactions).
8. Ensure the activity remains usable at 320 CSS px width.
9. When scoring is appropriate, keep scoring entirely client-side and ephemeral unless the teacher explicitly asks for another architecture. Do not send results anywhere.
10. If randomness is used, provide a restart/new-round control.
11. If audio is optional, never make audio the sole means of conveying information.

Follow [references/DESIGN.md](references/DESIGN.md).

### C. Create metadata

Create `meta.json` with:
- stable `id` equal to the slug
- child-friendly `title`
- concise `description`
- `year_group`
- `learning_intent`
- `subjects`
- `topics`
- `themes`
- `labels`
- `resource_type`
- `language`
- `estimated_minutes`
- `created`
- `updated`

Use ISO `YYYY-MM-DD` dates.

### D. Validate

Run:

`python3 .agents/skills/malta-classroom-pages/scripts/validate_resource.py resources/<slug>/meta.json`

If the skill is installed elsewhere, use the actual installed skill path.

Then rebuild the catalogue:

`python3 .agents/skills/malta-classroom-pages/scripts/build_catalog.py .`

Again, substitute the actual installed skill path if needed.

Check:
- no broken relative paths
- no tracker/analytics scripts
- no forms that transmit data
- no external font dependency unless deliberately approved
- keyboard operation
- responsive layout
- sensible content at the stated year level
- `resources.json` contains the new resource

### E. Publish

Unless the user explicitly asks for a draft only:

1. `git status`
2. Review the diff.
3. Commit only the intended resource/catalogue changes with a concise message such as:
   `Add Year 3 fractions frog activity`
4. Push to the repository's configured default branch.
5. The included GitHub Pages workflow deploys the site automatically.
6. Report:
   - resource title
   - year group
   - learning intent
   - labels/themes
   - repository path
   - expected public URL based on the configured Pages site

If git authentication or GitHub permissions block the push, do not pretend publication succeeded. Leave the files ready, state the exact blocking step, and provide the command/action needed.

## Catalogue behaviour

The repository root is the public curator. It reads `resources.json` and supports:
- free-text search
- year-group filtering
- subject filtering
- topic/theme/label discovery

Never hand-edit `resources.json` when the build script can regenerate it.

## Enhancement requests

When asked to improve an existing resource:
- edit it in place by default
- preserve its slug and public URL
- preserve `created`
- update `updated`
- keep the learning intent and year group stable unless explicitly changed
- retain working functionality and make targeted improvements
- revalidate and rebuild the catalogue
- do not create a second resource merely because the existing one is already "finished"

Examples of valid in-place enhancement requests include:
- "make this more mobile friendly"
- "add three more levels"
- "improve the instructions"
- "make it more suitable for independent work"
- "add keyboard controls"
- "improve the visual design"
- "fix the scoring bug"
- "add a printable mode"
- "make the feedback more child-friendly"
- "add Maltese labels while keeping the activity in English"

## Adaptation requests

When asked to "make the same resource about cars/frogs/etc.":
- preserve the original learning intent and difficulty unless asked to change them
- duplicate to a new slug
- update `themes` and relevant `labels`
- change surface examples/artwork/text
- do not silently alter the academic objective

When asked to adapt for another year group:
- treat it as a pedagogical adaptation, not merely a visual reskin
- adjust vocabulary, instructions, cognitive load, number ranges/text complexity, scaffolding, feedback, and interaction as appropriate.

## Safety and privacy

These are public pages. Never place:
- student names or photos
- class lists
- private school information
- API keys or secrets
- unpublished assessment answers intended to remain private
- copyrighted textbook scans or other material the teacher has not supplied rights to publish

If the teacher requests content that appears unsuitable for public publication, flag the specific issue before pushing.

## Completion standard

A task is complete only when:
- the resource works as a static page
- metadata is valid
- catalogue is rebuilt
- checks pass
- changes are committed and pushed when publication was requested and authentication permits it
- the teacher receives the public path/URL or a precise publication blocker
