# Vercel 배포 가이드

이 문서는 마이데이터 AI 투자 제안 시스템을 Vercel에 배포하는 방법을 설명합니다.

## 📋 사전 준비사항

### 1. GitHub 저장소 준비
- 프로젝트가 GitHub에 푸시되어 있어야 합니다
- 현재 저장소: `https://github.com/fe0603/mydata-naverpay`

### 2. API 키 준비
- **Gemini AI API 키** (필수): Google AI Studio에서 발급
- **KIS API 키** (선택사항): 한국투자증권 API 사용 시

## 🚀 Vercel 배포 단계

### 1단계: Vercel 계정 생성 및 GitHub 연동

1. [Vercel 웹사이트](https://vercel.com)에 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭
4. GitHub 저장소 `fe0603/mydata-naverpay` 선택

### 2단계: 프로젝트 설정

#### 중요: Node.js 버전 강제 설정
Vercel에서 Node.js 버전 문제가 발생할 경우, 다음 파일들이 모두 설정되어 있는지 확인:
- `.nvmrc`: `22` (Node.js 22 버전 명시)
- `vercel.json`: `"runtime": "nodejs22.x"` (Vercel 런타임 명시)
- `package.json`: `"node": ">=22.0.0"` (엔진 요구사항)

#### Framework Preset
- **Framework Preset**: `Other` 선택

#### Root Directory
- **Root Directory**: `./` (기본값)

#### Build and Output Settings
- **Build Command**: 비워둠 (Vercel이 자동 감지)
- **Output Directory**: `./` (기본값)
- **Install Command**: `npm install`
- **Node.js Version**: `22.x` (package.json, .nvmrc, vercel.json에서 명시)

### 3단계: 환경변수 설정

Vercel 대시보드의 "Environment Variables" 섹션에서 다음 변수들을 설정:

#### 필수 환경변수
```
GEMINI_API_KEY=AIzaSyAJa7ixo3h3CytmCvvAMSWX2cH2g1XTXpg
NODE_ENV=production
VERCEL=1
```

#### 선택적 환경변수
```
KIS_API_KEY=your_kis_api_key_here
CORS_ORIGIN=https://your-domain.vercel.app
HELMET_ENABLED=true
```

### 4단계: 배포 실행

1. "Deploy" 버튼 클릭
2. 배포 완료까지 대기 (약 2-3분)
3. 배포된 URL 확인

## 🔧 배포 후 설정

### 1. 도메인 확인
- Vercel에서 제공하는 기본 도메인: `https://your-project.vercel.app`
- 커스텀 도메인 설정 가능

### 2. 환경변수 확인
- Vercel 대시보드에서 환경변수가 올바르게 설정되었는지 확인
- 특히 `GEMINI_API_KEY`가 설정되어 있는지 확인

### 3. 기능 테스트
- 메인 페이지 접속 확인
- AI 리밸런싱 제안 기능 테스트
- AI 투자 상담사 기능 테스트

## 📁 프로젝트 구조

```
mydata-naverpay/
├── server.js                 # 메인 서버 파일
├── market-data-integration.html  # 프론트엔드 HTML
├── style.css                 # 스타일시트
├── manifest.json             # PWA 매니페스트
├── package.json              # 의존성 및 스크립트
├── vercel.json               # Vercel 설정 파일
├── env.example               # 환경변수 예시
└── VERCEL_DEPLOYMENT.md      # 이 배포 가이드
```

## ⚙️ Vercel 설정 파일 (vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "market-data-integration.html",
      "use": "@vercel/static"
    },
    {
      "src": "style.css",
      "use": "@vercel/static"
    },
    {
      "src": "manifest.json",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/style.css",
      "dest": "/style.css"
    },
    {
      "src": "/manifest.json",
      "dest": "/manifest.json"
    },
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

## 🔍 문제 해결

### 일반적인 문제들

#### 1. 환경변수 오류
```
Error: GEMINI_API_KEY가 설정되지 않았습니다.
```
**해결방법**: Vercel 대시보드에서 환경변수를 올바르게 설정했는지 확인

#### 2. 빌드 실패
```
Build failed: npm run build
```
**해결방법**: `package.json`의 build 스크립트가 올바른지 확인

#### 3. API 응답 오류
```
500 Internal Server Error
```
**해결방법**: 
- Gemini API 키가 유효한지 확인
- Vercel 함수 타임아웃 설정 확인 (현재 30초)

### 로그 확인 방법

1. Vercel 대시보드 → 프로젝트 선택
2. "Functions" 탭 클릭
3. `server.js` 함수 클릭
4. "Logs" 탭에서 실시간 로그 확인

## 📊 성능 최적화

### 1. 캐싱 설정
- 응답 캐싱이 이미 구현되어 있음 (5분)
- Vercel의 자동 CDN 활용

### 2. 함수 최적화
- 최대 실행 시간: 30초
- 메모리 사용량 최적화

### 3. 정적 파일 최적화
- CSS, HTML, 매니페스트 파일은 정적 파일로 서빙
- CDN을 통한 빠른 로딩

## 🔄 자동 배포 설정

GitHub에 코드를 푸시하면 자동으로 Vercel에서 재배포됩니다:

1. 로컬에서 코드 수정
2. `git add .`
3. `git commit -m "Update feature"`
4. `git push origin main`
5. Vercel에서 자동 배포 시작

## 📞 지원

배포 관련 문제가 있으면:
1. Vercel 대시보드의 로그 확인
2. GitHub Issues에 문제 보고
3. 프로젝트 문서 참조

---

**배포 완료 후**: `https://your-project.vercel.app`에서 애플리케이션을 확인하세요! 🎉
