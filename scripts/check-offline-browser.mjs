// Production worker path on an isolated secure test origin. No user's cache/saves.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,cp,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,extname} from 'node:path';
import {createRequire} from 'node:module';
import {generateInventory,readInventoryFile,parseInventory} from './lib/offline-inventory.mjs';
import {sandbox,project,hash} from '../tests/helpers/review-sandbox.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,label,ms=20000){const end=Date.now()+ms;while(Date.now()<end){if(await predicate())return;await sleep(50);}throw new Error('Timed out: '+label);}
const state={root:null,fail:null,hold:null,held:null,offline:false};let browser,version;
let launchOptions;
async function launch(profile){const context=await chromium.launchPersistentContext(profile,launchOptions);context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(15000);browser=context.browser();version=browser.version();return context;}
const server=createServer(async(req,res)=>{
 try{
  if(state.offline){req.socket.destroy();return;}
  let path=new URL(req.url,'http://localhost').pathname;if(path.startsWith('/luna_game/'))path=path.slice('/luna_game'.length);path=decodeURIComponent(path.endsWith('/')?path+'index.html':path).slice(1);
  if(path===state.fail){res.writeHead(404);res.end('missing required asset');return;}
  const file=resolve(state.root,path);if(relative(state.root,file).startsWith('..')){res.writeHead(403);res.end();return;}
  const bytes=await readFile(file);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'})[extname(file)]??'text/plain');
  if(path===state.hold){res.writeHead(200,{'Content-Length':bytes.length});res.write(bytes.subarray(0,10));state.held=res;return;}
  res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port,origin=`http://luna.test:${port}`;
const storage=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
const cacheKeys=page=>page.evaluate(()=>caches.keys());
const ready=page=>page.waitForFunction(()=>document.querySelector('#offline-status').textContent==='Ready for offline adventures');
const registerUpdate=page=>page.evaluate(()=>{navigator.serviceWorker.getRegistration().then(r=>r.update()).catch(error=>{window.__updateError=error.message;});});
const waiting=page=>until(()=>page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.waiting?.state==='installed';}),'installed waiting worker');
async function coldStart(context,profile,url){
 await context.close();state.offline=true;
 context=await launch(profile);const page=context.pages()[0]??await context.newPage();await page.goto(url);await ready(page);return {context,page};
}
async function activateAfterClosing(context,profile,pages,url){
 if(pages.length>1){await pages[0].close();assert.equal(await pages[1].evaluate(async()=> (await(await fetch('./assets/cosmetics/catalog.json')).json()).items.some(i=>i.id==='new-hat')),false,'one remaining old client still uses old generation');}
 return coldStart(context,profile,url);
}
async function addItem(root,id){
 const file=join(root,'assets/cosmetics/catalog.json'),catalog=JSON.parse(await readFile(file));catalog.items.push({...catalog.items.find(i=>i.id==='bowler'),id,name:id,target:9999,art:{kind:'png',asset:`assets/cosmetics/${id}.png`}});
 await writeFile(file,JSON.stringify(catalog,null,2)+'\n');await cp(join(root,'assets/cosmetics/bowler.png'),join(root,`assets/cosmetics/${id}.png`));
 await writeFile(join(root,'offline-assets.js'),await generateInventory({read:path=>readInventoryFile(root,path)}));
}
try{
 launchOptions={headless:true,channel:'chrome',timeout:30000,args:[`--host-resolver-rules=MAP luna.test 127.0.0.1`,`--unsafely-treat-insecure-origin-as-secure=${origin}`,'--no-proxy-server']};
 for(const prefix of ['/','/luna_game/']){
  let cleanup,context,second,third,profile,freshProfile;
  try{
   const s=await sandbox({after:fn=>{cleanup=fn;}});second=await mkdtemp(join(tmpdir(),'luna-offline-b-'));third=await mkdtemp(join(tmpdir(),'luna-offline-c-'));await cp(s.root,second,{recursive:true});await addItem(second,'new-hat');await cp(second,third,{recursive:true});await addItem(third,'interrupted-hat');
   await cp(join(project,'tests/fixtures/offline/sw-v19.js'),join(s.root,'sw.js'));await cp(join(project,'tests/fixtures/offline/app-v19.js'),join(s.root,'src/app.js'));
   // The previous worker's manual inventory predates approved raster replacements.
   await cp(join(project,'tests/fixtures/luna-v1/catalog.json'),join(s.root,'assets/cosmetics/catalog.json'));
   state.root=s.root;state.offline=false;state.fail=null;state.hold=null;state.held=null;const url=origin+prefix,oldKey=`luna-${url}-v19`,b=parseInventory(await readFile(join(second,'offline-assets.js'))),c=parseInventory(await readFile(join(third,'offline-assets.js')));
   profile=await mkdtemp(join(tmpdir(),'luna-offline-profile-'));context=await launch(profile);await context.addInitScript(()=>{if(!localStorage.getItem('luna.wardrobe.v2')){localStorage.setItem('luna.best.v1','812');localStorage.setItem('luna.wardrobe.v2',JSON.stringify({version:2,bestTreats:135,unlocked:['none','original','bare','bowler','witch','crown','star','skull','heels','runners','sandals','new-hat'],equipped:{hat:'bowler',mark:'star',shoes:'heels'}}));}});
   let page=await context.newPage();await page.goto(url);assert.equal(await page.evaluate(()=>isSecureContext),true);await ready(page);console.log('Previous v19 online ready',prefix);const saved=await storage(page);assert.ok((await cacheKeys(page)).includes(oldKey));
   await page.evaluate(async url=>{await caches.open('another-app');await caches.open(`luna-${new URL('other/',url).href}-keep`);},url);
   ({context,page}=await coldStart(context,profile,url));assert.deepEqual(await storage(page),saved);state.offline=false;
   const extra=await context.newPage();await extra.goto(url);await ready(extra);console.log('Previous v19 cold offline ready',prefix);state.root=second;await registerUpdate(page);await waiting(page);console.log('Generated worker waiting',prefix);
   assert.ok((await cacheKeys(page)).includes(oldKey));assert.ok((await cacheKeys(page)).includes(`luna-${url}-${b.cacheKey}`),JSON.stringify({expected:b.cacheKey,keys:await cacheKeys(page),workers:await Promise.all(context.serviceWorkers().map(async worker=>{try{return await worker.evaluate(()=>({key:self.LUNA_OFFLINE?.cacheKey,scope:self.registration.scope}));}catch{return 'closed';}}))}));
   assert.equal(await page.evaluate(async()=> (await(await fetch('./assets/cosmetics/catalog.json')).json()).items.some(i=>i.id==='new-hat')),false,'old clients keep their old catalog until activation');
   ({context,page}=await activateAfterClosing(context,profile,[page,extra],url));state.offline=false;console.log('Generated worker activated',prefix);assert.deepEqual(await storage(page),saved);assert.equal((await cacheKeys(page)).includes(oldKey),false);assert.ok((await cacheKeys(page)).includes('another-app'));assert.ok((await cacheKeys(page)).some(key=>key.endsWith('other/-keep')));
   ({context,page}=await coldStart(context,profile,url));assert.deepEqual(await storage(page),saved);
   const offlineCatalog=await page.evaluate(async()=>{const response=await fetch('./assets/cosmetics/catalog.json');return response.json();});
   for(const item of offlineCatalog.items.filter(item=>item.art.kind==='png')){
    const bytes=await page.evaluate(async asset=>[...new Uint8Array(await(await fetch('./'+asset)).arrayBuffer())],item.art.asset);
    assert.equal(hash(Buffer.from(bytes)),hash(await readFile(join(second,item.art.asset))),`Exact offline PNG for ${item.id}`);
   }
   await page.click('#open-store');for(const [tab,id] of [['Hats','new-hat'],['Shoes','runners'],['Body marks','skull']]){await page.getByRole('tab',{name:tab,exact:true}).click();await page.click(`[data-item="${id}"]`);}await page.click('#done-store');const equipped=await storage(page);
   const bytes=await page.evaluate(async()=>[...new Uint8Array(await(await fetch('./assets/cosmetics/new-hat.png')).arrayBuffer())]);assert.equal(hash(Buffer.from(bytes)),hash(s.png));
   state.offline=false;state.root=third;state.hold='assets/cosmetics/interrupted-hat.png';state.held=null;await registerUpdate(page);await until(()=>!!state.held,'partial new asset download');state.held.destroy();state.hold=null;
   await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('previous version retained'));assert.ok((await cacheKeys(page)).includes(`luna-${url}-${b.cacheKey}`));assert.equal((await cacheKeys(page)).includes(`luna-${url}-${c.cacheKey}`),false);assert.deepEqual(await storage(page),equipped);
   state.offline=true;assert.equal(await page.evaluate(async()=> (await(await fetch('./assets/cosmetics/catalog.json')).json()).items.some(i=>i.id==='interrupted-hat')),false);state.offline=false;
   await registerUpdate(page);await waiting(page);assert.match(await page.textContent('#offline-status'),/Update downloaded/);({context,page}=await activateAfterClosing(context,profile,[page],url));state.offline=false;assert.deepEqual(await storage(page),equipped);
   ({context,page}=await coldStart(context,profile,url));assert.equal(await page.evaluate(async()=> (await(await fetch('./assets/cosmetics/catalog.json')).json()).items.some(i=>i.id==='interrupted-hat')),true);assert.deepEqual(await storage(page),equipped);await context.close();context=null;
   // Fresh install failure must not falsely claim readiness, then recovers online.
   freshProfile=await mkdtemp(join(tmpdir(),'luna-offline-fresh-'));context=await launch(freshProfile);state.root=second;state.offline=false;state.fail='assets/icon-512.png';page=await context.newPage();await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{window.__statuses=[];const el=document.querySelector('#offline-status');new MutationObserver(()=>window.__statuses.push(el.textContent)).observe(el,{childList:true});}));
   await page.goto(url);await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('offline setup unavailable'));assert.equal((await cacheKeys(page)).some(key=>key.startsWith(`luna-${url}-`)),false);assert.equal(await page.evaluate(()=>window.__statuses.includes('Ready for offline adventures')),false);
   state.fail=null;await page.reload();await ready(page);
   // Ordinary localhost keeps its existing worker/cache bypass and saved progress.
   const localUrl=`http://127.0.0.1:${port}${prefix}`;page=await context.newPage();await page.addInitScript(()=>{if(!localStorage.getItem('luna.best.v1'))localStorage.setItem('luna.best.v1','42');});await page.goto(localUrl);await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));const localSaved=await storage(page);
   await page.evaluate(async url=>{await caches.open(`luna-${url}-old`);await caches.open('unrelated-local');},localUrl);await page.reload();await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));assert.deepEqual(await storage(page),localSaved);assert.deepEqual(await cacheKeys(page),['unrelated-local']);assert.equal(await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length),0);
   console.log(`v19 → generated worker upgrade, cold offline categories/new PNG, interrupted update/recovery, failed first install and localhost isolation passed at ${prefix}`);
  }finally{state.held?.destroy();state.held=null;state.fail=null;state.hold=null;await context?.close();await cleanup?.();if(profile)await rm(profile,{recursive:true,force:true});if(freshProfile)await rm(freshProfile,{recursive:true,force:true});if(second)await rm(second,{recursive:true,force:true});if(third)await rm(third,{recursive:true,force:true});}
 }
 console.log(`Installed-worker checks passed in Chrome ${version}; test-only secure loopback origin, no Android claim`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
