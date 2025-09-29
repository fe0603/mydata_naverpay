// 마이데이터 투자 제안 시스템 - IndexedDB 데이터베이스 관리
// 로컬 데이터 저장 및 히스토리 관리

class MyDataDatabase {
    constructor() {
        this.dbName = 'MyDataInvestmentDB';
        this.dbVersion = 1;
        this.db = null;
        
        // 데이터베이스 스키마 정의
        this.stores = {
            portfolios: {
                keyPath: 'id',
                autoIncrement: true,
                indexes: [
                    { name: 'userId', keyPath: 'userId', unique: false },
                    { name: 'timestamp', keyPath: 'timestamp', unique: false },
                    { name: 'type', keyPath: 'type', unique: false }
                ]
            },
            marketData: {
                keyPath: 'id',
                autoIncrement: true,
                indexes: [
                    { name: 'symbol', keyPath: 'symbol', unique: false },
                    { name: 'timestamp', keyPath: 'timestamp', unique: false },
                    { name: 'source', keyPath: 'source', unique: false }
                ]
            },
            investmentAdvice: {
                keyPath: 'id',
                autoIncrement: true,
                indexes: [
                    { name: 'portfolioId', keyPath: 'portfolioId', unique: false },
                    { name: 'timestamp', keyPath: 'timestamp', unique: false },
                    { name: 'riskLevel', keyPath: 'riskLevel', unique: false }
                ]
            },
            userPreferences: {
                keyPath: 'userId',
                indexes: [
                    { name: 'lastUpdated', keyPath: 'lastUpdated', unique: false }
                ]
            },
            performanceHistory: {
                keyPath: 'id',
                autoIncrement: true,
                indexes: [
                    { name: 'portfolioId', keyPath: 'portfolioId', unique: false },
                    { name: 'date', keyPath: 'date', unique: false },
                    { name: 'returnRate', keyPath: 'returnRate', unique: false }
                ]
            }
        };
        
        this.initDatabase();
    }

    // 데이터베이스 초기화
    async initDatabase() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB를 지원하지 않는 브라우저입니다.'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('데이터베이스 열기 실패: ' + request.error));
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[DB] 데이터베이스 연결 성공');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                console.log('[DB] 데이터베이스 업그레이드 중...');
                
                // 기존 스토어 삭제 (개발 단계)
                for (const storeName of this.db.objectStoreNames) {
                    this.db.deleteObjectStore(storeName);
                }

