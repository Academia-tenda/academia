const CACHE = 'academia-v38';
const ARQUIVOS = ['./', './index.html', './fotos.js', './manifest.json', './firebase-config.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/logo_tenda_tab.png',
'./img/logo_tenda.png', './img/logo_tenda_branco.png',
'./img/abdc_curto.jpg', './img/abdc_inferior.jpg', './img/abdc_remador.jpg', './img/barra_fixa.jpg', './img/cadeira_abdutora.jpg', './img/cadeira_extensora.jpg', './img/cadeira_flexora.jpg', './img/desenvolvimento_militar.jpg', './img/elevacao_frontal.jpg', './img/elevacao_lateral.jpg', './img/elevacao_posterior.jpg', './img/encolhimento.jpg', './img/flexao_chao.jpg', './img/legpress.jpg', './img/panturrilha_pe.jpg', './img/peckdeck.jpg', './img/puxada_alta.jpg', './img/remada_baixa.jpg', './img/remada_unilateral.jpg', './img/rosca_alternada.jpg', './img/rosca_punho.jpg', './img/rosca_scott.jpg', './img/rosca_w.jpg', './img/supino_halteres.jpg', './img/supino_inclinado_barra.jpg', './img/supino_reto_barra.jpg', './img/triceps_frances.jpg', './img/triceps_polia.jpg', './img/triceps_testa.jpg'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: 'no-cache' }); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.ok) {
          const c = resp.clone();
          caches.open(CACHE).then(function (ca) { ca.put(e.request, c); });
        }
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }
  const url = new URL(e.request.url);
  const ehImagem = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url.pathname);
  e.respondWith(
    caches.match(e.request).then(function (r) {
      if (r) {
        const ct = r.headers.get('content-type') || '';
        if (!ehImagem || /^image\//i.test(ct)) return r;
      }
      return fetch(e.request).then(function (resp) {
        const origem = new URL(e.request.url);
        const cacheavel = resp && resp.ok && (origem.origin === self.location.origin || origem.hostname.endsWith('gstatic.com'));
        if (cacheavel) {
          const clone = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function () {
        if (ehImagem && url.origin === self.location.origin) {
          return caches.match('./icons/icon-192.png');
        }
        return new Response('', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});
