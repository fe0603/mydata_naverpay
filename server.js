// 마이데이터 투자 제안 시스템 - Express 서버
// 네이버페이 브랜드 가이드라인 준수 및 금융 보안 고려

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// 응답 캐싱을 위한 Map
const responseCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 미들웨어 (개발 환경용 - 관대한 설정)
if (process.env.NODE_ENV === 'production') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://api.allorigins.win", "https://query1.finance.yahoo.com", "https://openapi.koreainvestment.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
            },
        },
    }));
} else {
    // 개발 환경에서는 CSP 비활성화
    app.use(helmet({
        contentSecurityPolicy: false,
    }));
}

// CORS 설정 (마이데이터 정책 고려)
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://mydatanaverpay-h461dp11t-fe-gptersorgs-projects.vercel.app', 'https://mydata-naverpay.vercel.app'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON 파싱 및 크기 제한
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 제공 (개발 환경 캐시 방지)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname), {
        maxAge: '1d' // 프로덕션에서는 1일 캐시
    }));
} else {
    // 개발 환경에서는 캐시 비활성화
    app.use(express.static(path.join(__dirname), {
        maxAge: 0,
        etag: false,
        lastModified: false,
        setHeaders: (res, path) => {
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store',
                'Last-Modified': new Date(0).toUTCString(),
                'ETag': '"' + Math.random().toString(36) + '"'
            });
        }
    }));
}

// API 라우트

// 헬스 체크 엔드포인트 (디버깅용)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3001,
        apis: {
            gemini: !!process.env.GEMINI_API_KEY,
            kis: !!process.env.KIS_API_KEY
        }
    });
});


