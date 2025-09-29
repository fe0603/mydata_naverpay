# 📚 GitHub 저장소 연동 가이드

## 🚀 GitHub 저장소 생성 및 연동 방법

### 1단계: GitHub에서 새 저장소 생성

1. **GitHub.com 접속**
   - https://github.com 로 이동
   - 로그인 후 우측 상단의 `+` 버튼 클릭
   - `New repository` 선택

2. **저장소 설정**
   - **Repository name**: `mydata-naverpay` (또는 원하는 이름)
   - **Description**: `🚀 마이데이터 투자 제안 시스템 - 네이버페이 연동 AI 기반 실시간 투자 리밸런싱 서비스`
   - **Visibility**: 
     - `Public` (공개) - 추천
     - `Private` (비공개) - 개인 프로젝트인 경우
   - **Initialize repository**: 
     - ❌ **체크하지 않기** (이미 로컬에 파일들이 있음)
     - `Add a README file` 체크 안함
     - `Add .gitignore` 체크 안함
     - `Choose a license` 체크 안함

3. **Create repository 클릭**

### 2단계: 로컬 저장소와 GitHub 연결

GitHub에서 저장소 생성 후 나타나는 URL을 복사하고 다음 명령어를 실행하세요:

```bash
# GitHub 원격 저장소 추가 (URL을 실제 저장소 URL로 변경)
git remote add origin https://github.com/yourusername/mydata-naverpay.git

# 기본 브랜치를 main으로 설정
git branch -M main

# GitHub으로 첫 번째 푸시
git push -u origin main
```

### 3단계: GitHub에서 확인

1. **저장소 페이지 새로고침**
   - 모든 파일이 업로드되었는지 확인
   - README.md가 자동으로 표시되는지 확인

2. **브랜치 보호 설정** (선택사항)
   - Settings > Branches
   - `Add rule` 클릭
   - Branch name pattern: `main`
   - 보호 규칙 설정

### 4단계: 협업 설정 (선택사항)

1. **협업자 추가**
   - Settings > Manage access
   - `Invite a collaborator` 클릭

2. **Issues 및 Wiki 활성화**
   - Settings > General
   - Features 섹션에서 필요한 기능 체크

## 🔄 일상적인 Git 워크플로우

### 새로운 기능 개발 시

```bash
# 새 브랜치 생성 및 전환
git checkout -b feature/new-feature

# 코드 수정 후
git add .
git commit -m "✨ Add new feature: description"

# GitHub에 브랜치 푸시
git push origin feature/new-feature

# GitHub에서 Pull Request 생성
```

### 일반적인 커밋 패턴

```bash
# 변경사항 확인
git status
git diff

# 파일 추가
git add .

# 커밋 (이모지 활용)
git commit -m "🐛 Fix: button click issue"
git commit -m "✨ Add: real-time stock data"
git commit -m "📚 Docs: update README"
git commit -m "🔧 Config: add environment variables"

# GitHub에 푸시
git push origin main
```

### 커밋 메시지 컨벤션

- 🎉 `:tada:` - 초기 커밋
- ✨ `:sparkles:` - 새로운 기능
- 🐛 `:bug:` - 버그 수정
- 📚 `:books:` - 문서 업데이트
- 🔧 `:wrench:` - 설정 파일 수정
- 💄 `:lipstick:` - UI/스타일 개선
- ⚡ `:zap:` - 성능 개선
- 🔒 `:lock:` - 보안 관련
- 🚀 `:rocket:` - 배포 관련

## 📊 GitHub 기능 활용

### 1. Issues
- 버그 리포트
- 기능 요청
- 작업 관리

### 2. Projects
- 칸반 보드
- 마일스톤 관리
- 작업 진행 상황 추적

### 3. Actions (CI/CD)
- 자동 테스트
- 자동 배포
- 코드 품질 검사

### 4. Releases
- 버전 태그
- 릴리즈 노트
- 바이너리 배포

## 🛡️ 보안 설정

### 1. Secrets 관리
- Settings > Secrets and variables > Actions
- API 키 등 민감한 정보 저장

### 2. Security Advisories
- Security 탭에서 보안 이슈 관리

### 3. Dependabot
- 의존성 보안 업데이트 자동화

## 📈 저장소 최적화

### 1. README.md 개선
- 배지 추가 (빌드 상태, 버전 등)
- 스크린샷 추가
- API 문서 링크

### 2. 태그 및 릴리즈
```bash
# 버전 태그 생성
git tag -a v1.3.0 -m "Release version 1.3.0"
git push origin v1.3.0
```

### 3. GitHub Pages 활용
- Settings > Pages
- 정적 사이트 호스팅

## 🔧 트러블슈팅

### 일반적인 문제들

1. **인증 오류**
   ```bash
   # Personal Access Token 사용
   git remote set-url origin https://username:token@github.com/username/repo.git
   ```

2. **브랜치 충돌**
   ```bash
   git pull origin main
   git mergetool
   ```

3. **커밋 히스토리 정리**
   ```bash
   git log --oneline
   git rebase -i HEAD~3
   ```

## 📞 도움말

- **GitHub Docs**: https://docs.github.com
- **Git 가이드**: https://git-scm.com/docs
- **GitHub Desktop**: 그래픽 인터페이스 사용시

---

**🎯 성공적인 GitHub 연동을 위해 단계별로 차근차근 진행하세요!**
