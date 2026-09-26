// Export the actual game sprite to SVG + sharp PNG icons. No extra packages.
import {writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {drawPixelLuna, PALETTE} from '../src/pixels.js';
const rectangles=[{x:0,y:0,w:512,h:512,color:PALETTE.W}];
const context={fillStyle:PALETTE.X,fillRect(x,y,w,h){rectangles.push({x:256+x*4,y:368+y*4,w:w*4,h:h*4,color:this.fillStyle});}};
drawPixelLuna(context,0,0,0,false,false);
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" shape-rendering="crispEdges">\n'+rectangles.map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.color}"/>`).join('\n')+'\n</svg>\n';
await writeFile(new URL('../assets/icon.svg',import.meta.url),svg);
function chunk(type,data){
 const name=Buffer.from(type),input=Buffer.concat([name,data]);let crc=0xffffffff;
 for(const byte of input){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 const length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(data.length);check.writeUInt32BE((crc^0xffffffff)>>>0);
 return Buffer.concat([length,name,data,check]);
}
for(const size of [192,512]){
 const stride=size*3+1,raw=Buffer.alloc(stride*size);
 for(const r of rectangles){
  const rgb=[1,3,5].map(i=>parseInt(r.color.slice(i,i+2),16));
  for(let y=Math.round(r.y*size/512);y<Math.round((r.y+r.h)*size/512);y++)
   for(let x=Math.round(r.x*size/512);x<Math.round((r.x+r.w)*size/512);x++)
    for(let channel=0;channel<3;channel++)raw[y*stride+1+x*3+channel]=rgb[channel];
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
 await writeFile(new URL(`../assets/icon-${size}.png`,import.meta.url),png);
}
console.log('Exported pixel Luna to SVG and 192/512px PNG icons.');
