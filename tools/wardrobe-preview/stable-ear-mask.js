// Preview candidates only; original PNGs and placements are unchanged.
const buffers=new WeakMap(),faceBuffers=new WeakMap();
function bodyBuffer(c,drawBody,opaque=false){
 const cache=opaque?faceBuffers:buffers;
 let canvas=cache.get(c);
 if(!canvas){canvas=document.createElement('canvas');cache.set(c,canvas);}
 if(canvas.width!==c.canvas.width)canvas.width=c.canvas.width;
 if(canvas.height!==c.canvas.height)canvas.height=c.canvas.height;
 const layer=canvas.getContext('2d');
 layer.resetTransform();layer.clearRect(0,0,canvas.width,canvas.height);
 if(opaque){layer.fillStyle='#f7f7f2';layer.fillRect(0,0,canvas.width,canvas.height);}
 layer.imageSmoothingEnabled=c.imageSmoothingEnabled;layer.setTransform(c.getTransform());
 drawBody(layer);return {canvas,layer};
}
export function drawStableBody(c,image,earMask,drawBody){
 if(earMask===null||earMask===undefined){drawBody(c);return;}
 const {canvas,layer}=bodyBuffer(c,drawBody);
 layer.save();layer.globalCompositeOperation='destination-out';
 layer.fillRect(0,0,image.naturalWidth,earMask);layer.restore();
 c.save();c.resetTransform();c.drawImage(canvas,0,0);c.restore();
}
// V2 always samples the eye from a dedicated body canvas, including Original
// look. Reading or changing the destination canvas must not change that source.
// Copy existing face pixels only; the rig's blink overlay still runs afterward.
export function drawStableFaceBody(c,image,earMask,drawBody){
 drawStableBody(c,image,earMask,drawBody);
 const {canvas}=bodyBuffer(c,drawBody,true),transform=c.getTransform();
 const a=transform.transformPoint({x:1000,y:540}),b=transform.transformPoint({x:1080,y:630});
 const x=Math.floor(a.x),y=Math.floor(a.y);
 // Pixel-aligned copy avoids blending translucent source pixels twice. The
 // face buffer uses Luna's existing background, as the game and studio do.
 c.save();c.resetTransform();c.beginPath();c.rect(x,y,Math.ceil(b.x)-x,Math.ceil(b.y)-y);c.clip();
 c.drawImage(canvas,0,0);c.restore();
}