// 2. Gemini AI 연동 (투자 제안 생성)
app.post('/api/investment-advice', async (req, res) => {
    try {
        console.log('🤖 Gemini AI API 요청 받음:', req.body);
        
        // 캐시 키 생성 (요청 내용 기반)
        const requestString = JSON.stringify(req.body);
        const hash = crypto.createHash('md5');
        hash.update(requestString);
        const cacheKey = hash.digest('hex');
        
        // 캐시 확인
        if (responseCache.has(cacheKey)) {
            const cached = responseCache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log('📦 캐시된 응답 반환');
                return res.json(cached.data);
            } else {
                responseCache.delete(cacheKey);
            }
        }
        
        // 클라이언트에서 보내는 다양한 파라미터 이름 지원
        const { 
            portfolio, 
            riskLevel, 
            targetReturn, 
            marketData, 
            testPrompt,
            // 클라이언트에서 실제로 보내는 파라미터들
            currentPortfolio,
            riskTolerance,
            investmentAmount,
            portfolioData,
            userMessage,
            chatHistory,
            userProfile,
            prompt
        } = req.body;
        
        // API 키 확인 (헤더 또는 환경변수에서)
        const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
        
        if (!apiKey || apiKey === 'demo_key') {
            console.log('❌ Gemini API 키 누락');
            return res.status(401).json({
                error: 'Gemini API 키가 필요합니다.',
                message: 'X-API-Key 헤더로 실제 API 키를 전송하거나 환경변수를 설정해주세요.'
            });
        }
        
        // 파라미터 정규화 (클라이언트에서 보내는 다양한 이름 지원)
        const normalizedPortfolio = portfolio || currentPortfolio || '';
        const normalizedRiskLevel = riskLevel || riskTolerance || 'moderate';
        const normalizedTargetReturn = targetReturn || 5;
        
        console.log('📊 정규화된 파라미터:', {
            portfolio: normalizedPortfolio,
            riskLevel: normalizedRiskLevel,
            targetReturn: normalizedTargetReturn
        });
        
        // 입력값 검증 (더 유연하게)
        if (!normalizedPortfolio && !userMessage) {
            console.log('❌ 필수 파라미터 누락');
            return res.status(400).json({
                error: '필수 파라미터가 누락되었습니다.',
                received: Object.keys(req.body),
                required: ['portfolio 또는 currentPortfolio', 'userMessage (챗봇용)']
            });
        }
        
        // Gemini AI API 직접 호출
        const axios = require('axios');
        console.log('📊 Gemini AI API 호출 시작...');
        
        // 챗봇 요청인지 투자 제안 요청인지 구분
        let investmentPrompt;
        
        if (userMessage && req.body.portfolioContext) {
            // 리밸런싱 요청인지 확인
            if (userMessage.includes('리밸런싱') || userMessage.includes('포트폴리오 리밸런싱')) {
                // 리밸런싱 요청: 전문적인 포트폴리오 리밸런싱 조언
                investmentPrompt = createRebalancingPrompt(userMessage, req.body.portfolioContext);
            } else {
                // 챗봇 요청: 포트폴리오 컨텍스트를 활용한 개인화된 응답
                investmentPrompt = createChatbotPrompt(userMessage, req.body.portfolioContext, chatHistory);
            }
        } else {
            // 투자 제안 요청: 기존 로직
            investmentPrompt = testPrompt || createInvestmentPrompt(normalizedPortfolio, normalizedRiskLevel, normalizedTargetReturn, marketData);
        }
        
        // Gemini API 요청 데이터 (성능 최적화)
        const requestData = {
            contents: [{
                parts: [{
                    text: investmentPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.5,  // 더 일관된 응답을 위해 낮춤
                topP: 0.9,         // 더 빠른 응답을 위해 높임
                topK: 20,          // 더 빠른 응답을 위해 낮춤
                maxOutputTokens: 1024,  // 응답 길이 제한으로 속도 향상
                candidateCount: 1
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };
        
        // Gemini API 호출 (최적화된 설정)
        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            requestData,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000
            }
        );
        
        const advice = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                      '투자 제안을 생성할 수 없습니다. 다시 시도해 주세요.';
        
        const responseData = {
            success: true,
            advice: advice,
            timestamp: new Date().toISOString(),
            riskWarning: '투자에는 원금 손실의 위험이 있습니다. 이 제안은 참고용이며, 실제 투자 결정은 신중히 하시기 바랍니다.',
            apiUsage: {
                model: 'gemini-pro',
                promptLength: investmentPrompt ? investmentPrompt.length : 0,
                responseLength: advice.length
            }
        };
        
        // 응답을 캐시에 저장
        responseCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });
        
        // 캐시 크기 제한 (메모리 관리)
        if (responseCache.size > 100) {
            const firstKey = responseCache.keys().next().value;
            responseCache.delete(firstKey);
        }
        
        res.json(responseData);
        
    } catch (error) {
        console.error('투자 제안 생성 오류:', error);
        
        // 구체적인 에러 메시지 제공
        let errorMessage = '투자 제안 생성 중 오류가 발생했습니다.';
        if (error.message.includes('API_KEY_INVALID')) {
            errorMessage = '유효하지 않은 Gemini API 키입니다.';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            errorMessage = 'API 할당량이 초과되었습니다.';
        } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
            errorMessage = 'API 호출 제한에 걸렸습니다. 잠시 후 다시 시도해주세요.';
        }
        
        res.status(500).json({
            error: errorMessage,
            message: process.env.NODE_ENV === 'development' ? error.message : '서버 오류',
            errorCode: error.code || 'UNKNOWN_ERROR'
        });
    }
});

