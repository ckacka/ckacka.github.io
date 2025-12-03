const CACHE_NAME = 'ckacka-toolbox-v3';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    // 确保把所有重要的资源都列在这里，包括您的CSS和JS文件
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
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
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                // 如果任何文件缓存失败，则 SW 无法安装
                console.error('Failed to cache resources:', error);
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
    if (event.request.url.startsWith('http')) {
         event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then(
                        networkResponse => {
                            // 仅缓存自己的应用资源，不缓存外部链接
                            if (networkResponse && networkResponse.status === 200 && event.request.url.includes(location.origin)) {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            }
                            return networkResponse;
                        }
                    ).catch(error => {
                        // 网络失败，且缓存中没有资源时的处理
                        console.log('Fetch failed, no cached resource:', error);
                        // 您可以在这里返回一个自定义的离线页面
                    });
                })
        );
    }
});
