/* Greenprint AI: offline shell. Scope: /ai only. Never caches AI replies. */
var V = "gpai-v1";
var SHELL = ["/ai", "/ai-icon-192.png", "/ai-icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("gpai-") === 0 && k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return; // AI + data: always live
  // App pages: network first, fall back to the cached shell when offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(V).then(function (c) { c.put("/ai", copy); });
      return res;
    }).catch(function () { return caches.match("/ai"); }));
    return;
  }
  // Static assets (hashed bundles, fonts, icons, pdf reader): cache first
  if (url.pathname.indexOf("/_next/static/") === 0 || url.pathname.indexOf("/vendor/") === 0 || /\.(png|svg|woff2?|webmanifest)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    }));
  }
});
