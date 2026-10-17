import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {generateInventory,parseInventory} from '../../scripts/lib/offline-inventory.mjs';
const root=new URL('../../',import.meta.url);
export async function worker(scope,{overlay=new Map(),stores=new Map(),fail=null,corrupt=null}={}){
 const read=async path=>overlay.has(path)?overlay.get(path):readFile(new URL(path,root));
 const inventoryBytes=await generateInventory({read}),inventory=parseInventory(inventoryBytes),listeners={};let online=true,claimed=false;
 const urlOf=value=>new URL(typeof value==='string'?value:value.url,scope).href;
 const network=async request=>{
  if(!online)throw new TypeError('offline');const url=new URL(urlOf(request)),path=decodeURIComponent(url.pathname.slice(new URL(scope).pathname.length))||'index.html';
  if(path===fail)return new Response('missing',{status:404});
  if(path===corrupt)return new Response('wrong generation',{status:200});
  try{return new Response(await read(path));}catch{return new Response('missing',{status:404});}
 };
 const caches={keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async name=>{
  if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);
  const put=async(key,response)=>entries.set(urlOf(key),response.clone());
  return {put,addAll:async files=>{const responses=await Promise.all(files.map(async path=>{const r=await network(path);if(!r.ok)throw new Error('Missing resource');return[path,r];}));for(const [path,r] of responses)await put(path,r);},match:async(request,{ignoreSearch=false}={})=>{const url=new URL(urlOf(request));if(ignoreSearch)url.search='';return entries.get(url.href)?.clone();}};
 }};
 const self={registration:{scope},clients:{claim:async()=>{claimed=true;}},addEventListener:(type,fn)=>{listeners[type]=fn;}};
 const context=vm.createContext({self,caches,fetch:network,URL,Request,Response,TextEncoder,crypto:webcrypto,console});
 context.importScripts=()=>vm.runInContext(inventoryBytes.toString(),context);
 vm.runInContext((await read('sw.js')).toString(),context);
 const lifecycle=type=>new Promise((resolve,reject)=>{try{listeners[type]({waitUntil:p=>Promise.resolve(p).then(resolve,reject)});}catch(error){reject(error);}});
 const fetchEvent=(path,mode='cors')=>new Promise((resolve,reject)=>{let used=false;listeners.fetch({request:{url:new URL(path,scope).href,method:'GET',mode},respondWith:p=>{used=true;Promise.resolve(p).then(resolve,reject);}});if(!used)network(new URL(path,scope).href).then(resolve,reject);});
 const status=()=>new Promise((resolve,reject)=>{try{listeners.message({data:{type:'LUNA_CACHE_STATUS'},ports:[{postMessage:resolve}],waitUntil:p=>p.catch(reject)});}catch(error){reject(error);}});
 return {stores,caches,lifecycle,fetchEvent,status,claimed:()=>claimed,setOffline:()=>{online=false;},cacheName:`luna-${scope}-${inventory.cacheKey}`,inventory};
}
