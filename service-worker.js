
const CACHE_NAME = 'treehole-toolbox-v4';

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/images/icon-512-maskable.png'
];

const FONT_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'
];

// 安装阶段：缓存核心资源
self.addEventListener('install', event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            // 核心资源必须缓存成功
            await cache.addAll(CORE_ASSETS);

            // 字体资源属于可选资源，失败不影响安装
            await Promise.allSettled(
                FONT_ASSETS.map(async url => {
                    const response = await fetch(url, {
                        mode: 'cors'
                    });

                    if (response.ok) {
                        await cache.put(url, response);
                    }
                })
            );

            // 跳过等待，立即激活新版本
            await self.skipWaiting();
        })().catch(error => {
            console.error('Service Worker installation failed:', error);
            throw error;
        })
    );
});

// 激活阶段：清理旧缓存并接管页面
self.addEventListener('activate', event => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );

            await self.clients.claim();
        })()
    );
});

// 请求拦截：缓存优先策略
self.addEventListener('fetch', event => {
    const request = event.request;

    // 只处理 GET 请求
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // 不缓存第三方 iframe 页面及其他跨域网页
    // Google Fonts 单独允许缓存
    const isGoogleFont =
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com';

    if (url.origin !== self.location.origin && !isGoogleFont) {
        return;
    }

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            // 先检查缓存
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                // 页面资源采用缓存优先策略
                return cachedResponse;
            }

            // 缓存不存在时请求网络
            try {
                const networkResponse = await fetch(request);

                // 只缓存成功的响应
                if (
                    networkResponse &&
                    networkResponse.status === 200 &&
                    networkResponse.type !== 'opaque'
                ) {
                    await cache.put(
                        request,
                        networkResponse.clone()
                    );
                }

                return networkResponse;
            } catch (error) {
                console.warn('Network request failed:', request.url);

                // 导航请求失败时，尝试返回首页
                if (request.mode === 'navigate') {
                    const offlinePage = await cache.match('/index.html');

                    if (offlinePage) {
                        return offlinePage;
                    }
                }

                // 其他资源无缓存时返回离线提示
                return new Response(
                    '当前处于离线状态，暂时无法加载该内容。',
                    {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: {
                            'Content-Type': 'text/plain; charset=utf-8'
                        }
                    }
                );
            }
        })()
    );
});
