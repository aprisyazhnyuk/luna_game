// The game and review studio load the same PNG and fit. No redraw on approval.
const root=new URL('../',import.meta.url);
const hats=new Map();
let loading;
export function getRasterHat(id){return hats.get(id);}
export function loadCosmeticAssets(){
 if(loading)return loading;
 loading=(async()=>{
  const response=await fetch(new URL('assets/cosmetics/bowler.json',root));
  if(!response.ok)throw new Error('Could not load bowler placement');
  const fit=await response.json();
  if(![fit.x,fit.y,fit.scale].every(Number.isFinite)||fit.scale<=0)throw new Error('Invalid bowler placement');
  const image=new Image();image.src=new URL(fit.asset,root);await image.decode();
  hats.set('bowler',{image,fit});
 })();
 return loading;
}
