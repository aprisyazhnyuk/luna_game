// Isolated end-to-end application check. All writes stay in disposable copies.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,cp} from 'node:fs/promises';
import {join,resolve,relative,extname} from 'node:path';
import {createRequire} from 'node:module';
import {prepareReview,applyPrepared} from './lib/review-application.mjs';
import {sandbox,project,hash} from '../tests/helpers/review-sandbox.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const {PNG}=createRequire(import.meta.url)('pngjs');
const pixels=bytes=>{const png=PNG.sync.read(bytes);return `${png.width}x${png.height}:`+hash(png.data);};
const poses=JSON.parse(await readFile(join(project,'tests/fixtures/luna-v1/poses.json')));
const protectedFiles=['assets/cosmetics/catalog.json','assets/cosmetics/bowler.png','assets/cosmetics/bowler.json','sw.js','concepts/luna/bowler-review/luna-bowler-fit.json','concepts/luna/bowler-review/luna-bowler-preview.png'];
const protectedHashes=await Promise.all(protectedFiles.map(async path=>hash(await readFile(join(project,path)))));
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome',timeout:30000,args:['--disable-accelerated-2d-canvas']});
 for(const prefix of ['/','/luna_game/']){
  let cleanup,server,context;
  try{
   const s=await sandbox({after:fn=>{cleanup=fn;}});
   for(const name of ['src','tools','assets'])await cp(join(project,name),join(s.root,name),{recursive:true});
   for(const name of ['index.html','style.css','manifest.webmanifest'])await cp(join(project,name),join(s.root,name));
   s.data.outfit={hat:'crown',shoes:'heels',mark:'skull'};await s.write();
   server=createServer(async(req,res)=>{
    try{
     let path=new URL(req.url,'http://localhost').pathname;if(path.startsWith('/luna_game/'))path=path.slice('/luna_game'.length);
     const file=resolve(s.root,'.'+decodeURIComponent(path.endsWith('/')?path+'index.html':path));
     if(relative(s.root,file).startsWith('..')){res.writeHead(403);res.end();return;}
     res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'})[extname(file)]??'text/plain');res.end(await readFile(file));
    }catch{res.writeHead(404);res.end();}
   });
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}${prefix}`;
   context=await browser.newContext();const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{if(!localStorage.getItem('luna.wardrobe.v2')){localStorage.setItem('luna.best.v1','456');localStorage.setItem('luna.wardrobe.v2',JSON.stringify({version:2,bestTreats:135,unlocked:[],equipped:{hat:'crown',shoes:'heels',mark:'skull'}}));}});
   const storage=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
   await page.goto(url);await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));const saved=await storage();
   await page.goto(url+'tools/wardrobe-preview/');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Every hat'));
   await page.setInputFiles('#fit-file',s.review);await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded fit.json'));
   const downloadEvent=page.waitForEvent('download');await page.click('#snapshot');const previewBytes=await readFile(await(await downloadEvent).path());await writeFile(s.preview,previewBytes);
   async function captures(candidate){
    return page.evaluate(async({candidate,poses})=>{
     const base=new URL('../../',location.href),{drawImageLuna}=await import(new URL('src/animation.js',base)),{loadCosmeticAssets,decodeCosmeticPng}=await import(new URL('src/cosmetic-assets.js',base));
     await loadCosmeticAssets();const {drawHat,drawShoes,drawMark}=await import(new URL('src/cosmetics.js',base));
     const image=new Image();image.src=new URL('assets/luna-custom.png',base);await image.decode();
     const replacements={};
     if(candidate)for(const [category,items] of Object.entries(candidate.fits))for(const [id,fit] of Object.entries(items))if(fit.kind==='raster')replacements[id]=await decodeCosmeticPng(new Uint8Array(await(await fetch(fit.asset.startsWith('data:')?fit.asset:new URL(fit.asset,base))).arrayBuffer()));
     const override=(category,id)=>({fit:candidate.fits[category][id],image:replacements[id]});
     const renderers=candidate?{hat:(c,id)=>drawHat(c,id,override('hat',id)),shoes:(c,leg,id)=>drawShoes(c,leg,id,override('shoes',id)),mark:(c,id,s)=>drawMark(c,id,s,override('mark',id))}:undefined;
     const rendered=[];
     for(const pose of poses)for(const scale of [1,5]){
      const canvas=document.createElement('canvas');canvas.width=scale===1?150:640;canvas.height=scale===1?110:480;
      const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#f7f7f2';c.fillRect(0,0,canvas.width,canvas.height);c.scale(scale,scale);
      drawImageLuna(c,image,scale===1?73:63,scale===1?96:88,pose.pose,{hat:'crown',shoes:'heels',mark:'skull'},renderers);rendered.push(canvas.toDataURL());
     }return rendered;
    },{candidate,poses});
   }
   const expected=await captures(s.data),plan=await prepareReview(s),applied=await applyPrepared(plan);assert.ok(applied.files.length>0);
   const catalog=JSON.parse(await readFile(join(s.root,'assets/cosmetics/catalog.json')));
   for(const id of ['crown','heels','skull'])assert.equal(hash(await readFile(join(s.root,catalog.items.find(i=>i.id===id).art.asset))),hash(s.png));
   await page.goto(url);await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));assert.deepEqual(await storage(),saved);
   // New page/module generation resolves applied catalog data with no overrides.
   await page.goto(url+'tools/wardrobe-preview/');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Every hat'));
   assert.deepEqual(await captures(null),expected,'Applied game renderer must match reviewed variants in all seven poses/both sizes');
   await page.setInputFiles('#fit-file',s.review);await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded fit.json'));
   const actual=await page.locator('#luna').evaluate(canvas=>canvas.toDataURL().split(',')[1]);assert.equal(pixels(Buffer.from(actual,'base64')),pixels(previewBytes));assert.deepEqual(await storage(),saved);
   const repeat=await prepareReview(s);assert.equal(repeat.files.length,0);assert.deepEqual(errors,[]);
   console.log(`Exact multi-category PNG application, saved-pose pixels, 14 movement captures, idempotence and saves passed at ${prefix}`);
  }finally{await context?.close();if(server)await new Promise(resolve=>server.close(resolve));await cleanup?.();}
 }
 assert.deepEqual(await Promise.all(protectedFiles.map(async path=>hash(await readFile(join(project,path))))),protectedHashes);
 console.log(`Review application verified in Chrome ${browser.version()}; approved repository artwork/reviews unchanged`);
}finally{await browser?.close();}
