import { uid, normaliseAnimation, defaultCanvas, framesFor, number } from './features.js';
export const MAX_SLIDES = 40;
export const THEMES = {
  ocean: { background: '#e8f4fa', ink: '#123c50', accent: '#147a96' },
  meadow: { background: '#eef6e6', ink: '#27432c', accent: '#437844' },
  sunshine: { background: '#fff4d9', ink: '#513719', accent: '#956019' },
  space: { background: '#17243d', ink: '#ffffff', accent: '#b9d6ff' },
};
export function newSlide(title = 'Your slide title', body = 'Add an explanation, a question or an activity.') {
  return { id:uid(), parentId:null, canvas:null, animations:{}, elements:[], title, body, image: '', imageAlt: '', layout: 'split', animation: 'fade', notes: '' };
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
    slides: raw.slides.map((s,index) => {
      if (!s || !['split', 'title', 'image'].includes(s.layout) || !['none', 'fade', 'rise', 'reveal'].includes(s.animation)) throw new Error('Unknown slide layout or animation.');
      const image = text(s.image, 600000, 'Image');
      if (image && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) throw new Error('Use an uploaded PNG, JPEG or WebP image.');
      const id = s.id === undefined ? `legacy-${index+1}` : text(s.id,80,'Slide ID');
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid slide ID.');
      const parentId = s.parentId == null ? null : text(s.parentId,80,'Parent ID');
      const c = s.canvas || defaultCanvas(index,!!parentId);
      const canvas = { x:number(c.x,-20000,20000,'Canvas X'), y:number(c.y,-20000,20000,'Canvas Y'), scale:number(c.scale,.005,3,'Slide size') };
      if (parentId && canvas.scale > .8) throw new Error('A nested slide must be smaller than its parent (80% or less).');
      const animations = Object.fromEntries(['title','body','image'].map(key=>[key,normaliseAnimation(s.animations?.[key])]));
      if (s.elements !== undefined && (!Array.isArray(s.elements) || s.elements.length>20)) throw new Error('Use at most 20 extra objects per slide.');
      const elements = (s.elements||[]).map(e=>{
        if (!e || !['text','image'].includes(e.type) || !/^[a-zA-Z0-9_-]+$/.test(e.id) || ['title','body','image'].includes(e.id)) throw new Error('Invalid slide object.');
        const objectImage=text(e.image||'',600000,'Object image');
        if(objectImage && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(objectImage)) throw new Error('Use an uploaded raster image.');
        const width=number(e.width,40,960,'Object width'),height=number(e.height,30,540,'Object height');
        return {id:text(e.id,80,'Object ID'),type:e.type,text:text(e.text||'',1500,'Text box'),image:objectImage,imageAlt:text(e.imageAlt||'',200,'Picture description'),
          x:number(e.x,0,960-width,'Object X'),y:number(e.y,0,540-height,'Object Y'),width,height,fontSize:number(e.fontSize,12,96,'Font size'),animation:normaliseAnimation(e.animation)};
      });
      if(new Set(elements.map(e=>e.id)).size!==elements.length)throw new Error('Duplicate object IDs.');
      return { id,parentId,canvas,animations,elements,title: text(s.title, 180, 'Slide title'), body: text(s.body, 2500, 'Slide text'), image, imageAlt: text(s.imageAlt, 200, 'Image description'), notes: text(s.notes, 3000, 'Notes'), layout: s.layout, animation: s.animation };
    }),
  };
  if(new Set(deck.slides.map(s=>s.id)).size!==deck.slides.length)throw new Error('Duplicate slide IDs.');
  framesFor(deck.slides);
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

export function nestedDemoDeck() {
  const d=newDeck('blank'); d.title='Zoom into a learning adventure'; d.mode='zoom';
  const topic=newSlide('Our amazing world','Click a smaller slide to explore a topic.');topic.canvas={x:0,y:0,scale:1};
  const animals=newSlide('Animals','Zoom further in to meet a butterfly.');animals.parentId=topic.id;animals.canvas={x:-230,y:145,scale:.32};
  const butterfly=newSlide('A butterfly’s journey','Egg → Caterpillar → Chrysalis → Butterfly');butterfly.parentId=animals.id;butterfly.canvas={x:170,y:150,scale:.3};
  butterfly.animations={body:{effect:'rise',trigger:'click',order:1,duration:700,delay:0}};
  const plants=newSlide('Plants','Roots take in water. Leaves catch sunlight.');plants.parentId=topic.id;plants.canvas={x:230,y:145,scale:.32};
  plants.elements=[{id:uid(),type:'text',text:'What could we grow?',image:'',imageAlt:'',x:120,y:360,width:720,height:90,fontSize:36,animation:{effect:'zoom',trigger:'click',order:1,duration:650,delay:0}}];
  d.slides=[topic,animals,butterfly,plants];return validateDeck(d);
}
