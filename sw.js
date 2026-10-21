/**
 * Service Worker - 离线缓存
 */
const CACHE_NAME = 'lifehub-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './base.css',
  './layout.css',
  './components.css',
  './pages.css',
  './utils.js',
  './ui.js',
  './db.js',
  './store.js',
  './router.js',
  './app.js',
  './home.js',
  './tasks.js',
  './workout.js',
  './diet.js',
  './expense.js',
  './calendar.js',
  './settings.js',
  './icon-192.png',
  './icon-512.png',
  './chart.umd.min.js'
];

// 安装：缓存所有资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('缓存资源:', ASSETS.length, '个文件');
        return cache.addAll(ASSETS).catch(err => {
          console.warn('部分资源缓存失败:', err);
          // 逐个缓存，避免一个失败导致全部失败
          return Promise.all(ASSETS.map(url =>
            cache.add(url).catch(e => console.warn('缓存失败:', url, e))
          ));
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  // 只缓存 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request)
          .then((response) => {
            // 缓存新的响应
            if (response && response.status === 200 && response.type === 'basic') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // 离线时返回首页
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
