'use strict';
const VERSION='v2.6.0', PREFIX='yatzy-central-shell-', CACHE=PREFIX+VERSION;
const REQUIRED=['./','./index.html','./app.js','./archive.js','./app.css','./manifest.webmanifest'];
const OPTIONAL=['./offline.html','./icons/icon-192.png','./icons/icon-512.png',
'./icons/apple-touch-icon.png','./icons/favicon-16.png','./icons/favicon-32.png',
'./badges/games.png','./badges/wins.png','./badges/yatzys.png','./badges/bonus.png',
'./badges/fullHouse.png','./badges/noStrike.png','./badges/smallStraight.png',
'./badges/largeStraight.png','./badges/yatzy1.png','./badges/yatzy2.png','./badges/yatzy3.png',
'./badges/yatzy4.png','./badges/yatzy5.png','./badges/yatzy6.png','./badges/rainbow.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{
  for(const url of REQUIRED){
   const res=await fetch(new Request(url,{cache:'reload'}));
   if(!res.ok||res.type==='opaque')throw Error('App-Shell nicht vollständig: '+url);
   await cache.put(url,res);
  }
  for(const url of OPTIONAL){try{const res=await fetch(new Request(url,{cache:'reload'}));if(res.ok)await cache.put(url,res);}catch{}}
 }catch(e){await caches.delete(CACHE);throw e;}
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_PREPARED')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const list=(await caches.keys()).filter(n=>n.startsWith(PREFIX));
 const keep=[CACHE,...list.filter(n=>n!==CACHE).sort().reverse().slice(0,1)];
 await Promise.all(list.filter(n=>!keep.includes(n)).map(n=>caches.delete(n)));
 // Deliberately no clients.claim() and no automatic reload.
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||
  /^\/(api\/|health\b|uploads\/|downloads\/|exports\/)/.test(url.pathname)||
  /\.(?:json|zip|3mf|stl|step|gcode)$/i.test(url.pathname) && !url.pathname.endsWith('manifest.webmanifest'))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(event.request,{ignoreSearch:true});
  if(cached)return cached;
  try{return await fetch(event.request);}catch{
   if(event.request.mode==='navigate')return await cache.match('./index.html')||await cache.match('./offline.html')||Response.error();
   return Response.error();
  }
 })());
});
