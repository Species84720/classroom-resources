// Native PresentationML timing. No macros, video or flattened slide screenshots.
// https://learn.microsoft.com/en-us/office/open-xml/presentation/working-with-animation
import { animationItems, normaliseAnimation } from './features.js';
export function addPowerPointAnimations(source, slide) {
  const shapes = new Map([...source.matchAll(/<p:cNvPr\b([^>]*)/g)].map(m => {
    const attrs = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map(a => [a[1], a[2]]));
    return [attrs.name, attrs.id];
  }));
  let id = 2;
  const next = () => ++id;
  const target = item => `<p:tgtEl><p:spTgt spid="${item.spid}">${item.paragraph == null ? '' : `<p:txEl><p:pRg st="${item.paragraph}" end="${item.paragraph}"/></p:txEl>`}</p:spTgt></p:tgtEl>`;
  const items = animationItems(slide).filter(i => shapes.has(`classroom-${i.id}`)).map(i => ({...i, spid:shapes.get(`classroom-${i.id}`), animation:normaliseAnimation(i.animation)}));
  const lastStep = Math.max(0, ...items.filter(i => i.animation.trigger === 'click').map(i => i.animation.order));
  if (slide.animation === 'reveal' && slide.body) {
    // Paragraph builds happen after the object's own reveal, just like the web player.
    const body = items.find(i => i.id === 'body');
    if(body) for(let paragraph=0; paragraph<slide.body.split('\n').length; paragraph++) items.push({id:'body',spid:body.spid,paragraph,animation:{effect:'none',trigger:'click',order:lastStep+paragraph+1,duration:0,delay:0}});
  }
  const active = items.filter(i => i.paragraph != null || i.animation.effect !== 'none' || i.animation.trigger === 'click' || i.animation.delay);
  const groups = new Map();
  for(const item of active){const step=item.animation.trigger==='enter'?0:item.animation.order;if(!groups.has(step))groups.set(step,[]);groups.get(step).push(item);}
  function effect(item, first, auto) {
    const a=item.animation, duration=Math.max(1,Math.round(a.duration));
    const behaviour=(attribute,dur=duration)=>`<p:cBhvr><p:cTn id="${next()}" dur="${dur}" fill="hold"/>${target(item)}${attribute?`<p:attrNameLst>${attribute.split(',').map(name=>`<p:attrName>${name}</p:attrName>`).join('')}</p:attrNameLst>`:''}</p:cBhvr>`;
    const visibility=`<p:set>${behaviour('style.visibility',1)}<p:to><p:strVal val="visible"/></p:to></p:set>`;
    let motion='';
    if(a.effect!=='none')motion=`<p:animEffect transition="in" filter="fade">${behaviour('')}</p:animEffect>`;
    if(a.effect==='rise')motion+=`<p:anim calcmode="lin" valueType="num">${behaviour('ppt_y')}<p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_y+0.08333"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav></p:tavLst></p:anim>`;
    if(a.effect==='zoom')motion+=`<p:animScale>${behaviour('ScaleX,ScaleY')}<p:from x="65000" y="65000"/><p:to x="100000" y="100000"/></p:animScale>`;
    if(a.effect==='spin')motion+=`<p:animRot from="-900000" to="0">${behaviour('r')}</p:animRot>`;
    const preset={none:1,fade:10,rise:2,zoom:23,spin:8}[a.effect];
    return `<p:par><p:cTn id="${next()}" presetID="${preset}" presetClass="entr" presetSubtype="0" fill="hold" nodeType="${auto||!first?'withEffect':'clickEffect'}"><p:stCondLst><p:cond delay="${Math.round(a.delay)}"/></p:stCondLst><p:childTnLst>${visibility}${motion}</p:childTnLst></p:cTn></p:par>`;
  }
  const sequence=[...groups].sort(([a],[b])=>a-b).map(([step,objects])=>`<p:par><p:cTn id="${next()}" fill="hold"><p:stCondLst><p:cond delay="${step===0?'0':'indefinite'}"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="${next()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${objects.map((item,i)=>effect(item,i===0,step===0)).join('')}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`).join('');
  const builds=[...new Set(active.filter(i=>i.id!=='image'&&!slide.elements?.find(e=>e.id===i.id&&e.type==='image')).map(i=>i.spid))].map(spid=>`<p:bldP spid="${spid}" grpId="0" build="${slide.animation==='reveal'&&spid===shapes.get('classroom-body')?'p':'allAtOnce'}"/>`).join('');
  const timing=active.length?`<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${sequence}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>${builds?`<p:bldLst>${builds}</p:bldLst>`:''}</p:timing>`:'';
  const transition=slide.animation==='fade'?'<p:transition><p:fade/></p:transition>':slide.animation==='rise'?'<p:transition><p:push dir="u"/></p:transition>':'';
  return source.replace('</p:sld>',`${transition}${timing}</p:sld>`);
}
