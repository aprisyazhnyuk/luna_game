import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as assets from '../src/cosmetic-assets.js';
const catalog=JSON.parse(await readFile(new URL('../assets/cosmetics/catalog.json',import.meta.url)));
const png=await readFile(new URL('../assets/cosmetics/bowler.png',import.meta.url));
function fixture({root='https://example.test/luna_game/',data=structuredClone(catalog),image=png,decodeError=false,missing=false}={}){
 const calls=[],decodes=[];
 const loader=assets.createCosmeticAssetLoader({root:new URL(root),fetch:async url=>{
  calls.push(String(url));return String(url).endsWith('catalog.json')?new Response(JSON.stringify(data)):new Response(missing?'missing':image,{status:missing?404:200});
 },decode:async(bytes,url)=>{
  decodes.push(String(url));assert.deepEqual(Buffer.from(bytes),Buffer.from(image));
  if(decodeError)throw new Error('Invalid PNG encoding');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  return {width:view.getUint32(16),height:view.getUint32(20)};
 }});
 return {loader,calls,decodes};
}
test('generic asset loader exposes a ready snapshot only after all assets validate',async()=>{
 assert.equal(typeof assets.createCosmeticAssetLoader,'function');
 const {loader,calls}=fixture();assert.equal(loader.getSnapshot(),null);
 const ready=await loader.load();assert.equal(loader.getSnapshot(),ready);
 assert.equal(ready.items.bowler.fit.asset,'assets/cosmetics/bowler.png');
 assert.deepEqual(ready.items.witch.art.rows,catalog.items.find(item=>item.id==='witch').art.rows);
 assert.equal(ready.items.bare.fit,null);assert.equal(ready.items.skull.fit.kind,'grid');
 assert.deepEqual(calls,['https://example.test/luna_game/assets/cosmetics/catalog.json','https://example.test/luna_game/assets/cosmetics/bowler.png']);
 assert.throws(()=>{ready.items.bowler.fit.x=0;},TypeError);
 assert.throws(()=>{ready.items.bad={};},TypeError);
});
for(const root of ['https://example.test/','https://example.test/luna_game/'])test(`all PNG categories use module-root URLs at ${root}`,async()=>{
 const data=structuredClone(catalog);
 for(const category of ['hat','shoes','mark']){
  const base=data.items.find(item=>item.category===category&&item.fit);
  data.items.push({...structuredClone(base),id:`new-${category}`,name:`New ${category}`,art:{kind:'png',asset:`assets/cosmetics/new-${category}.png`}});
 }
 const {loader,calls,decodes}=fixture({root,data});const ready=await loader.load();
 for(const category of ['hat','shoes','mark']){
  assert.ok(ready.items[`new-${category}`].image);assert.equal(ready.items[`new-${category}`].category,category);
  assert.ok(calls.includes(root+`assets/cosmetics/new-${category}.png`));
 }
 assert.equal(decodes.length,4);
});
for(const [name,options,pattern] of [
 ['missing PNG',{missing:true},/bowler.png.*404/],
 ['corrupt signature',{image:Buffer.from('not a PNG')},/bowler.png.*PNG/],
 ['failed image decode',{decodeError:true},/bowler.png.*Invalid PNG encoding/],
 ['oversize bytes',{image:Buffer.alloc(4_000_001)},/bowler.png.*size/],
 ['duplicate IDs',{data:{...catalog,items:[...catalog.items,catalog.items[1]]}},/catalog.json.*duplicate/]
])test(`failed ${name} leaves no partially published snapshot`,async()=>{
 const {loader}=fixture(options);await assert.rejects(loader.load(),pattern);assert.equal(loader.getSnapshot(),null);
});
test('oversize dimensions fail before image decode',async()=>{
 const image=Buffer.from(png);image.writeUInt32BE(4097,16);
 const {loader,decodes}=fixture({image});await assert.rejects(loader.load(),/bowler.png.*width/);assert.equal(decodes.length,0);
});
test('catalog conflicts and missing fields fail before fetching any PNG',async()=>{
 const data=structuredClone(catalog);delete data.items[1].fit;
 const {loader,calls}=fixture({data});await assert.rejects(loader.load(),/catalog.json.*fit/);assert.equal(calls.length,1);
});
test('shared paths decode once and concurrent calls share one transaction',async()=>{
 const data=structuredClone(catalog);data.items[2].art={kind:'png',asset:'assets/cosmetics/bowler.png'};
 const {loader,decodes}=fixture({data});const [a,b]=await Promise.all([loader.load(),loader.load()]);
 assert.equal(a,b);assert.equal(a.items.bowler.image,a.items.witch.image);assert.equal(decodes.length,1);
});
test('failed transactions can retry without exposing partial items',async()=>{
 let attempt=0;
 const loader=assets.createCosmeticAssetLoader({root:new URL('https://example.test/'),fetch:async url=>{
  if(String(url).endsWith('catalog.json'))return new Response(JSON.stringify(catalog));
  return new Response(png,{status:++attempt===1?404:200});
 },decode:async()=>({width:173,height:96})});
 await assert.rejects(loader.load());assert.equal(loader.getSnapshot(),null);
 assert.ok((await loader.load()).items.bowler.image);assert.equal(attempt,2);
});

test('late PNG failure cannot expose earlier decoded items',async()=>{
 const data=structuredClone(catalog);data.items[2].art={kind:'png',asset:'assets/cosmetics/late.png'};
 const decoded=[];
 const loader=assets.createCosmeticAssetLoader({root:new URL('https://example.test/'),fetch:async url=>{
  if(String(url).endsWith('catalog.json'))return new Response(JSON.stringify(data));
  return new Response(png);
 },decode:async(bytes,url)=>{
  if(String(url).endsWith('late.png')){await Promise.resolve();throw new Error('Late decode failure');}
  decoded.push(String(url));return {width:173,height:96};
 }});
 await assert.rejects(loader.load(),/late.png.*Late decode failure/);
 assert.equal(decoded.length,1);assert.equal(loader.getSnapshot(),null);
});

test('oversize catalog input fails before parsing or decoding images',async()=>{
 const {loader,decodes}=fixture({data:{...catalog,extra:'x'.repeat(1_000_001)}});
 await assert.rejects(loader.load(),/catalog.json.*size/);assert.equal(decodes.length,0);
});

test('decoded dimensions must agree with the PNG header',async()=>{
 const loader=assets.createCosmeticAssetLoader({fetch:async url=>new Response(String(url).endsWith('catalog.json')?JSON.stringify(catalog):png),decode:async()=>({width:1,height:1})});
 await assert.rejects(loader.load(),/bowler.png.*disagree/);assert.equal(loader.getSnapshot(),null);
});
