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
  // Another teacher's deck remains read-only even after Google sign-in.
  await page.click('#close');await page.selectOption('#scope','published');await page.locator('.deck-card').filter({hasText:'Another teacher'}).getByRole('button',{name:'Open presentation'}).click();assert.equal(await page.locator('#edit').isVisible(),false);
  await page.click('#logout');assert.equal(await page.locator('#edit').isVisible(),false);
  await page.goto('http://127.0.0.1:8766/');await page.waitForSelector('.card');const before=await page.locator('.card').count();assert.ok(before>0);await page.selectOption('#type','powerpoint');assert.equal(await page.locator('.card').count(),0);await page.click('#clear');assert.equal(await page.locator('.card').count(),before);
  assert.deepEqual(errors,[]);console.log('PASS: production playback, mobile layout, editor, reveal steps, save/reopen, PPTX import/export, image export, owner controls and catalogue filters.');
}finally{await browser?.close();server.kill();}