// 3-1. 종목 검색 API (오프라인 데이터베이스)
app.get('/api/naver-search/:query', async (req, res) => {
    const { query } = req.params;
    
    console.log(`🔍 종목 검색: ${query}`);
    
    // 확장된 종목 데이터베이스
    const stockDatabase = [
        { code: '005930', name: '삼성전자', market: 'KOSPI' },
        { code: '035420', name: 'NAVER', market: 'KOSPI' },
        { code: '035720', name: '카카오', market: 'KOSPI' },
        { code: '000660', name: 'SK하이닉스', market: 'KOSPI' },
        { code: '051910', name: 'LG화학', market: 'KOSPI' },
        { code: '005380', name: '현대자동차', market: 'KOSPI' },
        { code: '005490', name: 'POSCO홀딩스', market: 'KOSPI' },
        { code: '373220', name: 'LG에너지솔루션', market: 'KOSPI' },
        { code: '207940', name: '삼성바이오로직스', market: 'KOSPI' },
        { code: '003550', name: 'LG', market: 'KOSPI' },
        { code: '000270', name: '기아', market: 'KOSPI' },
        { code: '068270', name: '셀트리온', market: 'KOSPI' },
        { code: '015760', name: '한국전력', market: 'KOSPI' },
        { code: '323410', name: '카카오뱅크', market: 'KOSPI' },
        { code: '034730', name: 'SK', market: 'KOSPI' },
        { code: '030200', name: 'KT', market: 'KOSPI' },
        { code: '055550', name: '신한지주', market: 'KOSPI' },
        { code: '105560', name: 'KB금융', market: 'KOSPI' },
        { code: '086790', name: '하나금융지주', market: 'KOSPI' },
        { code: '051900', name: 'LG생활건강', market: 'KOSPI' },
        { code: '090430', name: '아모레퍼시픽', market: 'KOSPI' },
        { code: '066570', name: 'LG전자', market: 'KOSPI' },
        { code: '096770', name: 'SK이노베이션', market: 'KOSPI' },
        { code: '017670', name: 'SK텔레콤', market: 'KOSPI' },
        { code: '009150', name: '삼성전기', market: 'KOSPI' },
        { code: '010950', name: 'S-Oil', market: 'KOSPI' },
        { code: '032830', name: '삼성생명', market: 'KOSPI' },
        { code: '012330', name: '현대모비스', market: 'KOSPI' },
        { code: '028260', name: '삼성물산', market: 'KOSPI' },
        { code: '018260', name: '삼성에스디에스', market: 'KOSPI' },
        { code: '032640', name: 'LG유플러스', market: 'KOSPI' },
        { code: '011170', name: '롯데케미칼', market: 'KOSPI' },
        { code: '004020', name: '현대제철', market: 'KOSPI' },
        { code: '010130', name: '고려아연', market: 'KOSPI' },
        { code: '009540', name: 'HD한국조선해양', market: 'KOSPI' },
        { code: '000810', name: '삼성화재', market: 'KOSPI' },
        { code: '036570', name: '엔씨소프트', market: 'KOSPI' },
        { code: '051915', name: 'LG화학우', market: 'KOSPI' },
        { code: '139480', name: '이마트', market: 'KOSPI' }
    ];
    
    // 검색 수행 (이름, 코드, 부분 일치)
    const searchResults = stockDatabase.filter(stock => 
        stock.name.toLowerCase().includes(query.toLowerCase()) ||
        stock.code.includes(query) ||
        query.toLowerCase().includes(stock.name.toLowerCase())
    );
    
    const results = searchResults.map(item => ({
        code: item.code,
        name: item.name,
        fullName: item.name,
        market: item.market,
        url: `https://finance.naver.com/item/main.naver?code=${item.code}`
    }));
    
    console.log(`✅ 검색 결과 ${results.length}개: ${query}`);
    
    res.json({
        success: true,
        query: query,
        results: results,
        count: results.length,
        source: 'offline-database'
    });
});

