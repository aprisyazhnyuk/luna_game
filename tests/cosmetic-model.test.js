import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalog,validateFit,validateAssetPath,validatePngMetadata,validateReviewByteLength} from '../src/cosmetic-model.js';
import {HATS,SHOES,MARKS,EAR} from '../src/cosmetic-art.js';
const ORIGINAL={hat:'none',mark:'original',shoes:'bare'};
const ITEMS=JSON.parse(await readFile(new URL('./fixtures/luna-v1/historical-items.json',import.meta.url)));
import {PALETTE} from '../src/pixels.js';
const catalog=JSON.parse(await readFile(new URL('../assets/cosmetics/catalog.json',import.meta.url)));
const copy=()=>structuredClone(catalog);

test('tailored grid ears require their underlay color, but other art permits renamed palettes',()=>{
 const source=copy();
 source.palette.Z=source.palette.X;delete source.palette.X;
 source.earRows=source.earRows.map(row=>row.replaceAll('X','Z'));
 for(const item of source.items)if(item.art.rows)item.art.rows=item.art.rows.map(row=>row.replaceAll('X','Z'));
 assert.throws(()=>validateCatalog(source),/ear underlay color/);
 for(const item of source.items)if(item.art.ears)item.art.ears=[];
 assert.doesNotThrow(()=>validateCatalog(source));
});

test('catalog preserves the current metadata, grids, ears, applied fits and attachment behavior',()=>{
 const valid=validateCatalog(catalog);
 assert.deepEqual(valid.defaults,ORIGINAL);assert.deepEqual(valid.palette,PALETTE);assert.deepEqual(valid.earRows,EAR);
 assert.deepEqual(valid.items.map(({id,category,name,target})=>({id,category,name,target})),ITEMS);
 assert.equal(valid.items.filter(item=>item.art.kind!=='none').length,9);
 for(const item of valid.items){
  if(item.art.kind!=='none'){
   const want=item.category==='hat'?{earMaskY:476}:item.category==='shoes'?{pawClip:item.id==='heels'?24:0}:{counterStretch:true};
   assert.deepEqual(item.attachment,want);
  }
  if(item.art.kind==='grid'){
   const art=({hat:HATS,shoes:SHOES,mark:MARKS})[item.category][item.id];
   assert.deepEqual(item.art.rows,art.rows);assert.equal(item.art.size,art.size);
   if(item.category==='hat'){
    assert.deepEqual(item.art.ears,art.ears);
    assert.deepEqual(item.fit,{x:art.x,y:art.y,scale:1});
   }else assert.deepEqual(item.fit,item.category==='shoes'?{x:0,y:0,scale:1}:{x:604,y:730,scale:1});
  }
 }
 assert.deepEqual(valid.items.find(item=>item.id==='bowler').fit,{x:817,y:373,scale:1.91});
 assert.equal(valid.items.find(item=>item.id==='heels').attachment.pawClip,24);
 assert.equal(valid.items.find(item=>item.id==='witch').attachment.earMaskY,476);
 assert.deepEqual(valid.items.find(item=>item.id==='original').fit,{x:604,y:730,scale:1});
});

test('a new PNG item in each existing category needs only data',()=>{
 for(const category of ['hat','shoes','mark']){
  const source=copy(),base=source.items.find(item=>item.category===category&&item.art.kind!=='none');
  source.items.push({...structuredClone(base),id:'new-item',name:'New item',art:{kind:'png',asset:'assets/cosmetics/new-item.png'}});
  assert.equal(validateCatalog(source).items.at(-1).id,'new-item');
 }
});

test('validated snapshots cannot mutate inputs or one another',()=>{
 const source=copy(),valid=validateCatalog(source),next=validateCatalog(source);
 source.items[1].fit.x=900;
 assert.equal(valid.items[1].fit.x,817);assert.equal(next.items[1].fit.x,817);
 assert.throws(()=>{valid.items[1].fit.x=900;},TypeError);
 assert.throws(()=>{valid.items.push({});},TypeError);
});