                // 새로운 스토어 생성
                this.createStores();
            };
        });
    }

    // 오브젝트 스토어 생성
    createStores() {
        Object.entries(this.stores).forEach(([storeName, config]) => {
            const store = this.db.createObjectStore(storeName, {
                keyPath: config.keyPath,
                autoIncrement: config.autoIncrement || false
            });

            // 인덱스 생성
            if (config.indexes) {
                config.indexes.forEach(index => {
                    store.createIndex(index.name, index.keyPath, {
                        unique: index.unique || false
                    });
                });
            }

            console.log(`[DB] 스토어 생성: ${storeName}`);
        });
    }

    // 포트폴리오 저장
    async savePortfolio(portfolioData, userId = 'default') {
        try {
            const portfolio = {
                userId: userId,
                timestamp: new Date().toISOString(),
                type: 'user_input',
                totalAmount: portfolioData.totalAmount,
                stocks: portfolioData.stocks,
                marketData: portfolioData.marketData || {},
                performance: this.calculatePortfolioPerformance(portfolioData),
                version: '1.0.0'
            };

            const id = await this.addRecord('portfolios', portfolio);
            console.log('[DB] 포트폴리오 저장 완료:', id);
            
            // 성과 히스토리도 함께 저장
            await this.savePerformanceSnapshot(id, portfolio.performance);
            
            return id;
        } catch (error) {
            console.error('[DB] 포트폴리오 저장 실패:', error);
            throw error;
        }
    }

    // 포트폴리오 조회
    async getPortfolios(userId = 'default', limit = 10) {
        try {
            const transaction = this.db.transaction(['portfolios'], 'readonly');
            const store = transaction.objectStore('portfolios');
            const index = store.index('userId');
            
            const request = index.getAll(userId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const portfolios = request.result
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, limit);
                    resolve(portfolios);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('[DB] 포트폴리오 조회 실패:', error);
            throw error;
        }
    }

    // 최신 포트폴리오 조회
    async getLatestPortfolio(userId = 'default') {
        try {
            const portfolios = await this.getPortfolios(userId, 1);
            return portfolios.length > 0 ? portfolios[0] : null;
        } catch (error) {
            console.error('[DB] 최신 포트폴리오 조회 실패:', error);
            throw error;
        }
    }

    // 시장 데이터 저장
    async saveMarketData(marketData, source = 'yahoo') {
        try {
            const records = [];
            
            Object.entries(marketData).forEach(([symbol, data]) => {
                records.push({
                    symbol: symbol,
                    timestamp: new Date().toISOString(),
                    source: source,
                    price: data.price,
                    change: data.change,
                    changePercent: data.changePercent,
                    volume: data.volume,
                    marketCap: data.marketCap || 0,
                    rawData: data
                });
            });

            const ids = [];
            for (const record of records) {
                const id = await this.addRecord('marketData', record);
                ids.push(id);
            }

            console.log('[DB] 시장 데이터 저장 완료:', ids.length, '건');
            return ids;
        } catch (error) {
            console.error('[DB] 시장 데이터 저장 실패:', error);
            throw error;
        }
    }

    // 투자 조언 저장
    async saveInvestmentAdvice(advice, portfolioId, riskLevel, targetReturn) {
        try {
            const record = {
                portfolioId: portfolioId,
                timestamp: new Date().toISOString(),
                riskLevel: riskLevel,
                targetReturn: targetReturn,
                advice: advice.advice,
                recommendations: advice.recommendations || [],
                riskWarning: advice.riskWarning,
                apiUsage: advice.apiUsage || {},
                version: '1.0.0'
            };

            const id = await this.addRecord('investmentAdvice', record);
            console.log('[DB] 투자 조언 저장 완료:', id);
            return id;
        } catch (error) {
            console.error('[DB] 투자 조언 저장 실패:', error);
            throw error;
        }
    }

    // 성과 스냅샷 저장
    async savePerformanceSnapshot(portfolioId, performance) {
        try {
            const record = {
                portfolioId: portfolioId,
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD 형식
                timestamp: new Date().toISOString(),
                totalValue: performance.totalValue,
                totalInvestment: performance.totalInvestment,
                returnRate: performance.returnRate,
                profitLoss: performance.profitLoss,
                benchmarkReturn: performance.benchmarkReturn || 0,
                volatility: performance.volatility || 0,
                sharpeRatio: performance.sharpeRatio || 0
            };

            const id = await this.addRecord('performanceHistory', record);
            console.log('[DB] 성과 스냅샷 저장 완료:', id);
            return id;
        } catch (error) {
            console.error('[DB] 성과 스냅샷 저장 실패:', error);
            throw error;
        }
    }

    // 성과 히스토리 조회
    async getPerformanceHistory(portfolioId, days = 30) {
        try {
            const transaction = this.db.transaction(['performanceHistory'], 'readonly');
            const store = transaction.objectStore('performanceHistory');
            const index = store.index('portfolioId');
            
            const request = index.getAll(portfolioId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - days);
                    
                    const history = request.result
                        .filter(record => new Date(record.timestamp) >= cutoffDate)
                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    
                    resolve(history);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('[DB] 성과 히스토리 조회 실패:', error);
            throw error;
        }
    }

    // 사용자 설정 저장
    async saveUserPreferences(userId, preferences) {
        try {
            const record = {
                userId: userId,
                lastUpdated: new Date().toISOString(),
                riskTolerance: preferences.riskTolerance || 'moderate',
                investmentGoals: preferences.investmentGoals || [],
                notificationSettings: preferences.notificationSettings || {},
                displaySettings: preferences.displaySettings || {},
                apiKeys: preferences.apiKeys || {} // 암호화된 상태로 저장
            };

            await this.updateRecord('userPreferences', record);
            console.log('[DB] 사용자 설정 저장 완료');
            return true;
        } catch (error) {
            console.error('[DB] 사용자 설정 저장 실패:', error);
            throw error;
        }
    }

    // 사용자 설정 조회
    async getUserPreferences(userId) {
        try {
            const record = await this.getRecord('userPreferences', userId);
            return record || {
                userId: userId,
                riskTolerance: 'moderate',
                investmentGoals: [],
                notificationSettings: { enabled: true },
                displaySettings: { theme: 'light', currency: 'KRW' },
                apiKeys: {}
            };
        } catch (error) {
            console.error('[DB] 사용자 설정 조회 실패:', error);
            throw error;
        }
    }

    // 포트폴리오 성과 계산
    calculatePortfolioPerformance(portfolioData) {
        let totalValue = 0;
        let totalInvestment = portfolioData.totalAmount || 0;

        if (portfolioData.stocks && portfolioData.marketData) {
            Object.entries(portfolioData.stocks).forEach(([stockName, stockInfo]) => {
                if (portfolioData.marketData[stockName]) {
                    const currentPrice = portfolioData.marketData[stockName].price;
                    totalValue += stockInfo.shares * currentPrice;
                }
            });
        } else {
            totalValue = totalInvestment; // 시장 데이터가 없으면 원금으로 설정
        }

        const profitLoss = totalValue - totalInvestment;
        const returnRate = totalInvestment > 0 ? (profitLoss / totalInvestment) * 100 : 0;

        return {
            totalValue: totalValue,
            totalInvestment: totalInvestment,
            profitLoss: profitLoss,
            returnRate: returnRate
        };
    }

    // 통계 정보 조회
    async getStatistics(userId = 'default') {
        try {
            const portfolios = await this.getPortfolios(userId, 100);
            const totalPortfolios = portfolios.length;
            
            if (totalPortfolios === 0) {
                return {
                    totalPortfolios: 0,
                    avgReturnRate: 0,
                    bestPerformance: 0,
                    worstPerformance: 0,
                    totalInvestment: 0
                };
            }

            const performances = portfolios.map(p => p.performance.returnRate);
            const investments = portfolios.map(p => p.performance.totalInvestment);

            return {
                totalPortfolios: totalPortfolios,
                avgReturnRate: performances.reduce((a, b) => a + b, 0) / totalPortfolios,
                bestPerformance: Math.max(...performances),
                worstPerformance: Math.min(...performances),
                totalInvestment: investments.reduce((a, b) => a + b, 0),
                lastUpdated: portfolios[0]?.timestamp
            };
        } catch (error) {
            console.error('[DB] 통계 정보 조회 실패:', error);
            throw error;
        }
    }

    // 데이터 내보내기
    async exportData(userId = 'default') {
        try {
            const portfolios = await this.getPortfolios(userId, 1000);
            const preferences = await this.getUserPreferences(userId);
            const statistics = await this.getStatistics(userId);

            const exportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                userId: userId,
                portfolios: portfolios,
                preferences: preferences,
                statistics: statistics
            };

            return exportData;
        } catch (error) {
            console.error('[DB] 데이터 내보내기 실패:', error);
            throw error;
        }
    }

    // 데이터 가져오기
    async importData(importData) {
        try {
            if (!importData.version || !importData.portfolios) {
                throw new Error('유효하지 않은 가져오기 데이터 형식입니다.');
            }

            let importedCount = 0;

            // 포트폴리오 가져오기
            for (const portfolio of importData.portfolios) {
                await this.addRecord('portfolios', portfolio);
                importedCount++;
            }

            // 사용자 설정 가져오기
            if (importData.preferences) {
                await this.updateRecord('userPreferences', importData.preferences);
            }

            console.log('[DB] 데이터 가져오기 완료:', importedCount, '건');
            return importedCount;
        } catch (error) {
            console.error('[DB] 데이터 가져오기 실패:', error);
            throw error;
        }
    }

    // 헬퍼 메서드들
    async addRecord(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRecord(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateRecord(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRecord(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // 데이터베이스 정리
    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // 연결 해제
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('[DB] 데이터베이스 연결 해제');
        }
    }
}

// 전역 데이터베이스 인스턴스
let myDataDB = null;

// 데이터베이스 초기화 함수
async function initializeDatabase() {
    if (!myDataDB) {
        myDataDB = new MyDataDatabase();
        await myDataDB.initDatabase();
    }
    return myDataDB;
}

// 전역 접근을 위한 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MyDataDatabase, initializeDatabase };
} else {
    window.MyDataDatabase = MyDataDatabase;
    window.initializeDatabase = initializeDatabase;
}
