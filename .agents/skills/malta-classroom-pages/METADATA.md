# Resource metadata schema

Each `resources/<slug>/meta.json` must be a JSON object with these fields.

```json
{
  "id": "frog-counting-to-20",
  "title": "Frog Pond Counting",
  "description": "A touch-friendly counting activity using frogs in a pond.",
  "year_group": "Year 1",
  "learning_intent": "Count, recognise and match quantities and numerals to 20.",
  "subjects": ["Mathematics"],
  "topics": ["number", "counting", "numeral recognition"],
  "themes": ["frogs", "pond life"],
  "labels": ["emergent curriculum", "animals", "touch activity", "independent practice"],
  "resource_type": "interactive game",
  "language": "en-GB",
  "estimated_minutes": 10,
  "created": "2026-09-09",
  "updated": "2026-09-09"
}
```

## Rules

- `id`: lowercase kebab-case and identical to the containing folder name.
- `title`: human-readable, child/teacher friendly.
- `description`: one or two sentences.
- `year_group`: required, non-empty. Prefer Malta school labels such as `Year 1`, `Year 2`, etc. Use another explicitly requested grouping if appropriate.
- `learning_intent`: required and pedagogical, not thematic. "Practise addition bonds to 10" is good; "learn about frogs" is only good if frogs themselves are the subject matter.
- `subjects`: one or more broad areas, e.g. Mathematics, English, Science, Maltese, Social Studies, Art, PSCD.
- `topics`: academic concepts/skills.
- `themes`: contextual interests or skins. Empty array is allowed.
- `labels`: flexible retrieval vocabulary. Include synonyms or emergent-curriculum hooks that make discovery easier, without keyword stuffing.
- `resource_type`: e.g. interactive game, quiz, matching task, sorting task, explainer, simulator, story activity, flashcards.
- `language`: BCP-47 style tag; default `en-GB`. Use `mt-MT` for Maltese when requested.
- `estimated_minutes`: positive integer.
- `created` and `updated`: ISO dates `YYYY-MM-DD`.

Arrays must contain unique, non-empty strings.
