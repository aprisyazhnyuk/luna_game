import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,cp,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {generateInventory,parseInventory,readInventoryFile} from '../scripts/lib/offline-inventory.mjs';
import {sandbox,project,hashes} from './helpers/review-sandbox.js';
const generate=root=>generateInventory({read:path=>readInventoryFile(root,path)});
async function complete(s){for(const name of ['src','assets'])await cp(join(project,name),join(s.root,name),{recursive:true});for(const name of ['index.html','style.css','manifest.webmanifest','PRIVACY.md','CREDITS.md','LICENSE'])await cp(join(project,name),join(s.root,name));}
test('inventory is deterministic and covers actual shell/module/catalog dependencies only',async()=>{
 const first=await generate(project),next=await generate(project);assert.deepEqual(first,next);const data=parseInventory(first);
 const urls=data.files.map(f=>f.url);for(const url of ['./','./index.html','./sw.js','./src/app.js','./src/engine.js','./src/cosmetic-assets.js','./assets/cosmetics/catalog.json','./assets/cosmetics/bowler.png','./assets/luna-custom.png','./assets/icon-512.png'])assert.ok(urls.includes(url),url);
 for(const prefix of ['./tools/','./concepts/','data:'])assert.equal(urls.some(url=>url.startsWith(prefix)),false);
 assert.equal(urls.includes('./src/cosmetic-art.js'),false);assert.equal(urls.includes('./src/wardrobe-review.js'),false);assert.equal(urls.includes('./offline-assets.js'),false);
});
test('catalog-only PNGs and nested module imports extend coverage with no generator edits',async t=>{
 const s=await sandbox(t);await complete(s);const original=parseInventory(await generate(s.root));
 const path=join(s.root,'assets/cosmetics/catalog.json'),catalog=JSON.parse(await readFile(path));catalog.items.push({...catalog.items.find(i=>i.id==='bowler'),id:'extra-hat',name:'Extra hat',art:{kind:'png',asset:'assets/cosmetics/extra hat.png'}});await writeFile(path,JSON.stringify(catalog));await cp(join(s.root,'assets/cosmetics/bowler.png'),join(s.root,'assets/cosmetics/extra hat.png'));
 await mkdir(join(s.root,'src/nested'));await writeFile(join(s.root,'src/nested/example.js'),'export const ready=true;');await writeFile(join(s.root,'src/new-feature.js'),"export {ready} from './nested/example.js';\n// import './does-not-exist.js';\nconst text=\"import './also-not-real.js'\";");await writeFile(join(s.root,'src/engine.js'),"export {ready} from './new-feature.js';\n"+await readFile(join(s.root,'src/engine.js'),'utf8'));
 const data=parseInventory(await generate(s.root));assert.notEqual(data.cacheKey,original.cacheKey);assert.ok(data.files.some(f=>f.url==='./assets/cosmetics/extra%20hat.png'));assert.ok(data.files.some(f=>f.url==='./src/nested/example.js'));
 await writeFile(join(s.root,'src/new-feature.js'),'export const image=1;\n');assert.notEqual(parseInventory(await generate(s.root)).cacheKey,data.cacheKey);
});
test('every shipped-file byte change invalidates identity; missing dependencies and stale output fail check',async t=>{
 const s=await sandbox(t);await complete(s);const first=await generate(s.root);await writeFile(join(s.root,'offline-assets.js'),first);
 const command=join(project,'scripts/generate-offline-assets.mjs'),run=()=>spawnSync(process.execPath,[command,'--root',s.root,'--check'],{encoding:'utf8'});
 assert.equal(run().status,0);await writeFile(join(s.root,'style.css'),(await readFile(join(s.root,'style.css'),'utf8'))+'\n');assert.notEqual(run().status,0);
 await writeFile(join(s.root,'offline-assets.js'),await generate(s.root));assert.equal(run().status,0);
 await writeFile(join(s.root,'src/engine.js'),"import './missing.js';\n");const before=await hashes(s.root);assert.notEqual(run().status,0);assert.deepEqual(await hashes(s.root),before);
});

test('imports after numeric divisions in the real app remain required dependencies',async t=>{
 const s=await sandbox(t),app=join(s.root,'src/app.js'),source=await readFile(app,'utf8');
 await writeFile(join(s.root,'src/late-module.js'),'export const late=true;');
 await writeFile(app,source+"\nconst ratio=1/120; import './late-module.js';\n");
 assert.ok(parseInventory(await generate(s.root)).files.some(file=>file.url==='./src/late-module.js'));
 await writeFile(app,source+"\nimport './missing-after-division.js';\n");
 await assert.rejects(()=>generate(s.root),/missing-after-division|ENOENT/);
});

test('literal fetch uses the game execution URL',async t=>{
 const s=await sandbox(t),app=join(s.root,'src/app.js'),sw=join(s.root,'sw.js');
 await writeFile(join(s.root,'assets/fetch-example.png'),'example');
 await writeFile(app,"fetch('./assets/fetch-example.png');\n"+await readFile(app,'utf8'));
 assert.ok(parseInventory(await generate(s.root)).files.some(file=>file.url==='./assets/fetch-example.png'));
});

test('every importScripts argument is a required worker dependency',async t=>{
 const s=await sandbox(t),sw=join(s.root,'sw.js');
 await writeFile(join(s.root,'first-worker.js'),'const first=1;');await writeFile(join(s.root,'second-worker.js'),'const second=2;');
 await writeFile(sw,"importScripts('./first-worker.js', './second-worker.js');\n"+await readFile(sw,'utf8'));
 const urls=parseInventory(await generate(s.root)).files.map(file=>file.url);
 for(const url of ['./first-worker.js','./second-worker.js'])assert.ok(urls.includes(url),url);
 await writeFile(sw,"importScripts('./first-worker.js', './missing-worker.js');\n");await assert.rejects(()=>generate(s.root),/missing-worker|ENOENT/);
});
