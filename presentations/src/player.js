import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { applyObjectBox } from './object-box.js';
import { THEMES } from './model.js';
import { framesFor, sceneBounds, clickSteps } from './features.js';
import { ObjectAnimation } from './object-animation.js';
export function slideElement(slide, theme, number, animate = false, reveal = Infinity) {
  const el = document.createElement('article');
  el.className = `slide layout-${slide.layout}${animate && ['fade','rise'].includes(slide.animation) ? ` ${slide.animation}` : ''}`;
  el.style.setProperty('--slide-bg', THEMES[theme].background); el.style.setProperty('--slide-ink', THEMES[theme].ink);
  el.style.position='relative';el.dataset.slideId=slide.id;
  const title = document.createElement('h2'); title.textContent = slide.title;title.dataset.object='title';
  const content = document.createElement('div'); content.className = 'slide-content';
  const copy = document.createElement('div'); copy.className = 'slide-copy';copy.dataset.object='body';
  const lines = slide.body.split('\n');
  for (const [i, line] of lines.entries()) {
    const p = document.createElement('p'); p.textContent = line || '\u00a0';
    if (i >= reveal) { p.style.visibility = 'hidden'; p.setAttribute('aria-hidden','true'); }
    copy.append(p);
  }
  // Fit longer content without hiding the teacher's text.
  const longest = Math.max(...lines.map(s => s.length), 1), weightedLines = lines.reduce((sum,s) => sum + Math.max(1, Math.ceil(s.length / (slide.image ? 24 : 50))), 0);
  copy.style.fontSize = `${Math.max(12, Math.min(30, 290 / (weightedLines * 1.5)))}px`;
  for (const p of copy.children) { p.style.fontSize = '1em'; p.style.marginBottom = weightedLines > 9 ? '3px' : '12px'; }
  title.style.fontSize = `${Math.max(24, Math.min(48, 48 * Math.sqrt(65 / Math.max(slide.title.length, 65))))}px`;
  if (longest > 0) content.append(copy);
  if (slide.image) { const img = document.createElement('img'); img.src = slide.image; img.alt = slide.imageAlt;img.dataset.object='image'; content.append(img); }
  const n = document.createElement('span'); n.className = 'slide-number'; n.textContent = String(number);
  el.append(title, content, n);
  for(const object of slide.elements||[]){
    const box=document.createElement('div');box.className='extra-object';box.dataset.object=object.id;
    Object.assign(box.style,{position:'absolute',left:`${object.x}px`,top:`${object.y}px`,width:`${object.width}px`,height:`${object.height}px`,fontSize:`${object.fontSize}px`});
    if(object.type==='image'){const img=document.createElement('img');img.src=object.image;img.alt=object.imageAlt;box.append(img);}else box.textContent=object.text;
    el.append(box);
  }
  for(const key of ['title','body','image'])if(slide.boxes?.[key]){
    const node=el.querySelector(`[data-object="${key}"]`);if(node){el.append(node);applyObjectBox(node,slide.boxes[key]);}
  }
  return el;
}
export function renderPreview(container, deck, index) {
  const el = slideElement(deck.slides[index], deck.theme, index + 1); el.style.position = 'absolute'; el.style.transformOrigin = 'top left';
  el.style.transform = `scale(${container.clientWidth / 960})`; container.replaceChildren(el);
}
export class Player {
  constructor(stage, update) {
    this.stage=stage;this.update=update;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(stage);
    this.reduced.addEventListener('change',()=>{if(this.reduced.matches){this.timeline?.dispose();this.timeline?.apply(this.step,false);this.positionCamera(false);}});
  }
  load(deck,mode,index=0){
    this.destroyScene();this.deck=deck;this.mode=mode;this.index=index;this.step=0;this.reveal=0;this.overview=false;
    this.frames=framesFor(deck.slides);
    if(mode==='zoom'){
      this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(50,1,.000001,1000000);
      this.renderer=new CSS3DRenderer();this.stage.append(this.renderer.domElement);
      this.objects=deck.slides.map((s,i)=>{
        const el=slideElement(s,deck.theme,i+1),f=this.frames.get(s.id),object=new CSS3DObject(el);
        object.position.set(f.x,-f.y,f.z);object.scale.setScalar(f.scale);this.scene.add(object);
        el.addEventListener('click',()=>{if(this.overview||i!==this.index)this.go(i);});return object;
      });
      this.renderer.setSize(this.stage.clientWidth,this.stage.clientHeight);this.camera.aspect=this.stage.clientWidth/this.stage.clientHeight;this.camera.updateProjectionMatrix();
    }
    this.enter(false);
  }
  lineCount(){return this.deck.slides[this.index].body.split('\n').length;}
  enter(animate=true){
    this.timeline?.dispose();const slide=this.deck.slides[this.index];
    if(!this.renderer){
      const wrap=document.createElement('div');wrap.className='classic-wrap';this.classic=slideElement(slide,this.deck.theme,this.index+1,animate);
      wrap.append(this.classic);this.stage.replaceChildren(wrap);
    }
    const root=this.renderer?this.objects[this.index].element:this.classic;
    this.timeline=new ObjectAnimation(root,slide,this.reduced);this.timeline.apply(this.step,true);this.applyReveal();
    this.positionCamera(animate);this.resizeClassic();this.report();
  }
  applyReveal(){
    const slide=this.deck.slides[this.index],root=this.renderer?this.objects[this.index].element:this.classic;
    root.querySelectorAll('.slide-copy p').forEach((p,i)=>{
      const visible=slide.animation!=='reveal'||i<this.reveal;p.style.visibility=visible?'inherit':'hidden';p.setAttribute('aria-hidden',String(!visible));
    });
  }
  next(){
    if(!this.deck)return;
    if(this.overview){this.toggleOverview();return;}
    const slide=this.deck.slides[this.index];
    if(this.step<clickSteps(slide).length){this.step++;this.timeline.apply(this.step);this.report();return;}
    if(slide.animation==='reveal'&&this.reveal<this.lineCount()){this.reveal++;this.applyReveal();this.report();return;}
    this.go(this.index+1);
  }
  prev(){
    if(!this.deck)return;
    if(this.overview){this.toggleOverview();return;}
    if(this.reveal>0){this.reveal--;this.applyReveal();this.report();return;}
    if(this.step>0){this.step--;this.timeline.apply(this.step,false);this.report();return;}
    this.go(this.index-1);
  }
  go(index){if(!this.deck||index<0||index>=this.deck.slides.length)return;this.index=index;this.step=0;this.reveal=0;this.overview=false;this.enter();}
  parent(){const id=this.deck?.slides[this.index].parentId;if(id)this.go(this.deck.slides.findIndex(s=>s.id===id));}
  toggleOverview(){
    if(!this.deck||this.mode!=='zoom')return;
    this.overview=!this.overview;this.timeline?.dispose();
    if(!this.overview){this.timeline=new ObjectAnimation(this.objects[this.index].element,this.deck.slides[this.index],this.reduced);this.timeline.apply(this.step,false);this.applyReveal();}
    this.positionCamera();this.report();
  }
  positionCamera(animate=true){
    if(!this.renderer||!this.deck)return;
    const slide=this.deck.slides[this.index];
    this.objects.forEach((object,i)=>{
      const active=i===this.index;object.element.setAttribute('aria-hidden',String(this.overview||!active));object.element.style.cursor=this.overview||!active?'pointer':'default';
      // Context slides remain visible; the physically smaller slides sit within their parent.
      object.element.style.opacity='1';
      if(this.overview||!active){object.element.querySelectorAll('[data-object],.slide-copy p').forEach(el=>{el.style.visibility='visible';});}
    });
    const f=this.frames.get(slide.id),bounds=this.overview?sceneBounds(this.frames):null;
    const width=bounds?bounds.width+160:1060*f.scale,height=bounds?bounds.height+160:640*f.scale;
    const distance=Math.max(height/2,width/2/this.camera.aspect)/Math.tan(THREE.MathUtils.degToRad(25));
    const target=new THREE.Vector3(bounds?bounds.x:f.x,bounds?-bounds.y:-f.y,(bounds?Math.max(...[...this.frames.values()].map(v=>v.z)):f.z)+distance);
    const from=this.camera.position.clone(),start=performance.now(),duration=animate&&!this.reduced.matches&&slide.animation!=='none'?900:0;
    cancelAnimationFrame(this.frame);
    const tick=now=>{const t=duration?Math.min(1,(now-start)/duration):1,eased=t*t*(3-2*t);this.camera.position.lerpVectors(from,target,eased);this.renderer.render(this.scene,this.camera);if(t<1)this.frame=requestAnimationFrame(tick);};tick(start);
    this.stage.dataset.focusSlide=slide.id;this.stage.dataset.focusScale=String(f.scale);
  }
  resizeClassic(){if(this.classic)this.classic.style.transform=`scale(${Math.min(this.stage.clientWidth/1010,this.stage.clientHeight/590)})`;}
  resize(){
    if(!this.deck||!this.stage.clientWidth||!this.stage.clientHeight)return;
    if(this.renderer){this.renderer.setSize(this.stage.clientWidth,this.stage.clientHeight);this.camera.aspect=this.stage.clientWidth/this.stage.clientHeight;this.camera.updateProjectionMatrix();this.positionCamera(false);}else this.resizeClassic();
  }
  report(){
    const slide=this.deck.slides[this.index],steps=clickSteps(slide).length;
    this.update({index:this.index,count:this.deck.slides.length,overview:this.overview,parentId:slide.parentId,
      atStart:this.index===0&&this.step===0&&this.reveal===0,
      atEnd:this.index===this.deck.slides.length-1&&this.step===steps&&(slide.animation!=='reveal'||this.reveal>=this.lineCount()),
      reveal:slide.animation==='reveal'?`${this.reveal}/${this.lineCount()} lines`:steps?`build ${this.step}/${steps}`:''});
  }
  destroyScene(){this.timeline?.dispose();this.timeline=null;cancelAnimationFrame(this.frame);this.stage.replaceChildren();this.renderer=null;this.scene=null;this.camera=null;this.objects=[];this.classic=null;}
  stop(){this.destroyScene();this.deck=null;}
}
