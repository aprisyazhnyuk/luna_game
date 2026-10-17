import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,relative,dirname,join,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validateCatalog,validateReviewByteLength,INPUT_LIMITS} from '../../src/cosmetic-model.js';
import {parseReview,clone} from '../../src/wardrobe-review.js';
import {validatePng} from './png.mjs';
const JOURNAL='.luna-review-transaction',MAX_JSON=56_000_000;
const ROLLBACK=Symbol('writer rollback');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=bytes=>bytes===null?null:sha(bytes);
const json=object=>Buffer.from(JSON.stringify(object,null,2)+'\n');
function decode(bytes){
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),value=JSON.parse(text),stack=[];
 // JSON.parse accepts duplicate keys. Reject ambiguous evidence/configuration,
 // including differently escaped spellings of the same property name.
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(char==='"'){
   const start=i;while(++i<text.length){if(text[i]==='\\'){i++;continue;}if(text[i]==='"')break;}
   const frame=stack.at(-1);
   if(frame?.object&&frame.key){const key=JSON.parse(text.slice(start,i+1));if(frame.keys.has(key))throw new Error(`Duplicate JSON key: ${key}`);frame.keys.add(key);frame.key=false;}
  }else if(char==='{'||char==='['){stack.push({object:char==='{',keys:new Set(),key:true});if(stack.length>64)throw new Error('JSON nesting is too deep');}
  else if(char==='}'||char===']')stack.pop();
  else if(char===','&&stack.at(-1)?.object)stack.at(-1).key=true;
 }
 return value;
}
function safeRelative(path){if(typeof path!=='string'||!path||isAbsolute(path)||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error(`Unsafe project path: ${path}`);return path;}
async function checkPath(root,path,io=fs){
 safeRelative(path);const parts=path.split('/');
 for(let i=1;i<=parts.length;i++){
  let stat;try{stat=await io.lstat(join(root,...parts.slice(0,i)));}catch(error){if(error.code==='ENOENT')return;throw error;}
  if(stat.isSymbolicLink())throw new Error(`Symlink is not allowed: ${path}`);
  if(i<parts.length&&!stat.isDirectory())throw new Error(`Expected directory in ${path}`);
 }
}
async function readFile(path,limit,io=fs,optional=false){
 let handle;try{handle=await io.open(path,constants.O_RDONLY|constants.O_NOFOLLOW);}catch(error){if(optional&&error.code==='ENOENT')return null;throw error;}
 try{
  const stat=await handle.stat();if(!stat.isFile()||stat.size>limit)throw new Error(`Invalid file/size: ${path}`);
  const bytes=Buffer.alloc(stat.size+1);let length=0;
  while(length<bytes.length){const next=await handle.read(bytes,length,bytes.length-length,null);if(!next.bytesRead)break;length+=next.bytesRead;}
  if(length!==stat.size||(await handle.stat()).size!==stat.size)throw new Error(`File changed while reading: ${path}`);
  return bytes.subarray(0,length);
 }finally{await handle.close();}
}
async function readInside(root,path,limit,io=fs,optional=false){await checkPath(root,path,io);return readFile(join(root,path),limit,io,optional);}
function targetAllowed(path){
 safeRelative(path);
 if(path==='assets/cosmetics/catalog.json'||path==='sw.js')return true;
 if(/^assets\/cosmetics\/[a-z][a-z0-9-]*-[a-f0-9]{64}\.png$/.test(path))return true;
 return /^concepts\/luna\/applied-reviews\/[a-f0-9]{64}\/(review\.json|preview\.png|report\.json)$/.test(path);
}
function cacheSource(source,assets,changed,catalogBytes){
 const list=/^const FILES=(\[[^\n]*\]);$/m.exec(source),version=/^const VERSION='[^'\n]+';$/m.exec(source);
 if(!list||!version)throw new Error('Unsupported manual service worker format');
 let files;try{files=JSON.parse(list[1].replaceAll("'",'"'));}catch{throw new Error('Invalid offline list');}
 if(!Array.isArray(files)||files.some(path=>typeof path!=='string'||!path.startsWith('./')))throw new Error('Invalid offline paths');
 const additions=assets.map(path=>'./'+path).filter(path=>!files.includes(path)).sort();
 if(!changed&&!additions.length)return Buffer.from(source);
 const next=source.replace(list[0],'const FILES='+JSON.stringify([...files,...additions])+';');
 const identity=sha(Buffer.concat([catalogBytes,Buffer.from(next.replace(version[0],"const VERSION='';"))]));
 return Buffer.from(next.replace(version[0],`const VERSION='review-${identity.slice(0,24)}';`));
}
// Planning is read-only. Snapshot every input/target, including absent files.
export async function prepareReview({root,review,preview}){
 root=await fs.realpath(resolve(root));const snapshots=new Map();
 const read=async(path,limit,optional=false)=>{
  const bytes=await readInside(root,path,limit,fs,optional);snapshots.set(join(root,path),{path,limit,hash:hash(bytes)});return bytes;
 };
 const source=async(path,limit)=>{
  const original=resolve(path),stat=await fs.lstat(original);if(stat.isSymbolicLink())throw new Error(`Symlink input: ${path}`);
  const actual=await fs.realpath(original),inside=relative(root,actual);
  const bytes=!inside.startsWith('..')&&!isAbsolute(inside)?await read(inside,limit):await readFile(actual,limit);
  snapshots.set(actual,{absolute:actual,original,limit,hash:sha(bytes)});return bytes;
 };
 const catalogBytes=await read('assets/cosmetics/catalog.json',1_000_000),catalog=validateCatalog(decode(catalogBytes));
 const workerBytes=await read('sw.js',2_000_000);
 const reviewBytes=await source(review,MAX_JSON);validateReviewByteLength(reviewBytes.length);
 const draft=parseReview(decode(reviewBytes),catalog),previewBytes=await source(preview,INPUT_LIMITS.pngBytes);validatePng(previewBytes);
 const previewHash=sha(previewBytes),validated=new Set([previewHash]),activeImages=new Map();
 const validate=bytes=>{const digest=sha(bytes);if(!validated.has(digest)){validatePng(bytes);validated.add(digest);}return digest;};
 for(const item of catalog.items)if(item.art.kind==='png'&&!activeImages.has(item.art.asset)){
  const bytes=await read(item.art.asset,INPUT_LIMITS.pngBytes);validate(bytes);activeImages.set(item.art.asset,bytes);
 }
 const files=[],pending=new Map();
 const add=async(path,after,limit=MAX_JSON)=>{
  if(!targetAllowed(path))throw new Error(`Disallowed application target ${path}`);
  const prior=pending.get(path);if(prior){if(!prior.after.equals(after))throw new Error(`Conflicting target: ${path}`);return;}
  const before=await read(path,limit,true);if(before?.equals(after))return;
  const entry={path,before,after};pending.set(path,entry);files.push(entry);
 };
 const next=clone(catalog),items=[];
 for(const item of next.items){
  if(!item.fit)continue;
  const fit=draft.fits[item.category][item.id],old=catalog.items.find(i=>i.id===item.id);
  const beforeImage=old.art.kind==='png'?sha(activeImages.get(old.art.asset)):null;
  let afterImage=null;
  if(fit.kind==='raster'){
   const bytes=fit.asset.startsWith('data:')?Buffer.from(fit.asset.slice(22),'base64'):await read(fit.asset,INPUT_LIMITS.pngBytes);
   afterImage=validate(bytes);
   if(afterImage===previewHash)throw new Error(`The preview screenshot cannot be used as item artwork: ${item.id}`);
   let asset=old.art.kind==='png'&&beforeImage===afterImage?old.art.asset:`assets/cosmetics/${item.id}-${afterImage}.png`;
   if(asset!==old.art.asset){
    const existing=await read(asset,INPUT_LIMITS.pngBytes,true);
    if(existing&&!existing.equals(bytes))throw new Error(`Conflicting image destination: ${asset}`);
    await add(asset,bytes,INPUT_LIMITS.pngBytes);
   }
   item.art={kind:'png',asset};
  }
  item.fit={x:fit.x,y:fit.y,scale:fit.scale};
  const changed=!isDeepStrictEqual(old.art,item.art)||!isDeepStrictEqual(old.fit,item.fit);
  items.push({id:item.id,category:item.category,changed,before:{art:old.art,fit:old.fit,sha256:beforeImage},after:{art:item.art,fit:item.fit,sha256:afterImage}});
 }
 validateCatalog(next);
 const nextBytes=items.some(item=>item.changed)?json(next):catalogBytes;
 await add('assets/cosmetics/catalog.json',nextBytes,1_000_000);
 const worker=cacheSource(workerBytes.toString('utf8'),next.items.filter(i=>i.art.kind==='png').map(i=>i.art.asset),!nextBytes.equals(catalogBytes),nextBytes);
 await add('sw.js',worker,2_000_000);
 const reviewHash=sha(reviewBytes),evidence=`concepts/luna/applied-reviews/${sha(Buffer.from(reviewHash+':'+previewHash))}`;
 await add(evidence+'/review.json',reviewBytes);await add(evidence+'/preview.png',previewBytes,INPUT_LIMITS.pngBytes);
 const report={version:1,inputs:{review:{sha256:reviewHash},preview:{sha256:previewHash}},evidence,items,files:files.map(f=>({path:f.path,before:hash(f.before),after:sha(f.after)}))};
 const oldReport=await read(evidence+'/report.json',MAX_JSON,true);
 if(oldReport){const saved=decode(oldReport);if(saved.version!==1||saved.inputs?.review?.sha256!==reviewHash||saved.inputs?.preview?.sha256!==previewHash)throw new Error('Conflicting review evidence report');}
 else await add(evidence+'/report.json',json(report));
 return {root,report:{...report,files:files.map(f=>({path:f.path,before:hash(f.before),after:sha(f.after)}))},files,snapshots:[...snapshots.values()]};
}
async function verifySnapshot(root,snapshot,io){
 if(snapshot.original&&await io.realpath(snapshot.original)!==snapshot.absolute)throw new Error('Review input path changed concurrently');
 const bytes=snapshot.path?await readInside(root,snapshot.path,snapshot.limit,io,true):await readFile(snapshot.absolute,snapshot.limit,io,true);
 if(hash(bytes)!==snapshot.hash)throw new Error(`Input changed concurrently: ${snapshot.path??snapshot.absolute}`);
}
async function durable(path,bytes,io=fs){const file=await io.open(path,'wx',0o644);try{await file.writeFile(bytes);await file.sync();}finally{await file.close();}}
async function syncDirectory(path,io){const dir=await io.open(path,'r');try{await dir.sync();}finally{await dir.close();}}
async function saveManifest(root,manifest,io){
 const dir=join(root,JOURNAL),next=join(dir,'manifest.next');
 await io.rm(next,{force:true});await durable(next,json(manifest),io);await io.rename(next,join(dir,'manifest.json'));await syncDirectory(dir,io);
}
function temporary(path,index,rollback=false){return join(dirname(path),`.luna-review-${index}.${rollback?'rollback':'tmp'}`);}
async function publish(root,entry,index,bytes,io,rollback=false){
 await checkPath(root,entry.path,io);const temp=temporary(entry.path,index,rollback);await checkPath(root,temp,io);
 const prior=await readInside(root,temp,MAX_JSON,io,true);
 if(prior!==null){if(!bytes.subarray(0,prior.length).equals(prior))throw new Error(`Temporary file conflict: ${temp}`);await io.unlink(join(root,temp));}
 await durable(join(root,temp),bytes,io);await io.rename(join(root,temp),join(root,entry.path));await syncDirectory(join(root,dirname(entry.path)),io);
}
async function checkTemporaries(root,manifest,io){
 // Never remove a user's intervening edit to a reserved temporary pathname.
 for(let i=0;i<manifest.entries.length;i++)for(const rollback of [false,true]){
  const temp=temporary(manifest.entries[i].path,i,rollback),bytes=await readInside(root,temp,MAX_JSON,io,true);
  if(bytes!==null&&sha(bytes)!==(rollback?manifest.entries[i].before:manifest.entries[i].after)){
   const stagedName=rollback?manifest.entries[i].old:manifest.entries[i].next;
   const staged=stagedName?await readInside(root,JOURNAL+'/'+stagedName,MAX_JSON,io,true):null;
   if(!staged||!staged.subarray(0,bytes.length).equals(bytes))throw new Error(`Temporary file conflict: ${temp}`);
  }
 }
}
async function clean(root,manifest,io){
 await checkTemporaries(root,manifest,io);
 for(let i=0;i<manifest.entries.length;i++)for(const rollback of [false,true]){
  const temp=temporary(manifest.entries[i].path,i,rollback);await checkPath(root,temp,io);await io.rm(join(root,temp),{force:true});
 }
 await io.rm(join(root,JOURNAL),{recursive:true});await syncDirectory(root,io);
}
async function assertStopped(root,io,internal=false){
 const bytes=await readInside(root,JOURNAL+'/owner.json',1024,io,true);if(bytes===null)return;
 const owner=decode(bytes);if(!Number.isSafeInteger(owner.pid)||owner.pid<1)throw new Error('Invalid journal owner');
 if(internal&&owner.pid===process.pid)return;
 try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')return;throw new Error('Cannot confirm that the transaction writer has stopped');}
 throw new Error(`Active writer ${owner.pid} is still running; do not recover it`);
}
// A retained journal is an exclusive lock; recover only after its writer stopped.
export async function applyPrepared(plan,{io=fs}={}){
 const {root,files}=plan;
 for(const snapshot of plan.snapshots)await verifySnapshot(root,snapshot,io);
 await checkPath(root,JOURNAL,io);
 try{await io.lstat(join(root,JOURNAL));throw new Error('Pending transaction: run --recover after its writer has stopped');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!files.length)return {...plan.report,files:[],cleanupPending:false};
 for(const entry of files){if(!targetAllowed(entry.path))throw new Error('Unsafe transaction target');await checkPath(root,entry.path,io);}
 await io.mkdir(join(root,JOURNAL),{mode:0o700});
 const manifest={version:1,phase:'prepared',directories:[],entries:files.map((entry,i)=>({path:entry.path,before:hash(entry.before),after:sha(entry.after),old:entry.before===null?null:`${i}.before`,next:`${i}.after`}))};
 let committed=false,hasManifest=false;
 try{
  await durable(join(root,JOURNAL,'owner.json'),json({pid:process.pid}),io);
  for(let i=0;i<files.length;i++){
   if(files[i].before!==null)await durable(join(root,JOURNAL,`${i}.before`),files[i].before,io);
   await durable(join(root,JOURNAL,`${i}.after`),files[i].after,io);
   for(const roll of [false,true]){const temp=temporary(files[i].path,i,roll);await checkPath(root,temp,io);try{await io.lstat(join(root,temp));throw new Error(`Temporary path already exists: ${temp}`);}catch(error){if(error.code!=='ENOENT')throw error;}}
   let parent=dirname(files[i].path);
   while(parent!=='.'){
    try{await io.lstat(join(root,parent));break;}catch(error){if(error.code!=='ENOENT')throw error;}
    if(!manifest.directories.includes(parent))manifest.directories.push(parent);parent=dirname(parent);
   }
  }
  await saveManifest(root,manifest,io);hasManifest=true;
  for(const snapshot of plan.snapshots)await verifySnapshot(root,snapshot,io);
  manifest.phase='committing';await saveManifest(root,manifest,io);
  for(const dir of [...manifest.directories].sort((a,b)=>a.split('/').length-b.split('/').length)){await checkPath(root,dir,io);await io.mkdir(join(root,dir),{recursive:true});}
  for(let i=0;i<files.length;i++){
   const before=await readInside(root,files[i].path,MAX_JSON,io,true);
   if(hash(before)!==manifest.entries[i].before)throw new Error(`Target changed concurrently: ${files[i].path}`);
   await publish(root,files[i],i,files[i].after,io);
  }
  const targets=new Set(files.map(f=>f.path));
  for(const snapshot of plan.snapshots)if(!targets.has(snapshot.path))await verifySnapshot(root,snapshot,io);
  for(const entry of manifest.entries)if(hash(await readInside(root,entry.path,MAX_JSON,io,true))!==entry.after)throw new Error(`Published target changed concurrently: ${entry.path}`);
  manifest.phase='committed';await saveManifest(root,manifest,io);committed=true;
  await clean(root,manifest,io);
  return {...plan.report,files:plan.report.files,cleanupPending:false};
 }catch(error){
  if(committed)return {...plan.report,cleanupPending:true};
  try{if(hasManifest)await recoverReview(root,{io,[ROLLBACK]:true});else await io.rm(join(root,JOURNAL),{recursive:true});}
  catch(recovery){throw new Error(`${error.message}; recovery required: ${recovery.message}`,{cause:error});}
  throw error;
 }
}
export async function recoverReview(root,options={}){
 const io=options.io??fs;
 root=await io.realpath(resolve(root));await checkPath(root,JOURNAL,io);
 let manifestBytes;try{manifestBytes=await readInside(root,JOURNAL+'/manifest.json',MAX_JSON,io);}catch(error){
  if(error.code!=='ENOENT')throw error;
  let entries;try{entries=await io.readdir(join(root,JOURNAL),{withFileTypes:true});}catch(missing){if(missing.code==='ENOENT')throw new Error('No pending transaction');throw missing;}
  // Without the first durable manifest no active write has begun. A cleanup
  // interruption can also leave this state; in both cases remove staging only.
  await assertStopped(root,io,options[ROLLBACK]);
  if(entries.some(entry=>!entry.isFile()||!(/^(\d+\.(before|after)|manifest\.next|owner\.json)$/.test(entry.name))))throw new Error('Unrecognized staging contents; manual inspection required');
  await io.rm(join(root,JOURNAL),{recursive:true});await syncDirectory(root,io);return {recovered:'staging-cleanup'};
 }
 const manifest=decode(manifestBytes);
 if(manifest.version!==1||!['prepared','committing','committed'].includes(manifest.phase)||!Array.isArray(manifest.entries)||manifest.entries.length<1||manifest.entries.length>4005||!Array.isArray(manifest.directories))throw new Error('Invalid transaction manifest');
 const paths=new Set(),oldBytes=[];
 for(let i=0;i<manifest.entries.length;i++){
  const entry=manifest.entries[i];
  if(!targetAllowed(entry.path)||paths.has(entry.path)||!(/^[a-f0-9]{64}$/.test(entry.after))||!(entry.before===null||/^[a-f0-9]{64}$/.test(entry.before))||entry.next!==`${i}.after`||entry.old!==(entry.before===null?null:`${i}.before`))throw new Error('Invalid transaction entry');
  paths.add(entry.path);
 }
 for(const dir of manifest.directories)if(!manifest.entries.some(entry=>entry.path.startsWith(safeRelative(dir)+'/')))throw new Error('Invalid transaction directory');
 if(manifest.phase==='committed'){await clean(root,manifest,io);return {recovered:'committed-cleanup'};}
 await assertStopped(root,io,options[ROLLBACK]);
 for(const entry of manifest.entries){
  const next=await readInside(root,JOURNAL+'/'+entry.next,MAX_JSON,io);
  if(sha(next)!==entry.after)throw new Error('Corrupt staged bytes');
  const old=entry.old===null?null:await readInside(root,JOURNAL+'/'+entry.old,MAX_JSON,io);if(hash(old)!==entry.before)throw new Error('Corrupt rollback bytes');oldBytes.push(old);
 }
 // Validate all targets before restoring any, so user edits are never overwritten.
 await checkTemporaries(root,manifest,io);
 for(const entry of manifest.entries){const current=hash(await readInside(root,entry.path,MAX_JSON,io,true));if(current!==entry.before&&current!==entry.after)throw new Error(`Recovery conflict: ${entry.path} changed`);}
 for(let i=manifest.entries.length-1;i>=0;i--){
  const entry=manifest.entries[i],current=hash(await readInside(root,entry.path,MAX_JSON,io,true));
  if(current===entry.before)continue;
  if(current!==entry.after)throw new Error(`Recovery conflict: ${entry.path} changed`);
  if(oldBytes[i]===null){await checkPath(root,entry.path,io);await io.unlink(join(root,entry.path));await syncDirectory(join(root,dirname(entry.path)),io);}
  else await publish(root,entry,i,oldBytes[i],io,true);
 }
 await clean(root,manifest,io);
 for(const dir of [...manifest.directories].sort((a,b)=>b.split('/').length-a.split('/').length))try{await io.rmdir(join(root,dir));}catch(error){if(!['ENOENT','ENOTEMPTY'].includes(error.code))throw error;}
 return {recovered:'rolled-back'};
}
