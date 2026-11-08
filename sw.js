/* ==========================================================================
 * sw.js — Service Worker cơ bản cho PWA Vũ Gia Phát (VGP Tape)
 * Chỉ cache các static assets (HTML, CSS, JS, Logo), không cache API calls.
 * ========================================================================== */

var CACHE_NAME = 'vgp-tape-static-v1';
var STATIC_ASSETS = [
  './',
  './index.html',
  './products.html',
  './compare.html',
  './contact.html',
  './about.html',
  './blog.html',
  './css/style.css',
  './js/header.js',
  './js/footer.js',
  './js/seo.js',
  './js/main.js',
  './js/compare.js',
  './images/logo.webp',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function () {
        // Ignore individual asset failure on install
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Không cache các truy vấn API Supabase, Google Tag Manager, Analytics
  if (
    url.hostname.indexOf('supabase.co') !== -1 ||
    url.hostname.indexOf('googletagmanager.com') !== -1 ||
    url.hostname.indexOf('google-analytics.com') !== -1 ||
    url.pathname.indexOf('/admin/') !== -1
  ) {
    return;
  }

  // Với file tĩnh cùng origin: Network-first cho HTML/JS/CSS để luôn nhận code mới, fallback sang Cache khi offline
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(function (networkRes) {
          if (networkRes && networkRes.status === 200) {
            var resClone = networkRes.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(function () {
          return caches.match(req);
        })
    );
  }
});

