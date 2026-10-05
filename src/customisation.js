export const SAVE_KEY='luna.wardrobe.v1';
export const CATEGORIES=Object.freeze({hat:'Hats',mark:'Body marks',shoes:'Shoes'});
export const ITEMS=Object.freeze([
 {id:'none',category:'hat',name:'No hat',target:0},
 {id:'bowler',category:'hat',name:'Little bowler',target:30},
 {id:'original',category:'mark',name:'Luna’s mark',target:0},
 {id:'star',category:'mark',name:'Lucky star',target:45},
 {id:'bare',category:'shoes',name:'Bare paws',target:0},
 {id:'boots',category:'shoes',name:'Adventure boots',target:60}
]);
export const ORIGINAL=Object.freeze({hat:'none',mark:'original',shoes:'bare'});
export function createWardrobe(){return {version:1,bestTreats:0,equipped:{...ORIGINAL}};}
export function isUnlocked(wardrobe,item){return item.target<=wardrobe.bestTreats;}
export function selectItem(wardrobe,category,id){
 const item=ITEMS.find(item=>item.category===category&&item.id===id);
 if(!item||!isUnlocked(wardrobe,item))return false;
 wardrobe.equipped[category]=id;return true;
}
export function restoreWardrobe(saved){
 const wardrobe=createWardrobe();
 try {
  const data=JSON.parse(saved);
  if(data?.version!==1)return wardrobe;
  if(Number.isSafeInteger(data.bestTreats)&&data.bestTreats>=0)wardrobe.bestTreats=data.bestTreats;
  for(const category of Object.keys(CATEGORIES))selectItem(wardrobe,category,data.equipped?.[category]);
 } catch {}
 return wardrobe;
}
// This records a single run's count, never the sum of multiple runs. Keeping
// the maximum makes unlocks permanent even after a shorter run or restart.
export function recordTreats(wardrobe,treats){
 if(!Number.isSafeInteger(treats)||treats<=wardrobe.bestTreats)return [];
 const earned=ITEMS.filter(item=>item.target>wardrobe.bestTreats&&item.target<=treats);
 wardrobe.bestTreats=treats;return earned;
}
