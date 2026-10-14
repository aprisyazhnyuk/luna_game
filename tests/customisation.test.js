import {initializeCatalog} from './helpers/catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWardrobe,recordTreats,restoreWardrobe,selectItem,ORIGINAL,ITEMS,CATEGORIES,LEGACY_TARGETS} from '../src/customisation.js';
import {createRun,step} from '../src/engine.js';

await initializeCatalog();
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

test('earned-ID saves survive a threshold increase and reordering after reload',()=>{
 const wardrobe=createWardrobe();recordTreats(wardrobe,60);selectItem(wardrobe,'shoes','runners');
 assert.equal(wardrobe.version,2);
 assert.deepEqual(wardrobe.unlocked,['none','original','bare','bowler','star','runners']);
 const revised=[...ITEMS].reverse().map(item=>({...item,target:item.id==='runners'?600:item.target}));
 const restored=restoreWardrobe(JSON.stringify(wardrobe),revised);
 assert.ok(restored.unlocked.includes('runners'));assert.equal(restored.equipped.shoes,'runners');
 assert.ok(selectItem(restored,'shoes','runners',revised));
 assert.deepEqual(restoreWardrobe(JSON.stringify(restored),revised),restored);
});

test('legacy migration uses historical thresholds before revised catalog targets',()=>{
 const revised=ITEMS.map(item=>({...item,target:item.id==='bowler'?300:item.target}));
 const restored=restoreWardrobe('{"version":1,"bestTreats":30,"equipped":{"hat":"bowler"}}',revised);
 assert.ok(restored.unlocked?.includes('bowler'));assert.equal(restored.equipped.hat,'bowler');
 assert.equal(restored.bestTreats,30);
});

test('lowered targets grant rewards from the best single run without accumulating runs',()=>{
 const wardrobe=createWardrobe();recordTreats(wardrobe,29);
 const revised=ITEMS.map(item=>({...item,target:item.id==='runners'?25:item.target}));
 assert.deepEqual(recordTreats(wardrobe,10,revised).map(item=>item.id),['runners']);
 assert.equal(wardrobe.bestTreats,29);assert.deepEqual(recordTreats(wardrobe,20,revised),[]);
 assert.ok(selectItem(wardrobe,'shoes','runners',revised));
 const loaded=restoreWardrobe(JSON.stringify(createWardrobe()),revised);
 assert.equal(selectItem(loaded,'shoes','runners',revised),false);
});

test('version 2 recovers independently valid progress, earned IDs and equipped fields',()=>{
 const restored=restoreWardrobe(JSON.stringify({version:2,bestTreats:'invalid',unlocked:['bowler',null,'bowler','unknown-valid-id','../../bad','boots'],equipped:{hat:'bowler',mark:'skull',shoes:'boots'}}));
 assert.equal(restored.bestTreats,0);assert.equal(restored.equipped.hat,'bowler');assert.equal(restored.equipped.shoes,'runners');
 assert.equal(restored.equipped.mark,'original');assert.ok(restored.unlocked?.includes('unknown-valid-id'));
 assert.equal(restored.unlocked.filter(id=>id==='bowler').length,1);
 assert.equal(restored.unlocked.includes('../../bad'),false);
 const missingList=restoreWardrobe('{"version":2,"bestTreats":60,"unlocked":"bad","equipped":{"hat":"bowler","shoes":"runners"}}');
 assert.equal(missingList.equipped.hat,'bowler');assert.equal(missingList.equipped.shoes,'runners');
});

test('original look leaves earned IDs intact after reward targets increase',()=>{
 const wardrobe=createWardrobe();recordTreats(wardrobe,135);const before=[...wardrobe.unlocked];
 for(const [category,id] of Object.entries(ORIGINAL))selectItem(wardrobe,category,id);
 assert.deepEqual(wardrobe.unlocked,before);
 const revised=ITEMS.map(item=>({...item,target:item.target?1000:0}));
 assert.ok(selectItem(restoreWardrobe(JSON.stringify(wardrobe),revised),'hat','crown',revised));
});

