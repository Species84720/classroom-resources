import { animationItems, clickSteps } from './features.js';
const keyframes = {
  fade:[{opacity:0},{opacity:1}],
  rise:[{opacity:0,transform:'translateY(45px)'},{opacity:1,transform:'translateY(0)'}],
  zoom:[{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1)'}],
  spin:[{opacity:0,transform:'rotate(-15deg) scale(.7)'},{opacity:1,transform:'rotate(0) scale(1)'}],
};
export class ObjectAnimation {
  constructor(root, slide, reduced) {
    this.items=animationItems(slide);this.steps=clickSteps(slide);this.reduced=reduced;this.root=root;this.runs=new Map();this.shown=new Set();
  }
  apply(step, animate=true) {
    for(const item of this.items) {
      const node=[...this.root.querySelectorAll('[data-object]')].find(el=>el.dataset.object===item.id);if(!node)continue;
      const spec=item.animation, visible=spec.trigger==='enter'||this.steps.indexOf(spec.order)<step;
      if(!visible){this.runs.get(item.id)?.cancel();this.runs.delete(item.id);this.shown.delete(item.id);node.style.visibility='hidden';node.setAttribute('aria-hidden','true');continue;}
      node.style.visibility='visible';node.removeAttribute('aria-hidden');
      if(!this.shown.has(item.id)&&animate&&!this.reduced.matches&&(spec.effect!=='none'||spec.delay)){
        const frames=keyframes[spec.effect]||[{opacity:0},{opacity:1}];
        this.runs.set(item.id,node.animate(frames,{duration:spec.effect==='none'?0:spec.duration,delay:spec.delay,easing:'ease-out',fill:'both'}));
      }
      this.shown.add(item.id);
    }
  }
  dispose(){for(const a of this.runs.values())a.cancel();this.runs.clear();}
}
