import * as fs from 'node:fs/promises';
import {resolve,join,posix} from 'node:path';
import {createHash} from 'node:crypto';
import {validateCatalog} from '../../src/cosmetic-model.js';
const GENERATED='offline-assets.js',MAX_FILE=64_000_000;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function safe(path){if(!/^[A-Za-z0-9_. /-]+$/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error(`Unsafe offline path: ${path}`);return path;}
export async function readInventoryFile(root,path){
 root=await fs.realpath(resolve(root));safe(path);
 for(const [i,part] of path.split('/').entries()){
  const stat=await fs.lstat(join(root,...path.split('/').slice(0,i+1)));if(stat.isSymbolicLink())throw new Error(`Offline dependency is a symlink: ${path}`);
  if(i<path.split('/').length-1&&!stat.isDirectory())throw new Error(`Invalid offline directory: ${part}`);
 }
 const stat=await fs.stat(join(root,path));if(!stat.isFile()||stat.size>MAX_FILE)throw new Error(`Invalid offline file/size: ${path}`);
 const bytes=await fs.readFile(join(root,path));if(bytes.length!==stat.size)throw new Error(`Offline file changed while reading: ${path}`);return bytes;
}
function dependency(base,spec){
 if(spec.startsWith('data:')||spec.startsWith('#'))return null;
 if(/^[a-z]+:/i.test(spec)||spec.startsWith('/')||spec.includes('\\')||spec.includes('%'))throw new Error(`Offline dependency must be local: ${spec}`);
 const path=posix.normalize(posix.join(posix.dirname(base),spec.split(/[?#]/)[0]));safe(path);
 if(path.startsWith('tools/')||path.startsWith('concepts/'))throw new Error(`Non-game dependency in runtime graph: ${path}`);
 return path;
}
// Tokenize enough JS to distinguish real imports from comments, strings/regexes.
// Dynamic imports must be literal. Dynamic cosmetic paths come from the catalog.
function tokens(source){
 const result=[];let i=0;
 while(i<source.length){
  const c=source[i];if(/\s/.test(c)){i++;continue;}
  if(source.startsWith('//',i)){i=source.indexOf('\n',i);if(i<0)break;continue;}
  if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);if(end<0)throw new Error('Unclosed JS comment');i=end+2;continue;}
  if(c==='"'||c==="'"||c==='`'){
   const quote=c,start=++i;let escaped=false;
   while(i<source.length&&source[i]!==quote){if(source[i]==='\\'){escaped=true;i++;}i++;}
   const value=source.slice(start,i++);
   if(quote==='`'&&/\$\{[\s\S]*\bimport\s*\(/.test(value))throw new Error('Unsupported import in template expression');
   result.push({kind:quote==='`'?'template':'string',value,escaped});continue;
  }
  if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(source[i+1]??''))){
   const start=i++;while(i<source.length&&/[A-Za-z0-9_.]/.test(source[i]))i++;
   result.push({kind:'number',value:source.slice(start,i)});continue;
  }
  if(source.startsWith('++',i)||source.startsWith('--',i)){result.push({kind:'postfix',value:source.slice(i,i+2)});i+=2;continue;}
  if(c==='/'&&!['word','number','string','template','postfix',']',')','}'].includes(result.at(-1)?.kind)){
   i++;let bracket=false,closed=false;
   while(i<source.length){if(source[i]==='\\'){i+=2;continue;}if(source[i]==='[')bracket=true;if(source[i]===']')bracket=false;if(/[\r\n]/.test(source[i]))throw new Error('Unsupported or unterminated JS regex');if(source[i++]==='/'&&!bracket){closed=true;break;}}
   if(!closed)throw new Error('Unterminated JS regex');
   while(/[a-z]/i.test(source[i]??'')&&i<source.length)i++;result.push({kind:'regex',value:''});continue;
  }
  if(/[A-Za-z_$]/.test(c)){const start=i++;while(i<source.length&&/[A-Za-z0-9_$]/.test(source[i]))i++;result.push({kind:'word',value:source.slice(start,i)});continue;}
  result.push({kind:c,value:c});i++;
 }
 return result;
}
function jsDependencies(source){
 const ts=tokens(source),paths=[],add=(spec,base)=>paths.push({spec,base});
 const literal=t=>{if(t?.kind!=='string'||t.escaped)throw new Error('Offline imports/assets require plain literal paths');return t.value;};
 for(let i=0;i<ts.length;i++){
  const t=ts[i];
  if(t.kind==='word'&&t.value==='import'&&ts[i+1]?.value!=='.'){
   if(ts[i+1]?.value==='('){if(![')',','].includes(ts[i+3]?.value))throw new Error('Dynamic import requires a literal offline path');add(literal(ts[i+2]));}
   else if(ts[i+1]?.kind==='string')add(literal(ts[i+1]));
   else for(let j=i+1;j<ts.length&&ts[j].value!==';';j++)if(ts[j].value==='from'){add(literal(ts[j+1]));break;}
  }else if(t.kind==='word'&&t.value==='export'){
   if(['{','*'].includes(ts[i+1]?.value))for(let j=i+1;j<ts.length&&ts[j].value!==';';j++)if(ts[j].value==='from'){add(literal(ts[j+1]));break;}
  }else if(t.value==='new'&&ts[i+1]?.value==='URL'&&ts[i+2]?.value==='('&&ts[i+3]?.kind==='string'&&ts.slice(i+5,i+10).map(t=>t.value).join('')==='import.meta.url'){
   const path=literal(ts[i+3]);if(!path.endsWith('/'))add(path);
  }else if(t.value==='fetch'&&ts[i+1]?.value==='('&&ts[i+2]?.kind==='string')add(literal(ts[i+2]),'index.html');
  else if(t.value==='importScripts'&&ts[i+1]?.value==='('){
   for(let j=i+2;ts[j]?.value!==')';j+=2){
    add(literal(ts[j]),'sw.js');if(ts[j+1]?.value===')')break;if(ts[j+1]?.value!==',')throw new Error('importScripts requires literal offline paths');
   }
  }
 }
 return paths;
}
export function parseInventory(bytes){
 const text=Buffer.from(bytes).toString('utf8'),prefix='// Generated by scripts/generate-offline-assets.mjs. Do not edit.\nself.LUNA_OFFLINE=';
 if(!text.startsWith(prefix)||!text.endsWith(';\n'))throw new Error('Invalid generated offline inventory');
 return JSON.parse(text.slice(prefix.length,-2));
}
export async function generateInventory({read}){
 const queue=['index.html','manifest.webmanifest','assets/cosmetics/catalog.json','sw.js','PRIVACY.md','CREDITS.md','LICENSE'],files=new Map();
 while(queue.length){
  const path=queue.shift();if(path===GENERATED||files.has(path))continue;safe(path);
  const bytes=Buffer.from(await read(path));if(bytes.length>MAX_FILE)throw new Error(`Offline dependency too large: ${path}`);files.set(path,bytes);
  const add=(spec,base=path)=>{const dep=dependency(base,spec);if(dep&&dep!==GENERATED)queue.push(dep);};
  if(path.endsWith('.js'))for(const {spec,base} of jsDependencies(bytes.toString('utf8')))add(spec,base);
  if(path.endsWith('.css')){
   const text=bytes.toString('utf8').replace(/\/\*[\s\S]*?\*\//g,'');
   for(const m of text.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g))add(m[1]??m[2]);
  }
  if(path.endsWith('.html'))for(const m of bytes.toString('utf8').matchAll(/<(script|link)\b([^>]+)>/gi)){
   const attrs=Object.fromEntries([...m[2].matchAll(/([\w-]+)\s*=\s*['"]([^'"]+)['"]/g)].map(a=>[a[1].toLowerCase(),a[2]]));
   if(m[1].toLowerCase()==='script'&&attrs.src)add(attrs.src);
   if(m[1].toLowerCase()==='link'&&attrs.href&&/^(stylesheet|manifest|icon|apple-touch-icon|preload)$/.test(attrs.rel))add(attrs.href);
  }
  if(path==='manifest.webmanifest')for(const icon of JSON.parse(bytes).icons??[])add(icon.src);
  if(path==='assets/cosmetics/catalog.json')for(const item of validateCatalog(JSON.parse(bytes)).items)if(item.art.kind==='png')queue.push(safe(item.art.asset));
 }
 const entries=[...files].map(([path,bytes])=>({url:'./'+path.split('/').map(encodeURIComponent).join('/'),sha256:sha(bytes)}));
 entries.push({url:'./',sha256:sha(files.get('index.html'))});entries.sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0);
 const inventory={version:1,cacheKey:sha(Buffer.from(JSON.stringify({version:1,files:entries}))),files:entries};
 return Buffer.from('// Generated by scripts/generate-offline-assets.mjs. Do not edit.\nself.LUNA_OFFLINE='+JSON.stringify(inventory,null,2)+';\n');
}