const corruptions=[
 ['unsupported version',s=>{s.version=2;}],
 ['unknown root field',s=>{s.extra=true;}],
 ['duplicate ID',s=>{s.items[2].id='bowler';}],
 ['unsafe ID',s=>{s.items[2].id='__proto__';}],
 ['unknown category',s=>{s.items[2].category='tail';}],
 ['negative target',s=>{s.items[2].target=-1;}],
 ['fractional target',s=>{s.items[2].target=.5;}],
 ['invalid name',s=>{s.items[2].name='';}],
 ['invalid default category',s=>{s.defaults.hat='star';}],
 ['locked default',s=>{s.defaults.hat='bowler';}],
 ['empty item with fit',s=>{s.items[0].fit={x:500,y:400,scale:1};}],
 ['empty item with target',s=>{s.items[0].target=1;}],
 ['empty item with mask',s=>{s.items[0].attachment={earMaskY:476};}],
 ['unknown item field',s=>{s.items[1].special=true;}],
 ['wrong attachment category',s=>{s.items[1].attachment={pawClip:24};}],
 ['nonfinite mask',s=>{s.items[1].attachment.earMaskY=Infinity;}],
 ['negative clip',s=>{s.items[8].attachment.pawClip=-1;}],
 ['disabled mark compensation',s=>{s.items[4].attachment.counterStretch=false;}],
 ['empty grid',s=>{s.items[2].art.rows=[];}],
 ['ragged grid',s=>{s.items[2].art.rows[0]='X';}],
 ['unmapped palette',s=>{s.items[2].art.rows[0]='?'.repeat(28);}],
 ['bad color',s=>{s.palette.X='red';}],
 ['bad ear tuples',s=>{s.items[2].art.ears=[[1,2]];}],
 ['negative ear size',s=>{s.items[2].art.ears[0][2]=-1;}],
 ['zero grid size',s=>{s.items[2].art.size=0;}],
 ['grid path contradiction',s=>{s.items[2].art.asset='assets/a.png';}],
 ['missing fit',s=>{delete s.items[1].fit;}],
 ['outside fit bounds',s=>{s.items[1].fit.x=349;}],
 ['unknown fit field',s=>{s.items[1].fit.rotation=1;}],
 ['unsupported artwork',s=>{s.items[1].art.kind='svg';}]
];
for(const [name,corrupt] of corruptions)test(`catalog rejects ${name} without mutating input`,()=>{
 const source=copy();corrupt(source);const before=structuredClone(source);
 assert.throws(()=>validateCatalog(source));assert.deepEqual(source,before);
});

test('fit bounds accept endpoints and reject wrong types and unknown categories',()=>{
 for(const [category,fit] of [['hat',{x:350,y:-150,scale:.01}],['shoes',{x:-150,y:150,scale:4}],['mark',{x:850,y:900,scale:3}]])assert.deepEqual(validateFit(category,fit),fit);
 for(const fit of [{x:500,y:400,scale:0},{x:500,y:400,scale:NaN},{x:'500',y:400,scale:1},{x:500,y:Infinity,scale:1}])assert.throws(()=>validateFit('hat',fit));
 assert.throws(()=>validateFit('tail',{x:500,y:400,scale:1}));
});

test('active asset paths are portable local PNG paths with no traversal or encoding ambiguity',()=>{
 assert.equal(validateAssetPath('assets/cosmetics/my hat.png'),'assets/cosmetics/my hat.png');
 for(const path of ['assets/../a.png','assets//a.png','assets/./a.png','/assets/a.png','https://host/a.png','concepts/a.png','assets/%2e%2e/a.png','assets/a.png?x','assets/a\\b.png','data:image/png;base64,abcd','assets/a.png/','assets/a.jpg'])assert.throws(()=>validateAssetPath(path),path);
});

test('PNG metadata limits allow studio maxima and reject excess or invalid dimensions',()=>{
 assert.doesNotThrow(()=>validatePngMetadata({byteLength:4_000_000,width:4096,height:4096}));
 for(const value of [{byteLength:4_000_001,width:1,height:1},{byteLength:1,width:4097,height:1},{byteLength:1,width:0,height:1},{byteLength:1,width:1.5,height:1},{byteLength:NaN,width:1,height:1}])assert.throws(()=>validatePngMetadata(value));
});

test('total review input allows nine maximum-size embedded images with bounded overhead',()=>{
 const encoded=9*(4*Math.ceil(4_000_000/3)+'data:image/png;base64,'.length);
 assert.doesNotThrow(()=>validateReviewByteLength(encoded+1_000_000));
 assert.doesNotThrow(()=>validateReviewByteLength(56_000_000));
 for(const size of [56_000_001,-1,NaN,.5])assert.throws(()=>validateReviewByteLength(size));
});

test('fit validation rejects category values that only coerce to a valid string',()=>{
 for(const category of [['hat'],new String('hat'),{toString:()=> 'hat'}])assert.throws(()=>validateFit(category,{x:500,y:400,scale:1}));
});
