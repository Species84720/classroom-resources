# AI-authored PowerPoints

## Intake

Use the conversation to fill a brief; never ask again for a detail already supplied:

- `subject`: broad subject, e.g. Mathematics.
- `learning_intent`: what is being taught, e.g. recognise tens and ones in numbers to 50. A subject alone is insufficient.
- `theme`: contextual/visual theme such as dinosaurs, space, ocean or explicitly plain. Keep it distinct from the learning objective and use it in examples, headings and suitable embedded visuals.
- `year_group`: required; no silent Year 2 default.
- `slide_count`: 1–40, including title/recap. Ask how many slides; if unsure, suggest an age-appropriate count and let the teacher choose or explicitly delegate.
- `animations`: ask none, gentle automatic, or click-to-reveal. Normalise to `none`, `gentle`, `click`.

Ask one concise message containing only unanswered questions. For “Make a PowerPoint” ask all six. For “8-slide Year 2 maths PowerPoint on tens and ones to 50, dinosaur theme, click reveals” proceed without repeating intake. If the teacher says “you choose” for count, theme or animation, choose appropriately and state that choice. Do not infer a year group or specific teaching objective from a theme. Ask optional questions only when needed: lesson duration, prior knowledge, curriculum, differentiation/accessibility, language, assessment, speaker notes, teacher-provided examples. Default to UK English, readable 16:9 slides and teacher notes.

## Story and illustration defaults

Automatically use a simple story thread and suitable images when they help explain a slide or establish the requested theme. The teacher does not need to ask for pictures or a story separately. Honour explicit preferences for plain slides, no pictures or a factual presentation. Adapt the style to the year group; do not make older pupils' material babyish.

1. Plan a small narrative alongside the lesson: introduce a friendly character or situation, set a learning-related challenge, use lesson examples to make progress, and end with a resolution and recap. For example, a dinosaur needs to organise eggs into tens and ones. Keep the maths accurate and the story short enough to leave time for learning.
2. Make a visual plan for each slide: choose a useful scene, character cutout or teaching visual, or deliberately leave it text-only when a picture adds clutter. Prefer a clear cover scene and illustrations at key explanation/practice/story moments. Do not force a new decorative picture onto every slide. Reuse a character/setting where this supports continuity.
3. Use the available image-generation skill/tool to generate original story illustrations without an extra teacher prompt. Give it the year group, theme, scene, character appearance, palette and layout needs. Generate the first character/scene, then use that image as a reference for later scenes so appearance and illustration style stay consistent. Keep prompts and a small character/style description in temporary working notes. Inspect each output before embedding.
4. Generate illustrations as separate assets, never as a flattened image of a complete slide. Avoid baked-in titles, captions, numbers and answer text; keep those as editable PowerPoint text. Use native editable objects or deterministically drawn diagrams for exact quantities, mathematical models, labels and scientific facts; do not rely on an image model to get those right. Check every instructional illustration against the learning objective.
5. Copy selected generated images into an `images/` directory next to the plan. Resize/compress to the displayed resolution before embedding (usually 600–900 pixels across and around 20–50 KB per illustration is enough). Respect the studio's 700 KB total deck limit, including base64 overhead and reused image occurrences. Use fewer shared scenes, smaller pictures or simpler illustrations if needed. Keep the original generated assets separately while preparing the deck. Use PNG or JPEG for PowerPoint compatibility.
6. Set `imagePath` relative to the plan for the slide's main picture or an image element, and write meaningful `imageAlt`. The generator embeds local bytes in both deliverables; downloaded slides work offline. The picture can be moved, resized or replaced locally in PowerPoint. Its painted contents remain a raster illustration.

Example slide fragment (merge into the complete plan):

```json
{
  "title": "Help Dara organise the eggs",
  "body": "There are 3 tens and 4 ones.\nHow many eggs are there altogether?",
  "imagePath": "images/dara-at-the-nest.jpg",
  "imageAlt": "Dara the friendly green dinosaur beside a nest, ready to organise the eggs.",
  "layout": "split",
  "notes": "Show an accurate editable tens-and-ones model alongside the illustration. Reveal 34 after pupils explain."
}
```

