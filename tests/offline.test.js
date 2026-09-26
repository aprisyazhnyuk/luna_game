import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
async function worker(scope){
 const listeners={},stores=new Map();let online=true,claimed=false;
 const key=request=>new URL(typeof request==='string'?request:request.url,scope).href;
 const caches={
  keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),
  open:async name=>{
   if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);
   return {
    addAll:async files=>{for(const file of files){const relative=file==='./'?'./index.html':file;const content=await readFile(new URL('../'+relative,import.meta.url));store.set(key(file),new Response(content));}},
    match:async(request,options={})=>{const url=new URL(key(request));if(options.ignoreSearch)url.search='';return store.get(url.href)?.clone();}
   };
  }
 };
 const self={registration:{scope},clients:{claim:async()=>{claimed=true;}},addEventListener:(type,fn)=>{listeners[type]=fn;}};
 const network=async request=>{if(!online)throw new Error('offline');return new Response('network');};
 vm.runInNewContext(source,{self,caches,fetch:network,URL});
 const lifecycle=type=>new Promise((resolve,reject)=>listeners[type]({waitUntil:p=>p.then(resolve,reject)}));
 const fetchEvent=(relative,mode='cors')=>new Promise((resolve,reject)=>listeners.fetch({request:{url:new URL(relative,scope).href,method:'GET',mode},respondWith:p=>p.then(resolve,reject)}));
 return {stores,caches,lifecycle,fetchEvent,setOffline:()=>{online=false;},claimed:()=>claimed};
}
for(const path of ['/', '/luna_game/'])test(`all assets are present and available offline at ${path}`,async()=>{
 const w=await worker('https://example.test'+path);await w.lifecycle('install');await w.lifecycle('activate');w.setOffline();
 assert.ok(w.claimed());assert.match(await(await w.fetchEvent('./','navigate')).text(),/id="scene"/);
 assert.match(await(await w.fetchEvent('./src/engine.js?v=1')).text(),/createRun/);
 assert.equal((await w.fetchEvent('./assets/icon-512.png')).status,200);
 assert.match(await(await w.fetchEvent('./unknown','navigate')).text(),/id="scene"/);
});
test('updating this game preserves caches belonging to other apps or repository scopes',async()=>{
 const scope='https://example.test/luna_game/',w=await worker(scope);
 await w.caches.open(`luna-${scope}-v0`);await w.caches.open('another-game');await w.caches.open('luna-https://example.test/another-repo/-v0');
 await w.lifecycle('install');await w.lifecycle('activate');
 assert.ok(!w.stores.has(`luna-${scope}-v0`));assert.ok(w.stores.has('another-game'));assert.ok(w.stores.has('luna-https://example.test/another-repo/-v0'));
});
