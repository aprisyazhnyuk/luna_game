// Generated inventory changes with every required resource byte, including this
// worker. Never skip waiting: old clients finish with their existing generation.
importScripts('./offline-assets.js');
const INVENTORY=self.LUNA_OFFLINE;
const PREFIX=`luna-${self.registration.scope}-`;
const CACHE=PREFIX+INVENTORY.cacheKey;
const MARKER=new URL('__luna_offline_ready__',self.registration.scope).href;
const ENTRIES=new Map(INVENTORY.files.map(entry=>[new URL(entry.url,self.registration.scope).href,entry]));
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
let identity;
function validateIdentity(){return identity??=(async()=>{
 if(INVENTORY.version!==1||!/^[a-f0-9]{64}$/.test(INVENTORY.cacheKey)||!INVENTORY.files.length||ENTRIES.size!==INVENTORY.files.length)throw new Error('Invalid offline inventory');
 for(const [url,entry] of ENTRIES)if(!url.startsWith(self.registration.scope)||!/^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('Invalid offline dependency');
 const bytes=new TextEncoder().encode(JSON.stringify({version:1,files:INVENTORY.files}));
 if(await digest(bytes)!==INVENTORY.cacheKey)throw new Error('Offline identity mismatch');
 })();}
async function ready(){
 if(!(await caches.keys()).includes(CACHE))return false;
 const cache=await caches.open(CACHE),marker=await cache.match(MARKER);if(!marker)return false;
 const data=await marker.json();if(data.cacheKey!==INVENTORY.cacheKey||data.count!==ENTRIES.size)return false;
 for(const url of ENTRIES.keys())if(!await cache.match(url))return false;return true;
}
async function download(url,entry){
 const response=await fetch(new Request(url,{cache:'reload'}));
 if(!response.ok||await digest(await response.clone().arrayBuffer())!==entry.sha256)throw new Error(`Offline resource failed integrity check: ${entry.url}`);
 return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 await validateIdentity();if(await ready())return;
 const cache=await caches.open(CACHE);
 try{
  // Finish every request before cleanup, so a failed install cannot leave writes
  // racing against cache deletion or announce a partially downloaded generation.
  const results=await Promise.allSettled([...ENTRIES].map(async([url,entry])=>cache.put(url,await download(url,entry))));
  const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
  await cache.put(MARKER,new Response(JSON.stringify({cacheKey:INVENTORY.cacheKey,count:ENTRIES.size}),{headers:{'Content-Type':'application/json'}}));
 }catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await validateIdentity();if(!await ready())throw new Error('Offline cache is incomplete');
 const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='LUNA_CACHE_STATUS'||!event.ports?.[0])return;
 event.waitUntil((async()=>{await validateIdentity();event.ports[0].postMessage({type:'LUNA_OFFLINE_STATUS',cacheKey:INVENTORY.cacheKey,ready:await ready()});})());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(event.request,{ignoreSearch:true});if(cached)return cached;
  const key=new URL(url);key.search='';key.hash='';const entry=ENTRIES.get(key.href);
  if(entry){await validateIdentity();const response=await download(key.href,entry);await cache.put(key.href,response.clone());return response;}
  try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate'){const fallback=await cache.match(new URL('./',self.registration.scope).href);if(fallback)return fallback;}throw error;}
 })());
});
