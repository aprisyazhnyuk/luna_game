import {PALETTE,stamp} from './pixels.js';
import {EAR,HATS,SHOES,MARKS} from './cosmetic-art.js';
import {getRasterHat} from './cosmetic-assets.js';

const rasters=new Map();
function sprite(c,rows,x,y,size){
 let raster=rasters.get(rows);
 if(!raster){
  raster=document.createElement('canvas');raster.width=rows[0].length;raster.height=rows.length;
  stamp(raster.getContext('2d'),rows,0,0,1);rasters.set(rows,raster);
 }
 c.drawImage(raster,x,y,raster.width*size,raster.height*size);
}

// Hats share the torso transform. Smaller ears emerge through slots, leaving
// the crown and band visible instead of covering the whole accessory.
export function drawHat(c,hat,override){
 const raster=override?.image?override:override?.fit?.kind==='grid'?null:getRasterHat(hat);
 if(raster){
  const image=raster.image,fit=override?.fit??raster.fit;
  c.drawImage(image,fit.x,fit.y,image.width*fit.scale,image.height*fit.scale);return;
 }
 const design=HATS[hat];if(!design)return;
 const fit=override?.fit??{x:design.x,y:design.y,scale:1};
 const x=fit.x,y=fit.y,size=design.size*fit.scale;
 sprite(c,design.rows,x,y,size);
 for(const [dx,dy,earSize] of design.ears){
  const scale=size/12,earX=x+dx*scale,earY=y+dy*scale,tipSize=earSize*scale;
  c.fillStyle=PALETTE.X;c.fillRect(earX-tipSize,earY+6*tipSize,8*tipSize,2*tipSize);
  sprite(c,EAR,earX,earY,tipSize);
 }
}

// Called inside each paw's rotation, so all four shoes follow the gait.
export function drawShoes(c,leg,shoes,override){
 const design=SHOES[shoes];if(!design)return;
 const fit=override?.fit??{x:0,y:0,scale:1};
 const [x,y]=leg.foot;
 if(override?.image){
  const image=override.image,w=image.width*fit.scale,h=image.height*fit.scale;
  c.drawImage(image,x+fit.x-w/2,y+fit.y-h,w,h);return;
 }
 const {rows}=design,size=design.size*fit.scale;
 sprite(c,rows,x+fit.x-rows[0].length*size/2,y+fit.y-rows.length*size,size);
}

export function drawMark(c,mark,stretch,override){
 // Cover the old patch only within the white flank, and counter landing squash
 // so the emblems retain their proportions.
 c.fillStyle=PALETTE.W;c.beginPath();
 const mask=[[522,677],[531,666],[589,666],[604,686],[620,666],[680,666],[694,683],[694,726],[669,742],[669,789],[646,808],[562,808],[544,789],[544,741],[522,726]];
 mask.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
 const fit=override?.fit??{x:604,y:730,scale:1};
 c.save();c.translate(fit.x,fit.y);c.scale(1,1/stretch);c.translate(-fit.x,-fit.y);
 if(override?.image){
  const image=override.image,w=image.width*fit.scale,h=image.height*fit.scale;
  c.drawImage(image,fit.x-w/2,fit.y-h/2,w,h);
 }else{
  const design=MARKS[mark]??MARKS.original,{rows}=design,size=design.size*fit.scale;
  sprite(c,rows,fit.x-rows[0].length*size/2,fit.y-rows.length*size/2,size);
 }
 c.restore();
}
