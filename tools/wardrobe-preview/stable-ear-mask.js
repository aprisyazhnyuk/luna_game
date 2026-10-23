// Preview candidate only. Rasterize with the original body clip and transform,
// then remove the ears from that layer, so the extra clip cannot resample the face.
const buffers=new WeakMap();
export function drawStableBody(c,image,earMask,drawBody){
 if(earMask===null||earMask===undefined){drawBody(c);return;}
 let canvas=buffers.get(c);
 if(!canvas){canvas=document.createElement('canvas');buffers.set(c,canvas);}
 if(canvas.width!==c.canvas.width)canvas.width=c.canvas.width;
 if(canvas.height!==c.canvas.height)canvas.height=c.canvas.height;
 const layer=canvas.getContext('2d');
 layer.resetTransform();layer.clearRect(0,0,canvas.width,canvas.height);
 layer.imageSmoothingEnabled=c.imageSmoothingEnabled;
 layer.setTransform(c.getTransform());
 drawBody(layer);
 layer.save();layer.globalCompositeOperation='destination-out';
 layer.fillRect(0,0,image.naturalWidth,earMask);layer.restore();
 c.save();c.resetTransform();c.drawImage(canvas,0,0);c.restore();
}
