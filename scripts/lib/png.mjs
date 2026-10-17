// Offline-tool validation only. Decode bounded scanlines, never rewrite PNG bytes.
import {inflateSync} from 'node:zlib';
import {validatePngBytes} from '../../src/cosmetic-model.js';
const table=Uint32Array.from({length:256},(_,value)=>{for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);return value>>>0;});
function crc(bytes){let value=0xffffffff;for(const byte of bytes)value=table[(value^byte)&255]^(value>>>8);return(value^0xffffffff)>>>0;}
function fail(message){throw new Error(`Invalid PNG: ${message}`);}
export function validatePng(input){
 const bytes=Buffer.from(input.buffer,input.byteOffset,input.byteLength),{width,height}=validatePngBytes(bytes);
 let offset=8,header=null,palette=null,transparency=false,ended=false,sawData=false,closedData=false;
 const data=[];
 while(offset<bytes.length){
  if(bytes.length-offset<12)fail('truncated chunk');
  const length=bytes.readUInt32BE(offset),end=offset+length+12;
  if(end>bytes.length)fail('truncated chunk data');
  const type=bytes.toString('latin1',offset+4,offset+8),body=bytes.subarray(offset+8,end-4);
  if(!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type))fail('chunk type');
  if(crc(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))fail(`${type} CRC`);
  if(!header&&type!=='IHDR')fail('IHDR must be first');
  if(['acTL','fcTL','fdAT'].includes(type))fail('animated artwork is unsupported; use a static PNG');
  if(type==='IHDR'){
   if(header||offset!==8||length!==13)fail('duplicate/invalid IHDR');
   header={depth:body[8],color:body[9],interlace:body[12]};
   const depths={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
   if(!depths[header.color]?.includes(header.depth)||body[10]!==0||body[11]!==0||header.interlace>1)fail('unsupported IHDR values');
  }else if(type==='PLTE'){
   if(palette||sawData||transparency||length===0||length%3||length>768||[0,4].includes(header.color))fail('palette/order');
   palette=length/3;if(header.color===3&&palette>2**header.depth)fail('palette size');
  }else if(type==='tRNS'){
   if(transparency||sawData)fail('transparency order');transparency=true;
   if(header.color===3?(!palette||length<1||length>palette):header.color===0?length!==2:header.color===2?length!==6:true)fail('transparency data');
   if(header.color!==3)for(let i=0;i<body.length;i+=2)if(body.readUInt16BE(i)>2**header.depth-1)fail('transparency sample');
  }else if(type==='IDAT'){
   if(closedData||(header.color===3&&!palette))fail('image data order');
   sawData=true;data.push(body);
  }else if(type==='IEND'){
   if(length||!sawData||end!==bytes.length)fail('IEND/trailing data');ended=true;offset=end;break;
  }else if(type[0]===type[0].toUpperCase())fail(`unknown critical chunk ${type}`);
  if(sawData&&type!=='IDAT')closedData=true;
  offset=end;
 }
 if(!ended)fail('missing IEND');
 const channels={0:1,2:3,3:1,4:2,6:4}[header.color],bits=channels*header.depth;
 const layout=header.interlace?[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]:[[0,0,1,1]];
 const passes=layout.map(([x,y,dx,dy])=>({w:Math.max(0,Math.ceil((width-x)/dx)),h:Math.max(0,Math.ceil((height-y)/dy))})).filter(p=>p.w&&p.h);
 const expected=passes.reduce((n,p)=>n+(Math.ceil(p.w*bits/8)+1)*p.h,0),compressed=Buffer.concat(data);
 let decoded;
 try{
  const result=inflateSync(compressed,{maxOutputLength:expected+1,info:true});decoded=result.buffer;
  if(result.engine.bytesWritten!==compressed.length)fail('extra compressed data');
 }catch(error){fail(`compressed stream: ${error.message}`);}
 if(decoded.length!==expected)fail('scanline size');
 let position=0;
 for(const {w,h} of passes){
  const size=Math.ceil(w*bits/8),pixelBytes=Math.max(1,Math.ceil(bits/8));
  let previous=Buffer.alloc(size),row=Buffer.alloc(size);
  for(let y=0;y<h;y++){
   const filter=decoded[position++];if(filter>4)fail('scanline filter');
   for(let x=0;x<size;x++){
    const raw=decoded[position++],a=x<pixelBytes?0:row[x-pixelBytes],b=previous[x],c=x<pixelBytes?0:previous[x-pixelBytes];
    let prediction=0;
    if(filter===1)prediction=a;else if(filter===2)prediction=b;else if(filter===3)prediction=Math.floor((a+b)/2);
    else if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);prediction=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
    row[x]=(raw+prediction)&255;
   }
   if(header.color===3)for(let x=0;x<w;x++){
    const bit=x*header.depth,index=(row[bit>>3]>>(8-header.depth-(bit%8)))&((1<<header.depth)-1);
    if(index>=palette)fail('palette index');
   }
   [row,previous]=[previous,row];
  }
 }
 return {width,height};
}