test('storage reads prefer version 2 and preserve the legacy key',async()=>{
 const {loadWardrobe}=await import('../src/customisation.js');assert.equal(typeof loadWardrobe,'function');
 const legacy='{"version":1,"bestTreats":135,"equipped":{"hat":"crown","mark":"skull","shoes":"sandals"}}';
 const current='{"version":2,"bestTreats":30,"unlocked":["bowler"],"equipped":{"hat":"bowler","mark":"original","shoes":"bare"}}';
 const values=new Map([['luna.wardrobe.v1',legacy],['luna.wardrobe.v2',current]]);
 const storage={getItem:key=>values.get(key)??null,setItem:()=>{throw new Error('Load must not write');}};
 assert.equal(loadWardrobe(storage).bestTreats,30);assert.equal(loadWardrobe(storage).equipped.hat,'bowler');
 values.set('luna.wardrobe.v2','broken');assert.equal(loadWardrobe(storage).bestTreats,135);
 values.delete('luna.wardrobe.v2');assert.equal(loadWardrobe(storage).equipped.hat,'crown');
 assert.equal(values.get('luna.wardrobe.v1'),legacy);
});


test('frozen migration targets match the historical fixture, independent of current items',async()=>{
 const old=JSON.parse(await readFile(new URL('./fixtures/luna-v1/historical-items.json',import.meta.url)));
 assert.deepEqual(LEGACY_TARGETS,Object.fromEntries(old.map(item=>[item.id,item.target])));
});

test('all recorded legacy saves migrate to explicit version 2 fixtures idempotently',async()=>{
 const legacy=JSON.parse(await readFile(new URL('./fixtures/luna-v1/saves.json',import.meta.url)));
 const migrated=JSON.parse(await readFile(new URL('./fixtures/luna-v2/migrations.json',import.meta.url)));
 for(const fixture of legacy){
  const expected=migrated[fixture.id],actual=restoreWardrobe(fixture.saved);
  assert.deepEqual(actual,expected,fixture.id);
  assert.deepEqual(restoreWardrobe(JSON.stringify(actual)),expected,fixture.id);
 }
});

test('a temporarily missing earned item remains earned when it returns',()=>{
 const saved=JSON.stringify({version:2,bestTreats:30,unlocked:['bowler','future-hat'],equipped:{hat:'bowler'}});
 const absent=restoreWardrobe(saved);assert.ok(absent.unlocked.includes('future-hat'));
 assert.equal(selectItem(absent,'hat','future-hat'),false);
 const items=[...ITEMS,{id:'future-hat',category:'hat',name:'Future hat',target:1000}];
 const returned=restoreWardrobe(JSON.stringify(absent),items);
 assert.ok(selectItem(returned,'hat','future-hat',items));
});

test('reload grants newly lowered targets and new items from the existing single-run record',()=>{
 const saved=JSON.stringify({version:2,bestTreats:29,unlocked:['none','original','bare'],equipped:{hat:'none',mark:'original',shoes:'bare'}});
 const revised=[...ITEMS.map(item=>({...item,target:item.id==='runners'?25:item.target})),{id:'new-hat',category:'hat',name:'New hat',target:20}];
 const restored=restoreWardrobe(saved,revised);
 assert.ok(selectItem(restored,'shoes','runners',revised));assert.ok(selectItem(restored,'hat','new-hat',revised));
 assert.equal(restored.bestTreats,29);assert.deepEqual(recordTreats(restored,29,revised),[]);
});

test('an unavailable storage API reports the error to its caller',async()=>{
 const {loadWardrobe}=await import('../src/customisation.js');
 assert.throws(()=>loadWardrobe({getItem:()=>{throw new Error('Storage unavailable');}}),/Storage unavailable/);
});

test('an empty version 2 shell cannot hide a valid legacy save',async()=>{
 const {loadWardrobe}=await import('../src/customisation.js');
 const values={'luna.wardrobe.v2':'{"version":2}', 'luna.wardrobe.v1':'{"version":1,"bestTreats":60,"equipped":{"hat":"bowler","shoes":"boots"}}'};
 const restored=loadWardrobe({getItem:key=>values[key]??null});
 assert.equal(restored.bestTreats,60);assert.equal(restored.equipped.hat,'bowler');assert.equal(restored.equipped.shoes,'runners');
});
