import test from 'node:test';
import assert from 'node:assert/strict';
import {createWardrobe,recordTreats,restoreWardrobe,selectItem,ORIGINAL,ITEMS,CATEGORIES} from '../src/customisation.js';
import {createRun,step} from '../src/engine.js';

test('each reward unlocks at its own single-run milestone, exactly once',()=>{
 const wardrobe=createWardrobe();
 const milestones=[[30,'bowler'],[45,'star'],[60,'runners'],[75,'witch'],[90,'crown'],[105,'heels'],[120,'sandals'],[135,'skull']];
 for(const [target,id] of milestones){
  assert.deepEqual(recordTreats(wardrobe,target-1),[]);
  const item=ITEMS.find(item=>item.id===id);
  assert.equal(selectItem(wardrobe,item.category,id),false);
  assert.deepEqual(recordTreats(wardrobe,target).map(item=>item.id),[id]);
  assert.equal(selectItem(wardrobe,item.category,id),true);
  assert.deepEqual(recordTreats(wardrobe,target),[]);
 }
 assert.deepEqual(recordTreats(wardrobe,10),[]);assert.equal(wardrobe.bestTreats,135);
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
 assert.ok(selectItem(wardrobe,'hat','bowler'));assert.ok(selectItem(wardrobe,'mark','star'));assert.ok(selectItem(wardrobe,'shoes','runners'));
 assert.deepEqual(restoreWardrobe(JSON.stringify(wardrobe)),wardrobe);
 selectItem(wardrobe,'hat','none');
 assert.deepEqual(wardrobe.equipped,{hat:'none',mark:'star',shoes:'runners'});
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

test('a large single-run record reports rewards in milestone order',()=>{
 const wardrobe=createWardrobe();
 assert.deepEqual(recordTreats(wardrobe,135).map(item=>item.id),['bowler','star','runners','witch','crown','heels','sandals','skull']);
 assert.deepEqual(recordTreats(wardrobe,136),[]);
});
test('all 48 independent outfits survive saving, including removing accessories',()=>{
 const wardrobe=createWardrobe();recordTreats(wardrobe,135);
 const categories=Object.keys(CATEGORIES);
 let count=0;
 for(const hat of ITEMS.filter(item=>item.category==='hat')){
  for(const mark of ITEMS.filter(item=>item.category==='mark')){
   for(const shoes of ITEMS.filter(item=>item.category==='shoes')){
    const outfit={hat:hat.id,mark:mark.id,shoes:shoes.id};
    for(const category of categories)assert.ok(selectItem(wardrobe,category,outfit[category]));
    assert.deepEqual(restoreWardrobe(JSON.stringify(wardrobe)).equipped,outfit);count++;
   }
  }
 }
 assert.equal(count,48);
});
test('old boots saves migrate to runners without changing other choices or progress',()=>{
 const restored=restoreWardrobe(JSON.stringify({version:1,bestTreats:60,equipped:{hat:'bowler',mark:'star',shoes:'boots'}}));
 assert.equal(restored.bestTreats,60);
 assert.deepEqual(restored.equipped,{hat:'bowler',mark:'star',shoes:'runners'});
 assert.deepEqual(restoreWardrobe(JSON.stringify(restored)),restored);
 const locked=restoreWardrobe(JSON.stringify({version:1,bestTreats:30,equipped:{shoes:'boots'}}));
 assert.equal(locked.equipped.shoes,'bare');
});
