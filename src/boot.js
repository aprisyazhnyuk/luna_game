// Prepare local development before importing any game modules: an old offline
// worker can otherwise combine cached HTML with newer modules and stop startup.
import {clearGameCache,isLocalhost} from './local-cache.js';

async function start(){
 if(isLocalhost(location.hostname)){
  const scope=new URL('../',import.meta.url).href;
  try{
   const controlled=await clearGameCache(scope,navigator.serviceWorker,globalThis.caches);
   if(controlled){location.reload();return;}
  }catch(error){console.warn('Local cache cleanup unavailable:',error);}
 }
 await import('./app.js');
}
start().catch(error=>{
 console.error('Luna could not start:',error);
 document.getElementById('message-title').textContent='Couldn’t start Luna';
 const copy=document.getElementById('message-copy');copy.hidden=false;
 copy.textContent='Reload the game to try again.';
 document.getElementById('jump').addEventListener('click',()=>location.reload());
});
