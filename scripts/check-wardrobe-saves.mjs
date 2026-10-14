// Optional desktop Chrome integration checks in an isolated browser profile.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{
 try{
  let path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/luna_game/'))path=path.slice('/luna_game'.length);
  const file=resolve(root,'.'+decodeURIComponent(path.endsWith('/')?path+'index.html':path));
  if(relative(root,file).startsWith('..')){res.writeHead(403);res.end();return;}
  const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
  res.setHeader('Content-Type',types[extname(file)]??'text/plain');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const legacy=JSON.stringify({version:1,bestTreats:60,equipped:{hat:'bowler',mark:'star',shoes:'boots'}});
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const origin=`http://127.0.0.1:${server.address().port}`;
 async function pageFor(path='/',values={},deny=null){
  const context=await browser.newContext();const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({values,deny})=>{
   if(!sessionStorage.getItem('luna-test-seeded')){
    for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);
    sessionStorage.setItem('luna-test-seeded','1');
   }
   if(deny==='read'){
    const original=Storage.prototype.getItem;
    Storage.prototype.getItem=function(key){if(this===localStorage)throw new DOMException('Denied','SecurityError');return original.call(this,key);};
   }
   if(deny==='write'){
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(this===localStorage&&key==='luna.wardrobe.v2')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);};
   }
  },{values,deny});
  await page.goto(origin+path);
  await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));
  assert.deepEqual(errors,[]);
  return {page,context,errors};
 }
 const saves=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
 for(const path of ['/','/luna_game/']){
  const {page,context}=await pageFor(path,{'luna.wardrobe.v1':legacy,'luna.best.v1':'123'});
  let stored=await saves(page);assert.equal(stored['luna.wardrobe.v1'],legacy);assert.equal(stored['luna.best.v1'],'123');
  assert.ok(stored['luna.wardrobe.v2'],'Startup must persist the migrated version 2 save');
  let migrated=JSON.parse(stored['luna.wardrobe.v2']);assert.equal(migrated.version,2);assert.equal(migrated.equipped.shoes,'runners');assert.ok(migrated.unlocked.includes('runners'));
  await page.click('#open-store');assert.match(await page.textContent('#next-reward'),/Witch hat.*60 \/ 75 treats/);
  await page.click('[data-item="none"]');await page.click('#done-store');await page.reload();
  await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));
  stored=await saves(page);migrated=JSON.parse(stored['luna.wardrobe.v2']);assert.equal(migrated.equipped.hat,'none');assert.ok(migrated.unlocked.includes('bowler'));
  assert.equal(stored['luna.wardrobe.v1'],legacy);assert.equal(stored['luna.best.v1'],'123');
  await context.close();console.log(`Migration/reload/high-score/next-reward checks passed at ${path}`);
 }
 {
  const current=JSON.stringify({version:2,bestTreats:30,unlocked:['bowler'],equipped:{hat:'bowler',mark:'original',shoes:'bare'}});
  const {page,context}=await pageFor('/',{'luna.wardrobe.v1':legacy,'luna.wardrobe.v2':current});
  await page.click('#open-store');assert.match(await page.textContent('#next-reward'),/Lucky star.*30 \/ 45 treats/);
  assert.equal(JSON.parse((await saves(page))['luna.wardrobe.v2']).bestTreats,30);
  await context.close();console.log('Existing v2 save takes precedence over legacy save');
 }
 for(const corrupt of ['broken','{"version":2}']){
  const {page,context}=await pageFor('/',{'luna.wardrobe.v1':legacy,'luna.wardrobe.v2':corrupt});
  assert.equal(JSON.parse((await saves(page))['luna.wardrobe.v2']).bestTreats,60);
  assert.equal((await saves(page))['luna.wardrobe.v1'],legacy);
  await context.close();console.log('Corrupt v2 recovers from unchanged legacy save');
 }
 {
  const {page,context}=await pageFor('/',{},'read');
  assert.equal(await page.isVisible('#store-saving'),false);await page.click('#open-store');
  assert.equal(await page.isVisible('#store-saving'),true);await page.click('#done-store');await page.click('#jump');
  assert.equal(await page.textContent('#action'),'Jump');await context.close();console.log('Denied storage reads show warning and allow session gameplay');
 }
 {
  const {page,context}=await pageFor('/',{'luna.wardrobe.v1':legacy,'luna.best.v1':'123'},'write');
  await page.click('#open-store');assert.equal(await page.isVisible('#store-saving'),true);
  await page.click('[data-item="none"]');assert.equal(await page.getAttribute('[data-item="none"]','aria-pressed'),'true');
  assert.equal((await saves(page))['luna.wardrobe.v2'],undefined);assert.equal((await saves(page))['luna.wardrobe.v1'],legacy);
  await page.click('#done-store');await page.click('#jump');assert.equal(await page.textContent('#action'),'Jump');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));
  await page.click('#open-store');assert.equal(await page.getAttribute('[data-item="bowler"]','aria-pressed'),'true');
  assert.equal((await saves(page))['luna.best.v1'],'123');await context.close();console.log('Denied writes retain session choices and unchanged legacy/high-score data');
 }
 {
  const all=JSON.stringify({version:1,bestTreats:135,equipped:{hat:'bowler',mark:'star',shoes:'runners'}});
  const {page,context,errors}=await pageFor('/',{'luna.wardrobe.v1':all});
  await page.clock.install();await page.click('#jump');await page.clock.runFor(500);await page.keyboard.press('p');
  const before=await page.evaluate(()=>document.querySelector('#scene').toDataURL());
  await page.click('#open-store');await page.click('[data-item="crown"]');
  assert.equal(await page.evaluate(()=>document.querySelector('#scene').toDataURL()),before);
  assert.equal(JSON.parse((await saves(page))['luna.wardrobe.v2']).equipped.hat,'crown');
  await page.click('#done-store');assert.equal(await page.textContent('#message-title'),'Paused');
  await page.click('#jump');await page.clock.runFor(20000);assert.equal(await page.textContent('#message-title'),'Game over');
  await page.clock.runFor(700);await page.click('#jump');await page.keyboard.press('p');
  const expected=await page.evaluate(async()=>{
   const {createRun}=await import('./src/engine.js');const {draw}=await import('./src/draw.js');
   const canvas=document.createElement('canvas');canvas.width=390;canvas.height=380;
   const image=new Image();image.src='./assets/luna-custom.png';await image.decode();
   const run=createRun();run.phase='paused';run.outfit={hat:'crown',mark:'star',shoes:'runners'};
   draw(canvas.getContext('2d'),run,matchMedia('(prefers-reduced-motion: reduce)').matches,image,0);
   return canvas.toDataURL();
  });
  assert.equal(await page.evaluate(()=>document.querySelector('#scene').toDataURL()),expected);
  assert.deepEqual(errors,[]);await context.close();console.log('Store keeps current run outfit; next run equips saved choice');
 }
 console.log(`Desktop integration checks passed in Chrome ${browser.version()}`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
