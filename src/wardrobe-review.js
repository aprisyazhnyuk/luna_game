// Pure shared adapters for catalog fits and historical version-2 reviews.
import {FIT_LIMITS,INPUT_LIMITS,reviewFitForItem,validateFit as validatePlacement,validateAssetPath,validatePngBytes} from './cosmetic-model.js';
export const LIMITS=FIT_LIMITS;
export const clone=value=>JSON.parse(JSON.stringify(value));
const categories=Object.keys(LIMITS);
// Historical coverage identifies incomplete old reviews, not rendering behavior.
const legacyItems={hat:['bowler','witch','crown'],shoes:['heels','runners','sandals'],mark:['original','star','skull']};
function object(value,required,optional=[],label='review'){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label}`);
 for(const key of required)if(!Object.hasOwn(value,key))throw new Error(`Missing ${label}.${key}`);
 for(const key of Object.keys(value))if(!required.includes(key)&&!optional.includes(key))throw new Error(`Unknown ${label}.${key}`);
}
export function defaultFits(catalog){
 const fits={hat:{},shoes:{},mark:{}};
 for(const item of catalog.items)if(item.fit)fits[item.category][item.id]=reviewFitForItem(item);
 return fits;
}
export function validateAsset(asset){
 if(typeof asset!=='string')throw new Error('Missing PNG asset');
 if(asset.startsWith('data:image/png;base64,')){
  const encoded=asset.slice(22);
  if(encoded.length>4*Math.ceil(INPUT_LIMITS.pngBytes/3)||encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw new Error('Invalid embedded PNG encoding');
  const decoded=atob(encoded);
  if(btoa(decoded)!==encoded)throw new Error('Invalid embedded PNG encoding');
  validatePngBytes(Uint8Array.from(decoded,c=>c.charCodeAt(0)));return asset;
 }
 // Original bowler review references its preserved candidate under concepts.
 validateAssetPath(asset.startsWith('concepts/')?'assets/'+asset.slice(9):asset);
 return asset;
}
export function validateFit(category,raw){
 if(!raw||!['grid','raster'].includes(raw.kind))throw new Error(`Invalid ${category} artwork type`);
 object(raw,['kind','x','y','scale'],raw.kind==='raster'?['asset']:[],'fit');
 const fit={kind:raw.kind,...validatePlacement(category,{x:raw.x,y:raw.y,scale:raw.scale})};
 if(raw.kind==='raster')fit.asset=validateAsset(raw.asset);
 return fit;
}
export function validatePose(pose){
 object(pose,['grounded','blink','bob','stretch','legs','lift'],[],'pose');
 if(typeof pose.grounded!=='boolean'||typeof pose.blink!=='boolean')throw new Error('Invalid animation pose');
 for(const key of ['bob','stretch'])if(!Number.isFinite(pose[key]))throw new Error('Invalid animation pose');
 if(Math.abs(pose.bob)>20||pose.stretch<.5||pose.stretch>1.5)throw new Error('Invalid animation pose');
 for(const key of ['legs','lift'])if(!Array.isArray(pose[key])||pose[key].length!==4||pose[key].some(v=>!Number.isFinite(v)||Math.abs(v)>40))throw new Error('Invalid animation pose');
 return clone(pose);
}
function playback(raw){
 object(raw,['motion','playbackSpeed','height','pose'],[],'playback');
 if(!['ready','walk','jump'].includes(raw.motion)||!['.25','.5','1','0.25','0.5'].includes(String(raw.playbackSpeed)))throw new Error('Invalid playback settings');
 if(!Number.isFinite(raw.height)||raw.height<0||raw.height>150)throw new Error('Invalid jump height');
 return {motion:raw.motion,playbackSpeed:Number(raw.playbackSpeed),height:raw.height,pose:validatePose(raw.pose)};
}
// Returns a new complete draft only after every supplied field validates.
export function parseReview(data,catalog){
 const defaults=defaultFits(catalog),fits=clone(defaults);
 if(data?.version!==2){
  if(data?.version!==undefined)throw new Error('Unsupported review version');
  object(data,['asset','x','y','scale'],['status'],'legacy bowler');
  if(!catalog.items.some(item=>item.id==='bowler'&&item.category==='hat'&&item.fit))throw new Error('Legacy bowler is not in this catalog');
  fits.hat.bowler=validateFit('hat',{kind:'raster',asset:data.asset,x:data.x,y:data.y,scale:data.scale});
  return {fits,outfit:{...catalog.defaults,hat:'bowler'},selectedCategory:'hat',review:null};
 }
 object(data,['version','type','fits','outfit','selectedCategory','review'],['status','rendering'],'review');
 if(Object.hasOwn(data,'rendering')&&data.rendering!=='stable-ear-mask-v1')throw new Error('Invalid rendering candidate');
 if(data.type!=='luna-wardrobe-review')throw new Error('Not a Luna wardrobe review');
 object(data.fits,categories,[],'fits');
 for(const category of categories){
  const ids=Object.keys(defaults[category]);
  object(data.fits[category],legacyItems[category].filter(id=>ids.includes(id)),ids,'fits.'+category);
  for(const [id,raw] of Object.entries(data.fits[category])){
   const fit=validateFit(category,raw),item=catalog.items.find(item=>item.id===id&&item.category===category);
   if(fit.kind==='grid'&&item.art.kind!=='grid')throw new Error(`Grid artwork unavailable for ${id}`);
   fits[category][id]=fit;
  }
 }
 object(data.outfit,categories,[],'outfit');
 const outfit={};
 for(const category of categories){
  const id=data.outfit[category];
  if(!catalog.items.some(item=>item.category===category&&item.id===id))throw new Error(`Invalid ${category} selection`);
  outfit[category]=id;
 }
 if(typeof data.selectedCategory!=='string'||!Object.hasOwn(LIMITS,data.selectedCategory))throw new Error('Invalid editor category');
 return {fits,outfit,selectedCategory:data.selectedCategory,review:playback(data.review),...(data.rendering?{rendering:data.rendering}:{})};
}
export function createReview(draft,catalog){
 // Exports must contain all currently editable items, even if not selected.
 const defaults=defaultFits(catalog);
 for(const category of categories)for(const id of Object.keys(defaults[category]))if(!Object.hasOwn(draft.fits[category],id))throw new Error(`Missing export item ${id}`);
 const saved={version:2,type:'luna-wardrobe-review',status:'preview-awaiting-application',...clone(draft)};
 const parsed=parseReview(saved,catalog);
 return {version:saved.version,type:saved.type,status:saved.status,...parsed};
}
