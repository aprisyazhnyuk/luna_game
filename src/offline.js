// UI readiness follows an installed cache, never registration/ready alone.
function cacheReady(worker,timeoutMs){return new Promise(resolve=>{
 const channel=new MessageChannel();let done=false;
 const finish=value=>{if(done)return;done=true;clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(value);};
 const timer=setTimeout(()=>finish(false),timeoutMs);
 channel.port1.onmessage=event=>{if(event.data?.type==='LUNA_OFFLINE_STATUS')finish(event.data.ready===true&&typeof event.data.cacheKey==='string');};
 try{worker.postMessage({type:'LUNA_CACHE_STATUS'},[channel.port2]);}catch{finish(false);}
});}
export async function setupOffline(workers,onStatus,{timeoutMs=2500}={}){
 const unavailable='Online play · offline setup unavailable';
 let registration;
 try{registration=await workers.register('./sw.js',{updateViaCache:'none'});}
 catch{
  try{registration=await workers.getRegistration?.('./');}catch{}
  if(!registration){onStatus(unavailable);return null;}
 }
 let revision=0;const observed=new WeakSet();
 const update=async()=>{
  const request=++revision;
  for(const worker of [registration.installing,registration.waiting,registration.active])if(worker&&!observed.has(worker)){
   observed.add(worker);worker.addEventListener('statechange',()=>{
    if(worker.state==='redundant'){++revision;onStatus(registration.active?'Offline update unavailable · previous version retained':unavailable);}
    else void update();
   });
  }
  if(registration.installing?.state==='installing'){onStatus(registration.active?'Preparing offline update…':'Preparing offline play…');return;}
  const waiting=registration.waiting;
  if(waiting?.state==='installed'&&registration.active){
   const ready=await cacheReady(waiting,timeoutMs);if(request===revision)onStatus(ready?'Update downloaded · close all Luna windows to finish':'Offline update unavailable · previous version retained');return;
  }
  const active=registration.active;
  if(active?.state==='activated'){
   const ready=await cacheReady(active,timeoutMs);if(request===revision)onStatus(ready?'Ready for offline adventures':unavailable);return;
  }
  onStatus('Preparing offline play…');
 };
 registration.addEventListener('updatefound',()=>{void update();});
 await update();return registration;
}
