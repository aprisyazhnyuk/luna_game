import {createRun, jump, step} from './engine.js';
import {draw} from './draw.js';
import {SAVE_KEY,restoreWardrobe,recordTreats} from './customisation.js';
import {createStore} from './store.js';
import {isLocalhost} from './local-cache.js';
const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d');
let run=createRun(),lastTime=0,accumulator=0,best=0,installPrompt=null,endedAt=0,displayedPhase='',animationTime=0;
let wardrobe=restoreWardrobe(null),rewardUntil=0;
try{wardrobe=restoreWardrobe(localStorage.getItem(SAVE_KEY));}catch{$('store-saving').hidden=false;}
run.outfit={...wardrobe.equipped};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const lunaImage=new Image();
lunaImage.addEventListener('load',()=>render());
lunaImage.src=new URL('../assets/luna-custom.png',import.meta.url).href;
try {best=Math.max(0,Number(localStorage.getItem('luna.best.v1'))||0);}catch{}
function saveBest(){best=Math.max(best,Math.floor(run.distance));try{localStorage.setItem('luna.best.v1',String(best));}catch{}}
function saveWardrobe(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(wardrobe));}catch{$('store-saving').hidden=false;}}
const store=createStore(wardrobe,lunaImage,()=>{
 saveWardrobe();if(run.phase==='ready')run.outfit={...wardrobe.equipped};render();
},pauseOnLeave);
function updateRewards(){
 if(run.treats<=wardrobe.bestTreats)return;
 const earned=recordTreats(wardrobe,run.treats);saveWardrobe();
 if(earned.length){
  $('reward-notice').textContent=`${earned.map(item=>item.name).join(' + ')} unlocked! Visit the store.`;
  rewardUntil=run.time+5;$('open-store').classList.add('has-reward');
 }
 if($('store').open)store.refresh();
}
function render(){draw(ctx,run,reducedMotion,lunaImage,animationTime);}
function resize(){canvas.width=390;canvas.height=380;ctx.imageSmoothingEnabled=false;render();}
function updateUI(){
 const distance=Math.floor(run.distance);
 const setStat=(id,value,label)=>{const el=$(id);if(el.textContent!==String(value)){el.textContent=value;el.setAttribute('aria-label',label);}};
 setStat('distance',String(distance).padStart(5,'0'),`Distance: ${distance} metres`);
 setStat('best',String(best).padStart(5,'0'),`Best distance: ${best} metres`);
 setStat('treats',run.treats,`${run.treats} treats collected`);
 setStat('hearts',('♡ '.repeat(run.chances)+'· '.repeat(3-run.chances)).trim(),`${run.chances} chances remaining`);
 $('reward-notice').hidden=run.time>=rewardUntil;
 const running=run.phase==='running',paused=run.phase==='paused',over=run.phase==='over';
 if(displayedPhase!==run.phase){
  displayedPhase=run.phase;
  $('pause').disabled=run.phase==='ready'||over;$('pause').textContent=paused?'▷':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume game':'Pause game');
  $('message').hidden=running;
  $('action').textContent=running?'Jump':paused?'Resume':over?'Restart':'Start';
  $('jump').setAttribute('aria-label',running?'Jump':paused?'Resume game':over?'Restart game':'Start game. Tap or press Space to jump.');
  $('message-title').textContent=paused?'Paused':over?'Game over':'Tap to start';
  $('message-copy').textContent=paused?'Tap to resume':over?'↻  Tap to restart':'';
  $('message-copy').hidden=!paused&&!over;
 }
 if(!running)render();
}
function action(){
 if($('help').open||$('store').open)return;
 if(run.phase==='over'&&performance.now()-endedAt<650)return;
 if(run.phase==='ready'||run.phase==='over'){run=createRun();run.outfit={...wardrobe.equipped};run.phase='running';rewardUntil=0;}
 else if(run.phase==='paused'){run.phase='running';}
 else jump(run);
 accumulator=0;updateUI();
}
function pause(){if(run.phase==='running'){run.phase='paused';saveBest();}else if(run.phase==='paused')run.phase='running';accumulator=0;updateUI();}
// Pointer input works anywhere outside utility buttons. The button also supports
// keyboard/assistive-technology clicks without triggering a second jump on touch.
 $('game').addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,a'))return;e.preventDefault();action();});
 $('jump').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();action();});
 $('jump').addEventListener('click',e=>{if(e.detail===0)action();});
 $('pause').addEventListener('click',pause);
 document.addEventListener('keydown',e=>{
  if($('help').open||$('store').open)return;
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat)pause();return;}
  if(e.target.closest('button,a')&&e.target!==$('jump'))return;
  if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)action();}
 });
 function pauseOnLeave(){if(run.phase==='running'){run.phase='paused';saveBest();updateUI();}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseOnLeave();});
 window.addEventListener('blur',pauseOnLeave);window.addEventListener('pagehide',saveBest);
 $('about').addEventListener('click',()=>{pauseOnLeave();$('help').showModal();});
 $('close-help').addEventListener('click',()=>$('help').close());
 window.addEventListener('resize',resize);
 function frame(time){
  const elapsed=Math.min((time-lastTime)/1000,.1);lastTime=time;
  const animate=run.phase==='running'||run.phase==='ready';
  if(animate&&!document.hidden)animationTime+=elapsed;
  if(run.phase==='running'){
   accumulator+=elapsed;
   while(accumulator>=1/120){step(run,1/120);accumulator-=1/120;if(run.phase==='over'){endedAt=time;saveBest();break;}}
   updateRewards();
   updateUI();
  }
  if(animate&&!document.hidden)render();requestAnimationFrame(frame);
 }
 resize();updateUI();requestAnimationFrame(frame);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});
 $('install').addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install').hidden=true;});
 window.addEventListener('appinstalled',()=>{$('install').hidden=true;installPrompt=null;});
 if(isLocalhost(location.hostname)){
  $('offline-status').textContent='Local development · using current game files';
 }else if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offline-status').textContent='Ready for offline adventures';}).catch(()=>{$('offline-status').textContent='Online play · offline setup unavailable';});
 }else $('offline-status').textContent='Online play';
