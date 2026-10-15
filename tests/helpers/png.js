// A real, near-limit PNG with valid chunks/CRCs, without stored binary artwork.
import {deflateSync} from 'node:zlib';
function chunk(type,data){
 const name=Buffer.from(type),content=Buffer.concat([name,data]);let crc=0xffffffff;
 for(const byte of content){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);content.copy(out,4);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;
}
export function nearLimitPng(){
 const width=1000,height=1300,header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
 const rows=Buffer.alloc(height*(width*3+1));
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:0})),chunk('IEND',Buffer.alloc(0))]);
}
