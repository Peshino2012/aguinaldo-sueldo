// Service worker de Aguinaldo y Sueldo AR: la app no usa internet, así que
// todo se guarda en la caché al instalarla y funciona siempre sin conexión.
const CACHE = 'sueldo-ar-v1';
const ARCHIVOS = ['./', 'index.html', 'styles.css', 'app.js', 'logic.js', 'manifest.webmanifest', 'privacidad.html',
  'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