// 3-2. 네이버 금융 API 연동 (실시간 데이터) - 개선된 종목 코드 처리
app.get('/api/naver-finance/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const axios = require('axios');
        const cheerio = require('cheerio'); // HTML 파싱용
        
        // 한국 주식 코드 변환 및 동적 검색
        let stockCode = symbol;
        
        // 기본 주요 종목 매핑 (빠른 접근용)
        const koreanStocks = {
            '삼성전자': '005930',
            '카카오': '035720',
            '네이버': '035420',
            'LG화학': '051910',
            'SK하이닉스': '000660',
            '현대차': '005380',
            'POSCO홀딩스': '005490',
            'LG에너지솔루션': '373220',
            '삼성바이오로직스': '207940',
            '크래프톤': '259960',
            'LG': '003550',
            '기아': '000270',
            '셀트리온': '068270',
            'NAVER': '035420',
            '한국전력': '015760',
            '카카오뱅크': '323410',
            'SK': '034730',
            '포스코': '005490',
            'KT': '030200',
            '신한지주': '055550',
            'KB금융': '105560',
            '하나금융지주': '086790',
            'LG생활건강': '051900',
            '아모레퍼시픽': '090430',
            'NAVER': '035420'
        };
        
        if (koreanStocks[symbol]) {
            stockCode = koreanStocks[symbol];
        } else if (symbol.match(/^\d{6}$/)) {
            // 6자리 숫자인 경우 그대로 사용
            stockCode = symbol;
        } else {
            // 종목명으로 검색하여 코드 찾기
            try {
                const searchResponse = await axios.get(`http://localhost:3000/api/naver-search/${encodeURIComponent(symbol)}`);
                if (searchResponse.data.success && searchResponse.data.results.length > 0) {
                    stockCode = searchResponse.data.results[0].code;
                    console.log(`🔍 ${symbol} 검색 결과: ${stockCode}`);
                } else {
                    console.log(`⚠️ ${symbol} 검색 결과 없음, 원본 유지`);
                }
            } catch (searchError) {
                console.log(`⚠️ ${symbol} 검색 실패, 원본 유지:`, searchError.message);
            }
        }
        
        console.log(`📊 네이버 금융 API 호출: ${symbol} → ${stockCode}`);
        
        // 네이버 증권 실시간 API 사용 (블로그 참고)
        let response;
        let isRealTimeData = false;
        
        try {
            // 1차: 네이버 증권 sise.json API (블로그 참고 - 가장 안정적)
            const siseApiUrl = `https://polling.finance.naver.com/api/realtime/domestic/stock/${stockCode}`;
            
            response = await axios.get(siseApiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Referer': `https://finance.naver.com/item/main.naver?code=${stockCode}`,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                timeout: 5000
            });
            
            if (response.data && (response.data.datas || response.data.result)) {
                console.log(`✅ 네이버 sise API 성공: ${symbol}`);
                isRealTimeData = true;
            } else {
                throw new Error('sise API 데이터 없음');
            }
            
        } catch (realtimeError) {
            console.log(`⚠️ 실시간 증권 API 실패: ${realtimeError.message}`);
            
            try {
                // 2차: 네이버 금융 일반 API 시도
                const generalApiUrl = `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${stockCode}`;
                
                response = await axios.get(generalApiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                        'Referer': `https://finance.naver.com/item/main.naver?code=${stockCode}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    timeout: 10000
                });
                
                if (response.data && response.data.result && response.data.result.areas && response.data.result.areas.length > 0) {
                    console.log(`✅ 네이버 일반 API 성공: ${symbol}`);
                    isRealTimeData = true;
                } else {
                    throw new Error('일반 API 데이터 없음');
                }
                
            } catch (generalError) {
                console.log(`⚠️ 일반 API도 실패, 웹 스크래핑으로 대체: ${generalError.message}`);
                
                // 3차: 웹 스크래핑 방식으로 최종 대체
                const naverFinanceUrl = `https://finance.naver.com/item/main.naver?code=${stockCode}`;
                response = await axios.get(naverFinanceUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    timeout: 15000
                });
                isRealTimeData = false;
            }
        }
        
        let result;
        
        // 실시간 API 데이터 처리 (다양한 응답 형식 지원)
        if (isRealTimeData && response.data) {
            let stockData = null;
            
            // 1. 네이버 증권 실시간 API 응답 형식
            if (response.data.datas && response.data.datas.length > 0) {
                stockData = response.data.datas[0];
                console.log(`📊 증권 실시간 API 데이터 형식 사용: ${symbol}`);
            }
            // 2. 일반 polling API 응답 형식
            else if (response.data.result && response.data.result.areas && response.data.result.areas.length > 0) {
                stockData = response.data.result.areas[0].datas[0];
                console.log(`📊 일반 polling API 데이터 형식 사용: ${symbol}`);
            }
            
            if (stockData) {
                // 데이터 필드 정규화 (다양한 API 응답 형식 대응)
                // 가격 데이터 처리 (문자열에서 숫자 추출)
                let priceStr = stockData.nv || stockData.closePrice || stockData.nowPrice || '0';
                let changeStr = stockData.cv || stockData.compareToPreviousClosePrice || '0';
                let changePercentStr = stockData.cr || stockData.fluctuationsRatio || '0';
                
                // 쉼표 제거 및 숫자 변환
                let price = parseInt(String(priceStr).replace(/[,\s]/g, '')) || 0;
                let change = parseInt(String(changeStr).replace(/[,\s+]/g, '')) || 0;
                let changePercent = parseFloat(String(changePercentStr).replace(/[%\s+]/g, '')) || 0;
                
                // 네이버 API 가격 스케일 조정 (API가 천원 단위로 반환하는 경우 대응)
                if (price > 0 && price < 1000) {
                    // 한국 주식 시장에서 주요 종목이 1000원 미만일 가능성은 매우 낮음
                    // 네이버 API가 천원 단위로 데이터를 제공하는 것으로 추정
                    const knownLargeStocks = [
                        '삼성전자', '005930', 'SAMSUNG',
                        '네이버', '035420', 'NAVER',
                        '카카오', '035720', 'KAKAO',
                        'SK하이닉스', '000660',
                        'LG화학', '051910',
                        '현대차', '005380'
                    ];
                    
                    const isLargeStock = knownLargeStocks.some(stock => 
                        symbol.includes(stock) || 
                        (stockData.nm && stockData.nm.includes(stock)) ||
                        stock.includes(symbol)
                    );
                    
                    if (isLargeStock || price < 500) {
                        // 천원 단위로 조정
                        price *= 1000;
                        change *= 1000;
                        console.log(`💰 ${symbol} 가격 조정: ${price.toLocaleString()}원`);
                    }
                }
                
                // 거래량 데이터 정규화 (과도한 값 방지)
                let volume = parseInt(stockData.aq || stockData.accumulatedTradingVolume) || 0;
                if (volume > 1000000000) { // 10억 이상이면 천 단위로 나누기
                    volume = Math.floor(volume / 1000);
                }
                if (volume > 100000000) { // 1억 이상이면 백 단위로 나누기  
                    volume = Math.floor(volume / 100);
                }
                
                result = {
                    success: true,
                    symbol: stockCode,
                    originalSymbol: symbol,
                    koreanName: stockData.nm || stockData.itemName || symbol,
                    price: price,
                    change: change,
                    changePercent: changePercent,
                    volume: volume,
                    marketCap: price * 50000000, // 추정값
                    previousClose: price - change,
                    dayHigh: parseInt(stockData.hv || stockData.highPrice) || price,
                    dayLow: parseInt(stockData.lv || stockData.lowPrice) || price,
                    fiftyTwoWeekHigh: parseInt(stockData.hy52 || stockData.weekHigh52) || 0,
                    fiftyTwoWeekLow: parseInt(stockData.ly52 || stockData.weekLow52) || 0,
                    beta: 1.0,
                    pe: parseFloat(stockData.per || stockData.eps) || 0,
                    currency: 'KRW',
                    exchangeName: 'KRX',
                    marketState: 'REGULAR',
                    timestamp: new Date().toISOString(),
                    lastUpdateTime: new Date().toISOString(),
                    source: 'naver-realtime-api',
                    isRealTime: true
                };
                
                console.log(`✅ 네이버 실시간 API ${symbol} 데이터:`, {
                    name: result.koreanName,
                    price: result.price,
                    change: result.change,
                    volume: result.volume,
                    realtime: true
                });
            } else {
                throw new Error('실시간 API 데이터 파싱 실패');
            }
            
        } else {
            // HTML 파싱으로 주식 데이터 추출 (백업)
            const $ = cheerio.load(response.data);
            
            // 종목명 추출
            const stockName = $('.wrap_company h2 a').text().trim() || symbol;
            
            // 현재가 추출 (여러 선택자 시도)
            let currentPrice = 0;
            const priceSelectors = [
                '.no_today .blind',
                '.today .no_today .blind',
                'td.td_now .blind',
                '.no_today',
                '.today .no_today'
            ];
            
            for (const selector of priceSelectors) {
                const priceText = $(selector).first().text().trim();
                if (priceText && priceText !== '') {
                    currentPrice = parseInt(priceText.replace(/[,\s]/g, ''));
                    if (!isNaN(currentPrice) && currentPrice > 0) {
                        break;
                    }
                }
            }
            
            // 전일 대비 추출
            let change = 0;
            let changePercent = 0;
            const changeSelectors = [
                '.no_exday .blind',
                '.today .no_exday .blind',
                '.no_exday',
                '.today .no_exday'
            ];
            
            for (const selector of changeSelectors) {
                const changeElements = $(selector);
                if (changeElements.length >= 2) {
                    const changeText = changeElements.eq(0).text().trim();
                    const percentText = changeElements.eq(1).text().trim();
                    
                    change = parseInt(changeText.replace(/[,\s+]/g, ''));
                    changePercent = parseFloat(percentText.replace(/[%\s+]/g, ''));
                    
                    if (!isNaN(change) && !isNaN(changePercent)) {
                        break;
                    }
                }
            }
            
            // 거래량 추출
            let volume = 0;
            const volumeSelectors = [
                'td.trading_volume .blind',
                '.trading_volume .blind',
                'tr:contains("거래량") td .blind'
            ];
            
            for (const selector of volumeSelectors) {
                const volumeText = $(selector).text().trim();
                if (volumeText && volumeText !== '') {
                    volume = parseInt(volumeText.replace(/[,\s]/g, ''));
                    if (!isNaN(volume) && volume > 0) {
                        break;
                    }
                }
            }
            
            // 52주 최고/최저 추출
            let fiftyTwoWeekHigh = 0;
            let fiftyTwoWeekLow = 0;
            
            $('tr').each((index, element) => {
                const rowText = $(element).text();
                if (rowText.includes('52주')) {
                    const cells = $(element).find('td');
                    if (cells.length >= 2) {
                        const highText = cells.eq(0).text().trim();
                        const lowText = cells.eq(1).text().trim();
                        
                        fiftyTwoWeekHigh = parseInt(highText.replace(/[,\s]/g, '')) || fiftyTwoWeekHigh;
                        fiftyTwoWeekLow = parseInt(lowText.replace(/[,\s]/g, '')) || fiftyTwoWeekLow;
                    }
                }
            });
            
            result = {
                success: true,
                symbol: stockCode,
                originalSymbol: symbol,
                koreanName: stockName,
                price: currentPrice,
                change: change,
                changePercent: changePercent,
                volume: volume,
                marketCap: currentPrice * 50000000, // 추정값 (실제로는 발행주식수 필요)
                previousClose: currentPrice - change,
                dayHigh: currentPrice + Math.abs(change),
                dayLow: currentPrice - Math.abs(change),
                fiftyTwoWeekHigh: fiftyTwoWeekHigh,
                fiftyTwoWeekLow: fiftyTwoWeekLow,
                beta: 1.0, // 기본값
                pe: 15.0, // 기본값
                currency: 'KRW',
                exchangeName: 'KRX',
                marketState: 'REGULAR',
                timestamp: new Date().toISOString(),
                lastUpdateTime: new Date().toISOString(),
                source: 'naver-scraping',
                isRealTime: false
            };
            
            console.log(`✅ 네이버 스크래핑 ${symbol} 데이터:`, {
                name: result.koreanName,
                price: result.price,
                change: result.change,
                volume: result.volume,
                realtime: false
            });
        }
        
        res.json(result);
        
    } catch (error) {
        console.error(`❌ 네이버 금융 API 오류 (${req.params.symbol}):`, error.message);
        
        // 에러 시 현실적인 데모 데이터 반환 (서비스 중단 방지)
        const demoStockData = {
            '삼성전자': { price: 71900, change: -800, changePercent: -1.1, volume: 12456789 },
            '005930.KS': { price: 71900, change: -800, changePercent: -1.1, volume: 12456789 },
            '카카오': { price: 54200, change: 600, changePercent: 1.12, volume: 8765432 },
            '035720.KS': { price: 54200, change: 600, changePercent: 1.12, volume: 8765432 },
            '네이버': { price: 195000, change: -2000, changePercent: -1.02, volume: 3456789 },
            '035420.KS': { price: 195000, change: -2000, changePercent: -1.02, volume: 3456789 },
            'LG화학': { price: 378000, change: 5000, changePercent: 1.34, volume: 234567 },
            'SK하이닉스': { price: 128500, change: -1500, changePercent: -1.15, volume: 9876543 }
        };
        
        const symbol = req.params.symbol;
        const stockData = demoStockData[symbol] || { 
            price: 50000 + Math.floor(Math.random() * 100000), 
            change: Math.floor(Math.random() * 4000) - 2000,
            changePercent: (Math.random() * 6) - 3,
            volume: Math.floor(Math.random() * 10000000) + 1000000
        };
        
        res.json({
            success: true, // 데모 모드에서는 success: true로 반환
            symbol: symbol,
            originalSymbol: symbol,
            koreanName: symbol,
            price: stockData.price,
            change: stockData.change,
            changePercent: stockData.changePercent,
            volume: stockData.volume,
            marketCap: stockData.price * 50000000, // 추정 시가총액
            previousClose: stockData.price - stockData.change,
            dayHigh: stockData.price + Math.floor(Math.random() * 2000),
            dayLow: stockData.price - Math.floor(Math.random() * 2000),
            currency: 'KRW',
            exchangeName: 'KRX',
            marketState: 'REGULAR',
            timestamp: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            demoMode: true,
            message: '실시간 API 연결 문제로 데모 데이터를 표시합니다'
        });
    }
});

