import { uid, defaultAnimation, defaultCanvas, framesFor, sceneBounds, isDescendant, freeChildCanvas } from './features.js';
import { moveBox, resizeBox, applyObjectBox } from './object-box.js';
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
      const input=$(id);if(!input.checkValidity()){input.reportValidity();return;}const e=this.geometry(true);if(!e)return;e[key]=Number(input.value);e.x=clamp(e.x,0,960-e.width);e.y=clamp(e.y,0,540-e.height);this.changed();this.properties();
    });
    event('reset-boxes','click',()=>{this.slide().boxes={};this.changed();this.properties();});
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
  node(id=this.objectId){return [...$('preview').querySelectorAll('[data-object]')].find(el=>el.dataset.object===id);}
  measure(id){
    const node=this.node(id),root=$('preview').querySelector('.slide');if(!node||!root)return null;
    const r=node.getBoundingClientRect(),base=root.getBoundingClientRect(),scale=base.width/960;if(!scale)return null;
    const width=clamp(r.width/scale,40,960),height=clamp(r.height/scale,30,540);
    return {x:clamp((r.left-base.left)/scale,0,960-width),y:clamp((r.top-base.top)/scale,0,540-height),width,height,fontSize:clamp(parseFloat(getComputedStyle(node).fontSize)||32,12,96)};
  }
  captureLayout(){
    const slide=this.slide();slide.boxes ||= {};
    // Freeze all main items together so moving one does not reflow its neighbours.
    for(const id of ['title','body','image'])if(!slide.boxes[id]){const box=this.measure(id);if(box)slide.boxes[id]=box;}
  }
  geometry(create=false){
    const extra=this.extra();if(extra)return extra;
    if(create)this.captureLayout();return this.slide().boxes?.[this.objectId]||this.measure(this.objectId);
  }
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
    const extra=this.extra(),e=this.geometry(),spec=this.animation();$('extra-properties').hidden=!e;
    $('object-text-label').hidden=extra?.type!=='text';$('object-alt-label').hidden=extra?.type!=='image';
    $('delete-object').hidden=!extra;$('reset-boxes').hidden=!!extra;
    $('object-font').closest('label').hidden=this.objectId==='image'||extra?.type==='image';
    if(extra){$('object-text').value=extra.text;$('object-alt').value=extra.imageAlt;}
    if(e)for(const [id,key]of [['object-x','x'],['object-y','y'],['object-width','width'],['object-height','height'],['object-font','fontSize']])$(id).value=Math.round(e[key]*100)/100;
    for(const [id,key]of [['object-effect','effect'],['object-trigger','trigger'],['object-order','order'],['object-duration','duration'],['object-delay','delay']])$(id).value=spec[key];
    $('object-order').disabled=spec.trigger!=='click';this.decorate();
  }
  decorate(){
    const preview=$('preview');preview.querySelector('.selection-overlay')?.remove();
    const node=this.node();preview.querySelectorAll('[data-object]').forEach(el=>el.classList.toggle('selected-object',el===node));
    if(!node||!preview.clientWidth)return;
    const root=preview.querySelector('.slide'),r=node.getBoundingClientRect(),base=root.getBoundingClientRect();
    const overlay=document.createElement('div');overlay.className='selection-overlay';
    Object.assign(overlay.style,{left:`${r.left-base.left}px`,top:`${r.top-base.top}px`,width:`${r.width}px`,height:`${r.height}px`});
    for(const [handle,label]of [['nw','top left'],['n','top'],['ne','top right'],['e','right'],['se','bottom right'],['s','bottom'],['sw','bottom left'],['w','left']]){
      const b=document.createElement('button');b.type='button';b.className=`resize-handle handle-${handle}`;b.dataset.resize=handle;b.setAttribute('aria-label',`Resize ${label}`);b.title=`Resize ${label} (arrow keys also work)`;overlay.append(b);
    }
    preview.append(overlay);
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
    preview.addEventListener('dragstart',event=>event.preventDefault());
    preview.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;const handle=event.target.closest('[data-resize]')?.dataset.resize;
      const node=handle?this.node():event.target.closest('[data-object]');if(!node)return;
      try{this.guard();}catch{return;}
      const id=node.dataset.object;this.objectId=id;$('object-target').value=id;this.properties();
      const box=this.geometry();if(!box)return;
      drag={id,slide:this.slide(),beforeBoxes:structuredClone(this.slide().boxes||{}),box:{...box},handle,x:event.clientX,y:event.clientY,scale:preview.clientWidth/960,moved:false};
      preview.setPointerCapture(event.pointerId);preview.focus({preventScroll:true});event.preventDefault();
    });
    preview.addEventListener('pointermove',event=>{
      if(!drag)return;try{this.guard();}catch{cancel();return;}if(this.slide()!==drag.slide){cancel();return;}
      const dx=(event.clientX-drag.x)/drag.scale,dy=(event.clientY-drag.y)/drag.scale;
      if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<2)return;
      const target=this.geometry(true);drag.moved=true;const box=drag.handle?resizeBox(drag.box,drag.handle,dx,dy):moveBox(drag.box,dx,dy);Object.assign(target,box);
      // Update the existing nodes during the gesture. Do not destroy pointer capture.
      for(const id of ['title','body','image'])if(this.slide().boxes?.[id]){const node=this.node(id);if(node){preview.querySelector('.slide').append(node);applyObjectBox(node,this.slide().boxes[id]);}}
      const node=this.node();if(node)applyObjectBox(node,target);
      for(const [id,key]of [['object-x','x'],['object-y','y'],['object-width','width'],['object-height','height']])$(id).value=Math.round(target[key]*100)/100;
      this.decorate();
    });
    const finish=()=>{if(!drag)return;const changed=drag.moved;drag=null;if(changed)this.changed();this.properties();};
    const cancel=()=>{if(!drag)return;const {slide,id,box,beforeBoxes,moved}=drag;drag=null;if(moved){slide.boxes=beforeBoxes;const extra=slide.elements.find(e=>e.id===id);if(extra)Object.assign(extra,box);this.redrawPreview?.();}};
    this.cancelGesture=cancel;
    preview.addEventListener('pointerup',finish);preview.addEventListener('pointercancel',cancel);preview.addEventListener('lostpointercapture',finish);
    preview.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&drag){event.preventDefault();cancel();return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||event.ctrlKey||event.metaKey||event.altKey)return;
      try{this.guard();}catch{return;}event.preventDefault();const step=event.shiftKey?10:1,dx=event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0,dy=event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0;
      const e=this.geometry(true);if(!e)return;const handle=event.target.closest('[data-resize]')?.dataset.resize;
      Object.assign(e,handle?resizeBox(e,handle,dx,dy):moveBox(e,dx,dy));this.changed({group:`nudge:${this.slide().id}:${this.objectId}:${handle||'move'}`});this.properties();
      if(handle)preview.querySelector(`[data-resize="${handle}"]`)?.focus({preventScroll:true});else preview.focus({preventScroll:true});
    });
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
