import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareReview,applyPrepared,recoverReview} from '../scripts/lib/review-application.mjs';
import {sandbox,hashes,hash,project} from './helpers/review-sandbox.js';

test('unapplied rendering candidate cannot be silently applied as a fit-only review',async t=>{
 for(const variant of ['stable-ear-mask-v1','stable-face-layer-v2']){
  const s=await sandbox(t);s.data.rendering=variant;await s.write();
  const before=await hashes(s.root);
  await assert.rejects(()=>prepareReview(s),/rendering candidate.*studio only/i);
  assert.deepEqual(await hashes(s.root),before);
 }
});

test('dry-run changes nothing; apply transfers all fits and exact PNGs, evidence and cache atomically',async t=>{
 const s=await sandbox(t),before=await hashes(s.root),plan=await prepareReview(s);
 assert.deepEqual(await hashes(s.root),before);assert.equal(plan.report.items.filter(i=>i.changed).length,4);
 const result=await applyPrepared(plan);assert.ok(result.files.length>=6);
 const catalog=JSON.parse(await fs.readFile(join(s.root,'assets/cosmetics/catalog.json')));
 for(const id of ['crown','heels','skull']){const item=catalog.items.find(i=>i.id===id);assert.equal(item.art.kind,'png');assert.equal(hash(await fs.readFile(join(s.root,item.art.asset))),hash(s.png));assert.deepEqual(item.fit,(({x,y,scale})=>({x,y,scale}))(s.data.fits[item.category][id]));}
 assert.equal(catalog.items.find(i=>i.id==='star').fit.x,606);
 assert.equal(hash(await fs.readFile(join(s.root,'assets/cosmetics/bowler.png'))),before['assets/cosmetics/bowler.png']);
 assert.equal(hash(await fs.readFile(join(s.root,'player-saves.json'))),before['player-saves.json']);
 const archived=join(s.root,result.evidence);
 assert.equal(hash(await fs.readFile(join(archived,'review.json'))),hash(await fs.readFile(s.review)));
 assert.equal(hash(await fs.readFile(join(archived,'preview.png'))),hash(await fs.readFile(s.preview)));
 const sw=await fs.readFile(join(s.root,'offline-assets.js'),'utf8');for(const id of ['crown','heels','skull'])assert.ok(sw.includes(catalog.items.find(i=>i.id===id).art.asset));assert.notEqual(hash(Buffer.from(sw)),before['offline-assets.js']);
 const applied=await hashes(s.root);const again=await prepareReview(s);assert.equal(again.files.length,0);await applyPrepared(again);assert.deepEqual(await hashes(s.root),applied);
});
for(const [name,corrupt] of [
 ['late invalid fit',s=>{s.data.fits.mark.skull.scale=0;}],['unsupported version',s=>{s.data.version=3;}],['conflicting ID/category',s=>{s.data.fits.hat.heels=s.data.fits.shoes.heels;}],
 ['traversal',s=>{s.data.fits.mark.skull.asset='assets/../secret.png';}],['malformed PNG',s=>{s.data.fits.mark.skull.asset='data:image/png;base64,'+s.png.subarray(0,33).toString('base64');}]
])test(`invalid ${name} preserves whole tree`,async t=>{const s=await sandbox(t);corrupt(s);await s.write();const before=await hashes(s.root);await assert.rejects(()=>prepareReview(s));assert.deepEqual(await hashes(s.root),before);});
test('missing preview and screenshot-as-sprite are rejected before writes',async t=>{
 const s=await sandbox(t);let before=await hashes(s.root);await assert.rejects(()=>prepareReview({...s,preview:join(s.root,'missing.png')}));assert.deepEqual(await hashes(s.root),before);
 s.data.fits.hat.crown.asset='data:image/png;base64,'+(await fs.readFile(s.preview)).toString('base64');await s.write();before=await hashes(s.root);await assert.rejects(()=>prepareReview(s),/preview|screenshot/i);assert.deepEqual(await hashes(s.root),before);
});
test('escaping symlinks in source and active destination are rejected',async t=>{
 const s=await sandbox(t);await fs.symlink(project,join(s.root,'assets/escape'));s.data.fits.hat.crown.asset='assets/escape/assets/cosmetics/bowler.png';await s.write();const before=await hashes(s.root);await assert.rejects(()=>prepareReview(s),/symlink/i);assert.deepEqual(await hashes(s.root),before);
 await fs.unlink(join(s.root,'assets/cosmetics/catalog.json'));await fs.symlink(join(project,'assets/cosmetics/catalog.json'),join(s.root,'assets/cosmetics/catalog.json'));await assert.rejects(()=>prepareReview(s),/symlink/i);
});
test('concurrent catalog or review edits are refused before publication',async t=>{
 for(const field of ['review','catalog']){const s=await sandbox(t),plan=await prepareReview(s),path=field==='review'?s.review:join(s.root,'assets/cosmetics/catalog.json');await fs.appendFile(path,'\n');const before=await hashes(s.root);await assert.rejects(()=>applyPrepared(plan),/changed|concurrent/i);assert.deepEqual(await hashes(s.root),before);}
});
test('a write failure rolls back every published file and removes staged evidence',async t=>{
 const s=await sandbox(t),before=await hashes(s.root),plan=await prepareReview(s);
 const io={...fs,rename:async(from,to)=>{if(to===join(s.root,'assets/cosmetics/catalog.json')&&!from.endsWith('.rollback'))throw new Error('Injected write failure');return fs.rename(from,to);}};
 await assert.rejects(()=>applyPrepared(plan,{io}),/Injected/);assert.deepEqual(await hashes(s.root),before);
});
test('interrupted publication recovers old bytes, and conflicts refuse recovery without overwriting edits',async t=>{
 for(const conflict of [false,true]){
  const s=await sandbox(t),before=await hashes(s.root),module=fileURLToPath(new URL('../scripts/lib/review-application.mjs',import.meta.url));
  const code=`import * as fs from 'node:fs/promises';import {prepareReview,applyPrepared} from ${JSON.stringify(module)};const [root,review,preview]=process.argv.slice(1);const plan=await prepareReview({root,review,preview});await applyPrepared(plan,{io:{...fs,rename:async(from,to)=>{await fs.rename(from,to);if(to===root+'/assets/cosmetics/catalog.json')process.exit(86);}}});`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',code,s.root,s.review,s.preview],{encoding:'utf8'});assert.equal(child.status,86,child.stderr);
  if(conflict){await fs.appendFile(join(s.root,'assets/cosmetics/catalog.json'),'\n');const state=await hashes(s.root);await assert.rejects(()=>recoverReview(s.root),/conflict|changed/i);assert.deepEqual(await hashes(s.root),state);}
  else{await recoverReview(s.root);assert.deepEqual(await hashes(s.root),before);await assert.rejects(()=>recoverReview(s.root),/No.*transaction/i);}
 }
});
test('legacy bowler pair keeps original bytes and all unrelated items',async t=>{
 const s=await sandbox(t);await fs.mkdir(join(s.root,'concepts/luna/bowler-review'),{recursive:true});await fs.cp(join(project,'concepts/luna/bowler-review/bowler.png'),join(s.root,'concepts/luna/bowler-review/bowler.png'));
 const owner=JSON.parse(await fs.readFile(join(project,'concepts/luna/bowler-review/luna-bowler-fit.json')));owner.x+=1;await fs.writeFile(s.review,JSON.stringify(owner));const plan=await prepareReview(s);assert.equal(plan.report.items.filter(i=>i.changed).length,1);await applyPrepared(plan);const catalog=JSON.parse(await fs.readFile(join(s.root,'assets/cosmetics/catalog.json')));assert.equal(catalog.items.find(i=>i.id==='bowler').fit.x,owner.x);assert.equal(catalog.items.find(i=>i.id==='heels').art.kind,'grid');assert.equal(hash(await fs.readFile(join(s.root,'assets/cosmetics/bowler.png'))),hash(s.png));
});

