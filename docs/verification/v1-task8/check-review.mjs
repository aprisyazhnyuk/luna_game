import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve,relative,extname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const {PNG}=createRequire(import.meta.url)('pngjs');
// Reproduce Task 8 evidence in a disposable browser profile. No active writes.
const root=fileURLToPath(new URL('../../../',import.meta.url)),mode=process.argv[2];
assert.ok(['pose','movement'].includes(mode),'Usage: node docs/verification/v1-task8/check-review.mjs pose|movement [OUTPUT_DIR]');
const defaultCanvas=mode==='pose';
const evidence=join(root,'concepts/luna/applied-reviews/6237feec4702c5c2bcaf8005c764084d6e889969a0a5a8cf8e2772783ff20191');
const reviewPath=join(evidence,'review.json'),previewPath=join(evidence,'preview.png');
const review=JSON.parse(await readFile(reviewPath)),preview=await readFile(previewPath);
const application=JSON.parse(await readFile(join(evidence,'report.json')));
const previousWitch=application.items.find(item=>item.id==='witch').before;
const poses=JSON.parse(await readFile(join(root,'tests/fixtures/luna-v1/poses.json')));
const output=process.argv[3]?resolve(process.argv[3]):await mkdtemp(join(tmpdir(),'luna-task8-evidence-'));await mkdir(output,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pixels=bytes=>{const p=PNG.sync.read(bytes);return `${p.width}x${p.height}:${hash(p.data)}`;};
const server=createServer(async(req,res)=>{
 try{
  let path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/luna_game/'))path=path.slice('/luna_game'.length);
  const file=resolve(root,'.'+decodeURIComponent(path.endsWith('/')?path+'index.html':path));
  if(relative(root,file).startsWith('..')){res.writeHead(403);res.end();return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'})[extname(file)]??'text/plain');
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome',args:defaultCanvas?[]:['--disable-accelerated-2d-canvas']});
 const report={mode,canvasBackend:defaultCanvas?'default':'software',browser:browser.version(),reviewSha256:hash(await readFile(reviewPath)),previewSha256:hash(preview),paths:[]};
 for(const prefix of ['/','/luna_game/']){
  const context=await browser.newContext({deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(!localStorage.getItem('luna.wardrobe.v2')){
   localStorage.setItem('luna.best.v1','1183');
   localStorage.setItem('luna.wardrobe.v2',JSON.stringify({version:2,bestTreats:135,unlocked:['bowler','witch','crown','original','star','skull','heels','runners','sandals'],equipped:{hat:'bowler',shoes:'runners',mark:'star'}}));
  }});
  const origin=`http://127.0.0.1:${server.address().port}${prefix}`;
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));
  const storage=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
  const saved=await storage();
  await page.goto(origin+'tools/wardrobe-preview/');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Every hat'));
  await page.setInputFiles('#fit-file',reviewPath);await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded review.json'));
  const imported=Buffer.from(await page.locator('#luna').evaluate(c=>c.toDataURL().split(',')[1]),'base64');
  if(defaultCanvas)assert.equal(pixels(imported),pixels(preview),'Owner JSON/PNG saved pose must match');
  const capture=await page.evaluate(async({review,poses,previousWitch,poseOnly})=>{
   const base=new URL('../../',location.href);
   const {drawImageLuna}=await import(new URL('src/animation.js',base));
   const {loadCosmeticAssets,decodeCosmeticPng}=await import(new URL('src/cosmetic-assets.js',base));
   const {parseReview}=await import(new URL('src/wardrobe-review.js',base));
   const {drawHat,drawShoes,drawMark}=await import(new URL('src/cosmetics.js',base));
   const snapshot=await loadCosmeticAssets(),candidate=parseReview(review,snapshot.catalog);
   const image=new Image();image.src=new URL('assets/luna-custom.png',base);await image.decode();
   const replacements={};
   for(const [category,items] of Object.entries(candidate.fits))for(const [id,fit] of Object.entries(items))if(fit.kind==='raster'){
    replacements[id]=await decodeCosmeticPng(new Uint8Array(await(await fetch(fit.asset.startsWith('data:')?fit.asset:new URL(fit.asset,base))).arrayBuffer()));
   }
   const override=(category,id)=>({fit:candidate.fits[category][id],image:replacements[id]});
   const renderers={hat:(c,id)=>drawHat(c,id,override('hat',id)),shoes:(c,leg,id)=>drawShoes(c,leg,id,override('shoes',id)),mark:(c,id,s)=>drawMark(c,id,s,override('mark',id))};
   const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   function canvasFor(pose,outfit,scale,layers,ground=false){
    const canvas=document.createElement('canvas');canvas.width=scale===1?150:640;canvas.height=scale===1?110:480;
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#f7f7f2';c.fillRect(0,0,canvas.width,canvas.height);c.scale(scale,scale);
    const x=scale===1?73:63,y=scale===1?96:88;
    if(ground){c.fillStyle='#d7dacf';c.fillRect(8,y+candidate.review.height+1,canvas.width/scale-16,.5);}
    drawImageLuna(c,image,x,y,pose,outfit,layers);return canvas;
   }
   const jobs=[];
   const ids=category=>snapshot.catalog.items.filter(i=>i.category===category).map(i=>i.id);
   if(!poseOnly)for(const hat of ids('hat'))for(const shoes of ids('shoes'))for(const mark of ids('mark'))for(const pose of poses)for(const scale of [1,5]){
    const outfit={hat,shoes,mark},expected=canvasFor(pose.pose,outfit,scale,renderers);
    const before=await digest(expected.getContext('2d').getImageData(0,0,expected.width,expected.height).data);
    const actual=canvasFor(pose.pose,outfit,scale);const after=await digest(actual.getContext('2d').getImageData(0,0,actual.width,actual.height).data);if(before!==after)throw new Error(`Renderer mismatch ${hat}/${shoes}/${mark}/${pose.id}/${scale}`);
    jobs.push({hat,shoes,mark,pose:pose.id,scale,sha256:before});
   }
   const sheets={};
   for(const scale of [1,5]){
    const w=scale===1?150:640,h=scale===1?110:480,canvas=document.createElement('canvas');canvas.width=w*3;canvas.height=h*3;
    const c=canvas.getContext('2d');c.fillStyle='#f7f7f2';c.fillRect(0,0,canvas.width,canvas.height);
    poses.forEach((pose,i)=>c.drawImage(canvasFor(pose.pose,candidate.outfit,scale),i%3*w,Math.floor(i/3)*h));
    sheets[scale]=canvas.toDataURL().split(',')[1];
   }
   const oldHat={hat:(c,id)=>drawHat(c,id,{art:previousWitch.art,fit:{kind:'grid',...previousWitch.fit}})};
   return {jobs,sheets,saved:canvasFor(candidate.review.pose,candidate.outfit,5,undefined,true).toDataURL().split(',')[1],beforeSaved:canvasFor(candidate.review.pose,candidate.outfit,5,oldHat,true).toDataURL().split(',')[1]};
  },{review,poses,previousWitch,poseOnly:mode==='pose'});
  assert.equal(pixels(Buffer.from(capture.saved,'base64')),pixels(imported),'Game saved-pose renderer must reproduce studio import using the same Canvas backend');
  assert.deepEqual(await storage(),saved,'Studio import/render must preserve saves');
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));
  assert.deepEqual(await storage(),saved,'Reload must preserve high score/unlocks/equipped outfit');
  await page.click('#open-store');assert.equal(await page.locator('.cosmetic-option').count(),11);await page.click('[data-item="witch"]');await page.click('#done-store');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.includes('Local development'));
  const equipped=JSON.parse((await storage())['luna.wardrobe.v2']).equipped;assert.deepEqual(equipped,{hat:'witch',shoes:'runners',mark:'star'});
  assert.deepEqual(errors,[]);
  const frameHash=hash(Buffer.from(JSON.stringify(capture.jobs)));
  report.paths.push({prefix,frames:capture.jobs.length,outfits:mode==='pose'?1:48,poses:mode==='pose'?['saved']:poses.map(p=>p.id),scales:mode==='pose'?[5]:[1,5],frameHash,savedPosePixels:pixels(imported),ownerScreenshotMatch:defaultCanvas?true:null,savedPoseMatch:true,savesPreserved:true,storeSelectionReload:true,pageErrors:errors});
  if(prefix==='/'){
   if(mode==='pose'){
    await writeFile(join(output,'pose-saved.png'),Buffer.from(capture.saved,'base64'));
    await writeFile(join(output,'before-saved.png'),Buffer.from(capture.beforeSaved,'base64'));
   }else for(const scale of [1,5])await writeFile(join(output,`movement-${scale===1?'native':'enlarged'}.png`),Buffer.from(capture.sheets[scale],'base64'));
  }
  await context.close();console.log(`${mode}: ${prefix} saved pose, ${capture.jobs.length} frame comparisons, Store/reload and saves passed`);
 }
 await writeFile(join(output,`${mode}.json`),JSON.stringify(report,null,2)+'\n');
 console.log(`Evidence: ${output}`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
