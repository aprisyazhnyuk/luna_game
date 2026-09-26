import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,jump,step,RULES} from '../src/engine.js';
const advance=(run,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)step(run,1/120);};
function running(){const r=createRun(()=>.5);r.phase='running';return r;}
test('jump clears the tallest obstacle and lands; midair tapping cannot double jump',()=>{
 const r=running();jump(r);advance(r,.2);const v=r.vy;jump(r);assert.equal(r.vy,v);
 advance(r,.16);assert.ok(r.y>80);advance(r,.6);assert.equal(r.y,0);assert.equal(r.vy,0);
});
test('a jump buffered just before landing starts on landing',()=>{
 const r=running();jump(r);advance(r,.86);jump(r);advance(r,.07);assert.ok(r.vy>350);
});
test('standing collisions consume one chance with a recovery period, then end at three',()=>{
 const r=running();
 for(let i=0;i<3;i++){
  r.invincible=0;r.obstacles=[{x:80,w:32,h:35,type:'box'}];step(r,1/120);assert.equal(r.chances,2-i);
  if(i<2){r.obstacles.push({x:80,w:32,h:35,type:'box'});step(r,1/120);assert.equal(r.chances,2-i);}
 }
 assert.equal(r.phase,'over');const d=r.distance;advance(r,2);assert.equal(r.distance,d);
});
test('an early hop clears a box and collects its bite',()=>{
 const r=running();r.obstacles=[{x:150,w:32,h:35,type:'box'}];r.bites=[{x:166,y:RULES.ground-110}];
 jump(r);advance(r,1);assert.equal(r.chances,3);assert.equal(r.treats,1);
});
test('a well-timed hop can collect the entire generated treat arch',()=>{
 const r=running();r.spawnIn=0;r.random=()=>.9;step(r,1/120);
 while(r.obstacles[0].x>150)step(r,1/120);
 jump(r);advance(r,1);assert.equal(r.chances,3);assert.equal(r.treats,3);
});
test('ready and paused games do not advance',()=>{
 const r=createRun();advance(r,5);assert.equal(r.distance,0);r.phase='paused';jump(r);advance(r,3);assert.equal(r.y,0);assert.equal(r.time,0);
});
test('physics is consistent at common display rates',()=>{
 const a=running(),b=running();jump(a);jump(b);for(let i=0;i<24;i++)step(a,1/60);for(let i=0;i<48;i++)step(b,1/120);
 assert.ok(Math.abs(a.y-b.y)<.001);assert.ok(Math.abs(a.distance-b.distance)<.001);
});
test('obstacles are spaced beyond jump and recovery duration; objects stay bounded',()=>{
 const r=running();let count=0;for(let i=0;i<120*600;i++){r.invincible=10;step(r,1/120);count=Math.max(count,r.obstacles.length);}
 assert.ok(count<=3);assert.ok(r.bites.length<=9);assert.equal(r.chances,3);
});
