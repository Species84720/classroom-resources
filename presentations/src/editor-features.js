import { uid, defaultAnimation, defaultCanvas, framesFor, sceneBounds, isDescendant, freeChildCanvas } from './features.js';
import { compressImage } from './powerpoint.js';
const $=id=>document.getElementById(id), clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export class FeatureEditor {
  constructor(state, guard, changed, selectSlide, report) {
    Object.assign(this,{state,guard,changed,selectSlide,report});this.objectId='title';
    const event=(id,type,fn)=>$(id).addEventListener(type,()=>Promise.resolve().then(()=>{this.guard();return fn();}).catch(this.report));
    event('object-target','change',()=>{this.objectId=$('object-target').value;this.properties();});
    event('add-text','click',()=>this.addObject('text'));
    event('add-object-image','change',async()=>{
      const file=$('add-object-image').files[0];$('add-object-image').value='';if(!file)return;
      const slide=this.slide();const image=await compressImage(file);this.guard();if(slide!==this.slide())return;this.addObject('image',image);
    });
    for(const [id,key]of [['object-effect','effect'],['object-trigger','trigger'],['object-order','order'],['object-duration','duration'],['object-delay','delay']])event(id,'change',()=>{
      const input=$(id);if(!input.checkValidity()){input.reportValidity();return;}
      const spec=this.animation();spec[key]=input.tagName==='SELECT'?input.value:Number(input.value);this.changed();this.properties();
    });
    for(const [id,key]of [['object-text','text'],['object-alt','imageAlt']])event(id,'input',()=>{const e=this.extra();if(e){e[key]=$(id).value;this.changed();}});
    for(const [id,key]of [['object-x','x'],['object-y','y'],['object-width','width'],['object-height','height'],['object-font','fontSize']])event(id,'change',()=>{
      const input=$(id);if(!input.checkValidity()){input.reportValidity();return;}const e=this.extra();if(!e)return;e[key]=Number(input.value);e.x=clamp(e.x,0,960-e.width);e.y=clamp(e.y,0,540-e.height);this.changed();this.properties();
    });
    event('delete-object','click',()=>{const slide=this.slide();slide.elements=slide.elements.filter(e=>e.id!==this.objectId);this.objectId='title';this.changed();this.refresh();});
    event('parent-slide','change',()=>{
      const slide=this.slide(),old={parentId:slide.parentId,canvas:slide.canvas};slide.parentId=$('parent-slide').value||null;slide.canvas=slide.parentId?freeChildCanvas(this.state().deck.slides,slide.parentId,slide.id):defaultCanvas(this.state().selected);
      try{framesFor(this.state().deck.slides);}catch(e){Object.assign(slide,old);this.refresh();throw e;}
      if(slide.parentId)this.state().deck.mode='zoom';$('mode').value=this.state().deck.mode;this.changed();this.refresh();
    });
    for(const [id,key]of [['canvas-x','x'],['canvas-y','y'],['canvas-scale','scale']])event(id,'change',()=>{
      const input=$(id);if(!input.checkValidity()){input.reportValidity();return;}const s=this.slide();s.canvas[key]=Number(input.value)/(key==='scale'?100:1);this.contain(s);this.changed();this.canvasControls();this.map();
    });
    this.previewDrag();this.mapDrag();
  }
  slide(){return this.state().deck.slides[this.state().selected];}
  extra(){return this.slide().elements.find(e=>e.id===this.objectId);}
  animation(){const e=this.extra();if(e)return e.animation;return this.slide().animations[this.objectId] ||= defaultAnimation();}
  addObject(type,image=''){
    const s=this.slide();if(s.elements.length>=20)throw new Error('Use at most 20 extra objects per slide.');
    const e={id:uid(),type,text:type==='text'?'Your text here':'',image,imageAlt:'',x:120,y:340,width:type==='text'?640:260,height:130,fontSize:32,animation:defaultAnimation()};
    s.elements.push(e);this.objectId=e.id;this.changed();this.refresh();
  }
  refresh(){
    const s=this.slide();s.canvas ||= defaultCanvas(this.state().selected,!!s.parentId);s.animations ||= {};s.elements ||= [];
    const targets=[['title','Slide title'],['body','Main text'],...(s.image?[['image','Main picture']]:[]),...s.elements.map((e,i)=>[e.id,`${e.type==='text'?'Text box':'Picture'} ${i+1}`])];
    if(!targets.some(t=>t[0]===this.objectId))this.objectId='title';
    $('object-target').replaceChildren(...targets.map(([value,label])=>new Option(label,value)));$('object-target').value=this.objectId;this.properties();this.canvasControls();this.map();
    $('add-text').disabled=s.elements.length>=20;$('add-object-image').disabled=s.elements.length>=20;
  }
  properties(){
    const e=this.extra(),spec=this.animation();$('extra-properties').hidden=!e;
    if(e){$('object-text-label').hidden=e.type!=='text';$('object-alt-label').hidden=e.type!=='image';for(const [id,key]of [['object-text','text'],['object-alt','imageAlt'],['object-x','x'],['object-y','y'],['object-width','width'],['object-height','height'],['object-font','fontSize']])$(id).value=e[key];}
    for(const [id,key]of [['object-effect','effect'],['object-trigger','trigger'],['object-order','order'],['object-duration','duration'],['object-delay','delay']])$(id).value=spec[key];
    $('object-order').disabled=spec.trigger!=='click';
    $('preview').querySelectorAll('[data-object]').forEach(el=>el.classList.toggle('selected-object',el.dataset.object===this.objectId));
  }
  contain(slide){
    const c=slide.canvas;c.scale=clamp(c.scale,.01,slide.parentId ? .8 : 3);
    if(slide.parentId){c.x=clamp(c.x,-480*(1-c.scale),480*(1-c.scale));c.y=clamp(c.y,-270*(1-c.scale),270*(1-c.scale));}
  }
  canvasControls(){
    const {deck,selected}=this.state(),slide=this.slide();
    $('parent-slide').replaceChildren(new Option('Main canvas (no parent)',''),...deck.slides.filter(s=>s.id!==slide.id&&!isDescendant(deck.slides,s.id,slide.id)).map(s=>new Option(s.title||'Untitled slide',s.id)));
    $('parent-slide').value=slide.parentId||'';
    for(const [id,key]of [['canvas-x','x'],['canvas-y','y'],['canvas-scale','scale']])$(id).value=Math.round(slide.canvas[key]*(key==='scale'?100:1)*100)/100;
    $('canvas-scale').max=slide.parentId?'80':'300';
    $('canvas-description').textContent=slide.parentId?'Position and size are relative to the parent slide. Smaller sizes create a deeper zoom.':'Move this slide freely on the main canvas. Select a parent to nest it.';
  }
  map(){
    const {deck,selected}=this.state(),frames=framesFor(deck.slides),b=sceneBounds(frames),svg=$('canvas-map');svg.replaceChildren();
    this.mapBounds={left:b.left-100,top:b.top-100,width:b.width+200,height:b.height+200};svg.setAttribute('viewBox',`${this.mapBounds.left} ${this.mapBounds.top} ${this.mapBounds.width} ${this.mapBounds.height}`);
    const ns='http://www.w3.org/2000/svg';
    [...deck.slides].sort((a,b)=>frames.get(a.id).depth-frames.get(b.id).depth).forEach(s=>{
      const f=frames.get(s.id),g=document.createElementNS(ns,'g'),rect=document.createElementNS(ns,'rect'),label=document.createElementNS(ns,'text');g.dataset.slideId=s.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',`Select ${s.title||'Untitled slide'}`);
      for(const [k,v]of Object.entries({x:f.x-480*f.scale,y:f.y-270*f.scale,width:960*f.scale,height:540*f.scale,rx:16*f.scale,fill:s.id===deck.slides[selected].id?'#b2dce5':'#edf6f8',stroke:'#286777','stroke-width':3*f.scale}))rect.setAttribute(k,String(v));
      label.setAttribute('x',String(f.x-450*f.scale));label.setAttribute('y',String(f.y-210*f.scale));label.setAttribute('font-size',String(32*f.scale));label.textContent=`${deck.slides.indexOf(s)+1}. ${(s.title||'Untitled').slice(0,32)}`;g.append(rect,label);svg.append(g);
      g.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();this.selectSlide(deck.slides.indexOf(s));}});
    });
  }
  previewDrag(){
    const preview=$('preview');let drag;
    preview.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      const box=event.target.closest('[data-object]');if(!box)return;
      try{this.guard();}catch{return;}
      this.objectId=box.dataset.object;$('object-target').value=this.objectId;this.properties();const e=this.extra();if(!e)return;
      drag={e,node:box,x:event.clientX,y:event.clientY,startX:e.x,startY:e.y,scale:preview.clientWidth/960};preview.setPointerCapture(event.pointerId);event.preventDefault();
    });
    preview.addEventListener('pointermove',event=>{if(!drag)return;try{this.guard();}catch{drag=null;return;}const {e,node}=drag;e.x=clamp(Math.round(drag.startX+(event.clientX-drag.x)/drag.scale),0,960-e.width);e.y=clamp(Math.round(drag.startY+(event.clientY-drag.y)/drag.scale),0,540-e.height);node.style.left=`${e.x}px`;node.style.top=`${e.y}px`;$('object-x').value=e.x;$('object-y').value=e.y;});
    const end=()=>{if(drag){drag=null;this.changed();this.properties();}};preview.addEventListener('pointerup',end);preview.addEventListener('pointercancel',end);
  }
  mapDrag(){
    const svg=$('canvas-map');let drag;
    svg.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;const target=event.target.closest('[data-slide-id]');if(!target)return;try{this.guard();}catch{return;}
      const {deck}=this.state(),s=deck.slides.find(s=>s.id===target.dataset.slideId),frames=framesFor(deck.slides),parent=s.parentId?frames.get(s.parentId):null;
      const inverse=svg.getScreenCTM().inverse(),point=new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse);s.canvas ||= defaultCanvas(deck.slides.indexOf(s),!!s.parentId);
      drag={s,inverse,point,canvas:{...s.canvas},parentScale:parent?.scale||1};svg.setPointerCapture(event.pointerId);event.preventDefault();
    });
    svg.addEventListener('pointermove',event=>{if(!drag)return;try{this.guard();}catch{drag=null;return;}const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(drag.inverse);drag.s.canvas.x=clamp(drag.canvas.x+(p.x-drag.point.x)/drag.parentScale,-20000,20000);drag.s.canvas.y=clamp(drag.canvas.y+(p.y-drag.point.y)/drag.parentScale,-20000,20000);this.contain(drag.s);this.map();});
    const end=()=>{if(!drag)return;const s=drag.s;drag=null;this.changed();this.selectSlide(this.state().deck.slides.indexOf(s));};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  }
}
