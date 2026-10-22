import {mkdtemp,mkdir,cp,readFile,writeFile,readdir,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateCatalog} from '../../src/cosmetic-model.js';
import {defaultFits} from '../../src/wardrobe-review.js';
export const project=fileURLToPath(new URL('../../',import.meta.url));
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function hashes(root){const result={};for(const entry of await readdir(root,{recursive:true,withFileTypes:true}))if(entry.isFile()){const path=join(entry.parentPath,entry.name);result[relative(root,path)]=hash(await readFile(path));}return result;}
export async function sandbox(t){
 const root=await realpath(await mkdtemp(join(tmpdir(),'luna-review-')));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const name of ['src','assets'])await cp(join(project,name),join(root,name),{recursive:true});
 for(const name of ['index.html','style.css','manifest.webmanifest','PRIVACY.md','CREDITS.md','LICENSE','offline-assets.js'])await cp(join(project,name),join(root,name));
 await mkdir(join(root,'assets'),{recursive:true});await cp(join(project,'assets/cosmetics'),join(root,'assets/cosmetics'),{recursive:true});await cp(join(project,'sw.js'),join(root,'sw.js'));
 await mkdir(join(root,'concepts/reviews'),{recursive:true});
 const review=join(root,'concepts/reviews/fit.json'),preview=join(root,'concepts/reviews/preview.png');
 const data=JSON.parse(await readFile(join(project,'tests/fixtures/luna-v1/review-v2.json'))),png=await readFile(join(project,'assets/cosmetics/bowler.png'));
 data.fits=defaultFits(validateCatalog(JSON.parse(await readFile(join(root,'assets/cosmetics/catalog.json')))));
 for(const [category,id] of [['hat','crown'],['shoes','heels'],['mark','skull']]){const fit=data.fits[category][id];data.fits[category][id]={...fit,kind:'raster',asset:'data:image/png;base64,'+png.toString('base64')};}
 data.fits.mark.star.x+=2;
 await writeFile(review,JSON.stringify(data));await cp(join(project,'tests/fixtures/luna-v1/rendered/stand-native.png'),preview);
 await writeFile(join(root,'player-saves.json'),JSON.stringify({best:456,unlocked:['bowler','heels'],equipped:{hat:'bowler',shoes:'heels',mark:'star'}}));
 return {root,review,preview,data,png,write:()=>writeFile(review,JSON.stringify(data))};
}
