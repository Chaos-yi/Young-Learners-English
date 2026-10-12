/*
 * 小耳朵英语 · 离线缓存（Service Worker）
 * ------------------------------------------------------------
 * 第一次联网打开时把整个网站存到平板上，之后断网或网络慢也能秒开。
 * 策略：先用缓存里的版本立即显示，同时在后台联网取新版本；下次打开就是新版本。
 * 增删文件时更新 SHELL 列表并把 VERSION 加一。
 * 只缓存本站文件。B 站播放器等跨域请求不拦截，避免把境外或第三方响应写进离线缓存。
 */
const VERSION = 'v3';
const CACHE = 'little-ears-' + VERSION;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/style.css',
  'assets/fonts/fonts.css',
  'assets/fonts/andika-latin-400-normal.woff2',
  'assets/fonts/andika-latin-700-normal.woff2',
  'assets/fonts/grandstander-latin-700-normal.woff2',
  'assets/fonts/grandstander-latin-800-normal.woff2',
  'assets/fonts/nunito-latin-600-normal.woff2',
  'assets/fonts/nunito-latin-700-normal.woff2',
  'assets/fonts/nunito-latin-800-normal.woff2',
  'assets/js/data.js',
  'assets/js/store.js',
  'assets/js/speech.js',
  'assets/js/app.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('little-ears-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? 'index.html' : req;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) {
      event.waitUntil(fresh);
      return cached;
    }
    return (await fresh) || new Response('网络不可用，请联网后再打开一次。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
