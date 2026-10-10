import {RULES} from './engine.js';
import {drawHat,drawMark,drawShoes} from './cosmetics.js';
import {ORIGINAL} from './customisation.js';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t*t*(3-2*t); };
const mix = (a,b,t) => a+(b-a)*t;

// A separate visual clock lets Luna blink while waiting to start. No animation
// consumes the obstacle RNG or changes the collision box / jump trajectory.
export function blinkAt(time) {
 const cycle = Math.floor(time/5);
 const noise = Math.sin((cycle+1)*78.233)*43758.5453;
 const start = 2.5+(noise-Math.floor(noise))*1.8;
 const elapsed = time-cycle*5-start;
 return elapsed>=0 && elapsed<.16;
}

export function lunaPose(run,time=run.time,reducedMotion=false) {
 const pose = {bob:0,stretch:1,grounded:run.y===0&&run.vy===0,blink:!reducedMotion&&blinkAt(time),legs:[0,0,0,0],lift:[0,0,0,0]};
 if (reducedMotion) return pose;
 if (run.y>0 || run.vy>0) {
  const age = Math.max(0,run.time-(run.jumpTime??run.time));
  const reaching = ease((.18-run.y/Math.max(1,-run.vy))/.18);
  // Front paws fold immediately; hind paws finish the push 70 ms later.
  const front = ease(age/.10),hind = ease((age-.07)/.12);
  const landing = run.vy<0 ? reaching : 0;
  const hindLanding = ease((landing-.3)/.7);
  pose.legs = [mix(-.75*hind,.12,hindLanding),mix(-.9*hind,-.1,hindLanding),mix(.9*front,-.22,landing),mix(.75*front,-.1,landing)];
  pose.lift = [mix(2*hind,0,hindLanding),mix(3*hind,1,hindLanding),mix(3*front,0,landing),mix(2*front,0,landing)];
  pose.stretch = 1+.035*ease(age/.1)*(1-landing);
  return pose;
 }
 if (run.phase!=='ready') {
  // Diagonal pairs alternate. The planted half sweeps back with the ground;
  // the returning half lifts, so this reads as steps rather than foot shuffling.
  const cycle = run.time*RULES.speed/84;
  const offsets = [.5,0,0,.5]; // hind far, hind near, front far, front near
  offsets.forEach((offset,i)=>{
   const p = (cycle+offset)%1;
   pose.legs[i] = p<.6 ? mix(-.38,.38,p/.6) : mix(.38,-.38,ease((p-.6)/.4));
   pose.lift[i] = p<.6 ? 0 : Math.sin((p-.6)/.4*Math.PI)*3;
  });
  pose.bob = -Math.abs(Math.sin(cycle*Math.PI*2))*1.2;
  const landed = run.landTime===null ? 1 : ease((run.time-run.landTime)/.14);
  pose.stretch = mix(.92,1,landed);
 }
 return pose;
}

// Source-space masks rig the supplied illustration; the PNG stays intact.
// Draw far paws, near paws, then the torso to hide the moving hip seams.
const LEGS = [
 {hip:[546,817],foot:[550,961],outline:[[514,806],[579,806],[579,862],[560,866],[560,901],[600,916],[605,961],[508,961],[489,930],[489,875],[505,840]]},
 {hip:[432,812],foot:[436,969],outline:[[415,781],[463,781],[510,815],[504,850],[470,879],[451,906],[479,925],[479,969],[395,969],[376,944],[376,835]]},
 {hip:[848,818],foot:[873,954],outline:[[827,798],[869,813],[869,899],[909,915],[913,954],[842,954],[817,923],[815,849]]},
 {hip:[769,807],foot:[790,975],outline:[[731,786],[800,786],[832,807],[814,851],[814,919],[833,932],[830,975],[762,975],[743,950],[730,870],[715,850],[715,823]]}
];
const BODY = [[132,320],[1152,320],[1152,815],[884,815],[869,807],[858,792],[828,792],[828,809],[749,809],[749,795],[732,795],[716,830],[658,830],[658,815],[578,815],[578,800],[536,800],[518,827],[481,846],[451,864],[419,841],[418,780],[132,780]];
function path(c,points) {c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
export function drawImageLuna(c,image,x,y,pose,outfit=ORIGINAL) {
 c.save();
 c.translate(Math.round(x-44),Math.round(y-54+pose.bob));
 c.scale(86/970,54/605);
 // Squash/stretch is anchored at the ground rather than at the ears.
 c.translate(0,605);c.scale(1,pose.stretch);c.translate(-132,-975);
 // A small belly underlay bridges the cutout seams as the hips move.
 c.fillStyle='#42443f';c.fillRect(545,799,186,34);
 c.fillStyle='#f7f7f2';c.fillRect(533,783,208,35);
 for(let i=0;i<LEGS.length;i++) {
  const leg=LEGS[i];c.save();
  const foot=leg.foot;
  const dx=foot[0]-leg.hip[0],dy=foot[1]-leg.hip[1],angle=pose.legs[i];
  const planted=pose.grounded ? dy-Math.sin(angle)*dx-Math.cos(angle)*dy-pose.bob*605/54 : 0;
  c.translate(leg.hip[0],leg.hip[1]+planted-pose.lift[i]*605/54);
  c.rotate(pose.legs[i]);c.translate(-leg.hip[0],-leg.hip[1]);
  c.save();path(c,leg.outline);c.clip();c.drawImage(image,0,0);c.restore();
  drawShoes(c,leg,i,outfit.shoes);c.restore();
 }
 c.save();path(c,BODY);c.clip();c.drawImage(image,0,0);c.restore();
 drawMark(c,image,outfit.mark,pose.stretch);
 if(pose.blink) {
  // Cover only the visible eye, using the surrounding white face colour.
  c.fillStyle='#f7f7f2';c.fillRect(1015,551,49,59);
  c.fillStyle='#42443f';c.fillRect(1019,583,38,12);
 }
 drawHat(c,outfit.hat,image);
 c.restore();
}
