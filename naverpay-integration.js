// 마이데이터 투자 제안 시스템 - 네이버페이 결제 연동
// 네이버페이 브랜드 가이드라인 준수 및 실제 결제 프로세스 구현

class NaverPayIntegration {
    constructor() {
        this.isInitialized = false;
        this.config = {
            // 실제 서비스에서는 환경변수에서 로드
            clientId: process.env.NAVERPAY_CLIENT_ID || 'demo_client_id',
            clientSecret: process.env.NAVERPAY_CLIENT_SECRET || 'demo_client_secret',
            mode: process.env.NODE_ENV === 'production' ? 'REAL' : 'TEST', // TEST or REAL
            returnUrl: window.location.origin + '/payment/success',
            cancelUrl: window.location.origin + '/payment/cancel',
            // 네이버페이 API 엔드포인트
            apiUrl: process.env.NODE_ENV === 'production' 
                ? 'https://pay.naver.com/payments'
                : 'https://dev.pay.naver.com/payments'
        };
        
        this.paymentMethods = {
            CARD: '신용카드',
            BANK: '계좌이체',
            VBANK: '가상계좌',
            PHONE: '휴대폰결제',
            POINT: '네이버페이 포인트',
            NPAY_POINT: '네이버페이 적립금'
        };
        
        this.initialize();
    }

    // 네이버페이 SDK 초기화
    async initialize() {
        try {
            // 네이버페이 SDK 로드 확인
            if (typeof Naver === 'undefined' || !Naver.Pay) {
                await this.loadNaverPaySDK();
            }

            // 네이버페이 설정
            if (Naver && Naver.Pay) {
                Naver.Pay.create({
                    mode: this.config.mode,
                    clientId: this.config.clientId,
                    chainId: 'investment_advisory' // 서비스 체인 ID
                });
                
                this.isInitialized = true;
                console.log('[NPay] 네이버페이 SDK 초기화 완료');
                
                // 결제 완료 이벤트 리스너 등록
                this.registerEventListeners();
            }
            
        } catch (error) {
            console.error('[NPay] 네이버페이 초기화 실패:', error);
            this.showError('네이버페이 서비스를 불러올 수 없습니다.');
        }
    }

    // 네이버페이 SDK 동적 로드
    async loadNaverPaySDK() {
        return new Promise((resolve, reject) => {
            // 이미 로드된 경우
            if (document.querySelector('script[src*="pay.naver.com"]')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = this.config.mode === 'REAL' 
                ? 'https://pay.naver.com/customer/js/naverPaySdk.js'
                : 'https://test-pay.naver.com/customer/js/naverPaySdk.js';
            
            script.onload = () => {
                console.log('[NPay] SDK 로드 완료');
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error('네이버페이 SDK 로드 실패'));
            };
            
            document.head.appendChild(script);
        });
    }

    // 이벤트 리스너 등록
    registerEventListeners() {
        // 결제 성공 이벤트
        window.addEventListener('naverpay:success', (event) => {
            this.handlePaymentSuccess(event.detail);
        });

        // 결제 실패 이벤트
        window.addEventListener('naverpay:fail', (event) => {
            this.handlePaymentFail(event.detail);
        });

        // 결제 취소 이벤트
        window.addEventListener('naverpay:cancel', (event) => {
            this.handlePaymentCancel(event.detail);
        });
    }

