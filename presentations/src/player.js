import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { THEMES } from './model.js';
export function slideElement(slide, theme, number, animate = false, reveal = Infinity) {
  const el = document.createElement('article');
  el.className = `slide layout-${slide.layout}${animate && ['fade','rise'].includes(slide.animation) ? ` ${slide.animation}` : ''}`;
  el.style.setProperty('--slide-bg', THEMES[theme].background); el.style.setProperty('--slide-ink', THEMES[theme].ink);
  const title = document.createElement('h2'); title.textContent = slide.title;
  const content = document.createElement('div'); content.className = 'slide-content';
  const copy = document.createElement('div'); copy.className = 'slide-copy';
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
  if (slide.image) { const img = document.createElement('img'); img.src = slide.image; img.alt = slide.imageAlt; content.append(img); }
  const n = document.createElement('span'); n.className = 'slide-number'; n.textContent = String(number);
  el.append(title, content, n); return el;
}
export function renderPreview(container, deck, index) {
  const el = slideElement(deck.slides[index], deck.theme, index + 1); el.style.position = 'absolute'; el.style.transformOrigin = 'top left';
  el.style.transform = `scale(${container.clientWidth / 960})`; container.replaceChildren(el);
}
export class Player {
  constructor(stage, update) {
    this.stage = stage; this.update = update;
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(stage);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
  }
  load(deck, mode, index = 0) {
    this.destroyScene(); this.deck = deck; this.mode = mode; this.index = index; this.reveal = 0; this.overview = false;
    if (mode === 'zoom') {
      this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(50,1,1,30000);
      this.renderer = new CSS3DRenderer(); this.stage.append(this.renderer.domElement);
      this.objects = deck.slides.map((s,i) => {
        const el = slideElement(s, deck.theme, i+1); el.tabIndex = -1;
        const object = new CSS3DObject(el); object.position.set((i%4)*1150,-Math.floor(i/4)*730,0); this.scene.add(object); return object;
      });
    }
    this.resize(); this.show(false);
  }
  resize() {
    if (!this.deck || !this.stage.clientWidth || !this.stage.clientHeight) return;
    if (this.renderer) {
      this.renderer.setSize(this.stage.clientWidth, this.stage.clientHeight);
      this.camera.aspect = this.stage.clientWidth / this.stage.clientHeight; this.camera.updateProjectionMatrix(); this.show(false);
    } else if (this.classic) this.classic.style.transform = `scale(${Math.min(this.stage.clientWidth/1010,this.stage.clientHeight/590)})`;
  }
  lineCount() { return this.deck.slides[this.index].body.split('\n').length; }
  next() {
    if (this.overview) { this.overview=false; this.show(); return; }
    if (this.deck.slides[this.index].animation === 'reveal' && this.reveal < this.lineCount()) { this.reveal++; this.show(false); return; }
    this.go(this.index+1);
  }
  prev() {
    if (this.overview) { this.overview=false; this.show(); return; }
    if (this.deck.slides[this.index].animation === 'reveal' && this.reveal > 0) { this.reveal--; this.show(false); return; }
    this.go(this.index-1);
  }
  go(index) { if(index<0 || index>=this.deck.slides.length)return; this.index=index; this.reveal=0; this.overview=false; this.show(); }
  toggleOverview() { if(this.mode!=='zoom')return; this.overview=!this.overview; this.show(); }
  show(animate = true) {
    if(!this.deck)return;
    const slide = this.deck.slides[this.index], reveal = slide.animation==='reveal' ? this.reveal : Infinity;
    if (!this.renderer) {
      const wrap = document.createElement('div'); wrap.className='classic-wrap';
      this.classic=slideElement(slide,this.deck.theme,this.index+1,animate,reveal); wrap.append(this.classic); this.stage.replaceChildren(wrap); this.resize();
    } else {
      this.objects.forEach((obj,i) => {
        const active = i===this.index;
        obj.element.setAttribute('aria-hidden',String(this.overview || !active));
        obj.element.style.opacity = this.overview || active ? '1' : '.3';
        const visibleLines = active && !this.overview ? reveal : Infinity;
        [...obj.element.querySelectorAll('.slide-copy p')].forEach((p,j) => { p.style.visibility=j<visibleLines?'visible':'hidden'; p.setAttribute('aria-hidden',String(j>=visibleLines)); });
      });
      const target = this.objects[this.index].position.clone();
      const columns = Math.min(4,this.objects.length), rows=Math.ceil(this.objects.length/4);
      let width = 1060, height=640;
      if(this.overview) { target.set((columns-1)*575,-(rows-1)*365,0); width=(columns-1)*1150+1100; height=(rows-1)*730+670; }
      const z=Math.max(height/2, width/2/this.camera.aspect)/Math.tan(THREE.MathUtils.degToRad(25)); target.z=z;
      const from=this.camera.position.clone(), start=performance.now(); cancelAnimationFrame(this.frame);
      const duration=animate&&!this.reduced.matches&&slide.animation!=='none'?800:0;
      const tick=now=>{
        const t=duration?Math.min(1,(now-start)/duration):1, eased=t*t*(3-2*t);
        this.camera.position.lerpVectors(from,target,eased); this.renderer.render(this.scene,this.camera);
        if(t<1)this.frame=requestAnimationFrame(tick);
      }; tick(start);
    }
    const atEnd=this.index===this.deck.slides.length-1 && (slide.animation!=='reveal'||this.reveal>=this.lineCount());
    this.update({ index:this.index, count:this.deck.slides.length, overview:this.overview, atStart:this.index===0&&this.reveal===0, atEnd, reveal:slide.animation==='reveal'?`${this.reveal}/${this.lineCount()} lines`:'' });
  }
  destroyScene(){ cancelAnimationFrame(this.frame); this.stage.replaceChildren(); this.renderer=null; this.scene=null; this.camera=null; this.objects=[]; this.classic=null; }
  stop(){this.destroyScene();this.deck=null;}
}
