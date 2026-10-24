import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('resources/year-2-witch-apple-cart');
const server = createServer(async (req,res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname.split('/').pop() || 'index.html';
    if (!['index.html','style.css','script.js'].includes(name)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', {'.html':'text/html','.css':'text/css','.js':'application/javascript'}[extname(name)]);
    res.end(await readFile(resolve(root,name)));
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
import assert from 'node:assert/strict';
let browser;
try {
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=`http://127.0.0.1:${server.address().port}/`;
 await page.goto(url+'?target=32');
 assert.equal(await page.locator('#target').textContent(),'32');
 assert.equal(await page.locator('#ten .apple').count(),10);
 const source=await page.locator('#ten').boundingBox(),dest=await page.locator('#cart').boundingBox();
 await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:12});await page.mouse.up();
 assert.equal(await page.locator('#tens').textContent(),'1');
 await page.locator('#ten').click();await page.locator('#ten').click();await page.locator('#one').focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');
 assert.equal(await page.locator('#tens').textContent(),'3');assert.equal(await page.locator('#ones').textContent(),'2');

 await page.locator('#submit').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('happy')));assert.match(await page.locator('#feedback').textContent(),/3 tens and 2 ones/);
 await page.locator('#next').click();assert.equal(await page.locator('#target').textContent(),'32');
 await page.locator('#one').click();await page.locator('#submit').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('sad')));
 await page.locator('#one').click();assert(!(await page.locator('body').evaluate(e=>e.classList.contains('sad'))));
 await page.locator('.cart-item').first().click();assert.equal(await page.locator('#ones').textContent(),'1');await page.locator('#undo').click();assert.equal(await page.locator('#ones').textContent(),'2');await page.locator('#clear').click();assert.equal(await page.locator('#ones').textContent(),'0');await page.locator('#undo').click();assert.equal(await page.locator('#ones').textContent(),'2');
 for(const [target,tens,ones] of [[1,0,1],[10,1,0],[100,10,0]]){
 await page.goto(url+'?target='+target);for(let i=0;i<tens;i++)await page.locator('#ten').click();for(let i=0;i<ones;i++)await page.locator('#one').click();await page.locator('#one').click();await page.locator('#submit').click();assert.match(await page.locator('#feedback').textContent(),target===100?/Yes!/:/too many/);
 if(target!==100){await page.locator('.single').last().click();await page.locator('#submit').click();assert.match(await page.locator('#feedback').textContent(),/Yes!/);}
 }
 for(const value of ['', '?target=0','?target=101','?target=3.2','?target=hello']){await page.goto(url+value);let n=Number(await page.locator('#target').textContent());assert(n>=1&&n<=100);await page.locator('#next').click();assert.notEqual(Number(await page.locator('#target').textContent()),n);}
 await page.goto(url+'?target=10');const s=await page.locator('#ten').boundingBox();await page.mouse.move(s.x+20,s.y+20);await page.mouse.down();await page.mouse.move(5,5,{steps:10});await page.mouse.up();assert.equal(await page.locator('#tens').textContent(),'0');
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const mobile=await touch.newPage();await mobile.goto(url+'?target=32');await mobile.locator('#ten').tap();assert.equal(await mobile.locator('#tens').textContent(),'1');assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mobile.setViewportSize({width:320,height:1000});assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const client=await touch.newCDPSession(mobile);const a=await mobile.locator('#one').boundingBox(),b=await mobile.locator('#cart').boundingBox();await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await mobile.locator('#ones').textContent(),'1');
 assert.deepEqual(errors,[]);console.log('PASS: mouse drag, touch drag/tap, keyboard, remove/undo/clear, both outcomes, 1/10/32/100 targets, invalid URL fallback, random rounds and 320px layout.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
