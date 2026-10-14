import {HATS,SHOES,MARKS} from '../../src/cosmetic-art.js';
import {ITEMS} from '../../src/customisation.js';

export const LIMITS=Object.freeze({
 hat:{x:[350,1250],y:[-150,700],scale:[.01,4]},
 shoes:{x:[-150,150],y:[-150,150],scale:[.01,4]},
 mark:{x:[400,850],y:[550,900],scale:[.01,3]}
});
export const clone=value=>JSON.parse(JSON.stringify(value));
export const itemName=(category,id)=>ITEMS.find(item=>item.category===category&&item.id===id)?.name??id;
export function defaultFits(bowler){
 return {
  hat:Object.fromEntries(Object.entries(HATS).map(([id,art])=>[id,id==='bowler'
   ?{kind:'raster',asset:bowler.asset,x:bowler.x,y:bowler.y,scale:bowler.scale}
   :{kind:'grid',x:art.x,y:art.y,scale:1}])),
  shoes:Object.fromEntries(Object.keys(SHOES).map(id=>[id,{kind:'grid',x:0,y:0,scale:1}])),
  mark:Object.fromEntries(Object.keys(MARKS).map(id=>[id,{kind:'grid',x:604,y:730,scale:1}]))
 };
}
export function validateAsset(asset){
 if(typeof asset!=='string')throw new Error('Missing PNG asset');
 if(asset.startsWith('data:image/png;base64,')&&asset.length<8_000_000&&/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(asset))return asset;
 if(/^(assets|concepts)\/[A-Za-z0-9_./ -]+\.png$/.test(asset)&&!asset.split('/').includes('..'))return asset;
 throw new Error('Use a project PNG or an embedded PNG');
}
export function validateFit(category,raw){
 if(!raw||!['grid','raster'].includes(raw.kind))throw new Error(`Invalid ${category} artwork type`);
 const fit={kind:raw.kind};
 for(const key of ['x','y','scale']){
  const [min,max]=LIMITS[category][key],value=raw[key];
  if(!Number.isFinite(value)||value<min||value>max)throw new Error(`Invalid ${category} ${key}`);
  fit[key]=value;
 }
 if(fit.kind==='raster')fit.asset=validateAsset(raw.asset);
 return fit;
}
export function validatePose(pose){
 if(!pose||typeof pose.grounded!=='boolean'||typeof pose.blink!=='boolean')throw new Error('Invalid animation pose');
 for(const key of ['bob','stretch'])if(!Number.isFinite(pose[key]))throw new Error('Invalid animation pose');
 if(Math.abs(pose.bob)>20||pose.stretch<.5||pose.stretch>1.5)throw new Error('Invalid animation pose');
 for(const key of ['legs','lift'])if(!Array.isArray(pose[key])||pose[key].length!==4||pose[key].some(v=>!Number.isFinite(v)||Math.abs(v)>40))throw new Error('Invalid animation pose');
 return clone(pose);
}
// Parse completely before committing a draft; failed imports cannot erase edits.
export function parseReview(data,defaults){
 if(data?.version!==2){
  // Support the owner's original bowler downloads.
  if(data?.version!==undefined)throw new Error('Unsupported review version');
  const fits=clone(defaults);
  fits.hat.bowler=validateFit('hat',{...data,kind:'raster'});
  return {fits,outfit:{hat:'bowler',mark:'original',shoes:'bare'},selectedCategory:'hat',review:null};
 }
 if(data.type!=='luna-wardrobe-review')throw new Error('Not a Luna wardrobe review');
 const fits={};
 for(const [category,items] of Object.entries(defaults)){
  fits[category]={};
  for(const id of Object.keys(items))fits[category][id]=validateFit(category,data.fits?.[category]?.[id]);
 }
 const outfit={};
 for(const category of ['hat','mark','shoes']){
  const id=data.outfit?.[category];
  if(!ITEMS.some(item=>item.category===category&&item.id===id))throw new Error(`Invalid ${category} selection`);
  outfit[category]=id;
 }
 if(!Object.hasOwn(LIMITS,data.selectedCategory))throw new Error('Invalid editor category');
 const raw=data.review;
 if(!raw||!['ready','walk','jump'].includes(raw.motion)||!['.25','.5','1','0.25','0.5'].includes(String(raw.playbackSpeed)))throw new Error('Invalid playback settings');
 if(!Number.isFinite(raw.height)||raw.height<0||raw.height>150)throw new Error('Invalid jump height');
 return {fits,outfit,selectedCategory:data.selectedCategory,review:{
  motion:raw.motion,playbackSpeed:Number(raw.playbackSpeed),height:raw.height,pose:validatePose(raw.pose)
 }};
}