test('interrupted staging and partially cleaned committed journals recover without changing active files',async t=>{
 const s=await sandbox(t),before=await hashes(s.root),dir=join(s.root,'.luna-review-transaction');
 await fs.mkdir(dir);await fs.writeFile(join(dir,'0.after'),'partial staged bytes');await recoverReview(s.root);assert.deepEqual(await hashes(s.root),before);
 const plan=await prepareReview(s);const result=await applyPrepared(plan,{io:{...fs,rm:async(path,options)=>{if(path===dir&&options?.recursive)throw new Error('Injected cleanup failure');return fs.rm(path,options);}}});assert.equal(result.cleanupPending,true);
 const applied=await fs.readFile(join(s.root,'assets/cosmetics/catalog.json'));
 await fs.unlink(join(dir,'0.before')).catch(()=>{});await fs.unlink(join(dir,'0.after'));
 await recoverReview(s.root);assert.equal(hash(await fs.readFile(join(s.root,'assets/cosmetics/catalog.json'))),hash(applied));
});
test('foreign temporary bytes are not deleted by committed cleanup',async t=>{
 const s=await sandbox(t),plan=await prepareReview(s),dir=join(s.root,'.luna-review-transaction');
 await applyPrepared(plan,{io:{...fs,rm:async(path,options)=>{if(path===dir&&options?.recursive)throw new Error('Leave journal');return fs.rm(path,options);}}});
 await fs.writeFile(join(s.root,'assets/cosmetics/.luna-review-0.tmp'),'a newer unrelated edit');const before=await hashes(s.root);
 await assert.rejects(()=>recoverReview(s.root),/conflict|temporary/i);assert.deepEqual(await hashes(s.root),before);
});