// 4. KIS API 연동
app.post('/api/kis-token', async (req, res) => {
    try {
        const axios = require('axios');
        
        const response = await axios.post('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
            grant_type: 'client_credentials',
            appkey: process.env.KIS_API_KEY,
            appsecret: process.env.KIS_API_SECRET
        });
        
        res.json({
            success: true,
            token: response.data.access_token,
            expires_in: response.data.expires_in
        });
        
    } catch (error) {
        console.error('KIS 토큰 발급 오류:', error);
        res.status(500).json({
            error: 'KIS API 인증 실패'
        });
    }
});

app.get('/api/kis-stock/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const { authorization } = req.headers;
        const axios = require('axios');
        
        if (!authorization) {
            return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
        }
        
        const response = await axios.get(
            'https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price',
            {
                headers: {
                    'Authorization': authorization,
                    'appkey': process.env.KIS_API_KEY,
                    'appsecret': process.env.KIS_API_SECRET,
                    'tr_id': 'FHKST01010100'
                },
                params: {
                    fid_cond_mrkt_div_code: 'J',
                    fid_input_iscd: code
                }
            }
        );
        
        res.json(response.data);
        
    } catch (error) {
        console.error('KIS 주식 조회 오류:', error);
        res.status(500).json({
            error: '주식 정보 조회 실패',
            code: req.params.code
        });
    }
});