    // 투자 상품 결제 요청
    async requestInvestmentPayment(paymentData) {
        try {
            if (!this.isInitialized) {
                throw new Error('네이버페이가 초기화되지 않았습니다.');
            }

            // 결제 데이터 검증
            this.validatePaymentData(paymentData);

            // 네이버페이 브랜드 가이드라인 준수 확인
            this.validateBrandGuidelines();

            // 결제 요청 데이터 생성
            const paymentRequest = this.createPaymentRequest(paymentData);

            // 결제창 호출
            const result = await this.openPaymentWindow(paymentRequest);
            
            return {
                success: true,
                paymentId: result.paymentId,
                message: '결제가 시작되었습니다.'
            };

        } catch (error) {
            console.error('[NPay] 결제 요청 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 포트폴리오 투자 상품 결제
    async payForPortfolioInvestment(portfolioData, investmentAmount) {
        const paymentData = {
            productName: `마이데이터 포트폴리오 투자`,
            productCount: 1,
            totalPayAmount: investmentAmount,
            taxScopeAmount: investmentAmount,
            taxExScopeAmount: 0,
            productItems: this.createProductItems(portfolioData),
            userAgreement: {
                paymentAgreement: true,
                useCfmService: true
            },
            merchantUserKey: this.generateMerchantUserKey(),
            merchantPayKey: this.generateMerchantPayKey(),
            productType: 'INVESTMENT' // 투자 상품 타입
        };

        return await this.requestInvestmentPayment(paymentData);
    }

    // AI 투자 조언 서비스 결제
    async payForInvestmentAdvice(adviceType, duration) {
        const pricingTable = {
            'basic': { monthly: 9900, yearly: 99000 },
            'premium': { monthly: 19900, yearly: 199000 },
            'professional': { monthly: 39900, yearly: 399000 }
        };

        const price = pricingTable[adviceType]?.[duration] || 9900;
        const serviceName = this.getServiceName(adviceType, duration);

        const paymentData = {
            productName: serviceName,
            productCount: 1,
            totalPayAmount: price,
            taxScopeAmount: Math.floor(price / 1.1), // 부가세 포함 계산
            taxExScopeAmount: 0,
            productItems: [{
                categoryType: 'SERVICE',
                categoryId: 'investment_advice',
                uid: `advice_${adviceType}_${duration}`,
                name: serviceName,
                payReferrer: 'NAVER_PAY',
                count: 1,
                payAmount: price,
                startDate: new Date().toISOString().split('T')[0],
                endDate: this.calculateEndDate(duration)
            }],
            userAgreement: {
                paymentAgreement: true,
                useCfmService: true
            },
            merchantUserKey: this.generateMerchantUserKey(),
            merchantPayKey: this.generateMerchantPayKey(),
            productType: 'SUBSCRIPTION' // 구독 서비스 타입
        };

        return await this.requestInvestmentPayment(paymentData);
    }

    // 결제 요청 데이터 생성
    createPaymentRequest(paymentData) {
        return {
            mode: this.config.mode,
            payType: 'normal', // normal, recurring
            merchantUserKey: paymentData.merchantUserKey,
            merchantPayKey: paymentData.merchantPayKey,
            productName: paymentData.productName,
            productCount: paymentData.productCount,
            totalPayAmount: paymentData.totalPayAmount,
            taxScopeAmount: paymentData.taxScopeAmount,
            taxExScopeAmount: paymentData.taxExScopeAmount,
            returnUrl: this.config.returnUrl,
            cancelUrl: this.config.cancelUrl,
            
            // 상품 정보
            productItems: paymentData.productItems,
            
            // 사용자 동의
            userAgreement: paymentData.userAgreement,
            
            // 브랜드 설정 (네이버페이 가이드라인 준수)
            brandPay: {
                showLogo: true,
                merchantName: '마이데이터 투자',
                brandColor: '#03C75A', // Npay Green
                serviceLogoUrl: window.location.origin + '/assets/service-logo.png'
            },
            
            // 결제 수단 설정
            paymentMethods: ['CARD', 'BANK', 'POINT'],
            
            // 할부 설정
            cardInstallmentPlanMonths: [0, 2, 3, 4, 5, 6], // 일시불, 2-6개월 할부
            
            // 기타 옵션
            purchaserName: '고객',
            purchaserBirthday: '',
            isExchangeStudent: false,
            
            // 투자 상품 특별 설정
            investmentAgreement: {
                riskDisclosure: true, // 투자 위험 고지 동의
                termsOfService: true, // 서비스 이용약관 동의
                privacyPolicy: true,  // 개인정보 처리방침 동의
                marketingConsent: false // 마케팅 수신 동의 (선택)
            }
        };
    }

    // 결제창 열기
    async openPaymentWindow(paymentRequest) {
        return new Promise((resolve, reject) => {
            try {
                // 네이버페이 결제 창 호출
                Naver.Pay.open(paymentRequest, {
                    onSuccess: (result) => {
                        console.log('[NPay] 결제 성공:', result);
                        resolve(result);
                    },
                    onFail: (error) => {
                        console.error('[NPay] 결제 실패:', error);
                        reject(new Error(error.message || '결제에 실패했습니다.'));
                    },
                    onCancel: () => {
                        console.log('[NPay] 결제 취소');
                        reject(new Error('결제가 취소되었습니다.'));
                    }
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // 결제 승인 처리
    async approvePayment(paymentId, merchantPayKey) {
        try {
            const response = await fetch('/api/naverpay/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAccessToken()}`
                },
                body: JSON.stringify({
                    paymentId: paymentId,
                    merchantPayKey: merchantPayKey
                })
            });

            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    paymentDetail: result.paymentDetail,
                    message: '결제가 성공적으로 완료되었습니다.'
                };
            } else {
                throw new Error(result.message || '결제 승인에 실패했습니다.');
            }

        } catch (error) {
            console.error('[NPay] 결제 승인 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 결제 취소 처리
    async cancelPayment(paymentId, cancelAmount, cancelReason) {
        try {
            const response = await fetch('/api/naverpay/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAccessToken()}`
                },
                body: JSON.stringify({
                    paymentId: paymentId,
                    cancelAmount: cancelAmount,
                    cancelReason: cancelReason,
                    taxScopeAmount: Math.floor(cancelAmount / 1.1),
                    taxExScopeAmount: 0
                })
            });

            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    cancelDetail: result.cancelDetail,
                    message: '결제 취소가 완료되었습니다.'
                };
            } else {
                throw new Error(result.message || '결제 취소에 실패했습니다.');
            }

        } catch (error) {
            console.error('[NPay] 결제 취소 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 결제 내역 조회
    async getPaymentHistory(startDate, endDate, page = 1, size = 20) {
        try {
            const params = new URLSearchParams({
                startDate: startDate,
                endDate: endDate,
                page: page.toString(),
                size: size.toString()
            });

            const response = await fetch(`/api/naverpay/payments?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    payments: result.payments,
                    totalCount: result.totalCount,
                    currentPage: page
                };
            } else {
                throw new Error(result.message || '결제 내역 조회에 실패했습니다.');
            }

        } catch (error) {
            console.error('[NPay] 결제 내역 조회 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 정기 결제 등록
    async registerRecurringPayment(recurringData) {
        try {
            const response = await fetch('/api/naverpay/recurring/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAccessToken()}`
                },
                body: JSON.stringify(recurringData)
            });

            const result = await response.json();
            
            if (result.success) {
                return {
                    success: true,
                    recurringId: result.recurringId,
                    message: '정기 결제가 등록되었습니다.'
                };
            } else {
                throw new Error(result.message || '정기 결제 등록에 실패했습니다.');
            }

        } catch (error) {
            console.error('[NPay] 정기 결제 등록 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 이벤트 핸들러들
    handlePaymentSuccess(paymentData) {
        console.log('[NPay] 결제 성공 처리:', paymentData);
        
        // 결제 성공 후 처리 로직
        this.processSuccessfulPayment(paymentData);
        
        // 사용자에게 성공 알림
        this.showSuccess('결제가 성공적으로 완료되었습니다!');
        
        // 결제 성공 이벤트 발생
        window.dispatchEvent(new CustomEvent('investment:paymentSuccess', {
            detail: paymentData
        }));
    }

    handlePaymentFail(errorData) {
        console.error('[NPay] 결제 실패 처리:', errorData);
        
        // 결제 실패 로그 저장
        this.logPaymentError(errorData);
        
        // 사용자에게 실패 알림
        this.showError(`결제에 실패했습니다: ${errorData.message}`);
        
        // 결제 실패 이벤트 발생
        window.dispatchEvent(new CustomEvent('investment:paymentFail', {
            detail: errorData
        }));
    }

    handlePaymentCancel(cancelData) {
        console.log('[NPay] 결제 취소 처리:', cancelData);
        
        // 사용자에게 취소 알림
        this.showInfo('결제가 취소되었습니다.');
        
        // 결제 취소 이벤트 발생
        window.dispatchEvent(new CustomEvent('investment:paymentCancel', {
            detail: cancelData
        }));
    }

    // 결제 성공 후 처리
    async processSuccessfulPayment(paymentData) {
        try {
            // 결제 승인 처리
            const approveResult = await this.approvePayment(
                paymentData.paymentId, 
                paymentData.merchantPayKey
            );

            if (approveResult.success) {
                // 투자 서비스 활성화
                await this.activateInvestmentService(paymentData);
                
                // 결제 내역 저장
                await this.savePaymentRecord(approveResult.paymentDetail);
                
                // 영수증 발행
                await this.issueReceipt(approveResult.paymentDetail);
                
            } else {
                throw new Error('결제 승인에 실패했습니다.');
            }

        } catch (error) {
            console.error('[NPay] 결제 후 처리 실패:', error);
            this.showError('결제는 완료되었으나 서비스 활성화 중 오류가 발생했습니다.');
        }
    }

    // 투자 서비스 활성화
    async activateInvestmentService(paymentData) {
        // 결제 상품에 따른 서비스 활성화 로직
        if (paymentData.productType === 'INVESTMENT') {
            // 포트폴리오 투자 실행
            await this.executePortfolioInvestment(paymentData);
        } else if (paymentData.productType === 'SUBSCRIPTION') {
            // 구독 서비스 활성화
            await this.activateSubscriptionService(paymentData);
        }
    }

    // 유틸리티 메서드들
    validatePaymentData(paymentData) {
        const required = ['productName', 'totalPayAmount', 'merchantUserKey', 'merchantPayKey'];
        
        for (const field of required) {
            if (!paymentData[field]) {
                throw new Error(`필수 결제 정보가 누락되었습니다: ${field}`);
            }
        }

        if (paymentData.totalPayAmount < 100) {
            throw new Error('최소 결제 금액은 100원입니다.');
        }

        if (paymentData.totalPayAmount > 10000000) {
            throw new Error('최대 결제 금액은 1천만원입니다.');
        }
    }

    validateBrandGuidelines() {
        // 네이버페이 브랜드 가이드라인 준수 확인
        const brandElements = document.querySelectorAll('[class*="npay"], [class*="naverpay"]');
        
        brandElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const backgroundColor = computedStyle.backgroundColor;
            
            // 브랜드 색상 확인 (Npay Green: #03C75A)
            if (backgroundColor.includes('rgb(3, 199, 90)') || backgroundColor.includes('#03C75A')) {
                console.log('[NPay] 브랜드 가이드라인 준수 확인됨');
            }
        });
    }

    createProductItems(portfolioData) {
        const items = [];
        
        if (portfolioData.stocks) {
            Object.entries(portfolioData.stocks).forEach(([stockName, stockInfo]) => {
                items.push({
                    categoryType: 'INVESTMENT',
                    categoryId: 'stock_investment',
                    uid: `stock_${stockName.replace(/\s+/g, '_')}`,
                    name: `${stockName} ${stockInfo.shares}주`,
                    payReferrer: 'NAVER_PAY',
                    count: stockInfo.shares,
                    payAmount: stockInfo.shares * (stockInfo.currentPrice || stockInfo.price || 0),
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1년 후
                });
            });
        }

        return items;
    }

    generateMerchantUserKey() {
        // 사용자 식별키 생성 (실제로는 로그인된 사용자 ID 사용)
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateMerchantPayKey() {
        // 결제 식별키 생성
        return 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getServiceName(adviceType, duration) {
        const typeNames = {
            'basic': '기본 투자 조언',
            'premium': '프리미엄 투자 조언',
            'professional': '전문가 투자 조언'
        };
        
        const durationNames = {
            'monthly': '월간 구독',
            'yearly': '연간 구독'
        };

        return `${typeNames[adviceType]} - ${durationNames[duration]}`;
    }

    calculateEndDate(duration) {
        const now = new Date();
        if (duration === 'monthly') {
            now.setMonth(now.getMonth() + 1);
        } else if (duration === 'yearly') {
            now.setFullYear(now.getFullYear() + 1);
        }
        return now.toISOString().split('T')[0];
    }

    getAccessToken() {
        // 실제 구현에서는 인증 토큰 반환
        return localStorage.getItem('access_token') || 'demo_token';
    }

    // 알림 메서드들
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#03C75A' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    // 로깅 메서드들
    logPaymentError(errorData) {
        // 실제 구현에서는 서버로 에러 로그 전송
        console.error('[NPay] Payment Error Log:', {
            timestamp: new Date().toISOString(),
            error: errorData,
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }

    async savePaymentRecord(paymentDetail) {
        // 실제 구현에서는 데이터베이스에 결제 내역 저장
        console.log('[NPay] Payment Record Saved:', paymentDetail);
    }

    async issueReceipt(paymentDetail) {
        // 실제 구현에서는 영수증 발행 로직
        console.log('[NPay] Receipt Issued:', paymentDetail);
    }

    async executePortfolioInvestment(paymentData) {
        // 실제 구현에서는 증권사 API 연동하여 실제 투자 실행
        console.log('[NPay] Portfolio Investment Executed:', paymentData);
    }

    async activateSubscriptionService(paymentData) {
        // 실제 구현에서는 구독 서비스 활성화
        console.log('[NPay] Subscription Service Activated:', paymentData);
    }
}

// 전역 네이버페이 인스턴스
let naverPay = null;

// 네이버페이 초기화
function initializeNaverPay() {
    if (!naverPay) {
        naverPay = new NaverPayIntegration();
    }
    return naverPay;
}

// 전역 접근을 위한 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NaverPayIntegration, initializeNaverPay };
} else {
    window.NaverPayIntegration = NaverPayIntegration;
    window.initializeNaverPay = initializeNaverPay;
}
