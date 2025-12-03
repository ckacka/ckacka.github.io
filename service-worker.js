const CACHE_NAME = 'ckacka-toolbox-v3';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    // 假设已创建了这些图标文件
    '/images/icon-192.png', 
    '/images/icon-512.png' 
];

// 安装阶段：缓存所有核心资源
self.addEventListener('install', event => {
    // 强制 Service Worker 立即激活，跳过等待阶段
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// 激活阶段：清理旧的缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 抓取请求：缓存优先策略
self.addEventListener('fetch', event => {
    // 排除对外部iframe内容的缓存
    if (event.request.url.startsWith('http') && event.request.url.includes('ckacka.github.io')) {
         event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // 缓存命中，返回缓存资源
                    if (response) {
                        return response;
                    }

                    // 未命中，发起网络请求
                    return fetch(event.request).then(
                        networkResponse => {
                            // 检查是否收到有效的响应
                            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                return networkResponse;
                            }

                            // 将有效的网络响应克隆一份存入缓存
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });

                            return networkResponse;
                        }
                    );
                })
        );
    }
});
