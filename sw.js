// 마이데이터 투자 제안 시스템 - Service Worker
// PWA 기능 및 오프라인 지원

const CACHE_NAME = 'mydata-investment-v1.0.0';
const CACHE_VERSION = '1.0.0';

// 캐시할 리소스 목록
const STATIC_RESOURCES = [
    '/',
    '/market-data-integration.html',
    '/style.css',
    '/market-integration.js',
    '/api-test.html',
    '/manifest.json',
    // CDN 리소스
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'
];

// 동적 캐시할 API 엔드포인트
const API_CACHE_PATTERNS = [
    /^https:\/\/api\.allorigins\.win\/raw/,
    /^https:\/\/query1\.finance\.yahoo\.com/,
    /\/api\/health$/,
    /\/api\/investment-advice$/
];

// Service Worker 설치
self.addEventListener('install', event => {
    console.log('[SW] 서비스 워커 설치 중...', CACHE_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] 정적 리소스 캐싱 중...');
                return cache.addAll(STATIC_RESOURCES);
            })
            .then(() => {
                console.log('[SW] 서비스 워커 설치 완료');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] 설치 중 오류:', error);
            })
    );
});

// Service Worker 활성화
self.addEventListener('activate', event => {
    console.log('[SW] 서비스 워커 활성화 중...', CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] 오래된 캐시 삭제:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] 서비스 워커 활성화 완료');
                return self.clients.claim();
            })
    );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // API 요청 처리
    if (isApiRequest(url)) {
        event.respondWith(handleApiRequest(request));
        return;
    }
    
    // 정적 리소스 처리
    if (isStaticResource(url)) {
        event.respondWith(handleStaticResource(request));
        return;
    }
    
    // 기본 네트워크 요청
    event.respondWith(
        fetch(request).catch(() => {
            // 오프라인일 때 기본 페이지 반환
            if (request.mode === 'navigate') {
                return caches.match('/market-data-integration.html');
            }
        })
    );
});

// API 요청 처리 (캐시 우선, 네트워크 폴백)
async function handleApiRequest(request) {
    const url = new URL(request.url);
    
    try {
        // 헬스체크는 항상 최신 데이터
        if (url.pathname.includes('/health')) {
            const response = await fetch(request);
            return response;
        }
        
        // 투자 제안은 POST 요청이므로 캐시하지 않음
        if (request.method === 'POST') {
            return await fetch(request);
        }
        
        // 시장 데이터는 캐시 후 네트워크 업데이트
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        // 캐시된 데이터가 있으면 먼저 반환
        if (cachedResponse) {
            // 백그라운드에서 업데이트
            fetch(request).then(response => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
            }).catch(() => {
                // 네트워크 오류 무시
            });
            
            return cachedResponse;
        }
        
        // 캐시에 없으면 네트워크에서 가져와서 캐시
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
        
    } catch (error) {
        console.error('[SW] API 요청 오류:', error);
        
        // 오프라인 메시지 반환
        return new Response(JSON.stringify({
            error: '네트워크 연결을 확인해주세요.',
            offline: true,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
        });
    }
}

// 정적 리소스 처리 (캐시 우선)
async function handleStaticResource(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
        
    } catch (error) {
        console.error('[SW] 정적 리소스 요청 오류:', error);
        
        // 캐시에서 다시 시도
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(request);
    }
}

// API 요청 판별
function isApiRequest(url) {
    return url.pathname.startsWith('/api/') || 
           API_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

// 정적 리소스 판별
function isStaticResource(url) {
    return url.pathname.endsWith('.html') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.json') ||
           url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.jpg') ||
           url.pathname.endsWith('.svg');
}

// 백그라운드 동기화
self.addEventListener('sync', event => {
    console.log('[SW] 백그라운드 동기화:', event.tag);
    
    if (event.tag === 'portfolio-sync') {
        event.waitUntil(syncPortfolioData());
    }
});

// 포트폴리오 데이터 동기화
async function syncPortfolioData() {
    try {
        const portfolioData = await getStoredPortfolioData();
        if (portfolioData) {
            const response = await fetch('/api/portfolio/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(portfolioData)
            });
            
            if (response.ok) {
                console.log('[SW] 포트폴리오 동기화 완료');
                await clearStoredPortfolioData();
            }
        }
    } catch (error) {
        console.error('[SW] 포트폴리오 동기화 실패:', error);
    }
}

// 저장된 포트폴리오 데이터 가져오기
async function getStoredPortfolioData() {
    // IndexedDB에서 데이터 가져오기 (실제 구현 필요)
    return null;
}

// 저장된 포트폴리오 데이터 삭제
async function clearStoredPortfolioData() {
    // IndexedDB에서 데이터 삭제 (실제 구현 필요)
}

// 푸시 알림 처리
self.addEventListener('push', event => {
    console.log('[SW] 푸시 알림 수신:', event);
    
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const options = {
            body: data.body || '마이데이터 투자 제안 시스템에서 알림이 도착했습니다.',
            icon: '/assets/icon-192x192.png',
            badge: '/assets/icon-72x72.png',
            tag: data.tag || 'mydata-notification',
            data: data.data || {},
            actions: [
                {
                    action: 'view',
                    title: '확인하기',
                    icon: '/assets/action-view.png'
                },
                {
                    action: 'dismiss',
                    title: '닫기',
                    icon: '/assets/action-close.png'
                }
            ],
            requireInteraction: true,
            silent: false
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || '마이데이터 알림', options)
        );
        
    } catch (error) {
        console.error('[SW] 푸시 알림 처리 오류:', error);
    }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
    console.log('[SW] 알림 클릭:', event);
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/market-data-integration.html')
        );
    }
});

// 에러 처리
self.addEventListener('error', event => {
    console.error('[SW] 서비스 워커 오류:', event.error);
});

// Unhandled Promise Rejection 처리
self.addEventListener('unhandledrejection', event => {
    console.error('[SW] 처리되지 않은 Promise 거부:', event.reason);
    event.preventDefault();
});

// 메시지 처리 (클라이언트에서 서비스 워커로)
self.addEventListener('message', event => {
    console.log('[SW] 메시지 수신:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
});

console.log('[SW] 서비스 워커 로드 완료:', CACHE_VERSION);