`imagePrompt` is only a planning aid. Generation rejects an unresolved prompt so it cannot silently deliver an imaginary illustration. The CLI embeds prepared images; it does not call an image model. If an image tool is unavailable or fails, report that limit, use suitable teacher-supplied or correctly licensed images if available, or continue with accurate editable visuals and explain the fallback. Do not claim illustrations were generated when they were not, and do not add a client-side API key.

## Author and generate

This is an agent-assisted workflow: the public static studio has no AI endpoint. Do not claim it can chat with a model. Never put an AI API key in the browser. Use the AI conversation to gather the brief and author a complete plan. Use `presentations/src/ai-powerpoint.js` for intake checks and plan validation.

Write a JSON plan to a temporary working path:

```json
{
  "title": "Dinosaur tens and ones",
  "brief": {
    "subject": "Mathematics",
    "learning_intent": "Recognise tens and ones in numbers to 50.",
    "theme": "Dinosaurs",
    "year_group": "Year 2",
    "slide_count": 2,
    "animations": "click"
  },
  "palette": "meadow",
  "slides": [
    {"title": "Dinosaur numbers", "body": "Can you make 34 using tens and ones?", "notes": "Model three groups of ten dinosaur eggs and four single eggs. Invite pupils to explain.", "layout": "title"},
    {"title": "Show what you know", "body": "A nest has 4 tens and 2 ones.\nHow many eggs are there?", "notes": "Reveal the question on click. Accept 42 and ask how pupils know. Extend: what happens if we add one ten?"}
  ]
}
```

The example demonstrates the format; author the requested number of real slides, never repeat placeholders. Structure an age-appropriate lesson with an opening objective, explanation/models, guided practice, independent check and recap where the slide count permits. Keep answers in notes or separate click-reveal text objects. Use short text, generous spacing and high contrast. A theme must be visible in the content and imagery, not just mentioned in the description. `palette` selects ocean, meadow, sunshine or space; it is separate from the teacher's theme. Use `imagePath` for prepared local illustrations (see above) or embed raster data URIs, with alt text. Optional slide fields and positioned text/image `elements` follow `presentations/src/model.js`. Extra objects remain individually editable in PowerPoint. Avoid copyrighted or private pupil content.

Run from the repository root:

```sh
npm ci
node scripts/generate-powerpoint.mjs /tmp/plan.json /tmp/powerpoint --check
node scripts/generate-powerpoint.mjs /tmp/plan.json resources/<slug>
```

The check exits 2 with missing questions; invalid values exit 1. Generation rejects missing details and slide-count mismatches. It produces `presentation.pptx` and `presentation.json` (studio backup). The AI authors the lesson; the script packages and validates it, without calling a remote model.

## Verify and deliver

Inspect the generated PPTX, not just the JSON: verify slide count, native text/pictures, notes, theme and character consistency, learning accuracy, image quality, alt text and image/text spacing. Make sure the story supports the lesson, pictures are embedded, and no important content has been baked into artwork. Render slides using available presentation tooling and inspect for clipping/readability. Native PowerPoint timing is stored in slide XML; exercise automatic and click reveals, duration/delay and grouped click steps in desktop PowerPoint when available. State when desktop playback could not be checked. Do not equate a ZIP/XML test with verified desktop playback.

The exporter writes native Fade, Rise, Grow and Turn effects, click groups, delay/duration, line reveals, and Fade/Rise slide transitions. These are PowerPoint equivalents of studio effects. Prezi camera movement/nesting becomes the ordered flat slide list; it does not become a PowerPoint zoom camera. No macros are needed. The teacher can change the text, images, notes and animations locally. Studio PPTX import remains simplified and discards original animation data; use the JSON backup to re-edit in the studio without loss.

For public publication, create an accessible `resources/<slug>/index.html` landing page with title, year group, learning intention and relative download links to both files, plus concise instructions to open the PPTX in PowerPoint and import the JSON in Presentation Studio. Write `meta.json` using the normal metadata schema with `resource_type: "powerpoint"`, distinct subject/topics/themes, and relevant labels. Follow the main skill's validation, catalogue and publishing steps. Include the PPTX/JSON files in the same commit so download links work. For a download-only request, return the files directly without public publication.

Report the download URL, slide count, teaching brief, animation choice and any playback verification limitation. Do not claim a deck was generated if only the plan exists.
