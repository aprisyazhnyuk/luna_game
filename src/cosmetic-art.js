// Small pixel grids for the approved wardrobe, enlarged in Luna's PNG space.
function art(width,height,draw){
 const cells=Array.from({length:height},()=>Array(width).fill('.'));
 const fill=(color,inside)=>{
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(inside(x+.5,y+.5))cells[y][x]=color;
 };
 const rect=(color,x,y,w,h)=>fill(color,(px,py)=>px>=x&&px<x+w&&py>=y&&py<y+h);
 const disc=(color,x,y,r)=>fill(color,(px,py)=>(px-x)**2+(py-y)**2<=r*r);
 const polygon=(color,points)=>fill(color,(x,y)=>{
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const [ax,ay]=points[i],[bx,by]=points[j];
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
 });
 draw({rect,disc,polygon});
 return cells.map(row=>row.join(''));
}

export const EAR=[
 '..XX...',
 '.XGGX..',
 '.XWGX..',
 'XWWWGX.',
 'XWWWGX.',
 'XWWGGX.',
 'XGGGGX.',
 '.XXXX..'
];

export const HATS=Object.freeze({
 // Ear positions are offsets from the hat's top-left at the base size of 12.
 bowler:{x:824,y:324,size:12,ears:[[24,-16,11],[216,14,8]],rows:[
  '........XXXXXXXX........',
  '......XXXXXXXXXXXX......',
  '.....XXXXXXXXXXXXXX.....',
  '....XXXXGXXXXXXXXXXX....',
  '...XXXXXGGXXXXXXXXXXX...',
  '...XXXXGGGXXXXXXXXXXX...',
  '..XXXXXGGGXXXXXXXXXXXX..',
  '..XXXXXGGGXXXXXXXXXXXX..',
  '..XXLLLLLLLLLLLLLLLLXX..',
  '..XXLLLLLLLLLLLLLLLLXX..',
  '.XXXXXXXXXXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXXXXXXXXXX',
  '.XXXXXXXXXXXXXXXXXXXXXX.'
 ]},
 witch:{x:806,y:156,size:12,ears:[[36,212,11],[246,186,9]],rows:art(28,28,({polygon,rect})=>{
  polygon('X',[[16,0],[20,0],[23,2],[24,5],[23,6],[21,4],[18,4],[17,6],[18,9],[20,12],[22,16],[24,21],[27,23],[28,25],[27,27],[2,28],[0,26],[1,24],[5,22],[8,20],[10,16],[12,11],[13,8],[13,6],[12,5],[11,5],[10,7],[8,7],[8,5],[10,2],[13,1]]);
  polygon('G',[[16,2],[19,2],[21,3],[17,3],[15,6],[16,10],[18,13],[20,17],[21,20],[16,20],[14,16],[14,12],[15,8]]);
  polygon('L',[[7,21],[23,20],[25,23],[5,25]]);
  rect('X',16,21,3,2);rect('W',17,21,1,1);
 })},
 crown:{x:892,y:306,size:12,ears:[[-40,74,11],[166,60,9]],rows:art(21,15,({polygon,disc,rect})=>{
  polygon('X',[[1,4],[4,4],[7,8],[9,1],[12,1],[14,8],[17,4],[20,4],[18,12],[16,14],[5,14],[3,12]]);
  polygon('L',[[4,6],[8,11],[10,4],[13,11],[17,6],[15,12],[6,12]]);
  rect('G',5,12,12,2);rect('W',7,12,7,1);
  disc('X',2.5,4,1.8);disc('W',2.5,4,1);
  disc('X',10.5,2,1.8);disc('W',10.5,2,1);
  disc('X',18.5,4,1.8);disc('W',18.5,4,1);
 })}
});

export const SHOES=Object.freeze({
 heels:{size:10,rows:[
  '.XX........',
  'XGGX.......',
  'XGGGX......',
  'XGGGGXXXXX.',
  'XXXXXXXXXXX',
  'XX....XXXXX',
  'XX......XXX'
 ]},
 runners:{size:9,rows:[
  '..XXXX.....',
  '.XGGGGX....',
  'XGGWGGGX...',
  'XGGGWGGGXX.',
  'XGGWGGGGGGX',
  'XWWWWWWWWWX',
  '.XXXXXXXXX.'
 ]},
 sandals:{size:9,rows:[
  '.XX...XX...',
  '.XGX..XGX..',
  'XWWGGWWGGWX',
  'XWWGGWWGGWX',
  'XXXXXXXXXXX'
 ]}
});

export const MARKS=Object.freeze({
 original:{size:11,rows:art(15,13,({disc})=>{
  disc('G',3.5,3.5,3);disc('G',11.5,3.5,3);disc('G',7.5,8,4.5);
 })},
 star:{size:10,rows:art(15,15,({polygon})=>{
  const points=Array.from({length:10},(_,i)=>{
   const angle=-Math.PI/2+i*Math.PI/5,r=i%2?3.2:7.5;
   return [7.5+Math.cos(angle)*r,7.5+Math.sin(angle)*r];
  });
  polygon('G',points);
 })},
 skull:{size:8,rows:art(17,18,({disc,rect,polygon})=>{
  disc('G',8.5,5,5);rect('G',5,6,7,4);
  rect('W',5,3,2,3);rect('W',10,3,2,3);rect('W',8,6,1,1);
  rect('W',6,9,1,1);rect('W',9,9,1,1);
  polygon('G',[[3,11],[14,16],[13,18],[2,13]]);
  polygon('G',[[14,11],[3,16],[4,18],[15,13]]);
  for(const [x,y] of [[2,11],[3,12],[14,11],[13,12],[3,16],[4,17],[13,16],[14,17]])disc('G',x,y,1.3);
 })}
});
