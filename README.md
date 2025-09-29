# 🚀 마이데이터 투자 제안 시스템

네이버페이 연동 AI 기반 실시간 투자 리밸런싱 서비스

## 📊 프로젝트 개요

이 프로젝트는 **마이데이터** 표준을 기반으로 한 개인 투자 포트폴리오 분석 및 리밸런싱 제안 시스템입니다. 실시간 시장 데이터와 AI 분석을 통해 개인화된 투자 조언을 제공합니다.

## ✨ 주요 기능

### 🎯 핵심 기능
- **📈 실시간 포트폴리오 분석**: Yahoo Finance API 연동
- **🤖 AI 리밸런싱 제안**: Gemini AI 기반 개인화 추천
- **💳 네이버페이 브랜드 연동**: 공식 디자인 가이드라인 적용
- **📱 PWA 지원**: 모바일 앱과 같은 사용자 경험

### 🔧 기술적 특징
- **실시간 데이터**: 한국 주식 실시간 시세 조회
- **병렬 처리**: Promise.all을 활용한 빠른 API 호출
- **캐시 방지**: 개발 중 자동 캐시 방지 시스템
- **성능 모니터링**: 실시간 성능 메트릭 표시

## 🛠️ 기술 스택

### Frontend
- **HTML5/CSS3/JavaScript (ES6+)**
- **Chart.js**: 데이터 시각화
- **PWA**: 프로그레시브 웹 앱
- **Responsive Design**: 모바일 최적화

### Backend
- **Node.js + Express.js**
- **RESTful API**
- **CORS 프록시**: 브라우저 제한 우회

### APIs & 서비스
- **Yahoo Finance API**: 실시간 주가 데이터
- **Gemini AI API**: 투자 분석 및 제안
- **한국투자증권 KIS API**: 한국 주식 전문 데이터 (선택)

### 데이터 저장
- **IndexedDB**: 로컬 데이터 저장
- **Local Storage**: 사용자 설정

## 🚀 시작하기

### 필수 요구사항
- **Node.js** 16.0.0 이상
- **npm** 또는 **yarn**

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone https://github.com/yourusername/mydata-naverpay.git
   cd mydata-naverpay
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정** (선택사항)
   ```bash
   cp env-example.txt .env
   # .env 파일에서 API 키 설정
   ```

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

5. **브라우저에서 접속**
   ```
   http://localhost:3001/market-data-integration.html
   ```

## 📁 프로젝트 구조

```
mydata-naverpay/
├── 📄 README.md                    # 프로젝트 소개
├── 📄 package.json                 # 의존성 및 스크립트
├── 📄 server.js                    # Express 서버
├── 📄 .env.example                 # 환경변수 템플릿
│
├── 🎨 Frontend Files
│   ├── 📄 market-data-integration.html  # 메인 애플리케이션
│   ├── 📄 style.css                     # 스타일시트
│   ├── 📄 optimize.js                   # 성능 최적화
│   └── 📄 manifest.json                 # PWA 매니페스트
│
├── 🔧 Development Tools
│   ├── 📄 button-debug.html             # 디버깅 페이지
│   ├── 📄 api-test.html                 # API 테스트
│   └── 📄 test-guide.md                 # 테스트 가이드
│
├── 📚 Documentation
│   ├── 📄 마이데이터-바이브코딩패키지.md      # 브랜드 가이드
│   ├── 📄 마이데이터-환경설정가이드.md        # 환경 설정
│   ├── 📄 api-integration-guide.md       # API 연동 가이드
│   └── 📄 브라우저-캐시-관리-가이드.md       # 캐시 관리
│
└── 🎯 Advanced Features
    ├── 📄 login.html                    # 사용자 인증
    ├── 📄 payment.html                  # 네이버페이 연동
    ├── 📄 advanced-charts.html          # 고급 차트
    └── 📄 history-dashboard.html        # 히스토리 대시보드
```

## 🧪 테스트

### 기본 기능 테스트
```bash
# 서버 실행
npm run dev

# 브라우저에서 테스트
open http://localhost:3001/market-data-integration.html
```

### 디버깅 페이지
```bash
# 종합 디버깅 테스트
open http://localhost:3001/button-debug.html
```

### API 테스트
```bash
# 서버 상태 확인
curl http://localhost:3001/api/health

# 주가 데이터 테스트
curl http://localhost:3001/api/yahoo-finance/삼성전자
```

## 🎨 브랜드 가이드라인

네이버페이 공식 브랜드 가이드라인을 준수합니다:
- **Primary Color**: `#03C75A` (네이버페이 그린)
- **Typography**: 시스템 폰트 기반
- **로고 사용법**: 공식 가이드라인 준수
- **UI 컴포넌트**: 네이버페이 디자인 시스템

## 📊 개발 단계

- [x] **1단계**: 기본 구조 및 UI 설계
- [x] **2단계**: 네이버페이 브랜드 가이드라인 적용
- [x] **3단계**: 실시간 시장 데이터 연동
- [x] **4단계**: AI 리밸런싱 제안 기능
- [x] **5단계**: 데이터 저장 및 히스토리 관리
- [x] **6단계**: 보안 강화 및 사용자 인증
- [x] **7단계**: 고급 차트 및 분석 기능
- [x] **8단계**: 네이버페이 실제 결제 연동 준비
- [x] **9단계**: 성능 최적화 및 로딩 속도 개선
- [x] **10단계**: 실제 API 연동 (Yahoo Finance, Gemini AI)
- [x] **11단계**: 개발 중 자동 캐시 방지 시스템
- [x] **12단계**: 버튼 동작 디버깅 및 수정
- [x] **13단계**: GitHub 연동 및 버전 관리

## 🔐 보안 고려사항

- **API 키 보호**: `.env` 파일 사용, GitHub에 업로드 금지
- **CORS 정책**: 개발/프로덕션 환경 분리
- **데이터 검증**: 사용자 입력 검증 및 XSS 방지
- **HTTPS**: 프로덕션 환경에서 SSL 필수

## 🤝 기여하기

1. 이 저장소를 Fork 합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📝 버전 기록

- **v1.3.0** (2024-12-XX): GitHub 연동 및 버전 관리
- **v1.2.0** (2024-12-XX): 버튼 동작 문제 해결 및 디버깅 도구
- **v1.1.0** (2024-12-XX): 실제 API 연동 (Yahoo Finance, Gemini AI)
- **v1.0.0** (2024-12-XX): 기본 기능 완성 및 PWA 지원

## 📞 지원 및 문의

- **이슈 리포트**: [GitHub Issues](https://github.com/yourusername/mydata-naverpay/issues)
- **기능 요청**: [GitHub Discussions](https://github.com/yourusername/mydata-naverpay/discussions)

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

**🎯 Made with ❤️ for Korean Investors | 네이버페이 브랜드 가이드라인 준수**