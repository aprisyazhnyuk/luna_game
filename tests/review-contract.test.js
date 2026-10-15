import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseReview,defaultFits,createReview,validateAsset} from '../src/wardrobe-review.js';
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const catalog=await read('../assets/cosmetics/catalog.json');
const legacy=await read('./fixtures/luna-v1/review-v2.json');
const png=await readFile(new URL('../assets/cosmetics/bowler.png',import.meta.url));
const withNew=()=>{const c=structuredClone(catalog);c.items.push({...structuredClone(c.items.find(i=>i.id==='bowler')),id:'new-hat',name:'New hat',fit:{x:850,y:390,scale:1},art:{kind:'png',asset:'assets/cosmetics/new-hat.png'}});return c;};
test('older v2 review retains later catalog items at applied defaults',()=>{
 const c=withNew(),restored=parseReview(legacy,c);
 assert.deepEqual(restored.fits.hat['new-hat'],{kind:'raster',asset:'assets/cosmetics/new-hat.png',x:850,y:390,scale:1});
 assert.equal(restored.fits.hat.bowler.x,817);
});
test('new items in catalogs without a bowler seed their own defaults and export generically',()=>{
 const c=withNew();c.items=c.items.filter(i=>i.id!=='bowler');
 const fits=defaultFits(c);assert.equal(fits.hat.bowler,undefined);
 const source=createReview({fits,outfit:c.defaults,selectedCategory:'hat',review:legacy.review},c);
 assert.deepEqual(parseReview(source,c).fits,fits);
});
test('all replacement bytes and unselected fits survive serialization and shared validation',()=>{
 const fits=defaultFits(catalog),asset='data:image/png;base64,'+png.toString('base64');
 fits.shoes.heels={kind:'raster',asset,x:7,y:8,scale:.2};fits.mark.star.x=615;
 const saved=createReview({fits,outfit:catalog.defaults,selectedCategory:'hat',review:legacy.review},catalog);
 const restored=parseReview(JSON.parse(JSON.stringify(saved)),catalog);
 assert.equal(restored.fits.mark.star.x,615);
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash(Buffer.from(restored.fits.shoes.heels.asset.split(',')[1],'base64')),hash(png));
});
test('unknown review entries or contradictory fit fields are rejected without changing defaults',()=>{
 const defaults=defaultFits(catalog);
 for(const corrupt of [r=>{r.fits.hat.typo={...r.fits.hat.bowler};},r=>{r.fits.hat.bowler.rotation=1;},r=>{r.fits.mark.star.asset='assets/cosmetics/bowler.png';},r=>{r.fits.tail={};},r=>{r.review.pose.extra=1;}]){
  const r=structuredClone(legacy);corrupt(r);assert.throws(()=>parseReview(r,catalog));
 }
 assert.equal(defaults.hat.bowler.x,817);
});
test('embedded PNG assets reject noncanonical base64, invalid headers and excessive dimensions',()=>{
 assert.equal(validateAsset('data:image/png;base64,'+png.toString('base64')),'data:image/png;base64,'+png.toString('base64'));
 const huge=Buffer.from(png);huge.writeUInt32BE(4097,16);
 for(const asset of ['data:image/png;base64,YWJjZA==','data:image/png;base64,AAA','data:image/png;base64,'+huge.toString('base64'),'assets//hat.png','concepts/./hat.png'])assert.throws(()=>validateAsset(asset));
});

test('near-limit valid PNGs survive upload/import/export validation without regex stack overflow',async()=>{
 const {nearLimitPng}=await import('./helpers/png.js');
 const bytes=nearLimitPng();assert.ok(bytes.length>3_900_000&&bytes.length<=4_000_000);
 const asset='data:image/png;base64,'+bytes.toString('base64'),fits=defaultFits(catalog);
 fits.hat.bowler={kind:'raster',asset,x:817,y:373,scale:.1};
 const saved=createReview({fits,outfit:catalog.defaults,selectedCategory:'hat',review:legacy.review},catalog);
 assert.equal(parseReview(saved,catalog).fits.hat.bowler.asset,asset);
});
test('editor category requires a primitive category ID',()=>{
 for(const selectedCategory of [['hat'],{toString:()=> 'hat'}])assert.throws(()=>parseReview({...legacy,selectedCategory},catalog));
});
