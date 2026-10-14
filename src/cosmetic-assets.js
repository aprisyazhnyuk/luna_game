import {validateCatalog,validatePngMetadata,INPUT_LIMITS} from './cosmetic-model.js';
import {configureWardrobe} from './customisation.js';
const root=new URL('../',import.meta.url);
const CATALOG_BYTES=1_000_000;
const signature=[137,80,78,71,13,10,26,10];
async function decodePng(bytes){
 const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
 try{const image=new Image();image.src=url;await image.decode();return image;}
 finally{URL.revokeObjectURL(url);}
}
function pngMetadata(bytes){
 if(bytes.length<33||!signature.every((value,i)=>bytes[i]===value))throw new Error('Invalid PNG header');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(view.getUint32(8)!==13||String.fromCharCode(...bytes.subarray(12,16))!=='IHDR')throw new Error('Invalid PNG IHDR');
 return validatePngMetadata({byteLength:bytes.length,width:view.getUint32(16),height:view.getUint32(20)});
}
// Injectable IO keeps Node verification independent of browser globals/network.
export function createCosmeticAssetLoader({root:projectRoot=root,fetch:request=globalThis.fetch,decode=decodePng}={}){
 const base=new URL(projectRoot);let snapshot=null,loading=null;
 async function bytesAt(path,limit){
  const url=new URL(path,base);
  try{
   const response=await request(url);
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const advertised=Number(response.headers.get('content-length'));
   if(advertised>limit)throw new Error('Invalid asset size');
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(bytes.length===0||bytes.length>limit)throw new Error('Invalid asset size');
   return bytes;
  }catch(error){throw new Error(`Could not load ${path}: ${error.message}`,{cause:error});}
 }
 async function prepare(){
  let catalog;
  const path='assets/cosmetics/catalog.json';
  try{catalog=validateCatalog(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bytesAt(path,CATALOG_BYTES))));}
  catch(error){throw new Error(`Invalid ${path}: ${error.message}`,{cause:error});}
  const images=new Map();
  const paths=[...new Set(catalog.items.filter(item=>item.art.kind==='png').map(item=>item.art.asset))];
  await Promise.all(paths.map(async path=>{
   try{
    const bytes=await bytesAt(path,INPUT_LIMITS.pngBytes),metadata=pngMetadata(bytes);
    const image=await decode(bytes,new URL(path,base));
    const width=image.naturalWidth??image.width,height=image.naturalHeight??image.height;
    validatePngMetadata({byteLength:bytes.length,width,height});
    if(width!==metadata.width||height!==metadata.height)throw new Error('PNG decoded dimensions disagree with header');
    images.set(path,image);
   }catch(error){throw new Error(`Invalid ${path}: ${error.message}`,{cause:error});}
  }));
  const items=Object.create(null);
  for(const item of catalog.items){
   const fit=item.fit?Object.freeze({kind:item.art.kind==='png'?'raster':'grid',...item.fit,...(item.art.kind==='png'?{asset:item.art.asset}:{})}):null;
   items[item.id]=Object.freeze({id:item.id,category:item.category,art:item.art,attachment:item.attachment,fit,image:images.get(item.art.asset)});
  }
  return Object.freeze({catalog,items:Object.freeze(items)});
 }
 function load(){
  if(snapshot)return Promise.resolve(snapshot);
  if(!loading)loading=prepare().then(ready=>{snapshot=ready;return ready;}).finally(()=>{loading=null;});
  return loading;
 }
 return Object.freeze({load,getSnapshot:()=>snapshot});
}
const loader=createCosmeticAssetLoader();
let snapshot=null,loading=null;
export function getCosmeticSnapshot(){return snapshot;}
export function getCosmeticItem(category,id){const item=snapshot?.items[id];return item?.category===category?item:undefined;}
// Compatibility API for the existing hat renderer; no named-item loader logic.
export function getRasterHat(id){const item=getCosmeticItem('hat',id);return item?.image?item:undefined;}
export function loadCosmeticAssets(){
 if(snapshot)return Promise.resolve(snapshot);
 if(!loading)loading=loader.load().then(ready=>{
  configureWardrobe(ready.catalog);snapshot=ready;return ready;
 }).finally(()=>{loading=null;});
 return loading;
}
