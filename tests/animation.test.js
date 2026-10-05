import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,jump,step} from '../src/engine.js';
import {blinkAt,lunaPose} from '../src/animation.js';
const advance=(run,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)step(run,1/120);};
function running(){const run=createRun(()=>.5);run.phase='running';return run;}

test('front paws lift before the hind paws; all four tuck during flight',()=>{
 const run=running();jump(run);advance(run,.025);
 const takeoff=lunaPose(run);
 assert.ok(takeoff.lift[2]>0&&takeoff.lift[3]>0);
 assert.equal(takeoff.lift[0],0);assert.equal(takeoff.lift[1],0);
 advance(run,.2);
 assert.ok(lunaPose(run).lift.every(value=>value>0));
});
test('front paws reach down before landing and the landing squash recovers',()=>{
 const run=running();jump(run);advance(run,.45);const tucked=lunaPose(run);
 advance(run,.43);const reaching=lunaPose(run);
 assert.ok(reaching.lift[2]<tucked.lift[2]);assert.ok(reaching.legs[2]<0);
 advance(run,.04);assert.equal(run.y,0);assert.ok(lunaPose(run).stretch<1);
 advance(run,.16);assert.equal(lunaPose(run).stretch,1);
});
test('paused animation holds the same pose and does not consume gameplay randomness',()=>{
 const run=running();run.time=.48;
 run.random=()=>{throw new Error('Animation must not consume gameplay RNG');};
 const pose=lunaPose(run,3.1);run.phase='paused';
 assert.deepEqual(lunaPose(run,3.1),pose);
});
test('idle blinking is brief and spaced apart; reduced motion holds a neutral pose',()=>{
 for(let cycle=0;cycle<8;cycle++) {
  let blinkFrames=0;
  for(let i=0;i<500;i++)if(blinkAt(cycle*5+i/100))blinkFrames++;
  assert.ok(blinkFrames>=15&&blinkFrames<=17);
 }
 const run=running();jump(run);advance(run,.2);
 const pose=lunaPose(run,3.1,true);
 assert.deepEqual(pose.legs,[0,0,0,0]);assert.equal(pose.bob,0);assert.equal(pose.blink,false);
});
