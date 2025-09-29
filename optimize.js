// 성능 최적화 모듈
class PerformanceOptimizer {
    constructor() {
        this.loadingStartTime = Date.now();
        this.metrics = {
            pageLoad: 0,
            apiCalls: [],
            renderTime: 0,
            interactiveTime: 0
        };
        this.init();
    }

    init() {
        this.measurePageLoad();
        this.optimizeImages();
        this.implementLazyLoading();
        this.setupPerformanceMonitoring();
        this.optimizeNetworkRequests();
    }

    // 페이지 로딩 성능 측정
    measurePageLoad() {
        if (typeof performance !== 'undefined') {
            window.addEventListener('load', () => {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                this.metrics.pageLoad = loadTime;
                console.log(`📊 페이지 로딩 시간: ${loadTime}ms`);
                
                // Core Web Vitals 측정
                this.measureCoreWebVitals();
            });
        }
    }

    // Core Web Vitals 측정
    measureCoreWebVitals() {
        // LCP (Largest Contentful Paint)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log(`🎯 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // FID (First Input Delay)
            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    console.log(`⚡ FID: ${entry.processingStart - entry.startTime}ms`);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });

            // CLS (Cumulative Layout Shift)
            const clsObserver = new PerformanceObserver((list) => {
                let clsValue = 0;
                list.getEntries().forEach((entry) => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                console.log(`📏 CLS: ${clsValue.toFixed(4)}`);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        }
    }

    // 이미지 최적화
    optimizeImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // 적절한 이미지 형식 설정
            if (!img.loading) {
                img.loading = 'lazy';
            }
            
            // WebP 지원 확인
            if (this.supportsWebP()) {
                const src = img.src;
                if (src && !src.includes('.webp')) {
                    // WebP 대체 이미지가 있다면 사용
                    img.onerror = () => {
                        img.src = src; // 원본으로 폴백
                    };
                }
            }
        });
    }

    // WebP 지원 확인
    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }

    // 지연 로딩 구현
    implementLazyLoading() {
        // Intersection Observer를 이용한 지연 로딩
        if ('IntersectionObserver' in window) {
            const lazyElements = document.querySelectorAll('.lazy-load');
            
            const lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        
                        // 차트 지연 로딩
                        if (element.classList.contains('chart-container')) {
                            this.loadChart(element);
                        }
                        
                        // 컴포넌트 지연 로딩
                        if (element.dataset.component) {
                            this.loadComponent(element);
                        }
                        
                        lazyObserver.unobserve(element);
                    }
                });
            }, {
                rootMargin: '50px',
                threshold: 0.1
            });
            
            lazyElements.forEach(element => {
                lazyObserver.observe(element);
            });
        }
    }

    // 차트 지연 로딩
    loadChart(container) {
        console.log('📈 차트 로딩 시작');
        const startTime = Date.now();
        
        // Chart.js 동적 로딩
        if (!window.Chart) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                console.log(`📊 Chart.js 로딩 완료: ${Date.now() - startTime}ms`);
                this.initializeChart(container);
            };
            document.head.appendChild(script);
        } else {
            this.initializeChart(container);
        }
    }

    // 컴포넌트 지연 로딩
    loadComponent(element) {
        const componentName = element.dataset.component;
        console.log(`🧩 컴포넌트 로딩: ${componentName}`);
        
        // 컴포넌트별 로딩 로직
        switch (componentName) {
            case 'advanced-chart':
                this.loadAdvancedChart(element);
                break;
            case 'portfolio-analysis':
                this.loadPortfolioAnalysis(element);
                break;
            case 'ai-advisor':
                this.loadAIAdvisor(element);
                break;
        }
    }

    // 네트워크 요청 최적화
    optimizeNetworkRequests() {
        // 요청 병합 및 캐싱
        this.requestQueue = [];
        this.requestCache = new Map();
        
        // API 호출 최적화
        this.debounceApiCalls();
        this.batchApiRequests();
    }

    // API 호출 디바운싱
    debounceApiCalls() {
        window.debouncedFetch = this.debounce((url, options) => {
            return this.cachedFetch(url, options);
        }, 300);
    }

    // 캐시된 fetch
    cachedFetch(url, options = {}) {
        const cacheKey = `${url}-${JSON.stringify(options)}`;
        
        if (this.requestCache.has(cacheKey)) {
            const cached = this.requestCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 60000) { // 1분 캐시
                console.log(`💾 캐시에서 로딩: ${url}`);
                return Promise.resolve(cached.data);
            }
        }
        
        console.log(`🌐 API 호출: ${url}`);
        const startTime = Date.now();
        
        return fetch(url, options)
            .then(response => response.json())
            .then(data => {
                const loadTime = Date.now() - startTime;
                console.log(`⚡ API 응답 시간: ${loadTime}ms`);
                
                this.requestCache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
                
                this.metrics.apiCalls.push({
                    url,
                    loadTime,
                    timestamp: Date.now()
                });
                
                return data;
            });
    }

    // 디바운스 유틸리티
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 배치 API 요청
    batchApiRequests() {
        setInterval(() => {
            if (this.requestQueue.length > 0) {
                console.log(`📦 배치 처리: ${this.requestQueue.length}개 요청`);
                this.processBatchRequests();
            }
        }, 1000);
    }

    // 메모리 최적화
    optimizeMemory() {
        // 주기적 가비지 컬렉션 힌트
        setInterval(() => {
            // 사용하지 않는 데이터 정리
            this.cleanupUnusedData();
            
            // 메모리 사용량 모니터링
            if (performance.memory) {
                const memory = performance.memory;
                console.log(`💾 메모리 사용량: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
            }
        }, 30000); // 30초마다
    }

    // 사용하지 않는 데이터 정리
    cleanupUnusedData() {
        // 오래된 캐시 데이터 정리
        const now = Date.now();
        for (const [key, value] of this.requestCache.entries()) {
            if (now - value.timestamp > 300000) { // 5분 지난 캐시 삭제
                this.requestCache.delete(key);
            }
        }
        
        // 오래된 메트릭 데이터 정리
        this.metrics.apiCalls = this.metrics.apiCalls.filter(
            call => now - call.timestamp < 600000 // 10분간 기록 유지
        );
    }

    // 성능 모니터링 설정
    setupPerformanceMonitoring() {
        // 성능 데이터 수집
        setInterval(() => {
            this.collectPerformanceMetrics();
        }, 10000); // 10초마다
    }

    // 성능 메트릭 수집
    collectPerformanceMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            pageLoad: this.metrics.pageLoad,
            apiCalls: this.metrics.apiCalls.length,
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
            } : null,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink
            } : null
        };
        
        // 로컬 스토리지에 저장
        this.saveMetrics(metrics);
    }

    // 메트릭 저장
    saveMetrics(metrics) {
        try {
            let savedMetrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]');
            savedMetrics.push(metrics);
            
            // 최근 100개만 유지
            if (savedMetrics.length > 100) {
                savedMetrics = savedMetrics.slice(-100);
            }
            
            localStorage.setItem('performance_metrics', JSON.stringify(savedMetrics));
        } catch (error) {
            console.warn('메트릭 저장 실패:', error);
        }
    }

    // 성능 리포트 생성
    generatePerformanceReport() {
        try {
            const metrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]');
            
            if (metrics.length === 0) {
                return { message: '성능 데이터가 없습니다.' };
            }
            
            const latest = metrics[metrics.length - 1];
            const avgPageLoad = metrics
                .filter(m => m.pageLoad)
                .reduce((sum, m) => sum + m.pageLoad, 0) / metrics.length;
            
            return {
                현재_상태: {
                    페이지_로딩: `${latest.pageLoad || 0}ms`,
                    평균_로딩: `${Math.round(avgPageLoad)}ms`,
                    API_호출수: latest.apiCalls,
                    메모리_사용량: latest.memory ? `${latest.memory.used}MB` : 'N/A',
                    네트워크: latest.connection ? latest.connection.effectiveType : 'N/A'
                },
                권장사항: this.getOptimizationSuggestions(latest)
            };
        } catch (error) {
            return { error: '성능 리포트 생성 실패' };
        }
    }

    // 최적화 권장사항
    getOptimizationSuggestions(metrics) {
        const suggestions = [];
        
        if (metrics.pageLoad > 3000) {
            suggestions.push('페이지 로딩 시간이 3초를 초과합니다. 이미지 최적화를 고려하세요.');
        }
        
        if (metrics.memory && metrics.memory.used > 100) {
            suggestions.push('메모리 사용량이 높습니다. 데이터 정리를 고려하세요.');
        }
        
        if (metrics.apiCalls > 50) {
            suggestions.push('API 호출이 많습니다. 캐싱 전략을 검토하세요.');
        }
        
        return suggestions.length > 0 ? suggestions : ['현재 성능이 양호합니다.'];
    }
}

// 전역 성능 최적화 인스턴스
let performanceOptimizer;

// DOM 로딩 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    performanceOptimizer = new PerformanceOptimizer();
    console.log('🚀 성능 최적화 시스템 활성화');
});

// 전역 함수로 성능 리포트 접근
window.getPerformanceReport = () => {
    return performanceOptimizer ? performanceOptimizer.generatePerformanceReport() : null;
};
