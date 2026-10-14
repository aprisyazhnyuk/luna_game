export const SAVE_KEY='luna.wardrobe.v2';
export const LEGACY_SAVE_KEY='luna.wardrobe.v1';
export const CATEGORIES=Object.freeze({hat:'Hats',mark:'Body marks',shoes:'Shoes'});
export const ITEMS=Object.freeze([
 {id:'none',category:'hat',name:'No hat',target:0},
 {id:'bowler',category:'hat',name:'Little bowler',target:30},
 {id:'witch',category:'hat',name:'Witch hat',target:75},
 {id:'crown',category:'hat',name:'Crown',target:90},
 {id:'original',category:'mark',name:'Mickey',target:0},
 {id:'star',category:'mark',name:'Lucky star',target:45},
 {id:'skull',category:'mark',name:'Skull and bones',target:135},
 {id:'bare',category:'shoes',name:'Bare paws',target:0},
 {id:'heels',category:'shoes',name:'High heels',target:105},
 {id:'runners',category:'shoes',name:'Runners',target:60},
 {id:'sandals',category:'shoes',name:'Sandals',target:120}
]);
export const ORIGINAL=Object.freeze({hat:'none',mark:'original',shoes:'bare'});
// Historical compatibility data must not follow future catalog reward changes.
export const LEGACY_TARGETS=Object.freeze({none:0,bowler:30,witch:75,crown:90,original:0,star:45,skull:135,bare:0,heels:105,runners:60,sandals:120});
const LEGACY_ALIASES=Object.freeze({boots:'runners'});
const canonicalID=id=>typeof id==='string'&&Object.hasOwn(LEGACY_ALIASES,id)?LEGACY_ALIASES[id]:id;
const validID=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(id)&&!['constructor','prototype'].includes(id);
export function createWardrobe(items=ITEMS){
 return {version:2,bestTreats:0,unlocked:items.filter(item=>item.target===0).map(item=>item.id),equipped:{...ORIGINAL}};
}
export function isUnlocked(wardrobe,item){return item.target===0||wardrobe.unlocked.includes(item.id);}
export function selectItem(wardrobe,category,id,items=ITEMS){
 const item=items.find(item=>item.category===category&&item.id===id);
 if(!item||!isUnlocked(wardrobe,item))return false;
 wardrobe.equipped[category]=id;return true;
}
function parseSaved(saved){
 try{const data=JSON.parse(saved);return data&&(data.version===1||data.version===2)?data:null;}catch{return null;}
}
export function restoreWardrobe(saved,items=ITEMS){
 const wardrobe=createWardrobe(items),data=parseSaved(saved);
 if(!data)return wardrobe;
 if(Number.isSafeInteger(data.bestTreats)&&data.bestTreats>=0)wardrobe.bestTreats=data.bestTreats;
 const earned=new Set(wardrobe.unlocked);
 if(data.version===1){
  for(const [id,target] of Object.entries(LEGACY_TARGETS).sort((a,b)=>a[1]-b[1]))if(target<=wardrobe.bestTreats)earned.add(id);
 }else if(Array.isArray(data.unlocked)){
  // Retain safe IDs missing from today's catalog, for removal/readdition or rollback.
  for(const raw of data.unlocked){const id=canonicalID(raw);if(validID(id))earned.add(id);}
 }
 wardrobe.unlocked=[...earned];
 // A lower/new target can grant a reward from the best single-run record.
 recordTreats(wardrobe,wardrobe.bestTreats,items);
 for(const category of Object.keys(CATEGORIES))selectItem(wardrobe,category,canonicalID(data.equipped?.[category]),items);
 return wardrobe;
}
// Read-only: the app saves the migrated v2 result, leaving v1 intact for rollback.
// Storage errors propagate so the UI can explain session-only persistence.
export function loadWardrobe(storage,items=ITEMS){
 const current=storage.getItem(SAVE_KEY);
 const data=parseSaved(current);
 if(data?.version===2&&((Number.isSafeInteger(data.bestTreats)&&data.bestTreats>=0)||Array.isArray(data.unlocked)))return restoreWardrobe(current,items);
 return restoreWardrobe(storage.getItem(LEGACY_SAVE_KEY),items);
}
// Never sum separate runs or revoke earned IDs. Report each new reward once.
export function recordTreats(wardrobe,treats,items=ITEMS){
 if(!Number.isSafeInteger(treats)||treats<0)return [];
 wardrobe.bestTreats=Math.max(wardrobe.bestTreats,treats);
 const earned=items.filter(item=>!isUnlocked(wardrobe,item)&&item.target<=wardrobe.bestTreats).sort((a,b)=>a.target-b.target);
 wardrobe.unlocked.push(...earned.map(item=>item.id));return earned;
}
