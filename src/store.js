import {CATEGORIES,ITEMS,ORIGINAL,isUnlocked,selectItem} from './customisation.js';
import {drawImageLuna,lunaPose} from './animation.js';
import {createRun} from './engine.js';
import {drawPixelLuna} from './pixels.js';

export function createStore(wardrobe,image,onChange,onOpen){
 const $=id=>document.getElementById(id),dialog=$('store'),buttons=[],tabs=new Map(),panels=new Map();
 const categories=Object.keys(CATEGORIES);
 let activeCategory=categories[0];
 function showCategory(category){
  activeCategory=category;
  for(const [id,tab] of tabs){
   const selected=id===category;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
   panels.get(id).hidden=!selected;
  }
  $('store-items').scrollTop=0;
 }
 for(const [category,title] of Object.entries(CATEGORIES)){
  const tab=document.createElement('button');tab.type='button';tab.className='category-tab';tab.id=`tab-${category}`;
  tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`panel-${category}`);tab.textContent=title;
  tab.addEventListener('click',()=>showCategory(category));
  tab.addEventListener('keydown',event=>{
   const index=categories.indexOf(category);
   const next=event.key==='ArrowRight'?(index+1)%categories.length:event.key==='ArrowLeft'?(index+categories.length-1)%categories.length:event.key==='Home'?0:event.key==='End'?categories.length-1:null;
   if(next===null)return;
   event.preventDefault();showCategory(categories[next]);tabs.get(categories[next]).focus();
  });
  tabs.set(category,tab);$('store-categories').append(tab);
  const group=document.createElement('fieldset');group.className='cosmetic-group';
  group.id=`panel-${category}`;group.setAttribute('role','tabpanel');group.setAttribute('aria-labelledby',tab.id);
  const legend=document.createElement('legend');legend.className='sr-only';legend.textContent=title;group.append(legend);
  const options=document.createElement('div');options.className='cosmetic-options';group.append(options);
  for(const item of ITEMS.filter(item=>item.category===category)){
   const button=document.createElement('button');button.type='button';button.className='cosmetic-option';
   button.dataset.category=category;button.dataset.item=item.id;
   button.append(document.createTextNode(item.name));
   const status=document.createElement('span');button.append(status);
   button.addEventListener('click',()=>{if(selectItem(wardrobe,category,item.id)){onChange();refresh();}});
   buttons.push({button,status,item});options.append(button);
  }
  panels.set(category,group);$('store-items').append(group);
 }
 showCategory(activeCategory);
 function preview(){
  const canvas=$('outfit-preview'),c=canvas.getContext('2d');
  c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  c.save();c.scale(2,2);
  const pose=lunaPose(createRun(),0,true);
  if(image.complete&&image.naturalWidth>0)drawImageLuna(c,image,64,78,pose,wardrobe.equipped);
  else drawPixelLuna(c,64,78,0,false,false);
  c.fillStyle='#d7d9d0';c.fillRect(16,79,106,1);c.restore();
  const summary=ITEMS.filter(item=>wardrobe.equipped[item.category]===item.id).map(item=>item.name).join(' · ');
  $('outfit-summary').textContent=summary;canvas.setAttribute('aria-label',`Outfit preview: ${summary}`);
 }
 function refresh(){
  for(const {button,status,item} of buttons){
   const unlocked=isUnlocked(wardrobe,item),selected=wardrobe.equipped[item.category]===item.id;
   button.disabled=!unlocked;button.setAttribute('aria-pressed',String(selected));
   status.textContent=selected?'Selected':unlocked?'Available':`${item.target} treats in one run`;
  }
  const next=ITEMS.filter(item=>!isUnlocked(wardrobe,item)).sort((a,b)=>a.target-b.target)[0];
  $('next-reward').textContent=next?`${next.name} · ${wardrobe.bestTreats} / ${next.target} treats`:'Every reward unlocked!';
  $('unlock-progress').max=next?.target??Math.max(...ITEMS.map(item=>item.target));$('unlock-progress').value=wardrobe.bestTreats;
  $('unlock-progress').setAttribute('aria-label',next?`Progress toward ${next.name}`:'All rewards unlocked');
  $('treat-record').textContent=`Best in one run: ${wardrobe.bestTreats} treats`;
  preview();
 }
 $('open-store').addEventListener('click',()=>{onOpen();refresh();dialog.showModal();$('open-store').classList.remove('has-reward');});
 const close=()=>dialog.close();
 $('close-store').addEventListener('click',close);$('done-store').addEventListener('click',close);
 $('original-look').addEventListener('click',()=>{wardrobe.equipped={...ORIGINAL};onChange();refresh();});
 image.addEventListener('load',()=>{if(dialog.open)preview();});
 refresh();return {refresh};
}
