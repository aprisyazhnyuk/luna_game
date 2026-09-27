import {RULES} from './engine.js';
import {PALETTE, PIXEL, stamp, BOX, YARN, drawPixelLuna} from './pixels.js';
export {drawPixelLuna as drawLuna} from './pixels.js';
const snap=value=>Math.round(value/PIXEL)*PIXEL;
function block(c,x,y,w,h,color=PALETTE.X){c.fillStyle=color;c.fillRect(snap(x),snap(y),w,h);}
export function draw(c,run,reducedMotion=false,lunaImage=null) {
 c.clearRect(0,0,390,380);c.imageSmoothingEnabled=false;
 const offset=snap(run.time*RULES.speed);
 block(c,0,RULES.ground,390,2,PALETTE.G);
 for(let i=0;i<12;i++){
  const x=((i*38-offset)%456+456)%456-30;
  block(c,x,314+(i%3)*8,i%2?6:2,2,PALETTE.L);
  if(i%4===0)block(c,x+12,304,4,2,PALETTE.G);
 }
 for(const o of run.obstacles){
  const sprite=o.type==='box'?BOX:YARN;
  stamp(c,sprite,snap(o.x),RULES.ground-sprite.length*PIXEL);
  if(o.type==='yarn'){block(c,o.x+26,298,10,2);block(c,o.x+34,296,4,2);}
 }
 for(const b of run.bites){block(c,b.x-2,b.y-2,4,4);}
 c.save();
 // A brief on/off blink keeps recovery readable without introducing gray blur.
 if(run.invincible===0||reducedMotion||Math.floor(run.time*10)%2===0){
  if(lunaImage?.complete&&lunaImage.naturalWidth>0){
   // Crop the transparent margins at draw time; keep the owner's artwork intact.
   const running=run.phase==='running'&&run.y===0;
   const bob=!reducedMotion&&running&&Math.floor(run.time*9)%2===1?-2:0;
   c.drawImage(lunaImage,132,370,970,605,snap(RULES.catX-44),snap(RULES.ground-run.y-54+bob),86,54);
  }else drawPixelLuna(c,RULES.catX,RULES.ground-run.y,run.time,run.phase==='running',run.y>0);
 }
 c.restore();
 for(const p of run.particles){
  block(c,p.x-4,p.y,2,2,PALETTE.G);block(c,p.x+4,p.y,2,2,PALETTE.G);
  block(c,p.x,p.y-4,2,2,PALETTE.G);block(c,p.x,p.y+4,2,2,PALETTE.G);
 }
}
