import {PALETTE,stamp} from './pixels.js';
import {getCosmeticItem,getCosmeticSnapshot} from './cosmetic-assets.js';

const rasters=new WeakMap();
function sprite(c,rows,x,y,size,palette){
 let sprites=rasters.get(palette);
 if(!sprites){sprites=new Map();rasters.set(palette,sprites);}
 let raster=sprites.get(rows);
 if(!raster){
  raster=document.createElement('canvas');raster.width=rows[0].length;raster.height=rows.length;
  stamp(raster.getContext('2d'),rows,0,0,1,palette);sprites.set(rows,raster);
 }
 c.drawImage(raster,x,y,raster.width*size,raster.height*size);
}
// Merge isolated studio fits/PNGs with the same applied artwork/policy as game.
export function resolveCosmetic(category,id,override){
 const base=getCosmeticItem(category,id),item=override?.art?override:base;
 if(!item||item.art.kind==='none')return null;
 const fit=override?.fit??item.fit;
 if(fit.kind==='grid'&&item.art.kind!=='grid')throw new Error(`Grid artwork unavailable for ${id}`);
 const snapshot=getCosmeticSnapshot();
 return {...item,...override,fit,image:fit.kind==='grid'?undefined:override?.image??item.image,
  palette:override?.palette??snapshot?.catalog.palette??PALETTE,
  earRows:override?.earRows??snapshot?.catalog.earRows};
}

export function drawHat(c,id,override){
 const item=resolveCosmetic('hat',id,override);if(!item)return;
 const {fit,image,art,palette}=item;
 if(image){c.drawImage(image,fit.x,fit.y,image.width*fit.scale,image.height*fit.scale);return;}
 const size=art.size*fit.scale;
 sprite(c,art.rows,fit.x,fit.y,size,palette);
 for(const [dx,dy,earSize] of art.ears??[]){
  const scale=size/12,earX=fit.x+dx*scale,earY=fit.y+dy*scale,tipSize=earSize*scale;
  c.fillStyle=palette.X;c.fillRect(earX-tipSize,earY+6*tipSize,8*tipSize,2*tipSize);
  sprite(c,item.earRows,earX,earY,tipSize,palette);
 }
}

// Called inside each paw transform, for grid and PNG art alike.
export function drawShoes(c,leg,id,override){
 const item=resolveCosmetic('shoes',id,override);if(!item)return;
 const {fit,image,art,palette}=item,[x,y]=leg.foot;
 if(image){
  const w=image.width*fit.scale,h=image.height*fit.scale;
  c.drawImage(image,x+fit.x-w/2,y+fit.y-h,w,h);return;
 }
 const size=art.size*fit.scale;
 sprite(c,art.rows,x+fit.x-art.rows[0].length*size/2,y+fit.y-art.rows.length*size,size,palette);
}

export function drawMark(c,id,stretch,override){
 const item=resolveCosmetic('mark',id,override);if(!item)return;
 // The character's flank mask stays fixed; emblem geometry belongs to the item.
 c.fillStyle=PALETTE.W;c.beginPath();
 const mask=[[522,677],[531,666],[589,666],[604,686],[620,666],[680,666],[694,683],[694,726],[669,742],[669,789],[646,808],[562,808],[544,789],[544,741],[522,726]];
 mask.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
 const {fit,image,art,palette}=item;
 c.save();
 if(item.attachment.counterStretch){c.translate(fit.x,fit.y);c.scale(1,1/stretch);c.translate(-fit.x,-fit.y);}
 if(image){
  const w=image.width*fit.scale,h=image.height*fit.scale;
  c.drawImage(image,fit.x-w/2,fit.y-h/2,w,h);
 }else{
  const size=art.size*fit.scale;
  sprite(c,art.rows,fit.x-art.rows[0].length*size/2,fit.y-art.rows.length*size/2,size,palette);
 }
 c.restore();
}
