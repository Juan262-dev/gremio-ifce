// Network first apenas para arquivos públicos do Portal. Nunca cachear
// documentos privados, telas de gestão, URLs com parâmetros nem erros HTTP.
const CACHE = 'gremio-portal-v2';
const CACHE_PREFIX = 'gremio-';
const SCOPE = new URL(self.registration.scope);
const JS_PUBLICOS = new Set([
  'laboratorio-quimica.js', 'laboratorio-avancado.js',
  'portal-navegacao.js', 'portal-eventos-v2.js', 'carteirinha-aluno.js'
]);
function portalDocument(relativo) {
  return relativo === '' || relativo === 'index.html';
}
function arquivoPublico(relativo) {
  return JS_PUBLICOS.has(relativo) ||
    relativo === 'manifest.webmanifest' ||
    /^icon-(?:192|512)\.png$/.test(relativo) ||
    /^imagens\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|webp|svg)$/.test(relativo);
}
function podeCachear(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search || url.hash ||
      !url.pathname.startsWith(SCOPE.pathname) || request.headers.has('range')) return false;
  const relativo = url.pathname.slice(SCOPE.pathname.length);
  return portalDocument(relativo) || arquivoPublico(relativo);
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (!podeCachear(request)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const clone = response.clone();
        event.waitUntil(caches.open(CACHE)
          .then(cache => cache.put(request, clone))
          .catch(() => {}));
      }
      return response;
    } catch (error) {
      const saved = await caches.match(request);
      if (saved) return saved;
      // Nunca servir HTML como substituto de arquivos .js ou .png ausentes.
      const url = new URL(request.url);
      const relativo = url.pathname.slice(SCOPE.pathname.length);
      if (request.mode === 'navigate' && portalDocument(relativo)) {
        const page = await caches.match(new URL('index.html', SCOPE).href);
        if (page) return page;
      }
      throw error;
    }
  })());
});
