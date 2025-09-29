// 마이데이터 시장 데이터 연동 및 리밸런싱 시스템
// 네이버페이 브랜드 가이드라인 준수 및 금융 규제 고려

class MarketDataIntegrator {
    constructor() {
        this.portfolio = {};
        this.marketData = {};
        this.chart = null;
        this.db = null; // 데이터베이스 인스턴스
        this.currentPortfolioId = null; // 현재 포트폴리오 ID
        
        // API 설정 (브라우저 환경에서는 환경변수 접근 불가, 실제 서비스에서는 서버 API 사용)
        this.config = {
            geminiApiKey: 'demo_key', // 실제 서비스에서는 서버 API 통해 접근
            kisApiKey: 'demo_key',
            kisApiSecret: 'demo_secret',
            corsProxy: 'https://api.allorigins.win/raw?url=', // CORS 우회용
        };
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // 데이터베이스 초기화
            this.db = await initializeDatabase();
            console.log('[App] 데이터베이스 연결 완료');
            
            // 이전 포트폴리오 로드
            await this.loadLastPortfolio();
            
            // 이벤트 리스너 설정
            this.initializeEventListeners();
            
            // 히스토리 대시보드 버튼 추가
            this.addHistoryButton();
            
        } catch (error) {
            console.error('[App] 초기화 실패:', error);
            this.initializeEventListeners(); // 데이터베이스 없이도 기본 기능은 동작
        }
    }

    initializeEventListeners() {
        // 페이지 로드 시 샘플 데이터 자동 로드
        document.addEventListener('DOMContentLoaded', () => {
            this.loadSampleData();
        });
    }

    // 1단계: 포트폴리오 분석
    async analyzePortfolio() {
        const portfolioText = document.getElementById('current-portfolio').value;
        const investmentAmount = document.getElementById('investment-amount').value;
        
        if (!portfolioText || !investmentAmount) {
            alert('포트폴리오와 투자금액을 모두 입력해주세요.');
            return;
        }

        try {
            // 포트폴리오 파싱
            this.portfolio = this.parsePortfolio(portfolioText, investmentAmount);
            
            // UI 업데이트
            this.displayPortfolioAnalysis();
            
            // 자동으로 시장 데이터 가져오기
            await this.fetchMarketData('sample');
            
            // 데이터베이스에 저장
            await this.savePortfolioToDatabase();
            
        } catch (error) {
            console.error('포트폴리오 분석 오류:', error);
            this.showError('포트폴리오 분석 중 오류가 발생했습니다.');
        }
    }

    // 데이터베이스에 포트폴리오 저장
    async savePortfolioToDatabase() {
        if (!this.db) {
            console.warn('[App] 데이터베이스가 연결되지 않아 저장을 건너뜁니다.');
            return;
        }

        try {
            const portfolioData = {
                totalAmount: this.portfolio.totalAmount,
                stocks: this.portfolio.stocks,
                marketData: this.marketData,
                lastUpdated: new Date()
            };

            this.currentPortfolioId = await this.db.savePortfolio(portfolioData);
            console.log('[App] 포트폴리오 저장 완료:', this.currentPortfolioId);
            
            // 시장 데이터도 저장
            if (Object.keys(this.marketData).length > 0) {
                await this.db.saveMarketData(this.marketData, 'sample');
            }
            
            this.showSuccess('포트폴리오가 히스토리에 저장되었습니다.');
            
        } catch (error) {
            console.error('[App] 포트폴리오 저장 실패:', error);
            // 저장 실패해도 분석은 계속 진행
        }
    }

    // 이전 포트폴리오 로드
    async loadLastPortfolio() {
        if (!this.db) return;

        try {
            const lastPortfolio = await this.db.getLatestPortfolio();
            if (lastPortfolio) {
                // 폼에 이전 데이터 자동 입력
                const portfolioText = Object.entries(lastPortfolio.stocks)
                    .map(([name, info]) => `${name} ${info.shares}주`)
                    .join(', ');
                
                document.getElementById('current-portfolio').value = portfolioText;
                document.getElementById('investment-amount').value = lastPortfolio.totalAmount;
                
                console.log('[App] 이전 포트폴리오 로드 완료');
                this.showInfo('이전 포트폴리오 데이터를 불러왔습니다.');
            }
        } catch (error) {
            console.error('[App] 이전 포트폴리오 로드 실패:', error);
        }
    }

    // 히스토리 대시보드 버튼 추가
    addHistoryButton() {
        const exportOptions = document.querySelector('.export-options');
        if (exportOptions) {
            const historyButton = document.createElement('button');
            historyButton.className = 'btn secondary';
            historyButton.innerHTML = '📊 히스토리 대시보드';
            historyButton.onclick = () => {
                window.open('history-dashboard.html', '_blank');
            };
            
            exportOptions.insertBefore(historyButton, exportOptions.firstChild);
        }
    }

    parsePortfolio(portfolioText, totalAmount) {
        const stocks = {};
        const lines = portfolioText.split(/[,\n]/);
        
        lines.forEach(line => {
            const match = line.trim().match(/(.+?)\s*(\d+)\s*주/);
            if (match) {
                const [, name, shares] = match;
                stocks[name.trim()] = {
                    shares: parseInt(shares),
                    currentPrice: 0,
                    value: 0
                };
            }
        });
        
        return {
            stocks,
            totalAmount: parseInt(totalAmount),
            lastUpdated: new Date()
        };
    }

    displayPortfolioAnalysis() {
        const analysis = document.createElement('div');
        analysis.className = 'portfolio-analysis';
        analysis.innerHTML = `
            <h3>📊 포트폴리오 분석 결과</h3>
            <div class="portfolio-summary">
                <p><strong>총 투자금액:</strong> ${this.portfolio.totalAmount.toLocaleString()}원</p>
                <p><strong>보유 종목 수:</strong> ${Object.keys(this.portfolio.stocks).length}개</p>
                <p><strong>마지막 업데이트:</strong> ${this.portfolio.lastUpdated.toLocaleString()}</p>
            </div>
        `;
        
        const portfolioSection = document.getElementById('portfolio-section');
        const existingAnalysis = portfolioSection.querySelector('.portfolio-analysis');
        if (existingAnalysis) {
            existingAnalysis.remove();
        }
        portfolioSection.appendChild(analysis);
    }

    // 2단계: 시장 데이터 연동
    async fetchMarketData(source = 'sample') {
        const loading = document.getElementById('loading');
        const stockGrid = document.getElementById('stock-grid');
        
        loading.style.display = 'flex';
        stockGrid.innerHTML = '';
        
        try {
            let data;
            switch (source) {
                case 'yahoo':
                    data = await this.fetchYahooFinanceData();
                    break;
                case 'kis':
                    data = await this.fetchKISData();
                    break;
                default:
                    data = await this.fetchSampleData();
            }
            
            this.marketData = data;
            this.displayMarketData();
            this.updatePortfolioValues();
            
        } catch (error) {
            console.error('시장 데이터 가져오기 오류:', error);
            this.showError(`${source} 데이터를 가져오는 중 오류가 발생했습니다. 샘플 데이터로 대체합니다.`);
            
            // 실패 시 샘플 데이터로 대체
            if (source !== 'sample') {
                await this.fetchMarketData('sample');
            }
        } finally {
            loading.style.display = 'none';
        }
    }

    async fetchYahooFinanceData() {
        // 야후 파이낸스 API 연동 (CORS 제한으로 프록시 사용)
        const symbols = ['005930.KS', '035720.KS', '035420.KS', '000660.KS', '051910.KS']; // 삼성전자, 카카오, 네이버, SK하이닉스, LG화학
        const data = {};
        
        for (const symbol of symbols) {
            try {
                const url = `${this.config.corsProxy}https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
                const response = await axios.get(url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const result = response.data.chart.result[0];
                const meta = result.meta;
                const quote = result.indicators.quote[0];
                
                const name = this.getKoreanStockName(symbol);
                data[name] = {
                    symbol: symbol,
                    price: meta.regularMarketPrice,
                    change: meta.regularMarketPrice - meta.previousClose,
                    changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
                    volume: quote.volume[quote.volume.length - 1],
                    marketCap: meta.regularMarketPrice * meta.sharesOutstanding
                };
                
                // API 호출 제한 고려하여 딜레이
                await this.delay(200);
                
            } catch (error) {
                console.warn(`${symbol} 데이터 가져오기 실패:`, error);
            }
        }
        
        return data;
    }

    async fetchKISData() {
        // 한국투자증권 KIS API 연동
        if (!this.config.kisApiKey || !this.config.kisApiSecret) {
            throw new Error('KIS API 키가 설정되지 않았습니다.');
        }
        
        try {
            // 1. 접근 토큰 발급
            const tokenResponse = await axios.post('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
                grant_type: 'client_credentials',
                appkey: this.config.kisApiKey,
                appsecret: this.config.kisApiSecret
            });
            
            const accessToken = tokenResponse.data.access_token;
            
            // 2. 주식 시세 조회
            const stocks = ['005930', '035720', '035420', '000660', '051910'];
            const data = {};
            
            for (const code of stocks) {
                const response = await axios.get(
                    `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'appkey': this.config.kisApiKey,
                            'appsecret': this.config.kisApiSecret,
                            'tr_id': 'FHKST01010100'
                        },
                        params: {
                            fid_cond_mrkt_div_code: 'J',
                            fid_input_iscd: code
                        }
                    }
                );
                
                const output = response.data.output;
                const name = this.getKoreanStockName(code);
                
                data[name] = {
                    symbol: code,
                    price: parseInt(output.stck_prpr),
                    change: parseInt(output.prdy_vrss),
                    changePercent: parseFloat(output.prdy_ctrt),
                    volume: parseInt(output.acml_vol),
                    marketCap: parseInt(output.stck_prpr) * parseInt(output.lstg_stqt)
                };
                
                await this.delay(100); // API 호출 제한 고려
            }
            
            return data;
            
        } catch (error) {
            console.error('KIS API 오류:', error);
            throw new Error('KIS API 연동에 실패했습니다.');
        }
    }

    async fetchSampleData() {
        // 개발 및 테스트용 샘플 데이터
        await this.delay(1500); // 실제 API 호출처럼 지연 시뮬레이션
        
        return {
            '삼성전자': {
                symbol: '005930',
                price: 71900,
                change: 1100,
                changePercent: 1.55,
                volume: 12543210,
                marketCap: 429000000000000
            },
            '카카오': {
                symbol: '035720',
                price: 54200,
                change: -800,
                changePercent: -1.45,
                volume: 3421567,
                marketCap: 24000000000000
            },
            '네이버': {
                symbol: '035420',
                price: 195000,
                change: 2500,
                changePercent: 1.30,
                volume: 876543,
                marketCap: 32000000000000
            },
            'SK하이닉스': {
                symbol: '000660',
                price: 128500,
                change: -1500,
                changePercent: -1.15,
                volume: 2134567,
                marketCap: 93000000000000
            },
            'LG화학': {
                symbol: '051910',
                price: 378000,
                change: 5000,
                changePercent: 1.34,
                volume: 654321,
                marketCap: 26700000000000
            }
        };
    }

    displayMarketData() {
        const stockGrid = document.getElementById('stock-grid');
        stockGrid.innerHTML = '';
        
        Object.entries(this.marketData).forEach(([name, data]) => {
            const card = document.createElement('div');
            card.className = 'stock-card';
            
            const changeClass = data.change >= 0 ? 'positive' : 'negative';
            const changeSymbol = data.change >= 0 ? '+' : '';
            
            card.innerHTML = `
                <div class="stock-name">${name}</div>
                <div class="stock-price">${data.price.toLocaleString()}원</div>
                <div class="stock-change ${changeClass}">
                    ${changeSymbol}${data.change.toLocaleString()}원 (${data.changePercent.toFixed(2)}%)
                </div>
                <div class="stock-info">
                    <small>거래량: ${data.volume.toLocaleString()}</small>
                </div>
            `;
            
            stockGrid.appendChild(card);
        });
    }

    updatePortfolioValues() {
        // 포트폴리오 종목의 현재 가격 업데이트
        Object.keys(this.portfolio.stocks).forEach(stockName => {
            if (this.marketData[stockName]) {
                const stock = this.portfolio.stocks[stockName];
                stock.currentPrice = this.marketData[stockName].price;
                stock.value = stock.shares * stock.currentPrice;
            }
        });
    }

    // 3단계: AI 리밸런싱 제안
    async generateRebalancingAdvice() {
        const riskLevel = document.getElementById('risk-level').value;
        const targetReturn = document.getElementById('target-return').value;
        const resultDiv = document.getElementById('rebalancing-result');
        
        resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>AI가 최적의 리밸런싱을 분석 중입니다...</p></div>';
        
        try {
            // Gemini AI를 통한 리밸런싱 제안 생성
            const advice = await this.getAIRebalancingAdvice(riskLevel, targetReturn);
            this.displayRebalancingAdvice(advice);
            
            // 차트 업데이트
            this.updatePortfolioChart();
            
            // 액션 플랜 생성
            this.generateActionPlan(advice);
            
        } catch (error) {
            console.error('리밸런싱 제안 생성 오류:', error);
            this.showError('AI 리밸런싱 제안 생성 중 오류가 발생했습니다.');
        }
    }

    async getAIRebalancingAdvice(riskLevel, targetReturn) {
        // 실제 구현에서는 Gemini API 호출
        // 현재는 샘플 응답 반환
        await this.delay(2000);
        
        const portfolioSummary = this.createPortfolioSummary();
        const marketSummary = this.createMarketSummary();
        
        // 리스크 수준별 포트폴리오 조정 로직
        const riskProfiles = {
            conservative: {
                stocks: 40,
                bonds: 50,
                cash: 10,
                description: '안정적인 수익을 추구하는 보수적 포트폴리오'
            },
            moderate: {
                stocks: 60,
                bonds: 30,
                cash: 10,
                description: '적정 위험을 감수하며 균형잡힌 수익을 추구'
            },
            aggressive: {
                stocks: 80,
                bonds: 15,
                cash: 5,
                description: '높은 수익을 위해 적극적인 위험을 감수'
            }
        };
        
        const profile = riskProfiles[riskLevel];
        const advice = {
            summary: `${profile.description}하여 연 ${targetReturn}% 목표 수익률 달성을 위한 포트폴리오를 제안드립니다.`,
            allocation: profile,
            recommendations: this.generateStockRecommendations(riskLevel),
            riskWarning: '투자에는 원금 손실의 위험이 있으며, 과거 수익률이 미래 수익률을 보장하지 않습니다.',
            portfolioSummary,
            marketSummary,
            advice: `${profile.description} 전략을 바탕으로 한 상세 투자 조언입니다. 현재 시장 상황을 고려하여 ${profile.stocks}% 주식, ${profile.bonds}% 채권, ${profile.cash}% 현금 비중을 권장합니다.`
        };
        
        // 데이터베이스에 투자 조언 저장
        await this.saveAdviceToDatabase(advice, riskLevel, targetReturn);
        
        return advice;
    }

    // 투자 조언 데이터베이스 저장
    async saveAdviceToDatabase(advice, riskLevel, targetReturn) {
        if (!this.db || !this.currentPortfolioId) {
            console.warn('[App] 데이터베이스 또는 포트폴리오 ID가 없어 투자 조언 저장을 건너뜁니다.');
            return;
        }

        try {
            await this.db.saveInvestmentAdvice(
                advice, 
                this.currentPortfolioId, 
                riskLevel, 
                targetReturn
            );
            console.log('[App] 투자 조언 저장 완료');
        } catch (error) {
            console.error('[App] 투자 조언 저장 실패:', error);
        }
    }

    generateStockRecommendations(riskLevel) {
        const recommendations = [];
        
        // 현재 포트폴리오와 시장 데이터를 바탕으로 추천
        Object.entries(this.marketData).forEach(([name, data]) => {
            const isHeld = this.portfolio.stocks[name];
            
            if (data.changePercent > 2 && !isHeld) {
                recommendations.push({
                    action: 'buy',
                    stock: name,
                    reason: '강한 상승 모멘텀',
                    price: data.price,
                    quantity: Math.floor(1000000 / data.price) // 100만원 기준
                });
            } else if (isHeld && data.changePercent < -3) {
                recommendations.push({
                    action: 'review',
                    stock: name,
                    reason: '하락세 검토 필요',
                    price: data.price,
                    currentShares: this.portfolio.stocks[name].shares
                });
            }
        });
        
        return recommendations;
    }

    displayRebalancingAdvice(advice) {
        const resultDiv = document.getElementById('rebalancing-result');
        
        resultDiv.innerHTML = `
            <div class="advice-header">
                <h3>🤖 AI 리밸런싱 제안</h3>
                <p class="advice-summary">${advice.summary}</p>
            </div>
            
            <div class="allocation-grid">
                <div class="allocation-item">
                    <span class="allocation-label">주식</span>
                    <span class="allocation-value">${advice.allocation.stocks}%</span>
                </div>
                <div class="allocation-item">
                    <span class="allocation-label">채권</span>
                    <span class="allocation-value">${advice.allocation.bonds}%</span>
                </div>
                <div class="allocation-item">
                    <span class="allocation-label">현금</span>
                    <span class="allocation-value">${advice.allocation.cash}%</span>
                </div>
            </div>
            
            <div class="recommendations">
                <h4>📈 추천 종목</h4>
                ${advice.recommendations.map(rec => `
                    <div class="recommendation-item">
                        <span class="action-type ${rec.action}">${rec.action.toUpperCase()}</span>
                        <span class="stock-name">${rec.stock}</span>
                        <span class="reason">${rec.reason}</span>
                        <span class="price">${rec.price.toLocaleString()}원</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="risk-warning">
                <p>⚠️ ${advice.riskWarning}</p>
            </div>
        `;
    }

    updatePortfolioChart() {
        const ctx = document.getElementById('portfolioChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        const labels = Object.keys(this.marketData);
        const prices = Object.values(this.marketData).map(data => data.price);
        const changes = Object.values(this.marketData).map(data => data.changePercent);
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '현재가 (원)',
                    data: prices,
                    backgroundColor: prices.map((_, index) => 
                        changes[index] >= 0 ? '#22C55E' : '#EF4444'
                    ),
                    borderColor: '#03C75A',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '포트폴리오 종목 현재가',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + '원';
                            }
                        }
                    }
                }
            }
        });
    }

    generateActionPlan(advice) {
        const actionPlan = document.getElementById('action-plan');
        
        const actions = [];
        
        // 추천사항을 구체적인 액션으로 변환
        advice.recommendations.forEach(rec => {
            if (rec.action === 'buy') {
                actions.push({
                    type: 'buy',
                    description: `${rec.stock} ${rec.quantity}주 매수`,
                    amount: rec.price * rec.quantity,
                    priority: 'high'
                });
            } else if (rec.action === 'review') {
                actions.push({
                    type: 'review',
                    description: `${rec.stock} 보유분 검토 (${rec.currentShares}주)`,
                    amount: rec.price * rec.currentShares,
                    priority: 'medium'
                });
            }
        });
        
        actionPlan.innerHTML = `
            <h3>📋 실행 계획</h3>
            ${actions.map(action => `
                <div class="action-item">
                    <div class="action-info">
                        <span class="action-type ${action.type}">${action.type}</span>
                        <span class="action-description">${action.description}</span>
                    </div>
                    <div class="action-amount">
                        ${action.amount.toLocaleString()}원
                    </div>
                </div>
            `).join('')}
            
            <div class="action-summary">
                <p><strong>네이버페이 결제 시 최대 2% 적립 혜택을 받으실 수 있습니다.</strong></p>
                <p>⚠️ 실제 투자 전 충분한 검토와 상담을 권장합니다.</p>
            </div>
        `;
    }

    // 유틸리티 함수들
    getKoreanStockName(symbol) {
        const nameMap = {
            '005930.KS': '삼성전자',
            '005930': '삼성전자',
            '035720.KS': '카카오',
            '035720': '카카오',
            '035420.KS': '네이버',
            '035420': '네이버',
            '000660.KS': 'SK하이닉스',
            '000660': 'SK하이닉스',
            '051910.KS': 'LG화학',
            '051910': 'LG화학'
        };
        return nameMap[symbol] || symbol;
    }

    createPortfolioSummary() {
        const totalValue = Object.values(this.portfolio.stocks)
            .reduce((sum, stock) => sum + stock.value, 0);
        
        return {
            totalStocks: Object.keys(this.portfolio.stocks).length,
            totalValue: totalValue,
            totalInvestment: this.portfolio.totalAmount,
            returnRate: ((totalValue - this.portfolio.totalAmount) / this.portfolio.totalAmount) * 100
        };
    }

    createMarketSummary() {
        const stocks = Object.values(this.marketData);
        const avgChange = stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length;
        const positiveStocks = stocks.filter(stock => stock.changePercent > 0).length;
        
        return {
            totalStocks: stocks.length,
            averageChange: avgChange,
            positiveStocks: positiveStocks,
            marketSentiment: avgChange > 0 ? '상승' : '하락'
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--npay-green)' : 
                         type === 'error' ? 'var(--error)' : 'var(--info)'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    loadSampleData() {
        // 페이지 로드시 기본 샘플 데이터 설정
        document.getElementById('current-portfolio').value = '삼성전자 10주, 카카오 5주, 네이버 3주';
        document.getElementById('investment-amount').value = '10000000';
    }

    // 내보내기 기능들
    async exportToPDF() {
        // PDF 생성 기능 (jsPDF 사용)
        alert('PDF 다운로드 기능은 개발 중입니다. 실제 구현에서는 jsPDF 라이브러리를 사용합니다.');
    }

    saveToLocalStorage() {
        const data = {
            portfolio: this.portfolio,
            marketData: this.marketData,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('mydata_investment_analysis', JSON.stringify(data));
        alert('데이터가 로컬 저장소에 저장되었습니다.');
    }

    connectNpay() {
        alert('네이버페이 연동 기능은 실제 서비스에서 구현됩니다. 가입 심사 완료 후 사용 가능합니다.');
    }
}

// 전역 함수들 (HTML에서 호출)
let marketIntegrator;

function analyzePortfolio() {
    if (!marketIntegrator) {
        alert('시스템이 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    marketIntegrator.analyzePortfolio();
}

function fetchMarketData(source) {
    if (!marketIntegrator) {
        alert('시스템이 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    marketIntegrator.fetchMarketData(source);
}

function generateRebalancingAdvice() {
    if (!marketIntegrator) {
        alert('시스템이 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    marketIntegrator.generateRebalancingAdvice();
}

function exportToPDF() {
    if (!marketIntegrator) {
        alert('시스템이 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    marketIntegrator.exportToPDF();
}

function saveToLocalStorage() {
    if (!marketIntegrator) {
        alert('시스템이 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    marketIntegrator.saveToLocalStorage();
}

function connectNpay() {
    if (!marketIntegrator) {
        alert('시스템이 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    marketIntegrator.connectNpay();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('[시스템] 마이데이터 투자 제안 시스템 초기화 시작...');
        marketIntegrator = new MarketDataIntegrator();
        
        // 초기화 완료까지 대기
        while (!marketIntegrator.db) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('[시스템] 초기화 완료! 모든 기능을 사용할 수 있습니다.');
        
        // 초기화 완료 알림
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #03C75A;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
        `;
        notification.textContent = '✅ 시스템 초기화 완료';
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
        
    } catch (error) {
        console.error('[시스템] 초기화 실패:', error);
        alert('시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
    }
});
