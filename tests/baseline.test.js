import {initializeCatalog} from './helpers/catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,jump,step} from '../src/engine.js';
import {lunaPose} from '../src/animation.js';
import {restoreWardrobe} from '../src/customisation.js';
import {parseReview,defaultFits} from '../tools/wardrobe-preview/review-model.js';
await initializeCatalog();
const read=name=>readFile(new URL(`./fixtures/luna-v1/${name}.json`,import.meta.url),'utf8').then(JSON.parse);
const poses=await read('poses');
for(const fixture of poses)test(`recorded ${fixture.id} pose remains reproducible`,()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(lunaPose(fixture.run,fixture.animationTime))),fixture.pose);
});
for(const fixture of await read('saves'))test(`legacy save fixture: ${fixture.id}`,()=>{
 const actual=restoreWardrobe(fixture.saved);
 assert.equal(actual.bestTreats,fixture.expected.bestTreats);
 assert.deepEqual(actual.equipped,fixture.expected.equipped);
});
for(const fixture of await read('gameplay'))test(`fixed-step gameplay fixture: ${fixture.id}`,()=>{
 let seed=fixture.seed;const rng=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};
 const run=createRun(rng);run.phase='running';run.obstacles=structuredClone(fixture.obstacles);run.bites=structuredClone(fixture.bites);
 for(let i=0;i<fixture.ticks;i++){if(fixture.jumpAt.includes(i))jump(run);step(run,1/120);}
 for(const [key,value] of Object.entries(fixture.expected)){
  if(typeof value==='number')assert.ok(Math.abs(run[key]-value)<1e-9,`${key}: ${run[key]} versus ${value}`);
  else assert.equal(run[key],value);
 }
 if(fixture.expectedObstacleTypes)assert.deepEqual(run.obstacles.map(o=>o.type),fixture.expectedObstacleTypes);
});
test('legacy bowler and v2 fixture reviews reproduce their historical catalog fits',async()=>{
 const bowler=JSON.parse(await readFile(new URL('../assets/cosmetics/bowler.json',import.meta.url)));
 const catalog=await read('catalog');
 const defaults=defaultFits(catalog);
 assert.deepEqual(parseReview(await read('review-v2'),catalog).fits,defaults);
 const legacy=parseReview(await read('review-bowler'),catalog);
 assert.deepEqual({...legacy.fits.hat.bowler,asset:bowler.asset},defaults.hat.bowler);
 assert.deepEqual(legacy.fits.shoes,defaults.shoes);assert.deepEqual(legacy.fits.mark,defaults.mark);
 assert.deepEqual(await readFile(new URL('../'+legacy.fits.hat.bowler.asset,import.meta.url)),await readFile(new URL('../'+bowler.asset,import.meta.url)));
});
test('historical grid review rejects retired witch art; legacy bowler keeps current defaults',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../assets/cosmetics/catalog.json',import.meta.url)));
 const historical=await read('review-v2');
 assert.throws(()=>parseReview(historical,catalog),/Grid artwork unavailable for witch/);
 const legacy=parseReview(await read('review-bowler'),catalog);
 assert.deepEqual(legacy.fits.hat.witch,defaultFits(catalog).hat.witch);
});
