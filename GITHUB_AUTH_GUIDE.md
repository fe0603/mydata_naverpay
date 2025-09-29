# 🔐 GitHub 인증 설정 가이드

## 🚨 현재 상황
GitHub에서 보안 정책이 변경되어 비밀번호 인증이 더 이상 지원되지 않습니다. **Personal Access Token**을 사용해야 합니다.

## 🔑 Personal Access Token 생성

### 1단계: GitHub 설정 페이지 접속
- 브라우저에서 [https://github.com/settings/tokens](https://github.com/settings/tokens) 접속
- 로그인이 필요한 경우 `fe0603` 또는 `hckim0603@gmail.com` 계정으로 로그인

### 2단계: 새 토큰 생성
1. **"Generate new token"** 버튼 클릭
2. **"Generate new token (classic)"** 선택

### 3단계: 토큰 설정
- **Note**: `mydata-naverpay-token` (토큰 용도 설명)
- **Expiration**: `90 days` (또는 원하는 기간)
- **Select scopes**: 
  - ✅ **repo** (전체 체크박스 선택)
    - repo:status
    - repo_deployment
    - public_repo
    - repo:invite
    - security_events

### 4단계: 토큰 생성 및 복사
1. **"Generate token"** 클릭
2. 🚨 **중요**: 생성된 토큰을 즉시 복사하세요! (한 번만 표시됩니다)
3. 토큰은 `ghp_` 로 시작하는 긴 문자열입니다

## 🔗 GitHub 연결 명령어

토큰을 복사한 후, 다음 명령어를 실행하세요:

```bash
# 1. 원격 저장소 URL을 토큰 포함으로 업데이트
git remote set-url origin https://fe0603:YOUR_TOKEN_HERE@github.com/fe0603/mydata-naverpay.git

# 2. GitHub으로 푸시
git push -u origin main
```

**⚠️ 주의**: `YOUR_TOKEN_HERE` 부분을 실제 생성한 토큰으로 교체하세요!

### 예시:
```bash
# 토큰이 ghp_1234567890abcdef 라면:
git remote set-url origin https://fe0603:ghp_1234567890abcdef@github.com/fe0603/mydata-naverpay.git
git push -u origin main
```

## 🛠️ 대안 방법

### 방법 1: GitHub CLI 사용
```bash
# GitHub CLI 설치 (macOS)
brew install gh

# GitHub 로그인
gh auth login

# 저장소 푸시
git push -u origin main
```

### 방법 2: GitHub Desktop 앱
1. [GitHub Desktop](https://desktop.github.com/) 다운로드 및 설치
2. 계정 로그인
3. "Add an Existing Repository from your Hard Drive" 선택
4. 프로젝트 폴더 선택
5. "Publish repository" 클릭

### 방법 3: VS Code Git 연동
1. VS Code에서 프로젝트 폴더 열기
2. Source Control 탭 (Ctrl+Shift+G)
3. "Publish to GitHub" 클릭
4. GitHub 계정 연결

## 🔒 보안 고려사항

### 토큰 보안
- 토큰을 절대 공개하지 마세요
- 토큰이 노출되면 즉시 삭제하고 새로 생성하세요
- 정기적으로 토큰을 갱신하세요

### .env 파일에 토큰 저장 (선택사항)
```bash
echo "GITHUB_TOKEN=your_token_here" >> .env
```

## 🆘 문제 해결

### 토큰 분실 시
1. [https://github.com/settings/tokens](https://github.com/settings/tokens) 접속
2. 기존 토큰 삭제
3. 새 토큰 생성

### 권한 오류 시
- 토큰 생성 시 `repo` 권한이 선택되었는지 확인
- 저장소가 올바른 계정(`fe0603`)에 생성되었는지 확인

### 여전히 인증 실패 시
```bash
# 기존 인증 정보 삭제
git config --unset credential.helper

# 다시 푸시 시도
git push -u origin main
```

## ✅ 성공 확인

연결이 성공하면 다음과 같은 메시지가 표시됩니다:
```
Enumerating objects: 30, done.
Counting objects: 100% (30/30), done.
Delta compression using up to 8 threads
Compressing objects: 100% (28/28), done.
Writing objects: 100% (30/30), 123.45 KiB | 12.34 MiB/s, done.
Total 30 (delta 2), reused 0 (delta 0), pack-reused 0
To https://github.com/fe0603/mydata-naverpay.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

그 후 [https://github.com/fe0603/mydata-naverpay](https://github.com/fe0603/mydata-naverpay)에서 파일들이 업로드된 것을 확인할 수 있습니다.

---

**💡 토큰 생성이 완료되면 알려주세요! 연결을 도와드리겠습니다.**
