export function isLocalhost(hostname){return ['localhost','127.0.0.1','::1','[::1]'].includes(hostname);}

// Only this game's exact scope is touched. Scores and wardrobe live in
// localStorage, which is intentionally left intact.
export async function clearGameCache(scope,workers,cacheStorage){
 const registrations=workers?await workers.getRegistrations():[];
 const owned=registrations.filter(registration=>registration.scope===scope);
 await Promise.all(owned.map(registration=>registration.unregister()));
 const prefix=`luna-${scope}-`;
 if(cacheStorage){
  const keys=await cacheStorage.keys();
  await Promise.all(keys.filter(key=>key.startsWith(prefix)).map(key=>cacheStorage.delete(key)));
 }
 return workers?.controller?.scriptURL===new URL('sw.js',scope).href;
}
