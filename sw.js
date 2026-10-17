// Service worker simples: sempre tenta a internet primeiro (assim as atualizações aparecem),
// e só usa a cópia guardada se o aluno estiver sem conexão.
const CACHE = 'gremio-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
