import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import JSZip from 'jszip';
await mkdir('.test-output',{recursive:true});
await build({entryPoints:['presentations/src/studio.js'],outfile:'.test-output/studio-test.js',bundle:true,format:'esm',platform:'browser',plugins:[{name:'test-cloud',setup(b){b.onResolve({filter:/^\.\/cloud\.js$/},args=>({path:path.resolve('tests/cloud.mock.js')}));}}]});
const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
  for(let attempt=0;attempt<40;attempt++){try{await fetch('http://127.0.0.1:8766');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  // Production bundle: unconfigured service, public demo, keyboard and Three.js playback.
  await page.goto('http://127.0.0.1:8766/presentations/');await page.waitForSelector('#setup:visible');
  assert.equal(await page.locator('#create').isDisabled(),true);
  await page.click('#demo');await page.waitForSelector('#stage .slide');
  assert.equal(await page.locator('#edit').isVisible(),false);
  await page.locator('#stage').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('#slide-status').textContent(),/2 \/ 4/);
  await page.selectOption('#view-mode','zoom');await page.waitForTimeout(900);await page.click('#overview');await page.waitForTimeout(900);
  assert.match(await page.locator('#slide-status').textContent(),/Overview/);
  await page.screenshot({path:'.test-output/zoom-overview.png'});
  await page.setViewportSize({width:390,height:844});await page.click('#overview');await page.waitForTimeout(900);await page.screenshot({path:'.test-output/mobile-player.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // PowerPoint export and ZIP inspection (no Google account needed for downloads).
  const download=page.waitForEvent('download');await page.click('#export');const pptx=await download;await pptx.saveAs('.test-output/exported.pptx');
  const zip=await JSZip.loadAsync(await readFile('.test-output/exported.pptx'));assert.ok(zip.file('ppt/slides/slide4.xml'));
  assert.match(await zip.file('ppt/slides/slide1.xml').async('string'),/Big ideas/);
  // Editor interactions use a mock adapter. Actual authorisation is covered by the emulator suite.
  await page.route('**/presentations/dist/studio.js',route=>route.fulfill({path:'.test-output/studio-test.js',contentType:'text/javascript'}));
  await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:8766/presentations/');await page.click('#login');await page.click('#create');
  await page.fill('#title','Our counting adventure');await page.fill('#slide-title','Count with me');await page.fill('#slide-body','One\nTwo\nThree');await page.selectOption('#animation','reveal');
  await page.click('#duplicate');assert.equal(await page.locator('#slide-list li').count(),5);await page.click('#down');await page.click('#up');await page.click('#remove');assert.equal(await page.locator('#slide-list li').count(),4);
  await page.locator('#slide-list button').first().click();
  await page.screenshot({path:'.test-output/editor.png'});
  await page.click('#present');await page.locator('#stage').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('#slide-status').textContent(),/1\/3 lines/);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');assert.match(await page.locator('#slide-status').textContent(),/2 \/ 4/);
  await page.click('#exit-show');await page.check('#published');await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved and shared'));
  await page.click('#close');await page.selectOption('#scope','mine');await page.getByRole('button',{name:'Edit',exact:true}).click();assert.equal(await page.locator('#title').inputValue(),'Our counting adventure');
  // Import exported PPTX, preserving text and creating a new private draft.
  await page.click('#close');await page.locator('#import').setInputFiles('.test-output/exported.pptx');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Imported as editable'));
  assert.equal(await page.locator('#slide-list li').count(),4);assert.equal(await page.locator('#published').isChecked(),false);
  // Picture upload and export retains an embedded image.
  await page.locator('#image').setInputFiles({name:'picture.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#ff9900';ctx.fillRect(0,0,200,100);return c.toDataURL('image/png').split(',')[1];}),'base64')});
  await page.waitForSelector('#preview img').catch(async error=>{console.error('Picture upload status:',await page.locator('#status').textContent());throw error;});await page.fill('#image-alt','A sample picture');
  const withPicture=page.waitForEvent('download');await page.click('#export');await(await withPicture).saveAs('.test-output/with-picture.pptx');
  const imageZip=await JSZip.loadAsync(await readFile('.test-output/with-picture.pptx'));assert.ok(Object.keys(imageZip.files).some(f=>f.startsWith('ppt/media/')&&!f.endsWith('/')));
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.test-output/mobile-editor.png',fullPage:true});assert.ok((await page.locator('#add').boundingBox()).height<100);assert.ok(await page.locator('#template').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Nested frames, per-object effects, grouped click steps and backward navigation.
  await page.setViewportSize({width:1440,height:1100});await page.click('#close');await page.click('#create');await page.selectOption('#template','nested');
  assert.equal(await page.locator('#mode').inputValue(),'zoom');
  await page.locator('#slide-list button').nth(1).click();const parentID=await page.locator('#parent-slide').inputValue();assert.ok(parentID);
  await page.click('#add-child');await page.fill('#slide-title','A nested detail');assert.equal(await page.locator('#parent-slide').inputValue().then(Boolean),true);
  await page.selectOption('#object-target','title');await page.selectOption('#object-effect','fade');await page.fill('#object-duration','200');await page.locator('#object-duration').press('Tab');
  await page.selectOption('#object-target','body');await page.selectOption('#object-trigger','click');await page.selectOption('#object-effect','rise');
  await page.click('#add-text');await page.fill('#object-text','An independently animated text box');const objectID=await page.locator('#object-target').inputValue();
  await page.selectOption('#object-effect','zoom');await page.selectOption('#object-trigger','click');await page.fill('#object-order','2');await page.locator('#object-order').press('Tab');
  await page.fill('#object-delay','200');await page.locator('#object-delay').press('Tab');await page.fill('#object-duration','200');await page.locator('#object-duration').press('Tab');
  // Object placement by pointer and by accessible numeric controls.
  const oldX=Number(await page.locator('#object-x').inputValue());await page.locator('#preview').scrollIntoViewIfNeeded();const objectBox=await page.locator(`#preview [data-object="${objectID}"]`).boundingBox();
  await page.mouse.move(objectBox.x+20,objectBox.y+10);await page.mouse.down();await page.mouse.move(objectBox.x+60,objectBox.y+20,{steps:4});await page.mouse.up();assert.ok(Number(await page.locator('#object-x').inputValue())>oldX);
  const pictureFile=Object.keys(imageZip.files).find(f=>f.startsWith('ppt/media/')&&!f.endsWith('/'));
  await page.locator('#add-object-image').setInputFiles({name:'extra.jpeg',mimeType:'image/jpeg',buffer:await imageZip.file(pictureFile).async('nodebuffer')});
  await page.waitForFunction(()=>document.querySelector('#object-target').selectedOptions[0].textContent.includes('Picture'));
  const pictureID=await page.locator('#object-target').inputValue();await page.selectOption('#object-effect','spin');await page.selectOption('#object-trigger','click');await page.fill('#object-order','2');await page.locator('#object-order').press('Tab');
  await page.fill('#object-width','140');await page.locator('#object-width').press('Tab');await page.fill('#object-x','760');await page.locator('#object-x').press('Tab');
  await page.selectOption('#object-target',objectID);await page.fill('#object-width','500');await page.locator('#object-width').press('Tab');
  await page.locator('#canvas-map').scrollIntoViewIfNeeded();const selectedSlideID=await page.locator('#slide-list button[aria-current="true"]').evaluate((button)=>document.querySelector('#canvas-map [aria-label="Select A nested detail"]').dataset.slideId);
  const mapBox=await page.locator(`#canvas-map [data-slide-id="${selectedSlideID}"] rect`).boundingBox();const beforeMapX=Number(await page.locator('#canvas-x').inputValue());
  await page.mouse.move(mapBox.x+mapBox.width/2,mapBox.y+mapBox.height/2);await page.mouse.down();await page.mouse.move(mapBox.x+mapBox.width/2+8,mapBox.y+mapBox.height/2,{steps:3});await page.mouse.up();assert.notEqual(Number(await page.locator('#canvas-x').inputValue()),beforeMapX);
  await page.screenshot({path:'.test-output/object-editor.png',fullPage:true});
  await page.click('#present');const childScale=Number(await page.locator('#stage').getAttribute('data-focus-scale'));assert.ok(childScale<.2);
  const active=()=>page.locator('#stage .slide[aria-hidden="false"]');
  assert.equal(await active().locator('[data-object="body"]').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  assert.equal(await active().locator(`[data-object="${objectID}"]`).evaluate(e=>getComputedStyle(e).visibility),'hidden');
  await page.click('#next');assert.equal(await active().locator('[data-object="body"]').evaluate(e=>getComputedStyle(e).visibility),'visible');
  assert.equal(await active().locator(`[data-object="${objectID}"]`).evaluate(e=>getComputedStyle(e).visibility),'hidden');
  assert.equal(await active().locator(`[data-object="${pictureID}"]`).evaluate(e=>getComputedStyle(e).visibility),'hidden');
  await page.click('#next');await page.waitForTimeout(700);assert.equal(await active().locator(`[data-object="${pictureID}"]`).evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await active().locator(`[data-object="${objectID}"]`).evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.click('#prev');assert.equal(await active().locator(`[data-object="${objectID}"]`).evaluate(e=>getComputedStyle(e).visibility),'hidden');
  await page.click('#zoom-parent');assert.ok(Number(await page.locator('#stage').getAttribute('data-focus-scale'))>childScale);
  await page.getByRole('button',{name:'Zoom into A nested detail',exact:true}).click();assert.equal(Number(await page.locator('#stage').getAttribute('data-focus-scale')),childScale);
  await page.screenshot({path:'.test-output/nested-detail.png'});
  await page.click('#overview');await page.waitForTimeout(1000);await page.screenshot({path:'.test-output/nested-overview.png'});
  await page.click('#overview');await page.click('#exit-show');
  // Save/load and JSON backups retain hierarchy, geometry and object animations.
  await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved as'));
  const jsonDownload=page.waitForEvent('download');await page.click('#backup');await(await jsonDownload).saveAs('.test-output/nested-backup.json');
  const backup=JSON.parse(await readFile('.test-output/nested-backup.json','utf8'));const detailed=backup.slides.find(s=>s.title==='A nested detail');assert.ok(detailed.parentId);assert.equal(detailed.elements[0].animation.order,2);
  const objectExport=page.waitForEvent('download');await page.click('#export');await(await objectExport).saveAs('.test-output/objects.pptx');const objectsZip=await JSZip.loadAsync(await readFile('.test-output/objects.pptx'));assert.match(await objectsZip.file('ppt/slides/slide3.xml').async('string'),/independently animated/);
  // Reordering and parent deletion keep references valid.
  await page.click('#up');await page.click('#down');await page.locator('#slide-list button').nth(1).click();await page.click('#remove');await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved as'));
  await page.click('#close');await page.selectOption('#scope','mine');await page.locator('.deck-card').filter({hasText:'Untitled presentation'}).getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('#slide-list button').nth(1).click();assert.equal(await page.locator('#slide-title').inputValue(),'A nested detail');
  await page.selectOption('#object-target',objectID);assert.equal(await page.locator('#object-effect').inputValue(),'zoom');
  // Reduced motion retains click-to-reveal, without timed visual animations.
  await page.emulateMedia({reducedMotion:'reduce'});await page.click('#present');await page.click('#next');await page.click('#next');assert.equal(await active().locator(`[data-object="${objectID}"]`).evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await active().evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  await page.click('#exit-show');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.test-output/mobile-objects.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Another teacher's deck remains read-only even after Google sign-in.
  await page.click('#close');await page.selectOption('#scope','published');await page.locator('.deck-card').filter({hasText:'Another teacher'}).getByRole('button',{name:'Open presentation'}).click();assert.equal(await page.locator('#edit').isVisible(),false);
  await page.click('#logout');assert.equal(await page.locator('#edit').isVisible(),false);
  await page.goto('http://127.0.0.1:8766/');await page.waitForSelector('.card');const before=await page.locator('.card').count();assert.ok(before>0);await page.selectOption('#type','powerpoint');assert.equal(await page.locator('.card').count(),0);await page.click('#clear');assert.equal(await page.locator('.card').count(),before);
  assert.deepEqual(errors,[]);console.log('PASS: production playback, per-object builds and delays, nested zoom and parent return, drag positioning, reduced motion, legacy decks, save/reopen, PowerPoint objects, mobile layout and owner controls.');
}finally{await browser?.close();server.kill();}
