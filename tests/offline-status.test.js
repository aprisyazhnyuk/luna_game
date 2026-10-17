import test from 'node:test';
import assert from 'node:assert/strict';
import {setupOffline} from '../src/offline.js';
class Worker extends EventTarget{
 constructor(state,ready=true){super();this.state=state;this.ready=ready;}
 postMessage(data,ports){ports[0].postMessage({type:'LUNA_OFFLINE_STATUS',ready:this.ready,cacheKey:'test-generation'});}
 change(state){this.state=state;this.dispatchEvent(new Event('statechange'));}
}
function registration({active=null,installing=null,waiting=null}={}){const reg=new EventTarget();return Object.assign(reg,{active,installing,waiting});}
test('first-install failure reports unavailable instead of waiting forever on navigator.ready',async()=>{
 const worker=new Worker('installing'),reg=registration({installing:worker}),statuses=[];
 await setupOffline({register:async()=>reg},text=>statuses.push(text));
 assert.match(statuses.at(-1),/Preparing/);worker.change('redundant');assert.match(statuses.at(-1),/unavailable/);assert.equal(statuses.some(s=>s==='Ready for offline adventures'),false);
});
test('offline readiness requires a completed-cache response, not registration alone',async()=>{
 for(const ready of [false,true]){const reg=registration({active:new Worker('activated',ready)}),statuses=[];
  await setupOffline({register:async(_url,options)=>{assert.equal(options.updateViaCache,'none');return reg;}},text=>statuses.push(text));
  assert.equal(statuses.at(-1)==='Ready for offline adventures',ready);
 }
});
test('downloaded waiting update reports close-windows; failed update never reports new readiness',async()=>{
 const active=new Worker('activated'),waiting=new Worker('installed'),reg=registration({active,waiting}),statuses=[];
 await setupOffline({register:async()=>reg},text=>statuses.push(text));assert.match(statuses.at(-1),/close.*Luna windows/i);
 const newer=new Worker('installing');reg.waiting=null;reg.installing=newer;reg.dispatchEvent(new Event('updatefound'));assert.match(statuses.at(-1),/Preparing/);
 newer.change('redundant');assert.match(statuses.at(-1),/previous version|unavailable/i);assert.notEqual(statuses.at(-1),'Ready for offline adventures');
});
test('registration failure and unresponsive workers report a bounded failure',async()=>{
 const statuses=[];await setupOffline({register:async()=>{throw new Error('denied');}},text=>statuses.push(text));assert.match(statuses.at(-1),/unavailable/);
 const silent=new Worker('activated');silent.postMessage=()=>{};await setupOffline({register:async()=>registration({active:silent})},text=>statuses.push(text),{timeoutMs:5});assert.match(statuses.at(-1),/unavailable/);
});
