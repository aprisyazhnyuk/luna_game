// Original, hand-placed pixel grids. Dots are transparent; every visible cell
// stays square. Animation swaps small leg/tail poses rather than rotating art.
export const PALETTE = Object.freeze({ X:'#42443f', G:'#96998f', L:'#d7d9d0', W:'#f7f7f2' });
export const PIXEL = 2;
export function stamp(c,rows,x,y,size=PIXEL) {
 for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
  const color=PALETTE[rows[row][col]];
  if(color){c.fillStyle=color;c.fillRect(x+col*size,y+row*size,size,size);}
 }
}
const BODY = [
 '......XXXXXXXXXXX.............',
 '...XXXGGGGGGGGGXXXXXXXX......',
 '.XXGGGGGGGGGGGWWWWWWWWWWXX...',
 'XGGGGXGGGGGGGWWWWWWWWWWWWWX..',
 'XGGXGGGGGGGGGWWWWWWWWWWWWWX..',
 'XGGGGGGGGGGGGWWWWWWWWWWWWWWX.',
 'XGGGGGGGGGGGWWWWWWWWWWWWWWWX.',
 'XGGGGGGGGGGWWWWWWWWWWWWWWWWX.',
 'XGGGGGGGGGWWWWWWWWWWWWWWWWWX.',
 '.XGGGGGGGWWWWWWWWWWWWWWWWWWX.',
 '.XGGGGGGWWWWWWWWWWWWWWWWWWWWX',
 '..XGGGGWWWWWWWWWWWWWWWWWWWWWX',
 '...XWWWWWWWWWWWWWWWWWWWWWWWWX',
 '....XWWWWWWWWWWWWWWWWWWWWWWX',
 '.....XWWWWWWWWWWWWWWWWWWWWWX',
 '......XXXXXXXXXXXXXXXXXXXXXX.'
];
const HEAD = [
 '..XX......XX....',
 '..XGX....XGX....',
 '..XGGX..XGGX....',
 '..XGGGXXGGGX....',
 '.XGGGGGGGGGGX...',
 '.XGGXGGXGGGGX...',
 'XGGGGGGGWWGGGX..',
 'XGGGGGGWWWWGGX..',
 'XGGGGGWWWWXWWX..',
 'XWGGGWWWWWXWWXX.',
 'XWWWWWWWWWWWWWWX',
 '.XWWWWWWWWWWWXXX',
 '..XWWWWWWWWWWWWX',
 '...XWWWWWWWWXXX.',
 '....XXXXXXXX....'
];
const TAIL = [
 '.XXX.......',
 'XGGGX......',
 'XGGGX......',
 'XXXX.......',
 '.XGGX......',
 '.XGGGX.....',
 '..XXXXXX...',
 '...XGGGGXX.',
 '....XGGGGGX',
 '.....XXXXXX'
];
const PAW = ['XWWX','XWWX','XWWX','XWWX','XWWX','XWWX','XWWX','XWWX','XWWXX','XXXXX'];
const FAR_PAW = ['XLLX','XLLX','XLLX','XLLX','XLLX','XLLX','XLLX','XLLX','XLLX','XLLXX','XXXXX'];
export const BOX = [
 'XXXXXXXXXXXXXXXX',
 'XLLLLLLXXLLLLLLX',
 'XLLLLLLXXLLLLLLX',
 'XLLLLLLXXLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XLLXXLLLLLLLLLLX',
 'XLLLLLLLLLLLLLLX',
 'XXXXXXXXXXXXXXXX'
];
export const YARN = [
 '.....XXXX.....',
 '...XXLLLLXX...',
 '..XLLXXLLLLX..',
 '.XLLLLLXXLLLX.',
 '.XLLLXLLLXLLX.',
 'XLLLXLLLLLXLLX',
 'XLLXLLLLLLXLLX',
 'XLLXLLLLLLXLLX',
 'XLLXLLLLLLXLLX',
 '.XLLXLLLLXLLX.',
 '.XLLLXXXXLLLX.',
 '..XLLLLLLLLX..',
 '...XXLLLLXX...',
 '.....XXXX.....'
];
export function drawPixelLuna(c,x,y,time,moving,airborne,pose=null) {
 const frame=moving&&!airborne?Math.floor(time*9)%4:0;
 const ox=Math.round(x/PIXEL)*PIXEL-44,oy=Math.round(y/PIXEL)*PIXEL-60;
 const bob=moving&&!airborne&&frame%2===1?-1:0;
 const part=(rows,col,row)=>stamp(c,rows,ox+col*PIXEL,oy+row*PIXEL);
 part(TAIL,0,11+(frame===2?1:0));
 // Keep the pairs apart in every pose, including the tucked jump frame.
 const swing=moving&&!airborne?[0,1,0,-1][frame]:0;
 const paw=(rows,col,row,index)=>part(rows,col+(pose?Math.round(-pose.legs[index]*4):0),row-(pose?Math.round(pose.lift[index]):0));
 paw(FAR_PAW,13-swing,airborne?17:18+(frame===1?-1:0),0);
 paw(FAR_PAW,27+swing,airborne?17:18+(frame===3?-1:0),2);
 paw(PAW,10+swing+(airborne?1:0),airborne?19:20+(frame===3?-1:0),1);
 paw(PAW,24-swing+(airborne?1:0),airborne?19:20+(frame===1?-1:0),3);
 part(BODY,8,8+bob);
 // Separate head origin is also the attachment point for future hats.
 part(HEAD,25,3+bob);
 if(pose?.blink){
  c.fillStyle=PALETTE.W;c.fillRect(ox+35*PIXEL,oy+(11+bob)*PIXEL,PIXEL,2*PIXEL);
  c.fillStyle=PALETTE.X;c.fillRect(ox+34*PIXEL,oy+(12+bob)*PIXEL,2*PIXEL,PIXEL);
 }
}