// 5. 포트폴리오 저장/불러오기 (로컬 스토리지 대안)
const portfolios = new Map(); // 실제 서비스에서는 데이터베이스 사용

app.post('/api/portfolio/save', (req, res) => {
    try {
        const { userId, portfolio } = req.body;
        
        if (!userId || !portfolio) {
            return res.status(400).json({ error: '사용자 ID와 포트폴리오 정보가 필요합니다.' });
        }
        
        const portfolioData = {
            ...portfolio,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        };
        
        portfolios.set(userId, portfolioData);
        
        res.json({
            success: true,
            message: '포트폴리오가 저장되었습니다.',
            portfolioId: userId
        });
        
    } catch (error) {
        console.error('포트폴리오 저장 오류:', error);
        res.status(500).json({ error: '포트폴리오 저장 실패' });
    }
});

app.get('/api/portfolio/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const portfolio = portfolios.get(userId);
        
        if (!portfolio) {
            return res.status(404).json({ error: '포트폴리오를 찾을 수 없습니다.' });
        }
        
        res.json({
            success: true,
            portfolio: portfolio
        });
        
    } catch (error) {
        console.error('포트폴리오 조회 오류:', error);
        res.status(500).json({ error: '포트폴리오 조회 실패' });
    }
});

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'market-data-integration.html'));
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error('서버 오류:', err);
    res.status(500).json({
        error: '서버 내부 오류가 발생했습니다.',
        message: process.env.NODE_ENV === 'development' ? err.message : '서버 오류'
    });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({
        error: '요청한 리소스를 찾을 수 없습니다.',
        path: req.path
    });
});

