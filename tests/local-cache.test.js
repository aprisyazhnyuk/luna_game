import test from 'node:test';
import assert from 'node:assert/strict';
import {isLocalhost,clearGameCache} from '../src/local-cache.js';

test('development hosts are distinguished from hosted game addresses',()=>{
 for(const host of ['localhost','127.0.0.1','::1','[::1]'])assert.ok(isLocalhost(host));
 for(const host of ['example.com','localhost.example.com','luna.test'])assert.equal(isLocalhost(host),false);
});
test('cleanup removes only this game’s workers and caches, and signals a controlled page reload',async()=>{
 const scope='http://127.0.0.1:8080/luna/',unregistered=[];
 const workers={controller:{scriptURL:scope+'sw.js'},getRegistrations:async()=>[
  {scope,unregister:async()=>unregistered.push(scope)},
  {scope:'http://127.0.0.1:8080/other/',unregister:async()=>unregistered.push('other')}
 ]};
 const keys=new Set([`luna-${scope}-v5`,`luna-${scope}-v7`,'another-app','luna-http://127.0.0.1:8080/other/-v5']);
 const caches={keys:async()=>[...keys],delete:async key=>keys.delete(key)};
 assert.equal(await clearGameCache(scope,workers,caches),true);
 assert.deepEqual(unregistered,[scope]);assert.deepEqual([...keys],['another-app','luna-http://127.0.0.1:8080/other/-v5']);
});
test('a fresh local session does not need to reload, including without worker support',async()=>{
 assert.equal(await clearGameCache('http://localhost:8080/',undefined,undefined),false);
 const workers={controller:null,getRegistrations:async()=>[]};
 assert.equal(await clearGameCache('http://localhost:8080/',workers,{keys:async()=>[]}),false);
});
