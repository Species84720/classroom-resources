export const MAX_SLIDES = 40;
export const THEMES = {
  ocean: { background: '#e8f4fa', ink: '#123c50', accent: '#147a96' },
  meadow: { background: '#eef6e6', ink: '#27432c', accent: '#437844' },
  sunshine: { background: '#fff4d9', ink: '#513719', accent: '#956019' },
  space: { background: '#17243d', ink: '#ffffff', accent: '#b9d6ff' },
};
export function newSlide(title = 'Your slide title', body = 'Add an explanation, a question or an activity.') {
  return { title, body, image: '', imageAlt: '', layout: 'split', animation: 'fade', notes: '' };
}
export function newDeck(template = 'lesson') {
  const slides = template === 'blank' ? [newSlide()] : template === 'quiz' ? [
    newSlide('Let’s think!', 'Look carefully. Talk to your partner.'),
    newSlide('What do you notice?', 'Share your ideas with the class.'),
    newSlide('Show what you know', 'Explain how you found your answer.'),
  ] : [
    newSlide('Our learning adventure', 'Today we are learning something new.'),
    newSlide('Let’s explore', 'What can you see? What do you already know?'),
    newSlide('Your turn', 'Try it together. Explain your thinking.'),
    newSlide('What have we learnt?', 'Tell your partner one thing you learnt today.'),
  ];
  return { title: 'Untitled presentation', description: '', year_group: 'Year 2', subject: 'General', mode: 'classic', theme: 'ocean', slides };
}
function text(value, max, label) {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} is too long or invalid.`);
  return value;
}
export function validateDeck(raw) {
  if (!raw || !Array.isArray(raw.slides) || !raw.slides.length || raw.slides.length > MAX_SLIDES) throw new Error('Use between 1 and 40 slides.');
  if (!['classic', 'zoom'].includes(raw.mode) || !Object.hasOwn(THEMES, raw.theme)) throw new Error('Unknown presentation style.');
  const deck = {
    title: text(raw.title, 120, 'Presentation title').trim(),
    description: text(raw.description, 600, 'Description'),
    year_group: text(raw.year_group, 40, 'Year group').trim(),
    subject: text(raw.subject, 60, 'Subject').trim(), mode: raw.mode, theme: raw.theme,
    slides: raw.slides.map(s => {
      if (!s || !['split', 'title', 'image'].includes(s.layout) || !['none', 'fade', 'rise', 'reveal'].includes(s.animation)) throw new Error('Unknown slide layout or animation.');
      const image = text(s.image, 600000, 'Image');
      if (image && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) throw new Error('Use an uploaded PNG, JPEG or WebP image.');
      return { title: text(s.title, 180, 'Slide title'), body: text(s.body, 2500, 'Slide text'), image, imageAlt: text(s.imageAlt, 200, 'Image description'), notes: text(s.notes, 3000, 'Notes'), layout: s.layout, animation: s.animation };
    }),
  };
  if (!deck.title || !deck.year_group || !deck.subject) throw new Error('Add a title, year group and subject.');
  if (new TextEncoder().encode(JSON.stringify(deck)).length > 700000) throw new Error('Presentation is too large. Use fewer or smaller images (700 KB limit).');
  return deck;
}
export function moveSlide(slides, from, to) {
  if (from < 0 || from >= slides.length || to < 0 || to >= slides.length) return from;
  const [slide] = slides.splice(from, 1); slides.splice(to, 0, slide); return to;
}
export function canEdit(record, user) { return !!user && !!record && record.ownerId === user.uid; }
export function demoDeck() {
  const deck = newDeck();
  deck.title = 'A little learning adventure'; deck.description = 'Preview classic slides or take a zooming journey.';
  deck.slides = [newSlide('Big ideas. Little explorers.', 'A presentation studio for curious classrooms.'), newSlide('Look. Think. Wonder.', 'What do you notice?\nWhat would you like to find out?'), newSlide('Make learning move', 'Use the arrows to explore.\nTry Zoom journey for a different view.'), newSlide('Ready for your next lesson?', 'Sign in with Google to create and save your own presentation.')];
  return deck;
}
