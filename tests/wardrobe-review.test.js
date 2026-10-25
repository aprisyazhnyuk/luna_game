import {initializeCatalog} from './helpers/catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaultFits,clone,parseReview} from '../tools/wardrobe-preview/review-model.js';
import {lunaPose} from '../src/animation.js';
import {createRun} from '../src/engine.js';

await initializeCatalog();
const bowler=JSON.parse(await readFile(new URL('../assets/cosmetics/bowler.json',import.meta.url),'utf8'));
const catalog=JSON.parse(await readFile(new URL('../assets/cosmetics/catalog.json',import.meta.url)));
const defaults=defaultFits(catalog);
const bowlerPng=await readFile(new URL('../assets/cosmetics/bowler.png',import.meta.url));
function review(){
 return {version:2,type:'luna-wardrobe-review',fits:clone(defaults),outfit:{hat:'witch',shoes:'sandals',mark:'skull'},selectedCategory:'shoes',
  review:{motion:'ready',height:0,playbackSpeed:.5,pose:lunaPose(createRun(),0)}};
}
test('face candidate reviews preserve an explicit rendering variant; old reviews stay current',()=>{
 const source=review();
 for(const variant of ['stable-ear-mask-v1','stable-face-layer-v2']){source.rendering=variant;assert.equal(parseReview(source,catalog).rendering,variant);}
 assert.equal(parseReview(review(),catalog).rendering,undefined);
 for(const value of ['unknown',null,{},'current']){
  source.rendering=value;assert.throws(()=>parseReview(source,catalog),/rendering/i);
 }
});
test('one saved review retains edits to all nine items and the combined outfit',()=>{
 const source=review();
 for(const items of Object.values(source.fits))for(const fit of Object.values(items)){fit.x+=3;fit.y+=4;fit.scale+=.1;}
 const restored=parseReview(JSON.parse(JSON.stringify(source)),catalog);
 assert.deepEqual(restored.fits,source.fits);assert.deepEqual(restored.outfit,source.outfit);
 assert.deepEqual(restored.review,source.review);assert.equal(restored.selectedCategory,'shoes');
});
test('old bowler-only fit files still import without changing current defaults',()=>{
 const restored=parseReview({asset:bowler.asset,x:820,y:370,scale:1.9},catalog);
 assert.equal(restored.fits.hat.bowler.x,820);assert.deepEqual(restored.fits.shoes,defaults.shoes);
 assert.equal(defaults.hat.bowler.x,bowler.x);
});
test('replacement PNGs stay embedded and associated with their own item',()=>{
 const source=review(),asset='data:image/png;base64,'+bowlerPng.toString('base64');
 source.fits.shoes.sandals={kind:'raster',asset,x:0,y:0,scale:.1};
 const restored=parseReview(source,catalog);
 assert.equal(restored.fits.shoes.sandals.asset,asset);
 assert.deepEqual(restored.fits.shoes.runners,defaults.shoes.runners);
});
test('malformed or partial imports cannot mutate any existing fits',()=>{
 const original=clone(defaults);
 for(const corrupt of [r=>delete r.fits.mark.skull,r=>{r.fits.hat.crown.scale=0;},r=>{r.fits.shoes.heels.x=null;},r=>{r.outfit.shoes='unknown';},r=>{r.version=3;}]){
  const source=review();corrupt(source);assert.throws(()=>parseReview(source,catalog));assert.deepEqual(defaults,original);
 }
});
test('imports reject outside asset paths and malformed animation poses',()=>{
 for(const asset of ['https://example.com/hat.png','assets/../private.png','file:///tmp/hat.png','data:text/html;base64,abcd']){
  const source=review();source.fits.hat.bowler.asset=asset;assert.throws(()=>parseReview(source,catalog));
 }
 for(const corrupt of [r=>{r.review.pose.legs=[0];},r=>{r.review.pose.stretch=0;},r=>{r.review.height=NaN;},r=>{r.review.playbackSpeed=10;}]){
  const source=review();corrupt(source);assert.throws(()=>parseReview(source,catalog));
 }
});

test('a grid review cannot substitute unavailable grid art for an applied PNG',()=>{
 const source=review();source.fits.hat.bowler={kind:'grid',x:817,y:373,scale:1.91};
 assert.throws(()=>parseReview(source,catalog),/grid artwork/i);
});
