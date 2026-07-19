const CACHE = 'roozmarre-yaar-v6-action-helper';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./action.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-180.png'];
const DB_NAME='roozmarre-notifications';
const DB_VERSION=1;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('data'))db.createObjectStore('data');};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function dbGet(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readonly');const req=tx.objectStore('data').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function dbSet(key,value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function localISO(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function minutes(hhmm='09:00'){const [h,m]=String(hhmm).split(':').map(Number);return (h||0)*60+(m||0);}
async function checkSchedule(){
  const payload=await dbGet('schedule');
  if(!payload?.enabled||!Array.isArray(payload.entries))return;
  const now=new Date(),today=localISO(now),nowMin=now.getHours()*60+now.getMinutes();
  const sent=await dbGet('sent')||{};
  let changed=false;
  for(const item of payload.entries){
    if(!item?.dueDate||item.dueDate>today||minutes(item.time)>nowMin)continue;
    const key=`${item.id}|${today}`;
    if(sent[key])continue;
    await self.registration.showNotification(item.title||'روزمره‌یار',{
      body:item.body||'یک کار زمان‌بندی‌شده داری.',
      icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',
      tag:`roozmarre-${item.id}`,renotify:true,
      timestamp:Date.now(),
      data:{url:`./#${item.route||'dashboard'}`},
      actions:[{action:'open',title:'بازکردن روزمره‌یار'}]
    });
    sent[key]=Date.now();changed=true;
  }
  if(changed){
    const cutoff=Date.now()-45*86400000;
    for(const [k,v] of Object.entries(sent))if(Number(v)<cutoff)delete sent[k];
    await dbSet('sent',sent);
  }
}
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return response;}).catch(()=>caches.match('./index.html'))));
});
self.addEventListener('message',e=>{
  if(e.data?.type==='SYNC_SCHEDULE')e.waitUntil(dbSet('schedule',e.data.payload).then(checkSchedule));
  if(e.data?.type==='CHECK_NOTIFICATIONS')e.waitUntil(checkSchedule());
});
self.addEventListener('periodicsync',e=>{if(e.tag==='roozmarre-reminders')e.waitUntil(checkSchedule());});
self.addEventListener('sync',e=>{if(e.tag==='roozmarre-reminders')e.waitUntil(checkSchedule());});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification.data?.url||'./';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
    for(const client of list){if('focus'in client){if('navigate'in client)await client.navigate(url);return client.focus();}}
    return clients.openWindow(url);
  }));
});
