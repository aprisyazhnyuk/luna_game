// Bump VERSION whenever a shipped file changes. Updates activate after all old
// game windows close, avoiding mixed versions in the middle of a run.
const VERSION='v8';
const PREFIX=`luna-${self.registration.scope}-`;
const CACHE=PREFIX+VERSION;
const FILES=['./','./index.html','./style.css','./src/boot.js','./src/local-cache.js','./src/app.js','./src/engine.js','./src/animation.js','./src/customisation.js','./src/cosmetics.js','./src/store.js','./src/draw.js','./src/pixels.js','./manifest.webmanifest','./assets/luna-run.png','./assets/luna-custom.png','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./PRIVACY.md','./CREDITS.md','./LICENSE'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(event.request,{ignoreSearch:true});
  if(cached)return cached;
  try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return await cache.match('./index.html');throw error;}
 })());
});
