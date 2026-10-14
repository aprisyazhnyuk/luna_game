import {drawImageLuna,lunaPose} from '../../src/animation.js';
import {createRun,jump,step} from '../../src/engine.js';
import {loadCosmeticAssets,getRasterHat} from '../../src/cosmetic-assets.js';
import {drawHat,drawShoes,drawMark} from '../../src/cosmetics.js';
import {HATS,SHOES,MARKS} from '../../src/cosmetic-art.js';
import {stamp} from '../../src/pixels.js';
import {ITEMS,ORIGINAL} from '../../src/customisation.js';
import {LIMITS,clone,defaultFits,itemName,parseReview} from './review-model.js';

const $=selector=>document.querySelector(selector),status=$('#status');
const root=new URL('../../',import.meta.url),key=(category,id)=>`${category}/${id}`;
const load=async src=>{
 const image=new Image();image.src=src.startsWith('data:')?src:new URL(src,root);await image.decode();
 if(image.width>4096||image.height>4096)throw new Error('Use a PNG no larger than 4096 × 4096');return image;
};
const context=id=>{const c=$(id).getContext('2d');c.imageSmoothingEnabled=false;return c;};
function checker(c){
 c.clearRect(0,0,c.canvas.width,c.canvas.height);
 for(let y=0;y<c.canvas.height;y+=16)for(let x=0;x<c.canvas.width;x+=16){
  c.fillStyle=(x/16+y/16)%2?'#e7e8e0':'#f7f7f2';c.fillRect(x,y,16,16);
 }
}
function contain(c,image){
 const scale=Math.min(c.canvas.width/image.width,c.canvas.height/image.height);
 c.drawImage(image,(c.canvas.width-image.width*scale)/2,(c.canvas.height-image.height*scale)/2,image.width*scale,image.height*scale);
}
try {
 await loadCosmeticAssets();
 const applied=getRasterHat('bowler'),initial=defaultFits(applied.fit);
 let fits=clone(initial),images=new Map([[key('hat','bowler'),applied.image]]),selectedCategory='hat',revision=0;
 const outfit={...ORIGINAL,hat:'bowler'};
 const [luna,source]=await Promise.all([load('assets/luna-custom.png'),load('concepts/luna/04-approved-wardrobe.png')]);
 const sourceContext=context('#source'),accessoryContext=context('#accessory');
 const crops={
  hat:{bowler:[242,78,173,96],witch:[590,20,215,170],crown:[1067,52,166,125]},
  shoes:{heels:[85,660,280,90],runners:[495,660,280,90],sandals:[905,660,280,90]},
  mark:{original:[150,970,95,100],star:[550,970,110,110],skull:[955,970,120,120]}
 };
 const active=()=>({category:selectedCategory,id:outfit[selectedCategory],fit:fits[selectedCategory][outfit[selectedCategory]]});
 const override=(category,id)=>{
  const fit=fits[category][id];return fit?{fit,image:fit.kind==='raster'?images.get(key(category,id)):undefined}:undefined;
 };
 const renderers={
  hat:(c,id)=>drawHat(c,id,override('hat',id)),
  shoes:(c,leg,id)=>drawShoes(c,leg,id,override('shoes',id)),
  mark:(c,id,stretch)=>drawMark(c,id,stretch,override('mark',id))
 };
 // Isolated artwork thumbnails; no torso mask, foot, or background baked in.
 function gridArtwork(category,id){
  if(category!=='hat'){
   const art=(category==='shoes'?SHOES:MARKS)[id],canvas=document.createElement('canvas');
   canvas.width=art.rows[0].length;canvas.height=art.rows.length;stamp(canvas.getContext('2d'),art.rows,0,0,1);return canvas;
  }
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1200;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  drawHat(c,id,{fit:{kind:'grid',x:600,y:400,scale:1}});
  const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
  let left=1536,right=0,top=1200,bottom=0;
  for(let y=0;y<1200;y++)for(let x=0;x<1536;x++)if(pixels[(y*1536+x)*4+3]){
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const cropped=document.createElement('canvas');cropped.width=right-left+1;cropped.height=bottom-top+1;
  cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);return cropped;
 }
 const thumbnails=new Map();
 function showArtwork(){
  const {category,id,fit}=active();checker(sourceContext);checker(accessoryContext);
  if(!fit){$('#source-label').textContent='Choose an item';$('#accessory-label').textContent='No item selected';return;}
  const [x,y,w,h]=crops[category][id],scale=Math.min(346/w,192/h);
  sourceContext.drawImage(source,x,y,w,h,(346-w*scale)/2,(192-h*scale)/2,w*scale,h*scale);
  $('#source-label').textContent=`Approved concept · ${itemName(category,id)}`;
  let art=images.get(key(category,id));
  if(fit.kind==='grid'){
   if(!thumbnails.has(key(category,id)))thumbnails.set(key(category,id),gridArtwork(category,id));
   art=thumbnails.get(key(category,id));
  }
  contain(accessoryContext,art);$('#accessory-label').textContent=`${itemName(category,id)} · ${fit.kind==='raster'?'PNG':'pixel artwork'}`;
 }
 let motion='walk',paused=false,forceBlinkUntil=0,clock=0,previous=performance.now(),run=createRun(),heldPose=null,restartOnPlay=false;
 run.phase='running';
 const large=context('#luna'),native=context('#native');
 function currentPose(){
  const pose=clone(heldPose??lunaPose(run,clock));if(performance.now()<forceBlinkUntil)pose.blink=true;return pose;
 }
 function render(){
  const pose=currentPose();
  function view(c,scale,x,y){
   c.clearRect(0,0,c.canvas.width,c.canvas.height);c.fillStyle='#f7f7f2';c.fillRect(0,0,c.canvas.width,c.canvas.height);
   c.save();c.scale(scale,scale);c.fillStyle='#d7dacf';c.fillRect(8,y+run.y+1,c.canvas.width/scale-16,.5);
   drawImageLuna(c,luna,x,y,pose,outfit,renderers);c.restore();
  }
  // Extra headroom keeps the taller witch hat visible at its current fit.
  view(large,5,63,88);view(native,1,73,96);
 }
 function sync(artwork=false){
  const {category,id,fit}=active();$('#edit-category').value=category;
  for(const c of Object.keys(outfit))$(`#outfit-${c}`).value=outfit[c];
  $('#fit-title').textContent=fit?`${itemName(category,id)} fit`:'Choose an item';
  $('#fit-hint').textContent=!fit?'Select a hat or shoes above to enable adjustments.':category==='hat'
   ?'Move and size the complete hat and ears together. Replacement hat PNGs should include the ears.'
   :category==='shoes'?'Move and size the shoes relative to each paw. The same adjustment follows all four paws.'
   :'Move and size the mark on Luna’s side. Its proportions stay consistent during landing.';
  $('#fit-controls').disabled=!fit;$('#reset').disabled=!fit;$('#load-art').disabled=!fit;
  for(const name of ['x','y','scale']){
   const input=$(`#${name}`),[min,max]=LIMITS[category][name];input.min=min;input.max=max;
   input.value=fit?.[name]??(name==='scale'?1:0);$(`#${name}-value`).value=!fit?'—':name==='scale'?`${fit[name].toFixed(2)}×`:fit[name];
  }
  if(artwork)showArtwork();render();
 }
 for(const category of Object.keys(outfit)){
  const select=$(`#outfit-${category}`);
  for(const item of ITEMS.filter(item=>item.category===category)){
   const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.append(option);
  }
  select.addEventListener('change',()=>{outfit[category]=select.value;selectedCategory=category;sync(true);});
 }
 $('#edit-category').addEventListener('change',event=>{selectedCategory=event.target.value;sync(true);});
 $('#original').addEventListener('click',()=>{Object.assign(outfit,ORIGINAL);selectedCategory='mark';sync(true);});
 for(const name of ['x','y','scale'])$(`#${name}`).addEventListener('input',event=>{
  const {fit}=active();if(!fit)return;fit[name]=Number(event.target.value);
  status.textContent='Draft changed. Save the fit JSON and preview PNG when ready; the game is unchanged.';sync();
 });
 function setMotion(next){
  heldPose=null;restartOnPlay=false;motion=next;run=createRun();clock=0;forceBlinkUntil=0;
  if(motion!=='ready')run.phase='running';if(motion==='jump')jump(run);
  document.querySelectorAll('[data-motion]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.motion===motion)));render();
 }
 for(const button of document.querySelectorAll('[data-motion]'))button.addEventListener('click',()=>setMotion(button.dataset.motion));
 function setPaused(value){paused=value;$('#pause').textContent=paused?'Play':'Pause';$('#pause').setAttribute('aria-pressed',String(paused));}
 function releasePose(){if(heldPose){if(restartOnPlay)setMotion(motion);else heldPose=null;}}
 $('#pause').addEventListener('click',()=>{
  if(paused)releasePose();setPaused(!paused);
 });
 function advance(dt){
  releasePose();clock+=dt;
  if(motion!=='ready'){
   run.obstacles=[];run.bites=[];run.spawnIn=Infinity;
   for(let remaining=dt;remaining>0;){const tick=Math.min(remaining,1/120);step(run,tick);remaining-=tick;}
   if(motion==='jump'&&run.y===0&&run.time-run.jumpTime>1.2)jump(run);
  }
 }
 $('#step').addEventListener('click',()=>{setPaused(true);advance(1/120);render();});
 $('#blink').addEventListener('click',()=>{forceBlinkUntil=performance.now()+250;render();});
 function resetItem(category,id){
  fits[category][id]=clone(initial[category][id]);images.delete(key(category,id));
  if(category==='hat'&&id==='bowler')images.set(key(category,id),applied.image);
 }
 $('#reset').addEventListener('click',()=>{
  const {category,id,fit}=active();if(!fit)return;++revision;resetItem(category,id);sync(true);
  status.textContent=`Restored ${itemName(category,id)} to its applied fit. Other drafts were kept.`;
 });
 $('#reset-all').addEventListener('click',()=>{
  ++revision;fits=clone(initial);images=new Map([[key('hat','bowler'),applied.image]]);sync(true);
  status.textContent='All item drafts restored to their current game artwork and fit.';
 });
 $('#load-art').addEventListener('click',()=>$('#art-file').click());
 $('#art-file').addEventListener('change',async event=>{
  const file=event.target.files[0],{category,id,fit}=active();if(!file||!fit)return;
  const request=++revision;
  try{
   if(file.type!=='image/png'||file.size>4_000_000)throw new Error('Choose a PNG up to 4 MB');
   const asset=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
   const image=await load(asset);if(request!==revision)return;
   const oldImage=images.get(key(category,id));
   const design=(category==='hat'?HATS:category==='shoes'?SHOES:MARKS)[id];
   const width=(fit.kind==='raster'?oldImage.width:design.rows[0].length*design.size)*fit.scale;
   fits[category][id]={kind:'raster',asset,x:fit.x,y:fit.y,scale:Math.max(.01,Math.min(LIMITS[category].scale[1],Math.round(width/image.width*100)/100))};
   images.set(key(category,id),image);selectedCategory=category;sync(true);
   status.textContent=`Loaded ${file.name} for ${itemName(category,id)}. The PNG will be embedded in the saved JSON; the game is unchanged.`;
  }catch(error){status.textContent=`Could not load PNG: ${error.message}. The current artwork was kept.`;}
  finally{event.target.value='';}
 });
 $('#import').addEventListener('click',()=>$('#fit-file').click());
 $('#fit-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;const request=++revision;
  try{
   const candidate=parseReview(JSON.parse(await file.text()),initial),nextImages=new Map();
   await Promise.all(Object.entries(candidate.fits).flatMap(([category,items])=>Object.entries(items).filter(([,fit])=>fit.kind==='raster').map(async([id,fit])=>{
    nextImages.set(key(category,id),await load(fit.asset));
   })));
   if(request!==revision)return;
   fits=candidate.fits;images=nextImages;Object.assign(outfit,candidate.outfit);selectedCategory=candidate.selectedCategory;
   const review=candidate.review;setMotion(review?.motion??'ready');
   if(review){heldPose=review.pose;restartOnPlay=true;run.y=review.height;$('#speed').value=String(review.playbackSpeed);setPaused(true);}
   sync(true);status.textContent=`Loaded ${file.name}. All saved fits restored${review?' with the saved pose; Play restarts that animation':''}. The game is unchanged.`;
  }catch(error){status.textContent=`Could not load fit: ${error.message}. The current preview was kept.`;}
  finally{event.target.value='';}
 });
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function freezeFrame(){heldPose=currentPose();forceBlinkUntil=0;setPaused(true);render();}
 $('#export').addEventListener('click',()=>{
  freezeFrame();
  const exported={version:2,type:'luna-wardrobe-review',status:'preview-awaiting-application',fits:clone(fits),outfit:{...outfit},selectedCategory,
   review:{motion,playbackSpeed:Number($('#speed').value),height:run.y,pose:currentPose()}};
  download(new Blob([JSON.stringify(exported,null,2)+'\n'],{type:'application/json'}),'luna-wardrobe-fit.json');
  status.textContent='Paused at the saved pose. All item fits are in the JSON. Save the matching preview PNG, then tell me to apply the files.';
 });
 $('#snapshot').addEventListener('click',()=>{freezeFrame();$('#luna').toBlob(blob=>download(blob,'luna-wardrobe-preview.png'));});
 sync(true);status.textContent='Every hat, shoe style, and body mark can be adjusted. Changes stay in this preview until applied.';
 function frame(now){
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  if(!paused)advance(dt*Number($('#speed').value));render();requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(error){status.textContent=`Preview could not load: ${error.message}. Open this page through the local server.`;throw error;}
