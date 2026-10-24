import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { deckFromPowerPointPlan, missingPowerPointDetails } from '../presentations/src/ai-powerpoint.js';
import { createPPTX } from '../presentations/src/powerpoint.js';
import { newDeck } from '../presentations/src/model.js';
const plan=()=>({title:'Dinosaur numbers',brief:{subject:'Mathematics',learning_intent:'Recognise tens and ones to 50',theme:'Dinosaurs',year_group:'Year 2',slide_count:1,animations:'click'},palette:'meadow',slides:[{title:'Count the dinosaur eggs',body:'3 tens and 4 ones',notes:'Answer: 34. Ask pupils to explain.'}]});
test('intake asks only for unanswered details; plain themes and no animations are valid',()=>{
  assert.equal(missingPowerPointDetails().length,6);
  const p=plan();assert.deepEqual(missingPowerPointDetails(p.brief),[]);
  delete p.brief.theme;assert.deepEqual(missingPowerPointDetails(p.brief).map(q=>q.field),['theme']);
  assert.throws(()=>deckFromPowerPointPlan(p),/visual or story theme/);
  p.brief.theme='plain';p.brief.animations='none';assert.equal(deckFromPowerPointPlan(p).slides[0].animations.body.effect,'none');
  p.brief.year_group=' ';assert.throws(()=>deckFromPowerPointPlan(p),/year group/);
});
test('generation rejects count mismatch, invalid counts, unknown animations and un-authored content',()=>{
  for(const count of [0,41,2.5,'8']){const p=plan();p.brief.slide_count=count;assert.throws(()=>deckFromPowerPointPlan(p),/1–40/);}
  const p=plan();p.brief.slide_count=2;assert.throws(()=>deckFromPowerPointPlan(p),/match/);
  p.brief.slide_count=1;p.brief.animations='fireworks';assert.throws(()=>deckFromPowerPointPlan(p),/animations/);
  p.brief.animations='gentle';p.slides[0].title=' ';assert.throws(()=>deckFromPowerPointPlan(p),/Author/);
});
test('PPTX contains editable objects, notes, correct colours and native click timing',async()=>{
  const deck=deckFromPowerPointPlan(plan()),zip=await JSZip.loadAsync(await createPPTX(deck));
  const s=await zip.file('ppt/slides/slide1.xml').async('string');
  assert.match(s,/Count the dinosaur eggs/);assert.match(s,/3 tens and 4 ones/);assert.match(s,/eef6e6/i);
  assert.match(s,/<p:timing>/);assert.match(s,/nodeType="clickEffect"/);assert.match(s,/delay="indefinite"/);assert.match(s,/<p:animEffect transition="in" filter="fade">/);
  assert.match(await zip.file('ppt/notesSlides/notesSlide1.xml').async('string'),/Answer: 34/);
  const ids=[...s.matchAll(/<p:cTn id="(\d+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  const shapeIds=new Set([...s.matchAll(/<p:cNvPr id="(\d+)"/g)].map(m=>m[1]));
  for(const m of s.matchAll(/<p:spTgt spid="(\d+)"/g))assert.ok(shapeIds.has(m[1]));
});
test('none produces no timing, while gentle produces automatic effects and slide fade',async()=>{
  for(const animations of ['none','gentle']){
    const p=plan();p.brief.animations=animations;const zip=await JSZip.loadAsync(await createPPTX(deckFromPowerPointPlan(p)));
    const s=await zip.file('ppt/slides/slide1.xml').async('string');
    if(animations==='none')assert.doesNotMatch(s,/<p:timing>|<p:transition>/);
    else{assert.match(s,/<p:transition><p:fade/);assert.match(s,/nodeType="withEffect"/);assert.doesNotMatch(s,/delay="indefinite"/);}
  }
});
test('extra objects, images and every supported effect target the actual exported shape IDs',async()=>{
  const d=newDeck('blank'),s=d.slides[0];s.animation='reveal';s.body='First\nSecond';
  s.animations={title:{effect:'rise',trigger:'click',order:2,duration:800,delay:250},body:{effect:'fade',trigger:'enter'}};
  s.elements=['none','fade','rise','zoom','spin'].map((effect,i)=>({id:`extra-${i}`,type:'text',text:effect,x:10,y:10+i*40,width:200,height:40,fontSize:24,animation:{effect,trigger:'click',order:5,duration:700,delay:125}}));
  s.image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  s.animations.image={effect:'zoom',trigger:'click',order:5};
  const zip=await JSZip.loadAsync(await createPPTX(d)),xml=await zip.file('ppt/slides/slide1.xml').async('string');
  assert.match(xml,/<p:animScale>/);assert.match(xml,/<p:animRot/);assert.match(xml,/<p:attrName>ppt_y/);assert.match(xml,/dur="800"/);assert.match(xml,/delay="250"/);
  assert.match(xml,/<p:pRg st="0" end="0"/);assert.match(xml,/<p:pRg st="1" end="1"/);
  assert.ok(Object.keys(zip.files).some(p=>p.startsWith('ppt/media/')&&!p.endsWith('/')));
  const names=new Map([...xml.matchAll(/<p:cNvPr id="(\d+)" name="([^"]+)"/g)].map(m=>[m[2],m[1]]));
  assert.match(xml,new RegExp(`<p:spTgt spid="${names.get('classroom-image')}"`));
  for(let i=0;i<5;i++)assert.match(xml,new RegExp(`<p:spTgt spid="${names.get(`classroom-extra-${i}`)}"`));
});

test('CLI checks incomplete briefs and creates both downloadable files from a complete plan',async()=>{
  const {mkdtemp,writeFile,readFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const {spawnSync}=await import('node:child_process');
  const dir=await mkdtemp(join(tmpdir(),'classroom-pptx-'));
  try{
    const input=join(dir,'plan.json'),output=join(dir,'result');
    await writeFile(input,JSON.stringify({brief:{year_group:'Year 2'}}));
    const incomplete=spawnSync(process.execPath,['scripts/generate-powerpoint.mjs',input,output,'--check'],{encoding:'utf8'});
    assert.equal(incomplete.status,2);assert.equal(JSON.parse(incomplete.stdout).questions.length,5);
    const illustrated=plan();
    const picture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    await writeFile(join(dir,'dinosaur.png'),picture);
    illustrated.slides[0].imagePath='dinosaur.png';illustrated.slides[0].imageAlt='A friendly dinosaur beside the egg nest.';
    await writeFile(input,JSON.stringify(illustrated));
    const result=spawnSync(process.execPath,['scripts/generate-powerpoint.mjs',input,output],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const backup=JSON.parse(await readFile(join(output,'presentation.json'),'utf8'));
    assert.equal(backup.slides.length,1);assert.match(backup.slides[0].image,/^data:image\/png;base64,/);assert.equal(backup.slides[0].imagePath,undefined);
    const zip=await JSZip.loadAsync(await readFile(join(output,'presentation.pptx')));assert.ok(zip.file('ppt/slides/slide1.xml'));
    const media=Object.values(zip.files).filter(f=>f.name.startsWith('ppt/media/')&&!f.dir);assert.equal(media.length,1);
    assert.deepEqual(await media[0].async('nodebuffer'),picture);
    assert.match(await zip.file('ppt/slides/slide1.xml').async('string'),/A friendly dinosaur beside the egg nest/);
  }finally{await rm(dir,{recursive:true,force:true});}
});


test('illustrations cannot silently remain prompts or load unsupported or unlabelled assets',async()=>{
  const {embedPlanImages}=await import('../scripts/powerpoint-assets.mjs');
  const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=await mkdtemp(join(tmpdir(),'classroom-images-'));
  try{
    const p=plan();p.slides[0].imagePrompt='A storybook dinosaur';
    await assert.rejects(embedPlanImages(p,dir),/Generate the requested illustration first/);
    p.slides[0].imagePath='scene.png';
    await assert.rejects(embedPlanImages(p,dir),/imageAlt/);
    p.slides[0].imageAlt='A friendly dinosaur';p.slides[0].imagePath='https://example.com/image.png';
    await assert.rejects(embedPlanImages(p,dir),/relative/);
    p.slides[0].imagePath='scene.png';await writeFile(join(dir,'scene.png'),'<svg>not a raster illustration</svg>');
    await assert.rejects(embedPlanImages(p,dir),/PNG or JPEG/);
    await writeFile(join(dir,'scene.png'),Buffer.alloc(300001));
    await assert.rejects(embedPlanImages(p,dir),/Resize or compress/);
    assert.equal(p.slides[0].image,undefined);
  }finally{await rm(dir,{recursive:true,force:true});}
});