test('partial temporary writes roll back, and recovery can resume after interruption',async t=>{
 const s=await sandbox(t),before=await hashes(s.root),plan=await prepareReview(s);
 let failed=false;
 const io={...fs,rename:async(from,to)=>{
  if(!failed&&to===join(s.root,'assets/cosmetics/catalog.json')){failed=true;await fs.truncate(from,10);throw new Error('Partial temporary write');}
  return fs.rename(from,to);
 }};
 await assert.rejects(()=>applyPrepared(plan,{io}),/Partial/);assert.deepEqual(await hashes(s.root),before);
});

test('duplicate JSON keys, including escaped names, fail before active writes',async t=>{
 const s=await sandbox(t);const text=await fs.readFile(s.review,'utf8');await fs.writeFile(s.review,text.replace('"x":817','"x":817,"\\u0078":818'));
 const before=await hashes(s.root);await assert.rejects(()=>prepareReview(s),/duplicate/i);assert.deepEqual(await hashes(s.root),before);
});

test('manual recovery refuses a live writer instead of undoing its publication',async t=>{
 const s=await sandbox(t),dir=join(s.root,'.luna-review-transaction'),plan=await prepareReview(s);
 await applyPrepared(plan,{io:{...fs,rm:async(path,options)=>{if(path===dir&&options?.recursive)throw new Error('Retain journal');return fs.rm(path,options);}}});
 const path=join(dir,'manifest.json'),manifest=JSON.parse(await fs.readFile(path));manifest.phase='committing';await fs.writeFile(path,JSON.stringify(manifest));
 const before=await hashes(s.root);await assert.rejects(()=>recoverReview(s.root),/active writer|still running/i);assert.deepEqual(await hashes(s.root),before);
});

test('a second recovery resumes after the rollback process itself exits',async t=>{
 const s=await sandbox(t),before=await hashes(s.root),module=fileURLToPath(new URL('../scripts/lib/review-application.mjs',import.meta.url));
 const applying=`import * as fs from 'node:fs/promises';import {prepareReview,applyPrepared} from ${JSON.stringify(module)};const [root,review,preview]=process.argv.slice(1);await applyPrepared(await prepareReview({root,review,preview}),{io:{...fs,rename:async(from,to)=>{await fs.rename(from,to);if(to===root+'/assets/cosmetics/catalog.json')process.exit(86);}}});`;
 assert.equal(spawnSync(process.execPath,['--input-type=module','-e',applying,s.root,s.review,s.preview]).status,86);
 const rollingBack=`import * as fs from 'node:fs/promises';import {recoverReview} from ${JSON.stringify(module)};await recoverReview(process.argv[1],{io:{...fs,rename:async(from,to)=>{if(from.endsWith('.rollback'))process.exit(87);return fs.rename(from,to);}}});`;
 assert.equal(spawnSync(process.execPath,['--input-type=module','-e',rollingBack,s.root]).status,87);
 await recoverReview(s.root);assert.deepEqual(await hashes(s.root),before);
});

for(const name of ['review.json','preview.png'])test(`conflicting archived ${name} is preserved without any writes`,async t=>{
 const s=await sandbox(t),applied=await applyPrepared(await prepareReview(s));
 await fs.writeFile(join(s.root,applied.evidence,name),'a conflicting preserved review');
 const before=await hashes(s.root);await assert.rejects(()=>prepareReview(s),/archive|evidence/i);assert.deepEqual(await hashes(s.root),before);
});

test('application stages generated inventory and snapshots all runtime dependencies',async t=>{
 const s=await sandbox(t),plan=await prepareReview(s);
 assert.ok(plan.files.some(file=>file.path==='offline-assets.js'));
 await fs.appendFile(join(s.root,'src/engine.js'),'\n');const before=await hashes(s.root);
 await assert.rejects(()=>applyPrepared(plan),/concurrent|changed/i);assert.deepEqual(await hashes(s.root),before);
});

test('an input changed during inventory preparation cannot replace its validated snapshot',async t=>{
 const s=await sandbox(t),before=await hashes(s.root),module=fileURLToPath(new URL('../scripts/lib/review-application.mjs',import.meta.url));
 // Isolate the deterministic concurrent-writer hook from other tests/processes.
 const code=`import fs from 'node:fs/promises';import {syncBuiltinESMExports} from 'node:module';import assert from 'node:assert/strict';import {prepareReview} from ${JSON.stringify(module)};
 const [root,review,preview]=process.argv.slice(1),open=fs.open;let injected=false;
 fs.open=async(...args)=>{if(!injected&&args[0]===root+'/index.html'){injected=true;await fs.writeFile(root+'/assets/cosmetics/bowler.png','invalid concurrent PNG');}return open(...args);};syncBuiltinESMExports();
 try{await assert.rejects(()=>prepareReview({root,review,preview}),/concurrent|changed/i);assert.equal(injected,true);}finally{fs.open=open;syncBuiltinESMExports();}`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',code,s.root,s.review,s.preview],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);
 const expected={...before,'assets/cosmetics/bowler.png':hash(Buffer.from('invalid concurrent PNG'))};assert.deepEqual(await hashes(s.root),expected,'only the injected external edit remains');
});
