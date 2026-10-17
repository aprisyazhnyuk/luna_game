import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {worker} from './helpers/offline-worker.js';
for(const path of ['/','/luna_game/']){
 const scope='https://example.test'+path;
 test(`required assets and completed-cache status work offline at ${path}`,async()=>{
  const w=await worker(scope);await w.lifecycle('install');await w.lifecycle('activate');w.setOffline();assert.equal(w.claimed(),true);
  assert.match(await(await w.fetchEvent('./','navigate')).text(),/id="scene"/);
  for(const file of ['src/engine.js','src/animation.js','src/customisation.js','src/store.js','src/cosmetics.js','src/cosmetic-assets.js','src/cosmetic-model.js','assets/luna-custom.png','assets/icon-512.png'])assert.equal((await w.fetchEvent('./'+file)).status,200);
  const catalog=await(await w.fetchEvent('./assets/cosmetics/catalog.json')).json();for(const item of catalog.items.filter(i=>i.art.kind==='png'))assert.equal((await w.fetchEvent('./'+item.art.asset)).status,200);
  assert.equal((await w.status()).ready,true);assert.match(await(await w.fetchEvent('./unknown','navigate')).text(),/id="scene"/);
 });
 test(`catalog-only PNGs are cached; failed/mismatched installs preserve old cache at ${path}`,async()=>{
  const first=await worker(scope);await first.lifecycle('install');await first.lifecycle('activate');
  const catalog=JSON.parse(await readFile(new URL('../assets/cosmetics/catalog.json',import.meta.url))),png=await readFile(new URL('../assets/cosmetics/bowler.png',import.meta.url));
  catalog.items.push({...catalog.items.find(i=>i.id==='bowler'),id:'new-hat',name:'New hat',art:{kind:'png',asset:'assets/cosmetics/new.png'}});
  const overlay=new Map([['assets/cosmetics/catalog.json',Buffer.from(JSON.stringify(catalog))],['assets/cosmetics/new.png',png]]);
  const failed=await worker(scope,{stores:first.stores,overlay,fail:'assets/cosmetics/new.png'});await assert.rejects(()=>failed.lifecycle('install'));assert.equal(first.stores.has(first.cacheName),true);assert.equal(first.stores.has(failed.cacheName),false);assert.equal((await failed.status()).ready,false);
  const corrupt=await worker(scope,{stores:first.stores,overlay,corrupt:'assets/cosmetics/new.png'});await assert.rejects(()=>corrupt.lifecycle('install'));assert.equal(first.stores.has(first.cacheName),true);assert.equal(first.stores.has(corrupt.cacheName),false);
  const second=await worker(scope,{stores:first.stores,overlay});await second.lifecycle('install');assert.equal(first.stores.has(first.cacheName),true);second.setOffline();assert.equal((await second.fetchEvent('./assets/cosmetics/new.png')).status,200);await second.lifecycle('activate');assert.equal(first.stores.has(first.cacheName),false);
 });
}
test('activation cleanup preserves unrelated apps/scopes and partial eviction removes ready status',async()=>{
 const scope='https://example.test/luna_game/',w=await worker(scope);await w.caches.open(`luna-${scope}-old`);await w.caches.open('another-app');await w.caches.open('luna-https://example.test/another/-old');await w.lifecycle('install');await w.lifecycle('activate');
 assert.equal(w.stores.has(`luna-${scope}-old`),false);assert.ok(w.stores.has('another-app'));assert.ok(w.stores.has('luna-https://example.test/another/-old'));
 w.stores.get(w.cacheName).delete(scope+'src/engine.js');assert.equal((await w.status()).ready,false);
 // The network may restore a missing required file only if its generation matches.
 assert.equal((await w.fetchEvent('./src/engine.js')).status,200);assert.equal((await w.status()).ready,true);
});

test('missing required cache entries cannot silently mix newer network bytes',async()=>{
 const overlay=new Map(),scope='https://example.test/luna_game/',w=await worker(scope,{overlay});await w.lifecycle('install');await w.lifecycle('activate');
 w.stores.get(w.cacheName).delete(scope+'src/engine.js');overlay.set('src/engine.js',Buffer.from('different generation'));
 await assert.rejects(()=>w.fetchEvent('./src/engine.js'),/integrity/);assert.equal((await w.status()).ready,false);
});


test('an identical-generation reinstall keeps the completed cache even with unavailable network',async()=>{
 const scope='https://example.test/',first=await worker(scope);await first.lifecycle('install');await first.lifecycle('activate');
 const second=await worker(scope,{stores:first.stores,fail:'assets/icon-512.png'});second.setOffline();await second.lifecycle('install');
 assert.equal(second.cacheName,first.cacheName);assert.equal((await first.status()).ready,true);assert.equal((await second.status()).ready,true);
});
