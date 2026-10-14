// Dev-only catalog/Studio checks in isolated Chrome, never the owner's profile.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const {PNG}=createRequire(import.meta.url)('pngjs');
const pixelHash=bytes=>{const png=PNG.sync.read(bytes);return `${png.width}x${png.height}:`+digest(png.data);};
const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(await readFile(resolve(root,'assets/cosmetics/catalog.json')));
const png=await readFile(resolve(root,'assets/cosmetics/bowler.png'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function activeHashes(){
 const hashes={};
 for(const dir of ['assets','concepts'])for(const entry of await readdir(resolve(root,dir),{recursive:true,withFileTypes:true}))if(entry.isFile()){
  const path=resolve(entry.parentPath,entry.name);hashes[relative(root,path)]=digest(await readFile(path));
 }
 return hashes;
}
const beforeFiles=await activeHashes();
const server=createServer(async(req,res)=>{
 try{
  let path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/luna_game/'))path=path.slice('/luna_game'.length);
  const file=resolve(root,'.'+decodeURIComponent(path.endsWith('/')?path+'index.html':path));
  if(relative(root,file).startsWith('..')){res.writeHead(403);res.end();return;}
  const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
  res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-accelerated-2d-canvas']});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const editable=catalog.items.filter(item=>item.fit),fixture=JSON.parse(await readFile(resolve(root,'tests/fixtures/luna-v1/review-v2.json')));
 const context=await browser.newContext(),page=await context.newPage();
 page.on('pageerror',()=>{});
 await context.route('**/concepts/luna/04-approved-wardrobe.png',route=>route.fulfill({status:404,body:'Missing optional reference'}));
 await page.goto(origin+'/tools/wardrobe-preview/');
 await page.waitForFunction(()=>!document.querySelector('#status').textContent.startsWith('Loading current'));
 assert.match(await page.textContent('#status'),/^Every hat/,'Missing concept art must not prevent editing');
 console.log('Studio starts without optional concept art');
 await context.close();
 const exportJson=async page=>{const event=page.waitForEvent('download');await page.click('#export');return JSON.parse(await readFile(await (await event).path()));};
 const screenshot=async page=>{const event=page.waitForEvent('download');await page.click('#snapshot');return readFile(await (await event).path());};
 const importJson=async(page,data,name='candidate.json')=>page.setInputFiles('#fit-file',{name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 const setX=async(page,x)=>page.locator('#x').evaluate((el,x)=>{el.value=x;el.dispatchEvent(new Event('input',{bubbles:true}));},x);
 const storage=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
 for(const path of ['/','/luna_game/']){
  const ctx=await browser.newContext(),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('luna.best.v1','456');localStorage.setItem('luna.wardrobe.v2',JSON.stringify({version:2,bestTreats:135,unlocked:['bowler','star','heels'],equipped:{hat:'bowler',mark:'star',shoes:'heels'}}));});
  await p.goto(origin+path+'tools/wardrobe-preview/');await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Every hat'));
  const before=await storage(p);
  await p.evaluate(()=>{const decode=Image.prototype.decode;Image.prototype.decode=async function(){const result=await decode.call(this);window.decodeCompletions=(window.decodeCompletions??0)+1;return result;};});
  for(const item of editable){
   await p.selectOption(`#outfit-${item.category}`,item.id);
   await p.setInputFiles('#art-file',{name:`${item.id}.png`,mimeType:'image/png',buffer:png});
   await p.waitForFunction(id=>document.querySelector('#status').textContent.startsWith(`Loaded ${id}.png`),item.id);
   await setX(p,item.fit.x+2);
  }
  await p.selectOption('#outfit-hat','bowler');await p.click('[data-motion="jump"]');await p.selectOption('#speed','0.25');await p.click('#step');
  const review=await exportJson(p),image=await screenshot(p);
  assert.equal(review.version,2);assert.equal(review.review.playbackSpeed,.25);
  for(const item of editable){const fit=review.fits[item.category][item.id];assert.equal(fit.x,item.fit.x+2);assert.equal(digest(Buffer.from(fit.asset.split(',')[1],'base64')),digest(png));}
  const expected=await p.evaluate(async review=>{
   const {drawImageLuna}=await import('../../src/animation.js');
   const {drawHat,drawShoes,drawMark}=await import('../../src/cosmetics.js');
   const {decodeCosmeticPng}=await import('../../src/cosmetic-assets.js');
   const images={};
   for(const [cat,items] of Object.entries(review.fits))for(const [id,fit] of Object.entries(items))if(fit.kind==='raster')images[id]=await decodeCosmeticPng(new Uint8Array(await(await fetch(fit.asset)).arrayBuffer()));
   const luna=new Image();luna.src='../../assets/luna-custom.png';await luna.decode();
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#f7f7f2';c.fillRect(0,0,640,480);c.scale(5,5);c.fillStyle='#d7dacf';c.fillRect(8,89+review.review.height,112,.5);
   const override=(cat,id)=>({fit:review.fits[cat][id],image:images[id]});
   drawImageLuna(c,luna,63,88,review.review.pose,review.outfit,{hat:(c,id)=>drawHat(c,id,override('hat',id)),shoes:(c,leg,id)=>drawShoes(c,leg,id,override('shoes',id)),mark:(c,id,s)=>drawMark(c,id,s,override('mark',id))});
   return canvas.toDataURL().split(',')[1];
  },review);
  assert.equal(pixelHash(image),pixelHash(Buffer.from(expected,'base64')),'Saved PNG must match the serialized pose/fits using actual renderer');
  await p.click('#reset');let reset=await exportJson(p);assert.equal(reset.fits.hat.bowler.asset,'assets/cosmetics/bowler.png');assert.equal(reset.fits.hat.bowler.x,817);assert.ok(reset.fits.mark.skull.asset.startsWith('data:'));
  await p.click('#reset-all');reset=await exportJson(p);assert.equal(reset.fits.mark.skull.kind,'grid');assert.equal(reset.fits.shoes.heels.kind,'grid');
  await importJson(p,review);await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded candidate.json'));
  assert.equal(pixelHash(await screenshot(p)),pixelHash(image));assert.deepEqual((await exportJson(p)).fits,review.fits);
  const bad=structuredClone(review);bad.fits.mark.skull.asset='data:image/png;base64,YWJjZA==';
  await importJson(p,bad,'bad.json');await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Could not load fit'));
  assert.deepEqual((await exportJson(p)).fits,review.fits);assert.equal(pixelHash(await screenshot(p)),pixelHash(image));
  // A delayed file read must not roll back a fit edit made after upload began.
  await p.evaluate(()=>{const read=FileReader.prototype.readAsDataURL;FileReader.prototype.readAsDataURL=function(file){if(file.name==='slow.png')window.releaseSlow=()=>read.call(this,file);else read.call(this,file);};window.decodeCompletions=0;});
  await p.setInputFiles('#art-file',{name:'slow.png',mimeType:'image/png',buffer:png});await setX(p,831);await p.evaluate(()=>window.releaseSlow());
  await p.waitForFunction(()=>window.decodeCompletions>=1);await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal((await exportJson(p)).fits.hat.bowler.x,831);
  const late=structuredClone(review);late.fits.hat.bowler.asset='concepts/delayed.png';late.fits.hat.bowler.x=900;
  let release,arrive;const arrived=new Promise(resolve=>{arrive=resolve;});
  await ctx.route('**/concepts/delayed.png',async route=>{arrive();await new Promise(resolve=>{release=async()=>{await route.fulfill({body:png,contentType:'image/png'});resolve();};});});
  await p.evaluate(()=>{window.decodeCompletions=0;});
  await importJson(p,late,'late.json');await arrived;await setX(p,825);await release();
  await p.waitForFunction(()=>window.decodeCompletions>=9);
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  // All older decode work has finished before checking the newer fit edit.
  assert.equal((await exportJson(p)).fits.hat.bowler.x,825);
  await ctx.unroute('**/concepts/delayed.png');
  // A newer successful import wins over an older response still in flight.
  let unblock,signal;const pending=new Promise(resolve=>{signal=resolve;});
  await ctx.route('**/concepts/delayed.png',async route=>{signal();await new Promise(resolve=>{unblock=async()=>{await route.fulfill({body:png,contentType:'image/png'});resolve();};});});
  await p.evaluate(()=>{window.decodeCompletions=0;});
  await importJson(p,late,'first.json');await pending;await importJson(p,review,'second.json');await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded second.json'));
  await unblock();await p.waitForFunction(()=>window.decodeCompletions>=18);
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.match(await p.textContent('#status'),/^Loaded second.json/);assert.deepEqual((await exportJson(p)).fits,review.fits);
  assert.deepEqual(await storage(p),before);assert.deepEqual(errors,[]);await ctx.close();
  console.log(`Nine PNG byte/fit round trips, saved pose, resets, failed/concurrent imports and save isolation passed at ${path}`);
 }
 // A catalog without the historical bowler and with three unnamed PNG entries.
 {
  const ctx=await browser.newContext(),p=await ctx.newPage(),data=structuredClone(catalog);
  data.items=data.items.filter(item=>item.id!=='bowler');
  for(const category of ['hat','shoes','mark']){const base=data.items.find(item=>item.category===category&&item.fit);data.items.push({...structuredClone(base),id:`extra-${category}`,name:`Extra ${category}`,art:{kind:'png',asset:'assets/cosmetics/bowler.png'}});}
  await ctx.route('**/assets/cosmetics/catalog.json',route=>route.fulfill({json:data}));
  await ctx.route('**/concept-references.json',route=>route.fulfill({body:'not JSON',contentType:'application/json'}));
  await p.goto(origin+'/tools/wardrobe-preview/');await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Every hat'));
  assert.equal(await p.inputValue('#outfit-hat'),'witch');
  for(const category of ['hat','shoes','mark'])await p.selectOption(`#outfit-${category}`,`extra-${category}`);
  const old=structuredClone(fixture);delete old.fits.hat.bowler;old.outfit.hat='witch';
  await importJson(p,old);await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded candidate.json'));
  const exported=await exportJson(p);for(const category of ['hat','shoes','mark'])assert.equal(exported.fits[category][`extra-${category}`].asset,'assets/cosmetics/bowler.png');
  await ctx.close();console.log('No bowler seed/crop dependency; old reviews preserve three later catalog-only items');
 }

 assert.deepEqual(await activeHashes(),beforeFiles,'Active art/catalog/review evidence must never change');
 console.log(`Studio review verification passed in Chrome ${browser.version()}`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