// Vercel 환경에서는 자동으로 서버가 시작되므로 listen을 조건부로 실행
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    // 로컬 개발 환경에서만 서버 시작
    app.listen(PORT, () => {
        console.log(`🚀 마이데이터 투자 제안 시스템이 포트 ${PORT}에서 실행 중입니다.`);
        console.log(`📊 시장 데이터 연동: http://localhost:${PORT}`);
        console.log(`💡 환경: ${process.env.NODE_ENV || 'development'}`);
        
        // 환경변수 체크
        if (!process.env.GEMINI_API_KEY) {
            console.warn('⚠️  GEMINI_API_KEY가 설정되지 않았습니다.');
        }
        if (!process.env.KIS_API_KEY) {
            console.warn('⚠️  KIS_API_KEY가 설정되지 않았습니다.');
        }
    });
} else {
    // Vercel 환경에서 로그 출력
    console.log(`🚀 Vercel 환경에서 마이데이터 투자 제안 시스템이 실행 중입니다.`);
    console.log(`💡 환경: ${process.env.NODE_ENV}`);
    
    // 환경변수 체크
    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  GEMINI_API_KEY가 설정되지 않았습니다.');
    }
    if (!process.env.KIS_API_KEY) {
        console.warn('⚠️  KIS_API_KEY가 설정되지 않았습니다.');
    }
}

