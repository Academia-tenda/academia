const CACHE='academia-v65-pwa';
const ESSENCIAIS=['./','./index.html','./temas.css?v=17','./professor.css?v=1','./professor.js?v=5','./pwa.js?v=1','./fotos.js','./firebase-config.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png'];
const OPCIONAIS=['./img/tenda-gym.jpg','./img/logo_tenda.png','./img/logo_tenda_branco.png'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(ESSENCIAIS.map(u=>new Request(u,{cache:'reload'})));await Promise.allSettled(OPCIONAIS.map(u=>c.add(new Request(u,{cache:'reload'}))))})())});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('academia-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);if(req.method!=='GET')return;
 // Firebase Auth, Firestore e outros serviços seguem diretamente para a rede.
 const local=url.origin===self.location.origin&&url.pathname.startsWith(new URL(self.registration.scope).pathname);
 const sdk=url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/firebasejs/');
 if(!local&&!sdk)return;
 if(req.mode==='navigate'){e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(req);if(r.ok)await c.put(req,r.clone());if(r.ok)return r;const cached=await c.match('./index.html');return cached||r}catch(err){return await c.match(req)||await c.match('./index.html')||new Response('Abra o aplicativo com conexão à internet uma vez para preparar o modo offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}})());return}
 e.respondWith((async()=>{const c=await caches.open(CACHE),cached=await c.match(req);if(cached)return cached;try{const r=await fetch(req);if(r.ok&&r.type!=='opaque')await c.put(req,r.clone());return r}catch(err){return new Response('',{status:503})}})());
});
