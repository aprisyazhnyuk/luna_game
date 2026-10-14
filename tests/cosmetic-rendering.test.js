import test from 'node:test';
import assert from 'node:assert/strict';
import {drawHat,drawShoes,drawMark} from '../src/cosmetics.js';
import {drawImageLuna,lunaPose} from '../src/animation.js';
import {createRun} from '../src/engine.js';
function context(){
 const calls=[];
 const c=new Proxy({calls},{get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args])});
 return c;
}
const image={width:10,height:20};
const png=(category,fit,attachment)=>({category,art:{kind:'png'},fit:{kind:'raster',...fit},attachment,image});

test('a new raster shoe uses the paw anchor without a legacy grid design',()=>{
 const c=context(),item=png('shoes',{x:3,y:4,scale:2},{pawClip:0});
 drawShoes(c,{foot:[100,200]},'new-shoe',item);
 assert.deepEqual(c.calls.filter(call=>call[0]==='drawImage'),[['drawImage',image,93,164,20,40]]);
});
test('a new raster hat uses its catalog fit',()=>{
 const c=context(),item=png('hat',{x:817,y:373,scale:2},{earMaskY:476});
 drawHat(c,'new-hat',item);
 assert.deepEqual(c.calls.filter(call=>call[0]==='drawImage'),[['drawImage',image,817,373,20,40]]);
});
test('a new raster mark keeps its center and proportions through torso stretch',()=>{
 const c=context(),item=png('mark',{x:604,y:730,scale:2},{counterStretch:true});
 drawMark(c,'new-mark',1.25,item);
 assert.deepEqual(c.calls.filter(call=>call[0]==='drawImage'),[['drawImage',image,594,710,20,40]]);
 assert.deepEqual(c.calls.filter(call=>call[0]==='scale'),[['scale',1,.8]]);
});
test('the rig applies declared ear and paw masks to arbitrary item IDs',()=>{
 const c=context(),luna={naturalWidth:1200,naturalHeight:1000};
 const items={hat:png('hat',{x:817,y:373,scale:1},{earMaskY:510}),shoes:png('shoes',{x:0,y:0,scale:1},{pawClip:24})};
 drawImageLuna(c,luna,73,96,lunaPose(createRun(),0),{hat:'new-hat',shoes:'new-shoe',mark:'absent'}, {item:category=>items[category],mark:()=>{}});
 assert.deepEqual(c.calls.filter(call=>call[0]==='rect'),[
  ['rect',0,0,1200,937],['rect',0,0,1200,945],['rect',0,0,1200,930],['rect',0,0,1200,951],['rect',0,510,1200,490]
 ]);
 assert.equal(c.calls.filter(call=>call[0]==='drawImage'&&call[1]===image).length,5);
});
test('declared null/zero masks retain base ears and paw bottoms',()=>{
 const c=context(),items={hat:png('hat',{x:817,y:373,scale:1},{earMaskY:null}),shoes:png('shoes',{x:0,y:0,scale:1},{pawClip:0})};
 drawImageLuna(c,{naturalWidth:1200,naturalHeight:1000},73,96,lunaPose(createRun(),0),{hat:'new-hat',shoes:'new-shoe',mark:'absent'},{item:category=>items[category],mark:()=>{}});
 assert.equal(c.calls.filter(call=>call[0]==='rect').length,0);
});

test('grid stamping uses its supplied cosmetic palette',async()=>{
 const {stamp}=await import('../src/pixels.js');const painted=[];
 const c={fillStyle:null,fillRect(x,y,w,h){painted.push([this.fillStyle,x,y,w,h]);}};
 stamp(c,['X.'],5,6,2,{X:'#123456'});
 assert.deepEqual(painted,[['#123456',5,6,2,2]]);
});
