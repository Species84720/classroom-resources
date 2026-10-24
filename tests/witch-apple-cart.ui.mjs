import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('resources/year-2-witch-apple-cart');
const allowed=['index.html','style.css','script.js','config.js','assets/witch-ready.webp','assets/witch-sad.webp','assets/apple.webp','assets/orchard.webp','assets/dragon-egg.webp','assets/purple-frog.webp'];
const server=createServer(async(req,res)=>{
  try {
    const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(!allowed.includes(name)){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',{'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp'}[extname(name)]);
    res.end(await readFile(resolve(root,name)));
  }catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1366,height:900}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}/`;
  const open=async(query)=>{await page.goto(url+query);await page.locator('#progress li').first().waitFor();};
  const fill=async()=>{
    const target=Number(await page.locator('#target').textContent());
    for(let i=0;i<Math.floor(target/10);i++)await page.locator('#ten').click();
    for(let i=0;i<target%10;i++)await page.locator('#one').click();
  };
  await open('?target=32&items=apples,eggs,frogs');
  assert.equal(await page.locator('#ten .apple').count(),10);
  assert.equal(await page.locator('.sound-status').textContent(),'Sound on');
  assert(await page.locator('#next').isDisabled());
  await page.locator('#witch img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  for(const name of ['dragon-egg','purple-frog'])assert.equal((await page.request.get(url+'assets/'+name+'.webp')).status(),200);
  const source=await page.locator('#ten').boundingBox(),dest=await page.locator('#cart').boundingBox();
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();
  await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:12});await page.mouse.up();
  assert.equal(await page.locator('#tens').textContent(),'1');
  await page.locator('#ten').click();await page.locator('#ten').click();
  await page.locator('#one').focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');
  assert.equal(await page.locator('#tens').textContent(),'3');assert.equal(await page.locator('#ones').textContent(),'2');
  // Desktop OS motion preferences must not suppress the explicitly enabled witch and stars.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#submit').click();
  assert.match(await page.locator('#feedback').textContent(),/3 tens and 2 ones/);
  assert.equal(await page.locator('#witch').evaluate(e=>getComputedStyle(e).animationName),'witch-dance');
  assert.equal(await page.locator('.spark').count(),24);
  assert(await page.locator('.spark').first().isVisible());
  const before=await page.locator('#witch').evaluate(e=>getComputedStyle(e).transform);
  await page.waitForTimeout(180);
  assert.notEqual(await page.locator('#witch').evaluate(e=>getComputedStyle(e).transform),before);
  await page.locator('#motion').click();
  assert.equal(await page.locator('#witch').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await page.locator('.spark').count(),0);
  await page.locator('#motion').click();
  await page.locator('#next').click();
  assert.equal(await page.locator('#ingredient-name').textContent(),'dragon eggs');
  assert.equal(await page.locator('#tens').textContent(),'0');
  assert.equal(await page.locator('#ten').getAttribute('aria-label'),'Add a tray of 10 dragon eggs to the cart');
  await page.locator('#submit').click();
  assert.match(await page.locator('#feedback').textContent(),/too few/);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.witch-sad').evaluate(e=>getComputedStyle(e).opacity),'1');
  assert(await page.locator('#next').isDisabled());
  await page.locator('#one').click();await page.locator('.single').click();
  await page.locator('#undo').click();assert.equal(await page.locator('#ones').textContent(),'1');
  await page.locator('#clear').click();assert.equal(await page.locator('#ones').textContent(),'0');
  await page.locator('#undo').click();assert.equal(await page.locator('#ones').textContent(),'1');
  await page.locator('#clear').click();await fill();await page.locator('#submit').click();await page.locator('#next').click();
  assert.equal(await page.locator('#ingredient-name').textContent(),'purple frogs');
  await fill();await page.locator('#submit').click();
  assert.equal(await page.locator('#progress .complete').count(),3);
  assert.match(await page.locator('#feedback').textContent(),/potion is complete/);
  assert.equal(await page.locator('#next').textContent(),'New potion →');
  await page.locator('#next').click();assert.match(await page.locator('#question').textContent(),/1 of 3/);
  await open('?numbers=43,22,64&items=frogs,eggs,apples');
  const targets=[];
  for(let i=0;i<3;i++){targets.push(Number(await page.locator('#target').textContent()));await fill();await page.locator('#submit').click();if(i<2)await page.locator('#next').click();}
  assert.deepEqual(targets.sort((a,b)=>a-b),[22,43,64]);
  for(const target of [1,10,100]){
    await open(`?target=${target}&items=apples`);await fill();await page.locator('#one').click();await page.locator('#submit').click();
    if(target===100)assert.match(await page.locator('#feedback').textContent(),/Yes!/);
    else{assert.match(await page.locator('#feedback').textContent(),/too many/);await page.locator('.single').last().click();await page.locator('#submit').click();assert.match(await page.locator('#feedback').textContent(),/Yes!/);}
  }
  await open('?min=20&max=25');
  for(let i=0;i<3;i++){const n=Number(await page.locator('#target').textContent());assert(n>=20&&n<=25);await fill();await page.locator('#submit').click();if(i<2)await page.locator('#next').click();}
  await page.locator('summary').click();await page.locator('#min').fill('7');await page.locator('#max').fill('7');
  await page.locator('#numbers').fill('');await page.locator('#item-0').selectOption('eggs');await page.locator('#item-1').selectOption('frogs');await page.locator('#item-2').selectOption('apples');
  await page.locator('#settings button').click();assert.equal(await page.locator('#target').textContent(),'7');assert.match(page.url(),/items=eggs%2Cfrogs%2Capples/);
  await page.locator('#min').fill('30');await page.locator('#max').fill('10');await page.locator('#settings button').click();assert.match(await page.locator('#settings-status').textContent(),/minimum/);
  const touch=await browser.newContext({viewport:{width:390,height:1200},hasTouch:true,isMobile:true});const mobile=await touch.newPage();
  await mobile.goto(url+'?target=32&items=frogs');await mobile.locator('#progress li').first().waitFor();await mobile.locator('#ten').tap();assert.equal(await mobile.locator('#tens').textContent(),'1');
  await mobile.setViewportSize({width:320,height:1400});assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mobile.locator('#cart').scrollIntoViewIfNeeded();
  const client=await touch.newCDPSession(mobile),a=await mobile.locator('#one').boundingBox(),b=await mobile.locator('#cart').boundingBox();
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await mobile.locator('#ones').textContent(),'1');
  await open('?target=10&motion=off');await fill();await page.locator('#submit').click();assert.equal(await page.locator('.spark').count(),0);assert.equal(await page.locator('#witch').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.deepEqual(errors,[]);
  console.log('PASS: three-question recipes, all ingredients, range/list/fixed targets, teacher settings, sound default, desktop animation with reduced-motion override and off control, touch/mouse/keyboard, undo/retry, 320px layout.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
