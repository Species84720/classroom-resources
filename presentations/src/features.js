// Pure presentation geometry and animation data, shared by editor, player and tests.
export const EFFECTS = ['none', 'fade', 'rise', 'zoom', 'spin'];
export const uid = () => crypto.randomUUID();
export const defaultAnimation = () => ({ effect: 'none', trigger: 'enter', order: 1, duration: 600, delay: 0 });
export function number(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
}
export function normaliseAnimation(value) {
  const a = { ...defaultAnimation(), ...value };
  if (!EFFECTS.includes(a.effect) || !['enter', 'click'].includes(a.trigger)) throw new Error('Unknown object animation.');
  return { effect:a.effect, trigger:a.trigger, order:Math.round(number(a.order,1,20,'Click order')), duration:number(a.duration,0,3000,'Duration'), delay:number(a.delay,0,5000,'Delay') };
}
export function defaultCanvas(index, nested = false) {
  return nested ? { x:220, y:100, scale:.35 } : { x:(index%4)*1150, y:Math.floor(index/4)*730, scale:1 };
}
export function animationItems(slide) {
  return [
    ...(slide.title ? [{ id:'title', animation:slide.animations?.title || defaultAnimation() }] : []),
    ...(slide.body ? [{ id:'body', animation:slide.animations?.body || defaultAnimation() }] : []),
    ...(slide.image ? [{ id:'image', animation:slide.animations?.image || defaultAnimation() }] : []),
    ...(slide.elements || []).map(e => ({ id:e.id, animation:e.animation })),
  ];
}
export function clickSteps(slide) {
  return [...new Set(animationItems(slide).filter(i => i.animation.trigger==='click').map(i => i.animation.order))].sort((a,b)=>a-b);
}
export function isDescendant(slides, id, ancestor) {
  const byId = new Map(slides.map(s => [s.id,s])); let current=byId.get(id); const seen=new Set();
  while(current?.parentId) { if(current.parentId===ancestor)return true; if(seen.has(current.id))return false; seen.add(current.id); current=byId.get(current.parentId); }
  return false;
}
export function framesFor(slides) {
  const byId = new Map(slides.map((s,i)=>[s.id,{s,i}])), frames=new Map(), visiting=new Set();
  function frame(id) {
    if(frames.has(id))return frames.get(id);
    if(visiting.has(id))throw new Error('A slide cannot be nested inside itself or one of its children.');
    const entry=byId.get(id); if(!entry)throw new Error('A parent slide is missing.');
    visiting.add(id);const {s,i}=entry, c=s.canvas||defaultCanvas(i,!!s.parentId), parent=s.parentId?frame(s.parentId):null;
    const depth=parent?parent.depth+1:0;if(depth>4)throw new Error('Use at most four levels of nested slides.');
    const result={ x:(parent?.x||0)+c.x*(parent?.scale||1), y:(parent?.y||0)+c.y*(parent?.scale||1), z:(parent?.z||0)+(parent?parent.scale*.5:0), scale:c.scale*(parent?.scale||1), depth };
    frames.set(id,result);visiting.delete(id);return result;
  }
  slides.forEach(s=>frame(s.id));return frames;
}
export function sceneBounds(frames) {
  const values=[...frames.values()];
  const left=Math.min(...values.map(f=>f.x-480*f.scale)),right=Math.max(...values.map(f=>f.x+480*f.scale));
  const top=Math.min(...values.map(f=>f.y-270*f.scale)),bottom=Math.max(...values.map(f=>f.y+270*f.scale));
  return {x:(left+right)/2,y:(top+bottom)/2,width:right-left,height:bottom-top,left,top};
}
export function removeSlide(slides, index) {
  const removed=slides[index], frames=framesFor(slides), parent=removed.parentId?frames.get(removed.parentId):null;
  for(const s of slides.filter(s=>s.parentId===removed.id)) {
    const f=frames.get(s.id);s.parentId=removed.parentId;
    s.canvas={x:(f.x-(parent?.x||0))/(parent?.scale||1),y:(f.y-(parent?.y||0))/(parent?.scale||1),scale:f.scale/(parent?.scale||1)};
  }
  slides.splice(index,1);
}

export function freeChildCanvas(slides, parentId, excludeId = null) {
  const occupied=slides.filter(s=>s.parentId===parentId&&s.id!==excludeId).map(s=>s.canvas||defaultCanvas(0,true));
  for(const scale of [.3,.2,.12]) {
    const halfW=480*scale,halfH=270*scale;
    for(let y=270-halfH-20;y>=-270+halfH;y-=2*halfH+25) {
      for(let x=-480+halfW+20;x<=480-halfW;x+=2*halfW+25) {
        if(!occupied.some(c=>Math.abs(x-c.x)<halfW+480*c.scale+12&&Math.abs(y-c.y)<halfH+270*c.scale+12))return {x,y,scale};
      }
    }
  }
  return {x:0,y:0,scale:.12};
}
