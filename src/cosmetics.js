import {PALETTE,stamp} from './pixels.js';

const HAT=[
 '....XXXXXXXX....',
 '...XGGGGGGGGX...',
 '..XGGGGGGGGGGX..',
 '..XGGGGGGGGGGX..',
 '..XWWWWWWWWWWX..',
 'XXXXXXXXXXXXXXXX',
 '.XXXXXXXXXXXXXX.'
];
const STAR=[
 '.....GG.....',
 '.....GG.....',
 '....GGGG....',
 'GGGGGGGGGGGG',
 '.GGGGGGGGGG.',
 '..GGGGGGGG..',
 '...GGGGGG...',
 '..GGGGGGGG..',
 '..GGG..GGG..',
 '.GGG....GGG.'
];
const rasters=new Map();
function sprite(c,rows,x,y,size){
 let raster=rasters.get(rows);
 if(!raster){
  raster=document.createElement('canvas');raster.width=rows[0].length;raster.height=rows.length;
  stamp(raster.getContext('2d'),rows,0,0,1);rasters.set(rows,raster);
 }
 c.drawImage(raster,x,y,raster.width*size,raster.height*size);
}
// All attachment coordinates use the same native image space as the rig.
// The hat and mark sit on the torso; shoes are drawn inside each paw transform.
export function drawHat(c,hat){if(hat==='bowler')sprite(c,HAT,866,288,15);}
export function drawShoes(c,leg,index,shoes){
 if(shoes!=='boots')return;
 const [x,y]=leg.foot;
 c.fillStyle=PALETTE.X;c.fillRect(x-34,y-37,68,37);
 c.fillRect(x-20,y-52,42,20);
 c.fillStyle=index===0||index===2?PALETTE.G:PALETTE.L;
 c.fillRect(x-20,y-26,44,14);
 c.fillStyle=PALETTE.W;c.fillRect(x-12,y-45,26,9);
}
export function drawMark(c,image,mark,stretch){
 // Cover the original patch within its white flank. The replacement layer
 // counters torso squash/stretch, keeping the emblem's proportions stable.
 c.fillStyle=PALETTE.W;c.beginPath();
 const mask=[[522,677],[531,666],[589,666],[604,686],[620,666],[680,666],[694,683],[694,726],[669,742],[669,789],[646,808],[562,808],[544,789],[544,741],[522,726]];
 mask.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
 c.save();c.translate(604,726);c.scale(1,1/stretch);c.translate(-604,-726);
 if(mark==='star')sprite(c,STAR,531,657,12);
 else c.drawImage(image,522,650,174,148,522,650,174,148);
 c.restore();
}
