# Child-oriented static page design guide

## General

Design for the specified year group rather than using one universal "kids" style. Keep the interface calm, legible and playful. Use short instructions and reveal complexity progressively.

## Early primary

- Very short instructions.
- Large controls and generous spacing.
- Concrete examples and visual cues.
- Minimal reading burden unless literacy is the learning objective.
- Immediate, encouraging feedback.
- Avoid timers unless the teacher asks for them.

## Middle/upper primary

- Clear task framing.
- Slightly denser information is acceptable.
- Support independence with examples, hints, reset/retry, and visible progress.
- Avoid patronising language or babyish decoration.

## Accessibility

- Semantic landmarks and headings.
- Buttons are actual `<button>` elements.
- Inputs have labels.
- Visible keyboard focus.
- All interactive controls usable by keyboard.
- Do not use colour as the only success/error cue.
- Respect `prefers-reduced-motion`.
- Avoid rapid flashing.
- Use system font stacks by default.
- Include appropriate `lang` attribute.
- Use an informative `<title>` and meta viewport.

## Privacy and networking

Default to zero external requests. Do not include:
- Google Analytics
- Meta Pixel
- advertising scripts
- tracking pixels
- session replay
- CDN-hosted JS libraries
- external web fonts
- forms that POST data

If imagery is needed, prefer CSS, inline SVG created specifically for the resource, emoji where pedagogically appropriate, or teacher-provided/licensed local files.
