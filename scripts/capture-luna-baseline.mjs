// Dev-only capture/check of the actual renderer. Requires Playwright (Chromium).
// Capture writes only to the explicit output directory; never regenerates owner art.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,relative,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const args=process.argv.slice(2),mode=args[0],output=args[1];
if(!['--capture','--check'].includes(mode)||!output)throw new Error('Usage: node scripts/capture-luna-baseline.mjs --capture|--check OUTPUT_DIR');
const root=fileURLToPath(new URL('../',import.meta.url)),dest=resolve(output);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const poses=JSON.parse(await readFile(new URL('../tests/fixtures/luna-v1/poses.json',import.meta.url)));
const outfits=[
 {hat:'bowler',mark:'original',shoes:'bare'},{hat:'witch',mark:'original',shoes:'bare'},{hat:'crown',mark:'original',shoes:'bare'},
 {hat:'none',mark:'original',shoes:'heels'},{hat:'none',mark:'original',shoes:'runners'},{hat:'none',mark:'original',shoes:'sandals'},
 {hat:'none',mark:'original',shoes:'bare'},{hat:'none',mark:'star',shoes:'bare'},{hat:'none',mark:'skull',shoes:'bare'}
];
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/baseline'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Luna baseline</title>');return;}
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(relative(root,path).startsWith('..')){res.writeHead(403);res.end();return;}
  const types={'.js':'text/javascript','.json':'application/json','.png':'image/png'};
  res.setHeader('Content-Type',types[extname(path)]??'application/octet-stream');res.end(await readFile(path));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1920,height:1440},deviceScaleFactor:1});
 await page.goto(`http://127.0.0.1:${server.address().port}/baseline`);
 await page.evaluate(async()=>{
  const {drawImageLuna}=await import('/src/animation.js');
  const {loadCosmeticAssets}=await import('/src/cosmetic-assets.js');await loadCosmeticAssets();
  const image=new Image();image.src='/assets/luna-custom.png';await image.decode();
  window.baselineRender=(pose,outfits,size)=>{
   const [w,h,scale,x,y]=size==='native'?[150,110,1,73,96]:[640,480,5,63,88];
   const canvas=document.createElement('canvas');canvas.width=w*3;canvas.height=h*3;
   const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
   c.fillStyle='#f7f7f2';c.fillRect(0,0,canvas.width,canvas.height);
   outfits.forEach((outfit,i)=>{
    c.save();c.translate((i%3)*w,Math.floor(i/3)*h);c.beginPath();c.rect(0,0,w,h);c.clip();c.scale(scale,scale);
    drawImageLuna(c,image,x,y,pose,outfit);c.restore();
   });return canvas.toDataURL('image/png').split(',')[1];
  };
 });
 const manifest={browser:browser.version(),deviceScaleFactor:1,poses:hash(await readFile(new URL('../tests/fixtures/luna-v1/poses.json',import.meta.url))),outfits,inputs:{},images:{}};
 for(const path of ['src/animation.js','src/cosmetics.js','src/cosmetic-art.js','src/cosmetic-assets.js','src/pixels.js','assets/luna-custom.png','assets/cosmetics/bowler.png','assets/cosmetics/bowler.json'])manifest.inputs[path]=hash(await readFile(resolve(root,path)));
 if(mode==='--capture')await mkdir(dest,{recursive:true});
 const expected=mode==='--check'?JSON.parse(await readFile(resolve(dest,'manifest.json'))):null;
 if(expected&&expected.browser!==manifest.browser)throw new Error(`Browser mismatch: ${manifest.browser} versus ${expected.browser}`);
 for(const fixture of poses)for(const size of ['native','enlarged']){
  const name=`${fixture.id}-${size}.png`;
  const bytes=Buffer.from(await page.evaluate(({pose,outfits,size})=>window.baselineRender(pose,outfits,size),{pose:fixture.pose,outfits,size}),'base64');
  manifest.images[name]=hash(bytes);
  if(mode==='--capture')await writeFile(resolve(dest,name),bytes);
  else if(hash(await readFile(resolve(dest,name)))!==hash(bytes))throw new Error(`Renderer differs: ${name}`);
 }
 if(expected&&expected.poses!==manifest.poses)throw new Error('Pose fixture mismatch');
 if(mode==='--capture')await writeFile(resolve(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(`${mode==='--capture'?'Captured':'Matched'} ${Object.keys(manifest.images).length} sheets, nine outfits per sheet, Chromium ${manifest.browser}`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
