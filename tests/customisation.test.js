import test from 'node:test';
import assert from 'node:assert/strict';
import {createWardrobe,recordTreats,restoreWardrobe,selectItem,ORIGINAL} from '../src/customisation.js';
import {createRun,step} from '../src/engine.js';

test('rewards unlock exactly at 30, 45 and 60 treats and are not repeated',()=>{
 const wardrobe=createWardrobe();
 assert.deepEqual(recordTreats(wardrobe,29),[]);
 assert.deepEqual(recordTreats(wardrobe,30).map(item=>item.id),['bowler']);
 assert.deepEqual(recordTreats(wardrobe,44),[]);
 assert.deepEqual(recordTreats(wardrobe,45).map(item=>item.id),['star']);
 assert.deepEqual(recordTreats(wardrobe,59),[]);
 assert.deepEqual(recordTreats(wardrobe,60).map(item=>item.id),['boots']);
 assert.deepEqual(recordTreats(wardrobe,60),[]);
 assert.deepEqual(recordTreats(wardrobe,10),[]);assert.equal(wardrobe.bestTreats,60);
});
test('separate runs cannot add up to an unlock; pause resumes the same run',()=>{
 const wardrobe=createWardrobe();
 for(const treats of [16,14,29])recordTreats(wardrobe,treats);
 assert.equal(wardrobe.bestTreats,29);assert.equal(selectItem(wardrobe,'hat','bowler'),false);
 const run=createRun();run.phase='running';run.treats=29;run.bites=[{x:94,y:280}];
 run.phase='paused';step(run,1/120);assert.equal(run.treats,29);
 run.phase='running';step(run,1/120);assert.equal(run.treats,30);
 assert.equal(recordTreats(wardrobe,run.treats)[0].id,'bowler');
 assert.equal(createRun().treats,0);
});
test('unlocks and independent combinations survive a saved game reload',()=>{
 const wardrobe=createWardrobe();recordTreats(wardrobe,60);
 assert.ok(selectItem(wardrobe,'hat','bowler'));assert.ok(selectItem(wardrobe,'mark','star'));assert.ok(selectItem(wardrobe,'shoes','boots'));
 assert.deepEqual(restoreWardrobe(JSON.stringify(wardrobe)),wardrobe);
 selectItem(wardrobe,'hat','none');
 assert.deepEqual(wardrobe.equipped,{hat:'none',mark:'star',shoes:'boots'});
 for(const [category,id] of Object.entries(ORIGINAL))assert.ok(selectItem(wardrobe,category,id));
 assert.equal(wardrobe.bestTreats,60);assert.deepEqual(wardrobe.equipped,ORIGINAL);
});
test('invalid saves and locked selections recover safely without erasing valid progress',()=>{
 for(const saved of [null,'broken','{}','{"version":2}', '{"version":1,"bestTreats":-50}'])assert.deepEqual(restoreWardrobe(saved),createWardrobe());
 const restored=restoreWardrobe('{"version":1,"bestTreats":30,"equipped":{"hat":"bowler","mark":"star","shoes":"unknown"}}');
 assert.equal(restored.bestTreats,30);assert.deepEqual(restored.equipped,{hat:'bowler',mark:'original',shoes:'bare'});
 assert.equal(selectItem(restored,'mark','star'),false);assert.equal(selectItem(restored,'hat','star'),false);
 for(const treats of [NaN,Infinity,-1,.5])assert.deepEqual(recordTreats(restored,treats),[]);
 assert.equal(restored.bestTreats,30);
});
