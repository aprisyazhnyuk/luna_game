// Face candidate regression in isolated desktop Chrome, never the owner's profile.
// --baseline intentionally fails against the current clipped draw; --software
// exercises the alternate Canvas backend. Both use the actual game background.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const root=fileURLToPath(new URL('../',import.meta.url));
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
 browser=await chromium.launch({headless:true,channel:'chrome',args:process.argv.includes('--software')?['--disable-accelerated-2d-canvas']:[]});
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const results=await page.evaluate(async baseline=>{
  const {loadCosmeticAssets}=await import('/src/cosmetic-assets.js');await loadCosmeticAssets();
  const {drawImageLuna}=await import('/src/animation.js');
  const {resolveCosmetic}=await import('/src/cosmetics.js');
  const body=baseline?undefined:(await import('/tools/wardrobe-preview/stable-ear-mask.js')).drawStableBody;
  const fixtures=await (await fetch('/tests/fixtures/luna-v1/poses.json')).json();
  const image=new Image();image.src='/assets/luna-custom.png';await image.decode();
  const rows=[];
  for(const scale of [1,5])for(const {id,pose} of fixtures){
   const draw=(hat,candidate,maskOnly=false)=>{
    const canvas=document.createElement('canvas');canvas.width=390*scale;canvas.height=380*scale;
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    if(!maskOnly){c.fillStyle='#f7f7f2';c.fillRect(0,0,canvas.width,canvas.height);}
    c.scale(scale,scale);
    const layers=candidate&&body?{body}:{};
    if(maskOnly)layers.hat=()=>{};
    drawImageLuna(c,image,94,300,pose,{hat,mark:'original',shoes:'bare'},layers);
    return c;
   };
   const base=draw('none',false),withoutHatCandidate=draw('none',true);
   const pixels=c=>c.getImageData(0,0,c.canvas.width,c.canvas.height).data;
   const a=pixels(base),b=pixels(withoutHatCandidate);
   if(a.some((v,i)=>v!==b[i]))throw Error('Candidate changed Original look '+id);
   // Compare the face below all hat artwork, aligned through the rig transform.
   const x=Math.ceil((50+(1000-132)*86/970)*scale);
   const top=sourceY=>(Math.round(246+pose.bob)+605*54/605+(sourceY-975)*pose.stretch*54/605)*scale;
   const y=Math.ceil(top(540)),width=Math.floor(150*86/970*scale),height=Math.floor((top(630)-y));
   const expected=base.getImageData(x,y,width,height).data;
   for(const hat of ['bowler','witch','crown']){
    const c=draw(hat,true),actual=c.getImageData(x,y,width,height).data;
    const differences=actual.reduce((n,v,i)=>n+(v!==expected[i]),0);
    rows.push({pose:id,scale,hat,differences,...(differences?{samples:Array.from(actual).flatMap((v,i)=>v===expected[i]?[]:[{x:x+Math.floor(i/4)%width,y:y+Math.floor(i/4/width),channel:i%4,expected:expected[i],actual:v}]).slice(0,6)}:{})});
   }
   const masked=draw('bowler',true,true),cut=Math.floor(top(resolveCosmetic('hat','bowler').attachment.earMaskY))-1;
   const upper=masked.getImageData(0,0,masked.canvas.width,cut).data;
   if(upper.some((v,i)=>i%4===3&&v!==0))throw Error('Original ears remain above cut: '+id);
  }
  return rows;
 },process.argv.includes('--baseline'));
 const failures=results.filter(row=>row.differences);
 assert.equal(failures.length,0,'Hat selection changed face pixels: '+JSON.stringify(failures));
 await page.goto(`http://127.0.0.1:${server.address().port}/tools/wardrobe-preview/?face-review=1`);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Every hat'));
 const storage=()=>page.evaluate(()=>JSON.stringify({...localStorage}));const before=await storage();
 assert.equal(await page.inputValue('#rendering'),'stable-ear-mask-v1');
 await page.selectOption('#outfit-hat','witch');await page.click('[data-motion="ready"]');
 const jsonDownload=page.waitForEvent('download');await page.click('#export');
 const reviewFile=await jsonDownload,bytes=await readFile(await reviewFile.path()),review=JSON.parse(bytes);
 assert.equal(review.rendering,'stable-ear-mask-v1');assert.equal(reviewFile.suggestedFilename(),'luna-face-fit.json');
 const imageDownload=page.waitForEvent('download');await page.click('#snapshot');
 const imageFile=await imageDownload;assert.equal(imageFile.suggestedFilename(),'luna-face-preview.png');
 const saved=PNG.sync.read(await readFile(await imageFile.path()));
 await page.selectOption('#rendering','current');
 await page.setInputFiles('#fit-file',{name:'candidate.json',mimeType:'application/json',buffer:bytes});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded candidate.json'));
 assert.equal(await page.inputValue('#rendering'),'stable-ear-mask-v1');
 const data=await page.locator('#luna').evaluate(canvas=>canvas.toDataURL().split(',')[1]);
 assert.deepEqual(PNG.sync.read(Buffer.from(data,'base64')).data,saved.data,'Candidate pair must restore identical saved-pose pixels');
 const old={...review};delete old.rendering;
 await page.setInputFiles('#fit-file',{name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Loaded old.json'));
 assert.equal(await page.inputValue('#rendering'),'current','Older review must not silently use candidate');
 assert.equal(await storage(),before,'Studio must preserve player saves');
 console.log('Candidate JSON/PNG round trip, explicit variant, historical review isolation and saves passed.');
 console.log(`Face unchanged across ${results.length} hat/pose/size comparisons; Original look unchanged; original ears hidden.`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
