import { newDeck, newSlide, validateDeck, MAX_SLIDES } from './model.js';
const questions = {
  subject:'Which subject is this PowerPoint for?',
  learning_intent:'What exactly should pupils learn or be able to do?',
  theme:'Which visual or story theme would you like (for example space, dinosaurs or a plain classroom style)?',
  year_group:'Which year group is it for?',
  slide_count:'How many slides would you like, including the opening and recap (1–40)?',
  animations:'Would you like no animations, gentle automatic animations, or click-to-reveal animations?',
};
export function missingPowerPointDetails(brief = {}) {
  return Object.entries(questions).filter(([key])=>brief[key]==null || brief[key]==='' || (typeof brief[key]==='string'&&!brief[key].trim())).map(([field,question])=>({field,question}));
}
export function validatePowerPointBrief(brief) {
  const missing=missingPowerPointDetails(brief);
  if(missing.length)throw new Error(missing.map(q=>q.question).join('\n'));
  for(const [key,max] of Object.entries({subject:60,learning_intent:500,theme:200,year_group:40})){
    if(typeof brief[key]!=='string'||!brief[key].trim()||brief[key].length>max)throw new Error(`Invalid ${key}.`);
  }
  if(!Number.isInteger(brief.slide_count)||brief.slide_count<1||brief.slide_count>MAX_SLIDES)throw new Error('Choose 1–40 slides.');
  if(!['none','gentle','click'].includes(brief.animations))throw new Error('Choose animations: none, gentle or click.');
  return brief;
}
// The AI authors real lesson content; this function validates and packages it.
// Never invent a lesson from a title or fill missing slides with placeholders.
export function deckFromPowerPointPlan(plan) {
  const brief=validatePowerPointBrief(plan.brief);
  if(!Array.isArray(plan.slides)||plan.slides.length!==brief.slide_count)throw new Error('The authored slides must match the requested slide count.');
  const deck=newDeck('blank');
  deck.title=plan.title;
  deck.description=`${brief.learning_intent}\nTheme: ${brief.theme}`;
  deck.subject=brief.subject;deck.year_group=brief.year_group;
  deck.theme=plan.palette||'ocean';deck.mode='classic';
  deck.slides=plan.slides.map((content,index)=>{
    if(!content||typeof content.title!=='string'||!content.title.trim()||typeof content.body!=='string')throw new Error(`Author a title and body for slide ${index+1}.`);
    const slide={...newSlide(),...content};
    slide.parentId=null;slide.animation=brief.animations==='gentle'?'fade':'none';
    const effect=brief.animations==='none'?'none':'fade';
    const animation=trigger=>({effect,trigger,order:1,duration:600,delay:0});
    // A "none" preference disables every effect, including AI-authored extra objects.
    slide.animations={title:animation('enter'),body:animation(brief.animations==='click'?'click':'enter'),image:animation('enter')};
    slide.elements=(content.elements||[]).map(e=>({...e,animation:brief.animations==='none'?animation('enter'):(e.animation||animation(brief.animations==='click'?'click':'enter'))}));
    return slide;
  });
  return validateDeck(deck);
}
