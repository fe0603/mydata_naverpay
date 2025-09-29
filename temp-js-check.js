// 메인 함수들 정의 테스트
async function analyzePortfolioSimple() {
    console.log('🔍 실시간 포트폴리오 분석 시작');
    
    let portfolioText, investmentAmount;
    
    try {
        portfolioText = document.getElementById('current-portfolio').value;
        investmentAmount = document.getElementById('investment-amount').value;
        
        console.log('📊 입력값:', { portfolioText, investmentAmount });
        
        if (!portfolioText || !investmentAmount) {
            alert('포트폴리오와 투자금액을 모두 입력해주세요.');
            return;
        }
        
        // 로딩 표시
        showQuickNotification('실시간 주가 정보를 조회하고 있습니다...', 'info');
        
        // 실시간 포트폴리오 파싱
        const portfolio = await parsePortfolioQuick(portfolioText);
        const amount = parseInt(investmentAmount);
        
        console.log('📊 실시간 포트폴리오 데이터:', portfolio);
        
        // 결과 표시
        displayAnalysisResult(portfolio, amount);
        
        // 차트 생성
        createPortfolioChart(portfolio, amount);
        
        // 실시간 데이터 사용 여부 표시
        const realTimeCount = Object.values(portfolio).filter(stock => stock.isRealTime).length;
        const totalCount = Object.keys(portfolio).length;
        
        if (realTimeCount === totalCount) {
            showQuickNotification(`✅ 분석 완료! (실시간 데이터 ${realTimeCount}/${totalCount})`, 'success');
        } else if (realTimeCount > 0) {
            showQuickNotification(`⚠️ 분석 완료! (실시간 ${realTimeCount}/${totalCount}, 나머지는 추정가)`, 'warning');
        } else {
            showQuickNotification('⚠️ 분석 완료! (추정 데이터 사용)', 'warning');
        }
        
    } catch (error) {
        console.error('❌ 포트폴리오 분석 오류:', error);
        alert('오류가 발생했습니다: ' + error.message);
        return;
    }
}

function showQuickNotification(message, type = 'success') {
    console.log('알림:', message, type);
}

function parsePortfolioQuick(text) {
    return { '삼성전자': { shares: 10, currentPrice: 71900 } };
}

function displayAnalysisResult(portfolio, amount) {
    console.log('결과 표시:', portfolio, amount);
}

function createPortfolioChart(portfolio, amount) {
    console.log('차트 생성:', portfolio, amount);
}

console.log('✅ JavaScript 문법 테스트 완료');
