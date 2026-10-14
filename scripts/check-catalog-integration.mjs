// Dev-only catalog/Studio checks in isolated Chrome, never the owner's profile.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(await readFile(resolve(root,'assets/cosmetics/catalog.json')));
const png=await readFile(resolve(root,'assets/cosmetics/bowler.png'));
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
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const saved=JSON.stringify({version:2,bestTreats:60,unlocked:['none','original','bare','bowler','star','runners'],equipped:{hat:'bowler',mark:'star',shoes:'runners'}});
 const storage=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
 for(const path of ['/','/luna_game/']){
  const context=await browser.newContext();const page=await context.newPage();const requests=[],errors=[];
  page.on('request',request=>requests.push(new URL(request.url()).pathname));page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(saved=>{if(!localStorage.getItem('luna.wardrobe.v2')){localStorage.setItem('luna.wardrobe.v2',saved);localStorage.setItem('luna.best.v1','321');}},saved);
  await page.goto(origin+path);await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));
  assert.equal(requests.filter(url=>url.endsWith('/catalog.json')).length,1);assert.equal(requests.filter(url=>url.endsWith('/bowler.png')).length,1);
  assert.equal(requests.filter(url=>url.endsWith('/bowler.json')).length,0);
  await page.click('#open-store');assert.equal(await page.locator('.cosmetic-option').count(),11);await page.click('#done-store');
  const before=await storage(page);await page.goto(origin+path+'tools/wardrobe-preview/');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Every hat'));
  await page.click('[data-motion="ready"]');await page.click('#pause');
  assert.equal(await page.inputValue('#x'),'817');assert.equal(await page.inputValue('#y'),'373');assert.equal(await page.inputValue('#scale'),'1.91');
  for(const [category,ids] of Object.entries({hat:['bowler','witch','crown'],shoes:['heels','runners','sandals'],mark:['original','star','skull']})){
   for(const id of ids)await page.selectOption(`#outfit-${category}`,id);
  }
  await page.setInputFiles('#art-file',{name:'replacement.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded replacement.png'));
  await page.click('#reset-all');
  const downloadEvent=page.waitForEvent('download');await page.click('#export');const download=await downloadEvent;
  const review=JSON.parse(await readFile(await download.path()));
  assert.equal(review.version,2);
  assert.equal(Object.values(review.fits).reduce((sum,items)=>sum+Object.keys(items).length,0),9);
  for(const item of catalog.items.filter(item=>item.fit)){
   const fit=review.fits[item.category][item.id];assert.equal(fit.x,item.fit.x);assert.equal(fit.y,item.fit.y);assert.equal(fit.scale,item.fit.scale);
   if(item.art.kind==='png')assert.equal(fit.asset,item.art.asset);
  }
  assert.deepEqual(await storage(page),before);assert.deepEqual(errors,[]);await context.close();
  console.log(`Shared catalog, nine Studio items/import/reset/export and save isolation passed at ${path}`);
 }
 {
  const context=await browser.newContext();const page=await context.newPage(),data=structuredClone(catalog);
  data.items.find(item=>item.id==='bowler').name='Catalog bowler label';
  for(const category of ['hat','shoes','mark']){
   const base=data.items.find(item=>item.category===category&&item.fit);
   data.items.push({...structuredClone(base),id:`new-${category}`,name:`New ${category}`,art:{kind:'png',asset:'assets/cosmetics/bowler.png'}});
  }
  await context.route('**/assets/cosmetics/catalog.json',route=>route.fulfill({json:data}));
  await page.goto(origin+'/');await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));
  await page.click('#open-store');assert.equal(await page.locator('.cosmetic-option').count(),14);
  assert.match(await page.textContent('[data-item="bowler"]'),/Catalog bowler label/);
  for(const category of ['hat','shoes','mark'])assert.equal(await page.locator(`[data-item="new-${category}"]`).count(),1);
  await page.goto(origin+'/tools/wardrobe-preview/');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Every hat'));
  for(const category of ['hat','shoes','mark'])await page.selectOption(`#outfit-${category}`,`new-${category}`);
  assert.match(await page.textContent('#source-label'),/No concept reference/);
  const count=await page.evaluate(async()=>{const {getCosmeticSnapshot}=await import('../../src/cosmetic-assets.js');return Object.values(getCosmeticSnapshot().items).filter(item=>item.image).length;});
  assert.equal(count,4);await context.close();console.log('Catalog-only PNG entries populate loader, Store and Studio in all categories');
 }
 {
  const context=await browser.newContext();const page=await context.newPage();
  await page.addInitScript(saved=>localStorage.setItem('luna.wardrobe.v2',saved),saved);
  await context.route('**/assets/cosmetics/bowler.png',route=>route.fulfill({body:'not a PNG',contentType:'image/png'}));
  await page.goto(origin+'/');await page.waitForFunction(()=>document.querySelector('#message-title').textContent==='Couldn’t start Luna');
  assert.equal((await storage(page))['luna.wardrobe.v2'],saved);
  assert.equal(await page.evaluate(async()=>{const {getCosmeticSnapshot}=await import('./src/cosmetic-assets.js');return getCosmeticSnapshot();}),null);
  await page.goto(origin+'/tools/wardrobe-preview/');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Preview could not load'));
  assert.match(await page.textContent('#status'),/bowler.png.*PNG header/);
  await context.close();console.log('Invalid actual PNG fails startup/Studio without a partial snapshot or save write');
 }
 console.log(`Catalog integration passed in Chrome ${browser.version()}`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
