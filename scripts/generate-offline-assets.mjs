#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateInventory,readInventoryFile,parseInventory} from './lib/offline-inventory.mjs';
try{
 const args=process.argv.slice(2);let root=fileURLToPath(new URL('../',import.meta.url)),mode=null;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--root'){if(!args[i+1])throw new Error('Missing root');root=resolve(args[++i]);}
  else if(['--check','--write'].includes(args[i])&&!mode)mode=args[i];else throw new Error('Usage: generate-offline-assets.mjs [--root DIR] --check|--write');
 }
 if(!mode)throw new Error('Choose --check or --write');
 const bytes=await generateInventory({read:path=>readInventoryFile(root,path)}),target=join(root,'offline-assets.js');
 let current=null;try{current=await readInventoryFile(root,'offline-assets.js');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!current?.equals(bytes)){
  if(mode==='--check')throw new Error('Offline inventory is stale; run node scripts/generate-offline-assets.mjs --write');
  const temp=target+'.tmp';await fs.writeFile(temp,bytes,{flag:'wx'});try{await fs.rename(temp,target);}catch(error){await fs.unlink(temp);throw error;}
 }
 console.log(`Offline inventory ${mode==='--check'?'verified':'generated'}: ${parseInventory(bytes).files.length} resources, ${parseInventory(bytes).cacheKey}`);
}catch(error){console.error(`Offline inventory failed: ${error.message}`);process.exitCode=1;}