// 투자 제안 프롬프트 생성 함수
function createInvestmentPrompt(portfolio, riskLevel, targetReturn, marketData) {
    return `
당신은 전문 투자 상담사입니다. 다음 정보를 바탕으로 개인 맞춤형 포트폴리오 리밸런싱 제안을 작성해주세요.

**현재 포트폴리오:**
${JSON.stringify(portfolio, null, 2)}

**투자 성향:** ${riskLevel}
**목표 수익률:** ${targetReturn}%

**현재 시장 데이터:**
${JSON.stringify(marketData, null, 2)}

**제안 형식:**
1. 현재 포트폴리오 분석
2. 시장 상황 진단
3. 리밸런싱 제안 (구체적인 매수/매도 종목과 수량)
4. 위험 요소 및 주의사항

**필수 포함사항:**
- 금융투자업법에 따른 투자 위험 고지
- "투자에는 원금 손실의 위험이 있습니다" 문구 포함
- 네이버페이 결제 시 혜택 안내
- 구체적이고 실행 가능한 액션 플랜

한국어로 전문적이면서도 이해하기 쉽게 작성해주세요.
`;
}

// 챗봇용 프롬프트 생성 함수
function createRebalancingPrompt(userMessage, portfolioContext) {
    const holdings = portfolioContext.holdings || [];
    const stockDetails = holdings.map(h => 
        `${h.name}: ${h.quantity}주 (${h.totalValue ? h.totalValue.toLocaleString() + '원' : 'N/A'})`
    ).join(', ');
    
    return `포트폴리오 리밸런싱 조언을 요청합니다.

투자자 정보:
- 위험성향: ${portfolioContext.riskTolerance || '보통'}
- 목표수익률: ${portfolioContext.targetReturn || '5'}%
- 투자금액: ${portfolioContext.investmentAmount ? Number(portfolioContext.investmentAmount).toLocaleString() + '원' : '미입력'}

현재 포트폴리오: ${stockDetails || '보유종목 없음'}

다음 내용으로 간결하게 조언해주세요:
1. 현재 포트폴리오 분석 (강점/약점)
2. 구체적인 리밸런싱 제안 (매도/매수 종목과 수량)
3. 신규 투자 추천 (다각화 종목)
4. 리스크 관리 방안
5. 투자 전략

마크다운 형식으로 작성하고, 모든 금액은 원화 기준으로 표시하세요. 투자 위험 고지사항을 포함하세요.`;
}

function createChatbotPrompt(userMessage, portfolioContext, chatHistory) {
    const holdings = portfolioContext.holdings || [];
    const stockNames = holdings.map(h => h.name).join(', ');
    
    return `투자 상담사입니다. 포트폴리오 정보를 바탕으로 조언해주세요.

질문: ${userMessage}

포트폴리오: ${stockNames || '보유종목 없음'}
투자금액: ${portfolioContext.investmentAmount ? Number(portfolioContext.investmentAmount).toLocaleString() + '원' : '미입력'}
위험성향: ${portfolioContext.riskTolerance || '보통'}

간결하고 실용적인 조언을 제공하세요. 투자 위험을 고지하고 한국 주식시장에 특화된 정보를 포함하세요.`;
}

module.exports = app;
