// Pure, versioned cosmetic contract shared by runtime, studio and Node tools.
const freeze=value=>{
 if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
 return value;
};
export const FIT_LIMITS=freeze({
 hat:{x:[350,1250],y:[-150,700],scale:[.01,4]},
 shoes:{x:[-150,150],y:[-150,150],scale:[.01,4]},
 mark:{x:[400,850],y:[550,900],scale:[.01,3]}
});
export const INPUT_LIMITS=Object.freeze({pngBytes:4_000_000,pngDimension:4096,reviewBytes:56_000_000});
const categories=Object.keys(FIT_LIMITS);
function fail(message){throw new Error(message);}
function object(value,required,optional=[],label='object'){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail(`Invalid ${label}`);
 for(const key of required)if(!Object.hasOwn(value,key))fail(`Missing ${label}.${key}`);
 for(const key of Object.keys(value))if(!required.includes(key)&&!optional.includes(key))fail(`Unknown ${label}.${key}`);
}
function number(value,min,max,label){if(!Number.isFinite(value)||value<min||value>max)fail(`Invalid ${label}`);}
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)fail(`Invalid ${label}`);}
export function validateFit(category,fit){
 if(typeof category!=='string'||!Object.hasOwn(FIT_LIMITS,category))fail('Unknown fit category');
 object(fit,['x','y','scale'],[],'fit');
 for(const [key,[min,max]] of Object.entries(FIT_LIMITS[category]))number(fit[key],min,max,`fit.${key}`);
 return Object.freeze({x:fit.x,y:fit.y,scale:fit.scale});
}
export function validateAssetPath(path){
 if(typeof path!=='string'||!/^assets\/(?:[A-Za-z0-9_-][A-Za-z0-9_. -]*\/)*[A-Za-z0-9_-][A-Za-z0-9_. -]*\.png$/.test(path)||path.split('/').some(part=>part==='.'||part==='..'||part.endsWith(' ')||part.endsWith('.')))fail('Invalid project PNG path');
 return path;
}
// These are bounds, not a PNG decoder. Load/apply must verify actual bytes too.
export function validatePngMetadata(metadata){
 object(metadata,['byteLength','width','height'],[],'PNG metadata');
 integer(metadata.byteLength,1,INPUT_LIMITS.pngBytes,'PNG byte length');
 for(const key of ['width','height'])integer(metadata[key],1,INPUT_LIMITS.pngDimension,`PNG ${key}`);
 return Object.freeze({...metadata});
}
export function validateReviewByteLength(length){
 integer(length,1,INPUT_LIMITS.reviewBytes,'Review byte length');return length;
}
function grid(rows,palette,label){
 if(!Array.isArray(rows)||rows.length<1||rows.length>256||typeof rows[0]!=='string'||rows[0].length<1||rows[0].length>256)fail(`Invalid ${label} dimensions`);
 for(const row of rows){
  if(typeof row!=='string'||row.length!==rows[0].length||[...row].some(cell=>cell!=='.'&&!Object.hasOwn(palette,cell)))fail(`Invalid ${label} pixels`);
 }
}
function validateArt(art,category,palette){
 if(!art||typeof art!=='object')fail('Missing artwork');
 if(art.kind==='none'){object(art,['kind'],[],'art');return;}
 if(art.kind==='png'){object(art,['kind','asset'],[],'art');validateAssetPath(art.asset);return;}
 if(art.kind!=='grid')fail('Unsupported artwork kind');
 object(art,['kind','rows','size'],category==='hat'?['ears']:[],'art');
 grid(art.rows,palette,'art');number(art.size,.01,256,'grid size');
 if(art.ears!==undefined){
  if(!Array.isArray(art.ears)||art.ears.length>16)fail('Invalid ears');
  if(art.ears.length&&!Object.hasOwn(palette,'X'))fail('Missing ear underlay color X');
  for(const ear of art.ears){
   if(!Array.isArray(ear)||ear.length!==3)fail('Invalid ear tuple');
   number(ear[0],-4096,4096,'ear x');number(ear[1],-4096,4096,'ear y');number(ear[2],.01,256,'ear size');
  }
 }
}
function attachment(item){
 const value=item.attachment;
 if(item.art.kind==='none'){object(value,[],[],'attachment');return;}
 if(item.category==='hat'){
  object(value,['earMaskY'],[],'attachment');
  if(value.earMaskY!==null)number(value.earMaskY,0,4096,'ear mask y');
 }else if(item.category==='shoes'){
  object(value,['pawClip'],[],'attachment');number(value.pawClip,0,4096,'paw clip');
 }else{
  object(value,['counterStretch'],[],'attachment');if(value.counterStretch!==true)fail('Marks must retain proportions');
 }
}
export function validateCatalog(source){
 object(source,['version','palette','earRows','defaults','items'],[],'catalog');
 if(source.version!==1)fail('Unsupported catalog version');
 const palette=source.palette;
 if(!palette||typeof palette!=='object'||Array.isArray(palette)||Object.keys(palette).length<1||Object.keys(palette).length>26)fail('Invalid palette');
 for(const [key,color] of Object.entries(palette))if(!/^[A-Z]$/.test(key)||typeof color!=='string'||!/^#[a-fA-F0-9]{6}$/.test(color))fail('Invalid palette color');
 grid(source.earRows,palette,'ear');
 object(source.defaults,categories,[],'defaults');
 if(!Array.isArray(source.items)||source.items.length<3||source.items.length>1000)fail('Invalid item list');
 const ids=new Set();
 for(const item of source.items){
  object(item,['id','category','name','target','art','fit','attachment'],[],'item');
  if(typeof item.id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(item.id)||['constructor','prototype'].includes(item.id)||ids.has(item.id))fail('Invalid or duplicate item ID');
  ids.add(item.id);
  if(!categories.includes(item.category))fail('Unknown item category');
  if(typeof item.name!=='string'||item.name.trim()!==item.name||item.name.length<1||item.name.length>100||/[\x00-\x1f\x7f]/.test(item.name))fail('Invalid item name');
  integer(item.target,0,Number.MAX_SAFE_INTEGER,'reward target');
  validateArt(item.art,item.category,palette);
  if(item.art.kind==='none'){
   if(item.fit!==null||item.target!==0)fail('Empty items cannot have fit or reward target');
  }else validateFit(item.category,item.fit);
  attachment(item);
 }
 for(const category of categories){
  const item=source.items.find(item=>item.id===source.defaults[category]&&item.category===category);
  if(!item||item.target!==0)fail(`Invalid ${category} default`);
 }
 // All fields above are JSON data; clone before freezing to isolate callers.
 return freeze(JSON.parse(JSON.stringify(source)));
}
