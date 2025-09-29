// 마이데이터 투자 제안 시스템 - Express 서버
// 네이버페이 브랜드 가이드라인 준수 및 금융 보안 고려

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

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
        ? ['https://your-domain.com'] 
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
        const { portfolio, riskLevel, targetReturn, marketData, testPrompt } = req.body;
        
        // API 키 확인 (헤더 또는 환경변수에서)
        const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
        
        if (!apiKey || apiKey === 'demo_key') {
            return res.status(401).json({
                error: 'Gemini API 키가 필요합니다.',
                message: 'X-API-Key 헤더로 실제 API 키를 전송하거나 환경변수를 설정해주세요.'
            });
        }
        
        // 입력값 검증
        if (!portfolio || !riskLevel || !targetReturn) {
            return res.status(400).json({
                error: '필수 파라미터가 누락되었습니다.',
                required: ['portfolio', 'riskLevel', 'targetReturn']
            });
        }
        
        // Gemini AI API 직접 호출
        const axios = require('axios');
        console.log('📊 Gemini AI API 호출 시작...');
        
        // 테스트 프롬프트가 있으면 사용, 없으면 투자 제안 프롬프트 생성
        const prompt = testPrompt || createInvestmentPrompt(portfolio, riskLevel, targetReturn, marketData);
        
        // Gemini API 요청 데이터
        const requestData = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048,
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
        
        // Gemini API 호출
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
        
        res.json({
            success: true,
            advice: advice,
            timestamp: new Date().toISOString(),
            riskWarning: '투자에는 원금 손실의 위험이 있습니다. 이 제안은 참고용이며, 실제 투자 결정은 신중히 하시기 바랍니다.',
            apiUsage: {
                model: 'gemini-pro',
                promptLength: prompt.length,
                responseLength: advice.length
            }
        });
        
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

// 3. 야후 파이낸스 API 연동 (실시간 데이터)
app.get('/api/yahoo-finance/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const axios = require('axios');
        
        // 한국 주식 심볼 변환 (삼성전자 → 005930.KS)
        let yahooSymbol = symbol;
        const koreanStocks = {
            '삼성전자': '005930.KS',
            '카카오': '035720.KS',
            '네이버': '035420.KS',
            'LG화학': '051910.KS',
            'SK하이닉스': '000660.KS',
            '현대차': '005380.KS',
            'POSCO홀딩스': '005490.KS',
            'LG에너지솔루션': '373220.KS',
            '삼성바이오로직스': '207940.KS',
            '크래프톤': '259960.KS'
        };
        
        if (koreanStocks[symbol]) {
            yahooSymbol = koreanStocks[symbol];
        } else if (symbol.match(/^\d{6}$/)) {
            // 6자리 숫자인 경우 한국 주식 코드로 판단
            yahooSymbol = `${symbol}.KS`; // KOSPI 기본
        }
        
        console.log(`📊 야후 파이낸스 API 호출: ${symbol} → ${yahooSymbol}`);
        
        // 실시간 시세 조회
        const quoteSummaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol}`;
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
        
        const [quoteSummaryResponse, chartResponse] = await Promise.all([
            axios.get(quoteSummaryUrl, {
                params: { modules: 'price,summaryDetail,defaultKeyStatistics' },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
                },
                timeout: 15000
            }),
            axios.get(chartUrl, {
                params: { interval: '1d', range: '1d' },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: 15000
            })
        ]);
        
        const quoteSummary = quoteSummaryResponse.data?.quoteSummary?.result?.[0];
        const chartData = chartResponse.data?.chart?.result?.[0];
        
        if (!quoteSummary && !chartData) {
            throw new Error('데이터 조회 실패');
        }
        
        // 데이터 추출 및 정리
        const price = quoteSummary?.price || chartData?.meta;
        const summaryDetail = quoteSummary?.summaryDetail;
        
        const result = {
            success: true,
            symbol: yahooSymbol,
            originalSymbol: symbol,
            koreanName: Object.keys(koreanStocks).find(key => koreanStocks[key] === yahooSymbol) || symbol,
            price: price?.regularMarketPrice || chartData?.meta?.regularMarketPrice || 0,
            change: price?.regularMarketChange || chartData?.meta?.regularMarketChange || 0,
            changePercent: price?.regularMarketChangePercent || chartData?.meta?.regularMarketChangePercent || 0,
            volume: price?.regularMarketVolume || chartData?.meta?.regularMarketVolume || 0,
            marketCap: summaryDetail?.marketCap || 0,
            previousClose: price?.previousClose || chartData?.meta?.previousClose || 0,
            dayHigh: price?.regularMarketDayHigh || chartData?.meta?.regularMarketDayHigh || 0,
            dayLow: price?.regularMarketDayLow || chartData?.meta?.regularMarketDayLow || 0,
            fiftyTwoWeekHigh: summaryDetail?.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: summaryDetail?.fiftyTwoWeekLow || 0,
            beta: summaryDetail?.beta || 0,
            pe: summaryDetail?.trailingPE || 0,
            currency: price?.currency || 'KRW',
            exchangeName: price?.exchangeName || 'KRX',
            marketState: price?.marketState || 'CLOSED',
            timestamp: new Date().toISOString(),
            lastUpdateTime: new Date(price?.regularMarketTime * 1000 || Date.now()).toISOString()
        };
        
        console.log(`✅ ${symbol} 데이터 조회 성공:`, {
            price: result.price,
            change: result.change,
            volume: result.volume
        });
        
        res.json(result);
        
    } catch (error) {
        console.error(`❌ 야후 파이낸스 API 오류 (${req.params.symbol}):`, error.message);
        
        // 에러 시 기본값 반환 (서비스 중단 방지)
        res.json({
            success: false,
            symbol: req.params.symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            error: '실시간 데이터 조회 실패 - 데모 데이터로 대체',
            timestamp: new Date().toISOString(),
            fallback: true
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

// 서버 시작
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

module.exports = app;
