import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {validatePng} from '../scripts/lib/png.mjs';
import {nearLimitPng} from './helpers/png.js';
const bowler=await readFile(new URL('../assets/cosmetics/bowler.png',import.meta.url));
function crc(bytes){let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return(value^0xffffffff)>>>0;}
function chunk(type,bytes){const b=Buffer.alloc(bytes.length+12);b.writeUInt32BE(bytes.length);b.write(type,4);bytes.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,-4)),b.length-4);return b;}
function make({width=1,height=1,depth=8,color=6,interlace=0,rows=Buffer.from([0,255,0,0,255]),extra=[],compressed}={}){
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=depth;header[9]=color;header[12]=interlace;
 return Buffer.concat([bowler.subarray(0,8),chunk('IHDR',header),...extra,chunk('IDAT',compressed??deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
test('full PNG validation accepts exact approved art and a near-limit valid PNG',()=>{
 const result=validatePng(bowler);assert.ok(result.width>0&&result.height>0);assert.deepEqual(bowler,Buffer.from(bowler));
 assert.deepEqual(validatePng(nearLimitPng()),{width:1000,height:1300});
});
test('CRC, truncated/trailing bytes, unsupported critical chunks and animations fail',()=>{
 const bad=Buffer.from(bowler);bad[45]^=1;
 for(const bytes of [bad,bowler.subarray(0,-1),Buffer.concat([bowler,Buffer.from([0])]),make({extra:[chunk('ABCD',Buffer.alloc(0))]}),make({extra:[chunk('acTL',Buffer.alloc(8))]})])assert.throws(()=>validatePng(bytes));
});
test('bounded inflate rejects bombs, wrong scanline counts, bad filters and extra zlib data',()=>{
 for(const png of [make({rows:Buffer.alloc(1_000_000)}),make({rows:Buffer.from([0])}),make({rows:Buffer.from([5,1,2,3,4])}),make({compressed:Buffer.concat([deflateSync(Buffer.from([0,1,2,3,4])),Buffer.from([1])])})])assert.throws(()=>validatePng(png));
});
test('palette indices, low/16-bit samples and Adam7 passes are decoded with bounds',()=>{
 assert.deepEqual(validatePng(make({color:3,depth:1,rows:Buffer.from([0,0]),extra:[chunk('PLTE',Buffer.from([0,0,0]))]})),{width:1,height:1});
 assert.throws(()=>validatePng(make({color:3,depth:1,rows:Buffer.from([0,128]),extra:[chunk('PLTE',Buffer.from([0,0,0]))]})));
 assert.deepEqual(validatePng(make({color:0,depth:16,rows:Buffer.from([0,255,255])})),{width:1,height:1});
 assert.deepEqual(validatePng(make({interlace:1})),{width:1,height:1});
 assert.throws(()=>validatePng(make({color:3,depth:16})));
});

test('all five scanline filters reconstruct palette indices, including the last Adam7 pass',()=>{
 for(let filter=0;filter<=4;filter++){
  const rows=Buffer.from([filter,0,1,filter,1,filter===0?0:255]);
  const extra=[chunk('PLTE',Buffer.from([0,0,0,255,255,255]))];
  assert.deepEqual(validatePng(make({width:2,height:2,color:3,rows,extra})),{width:2,height:2});
  rows[1]=3;assert.throws(()=>validatePng(make({width:2,height:2,color:3,rows,extra})),/palette index/);
 }
 // 9x9 indexed Adam7: scanline byte totals 6+4+4+9+12+25+40=100.
 const rows=Buffer.alloc(100),extra=[chunk('PLTE',Buffer.from([0,0,0]))];
 assert.deepEqual(validatePng(make({width:9,height:9,color:3,interlace:1,rows,extra})),{width:9,height:9});
 rows[99]=1;assert.throws(()=>validatePng(make({width:9,height:9,color:3,interlace:1,rows,extra})),/palette index/);
});

test('chunk names cannot smuggle high-bit bytes through ASCII decoding',()=>{
 const png=make(),length=png.readUInt32BE(33);png[37]|=128;
 png.writeUInt32BE(crc(png.subarray(37,41+length)),41+length);
 assert.throws(()=>validatePng(png),/chunk type/);
});

test('transparency samples and optional palettes obey their order and sample depth',()=>{
 assert.throws(()=>validatePng(make({color:2,rows:Buffer.from([0,0,0,0]),extra:[chunk('tRNS',Buffer.alloc(6)),chunk('PLTE',Buffer.from([0,0,0]))]})),/palette|order/);
 assert.throws(()=>validatePng(make({color:0,depth:1,rows:Buffer.from([0,0]),extra:[chunk('tRNS',Buffer.from([0,2]))]})),/transparency/);
});
