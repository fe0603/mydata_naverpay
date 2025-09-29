// 마이데이터 투자 제안 시스템 - 사용자 인증 및 보안 시스템
// JWT 토큰 기반 인증, OAuth 연동, 개인정보 암호화

class AuthenticationManager {
    constructor() {
        this.currentUser = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenRefreshTimer = null;
        
        // 보안 설정
        this.config = {
            tokenExpiry: 3600000, // 1시간 (밀리초)
            refreshThreshold: 300000, // 5분 전 갱신
            maxLoginAttempts: 5,
            lockoutDuration: 300000, // 5분 잠금
            sessionTimeout: 1800000, // 30분 비활성 타임아웃
        };
        
        // 암호화 키 (실제 서비스에서는 서버에서 관리)
        this.encryptionKey = this.generateEncryptionKey();
        
        this.initializeAuth();
    }

    // 인증 시스템 초기화
    async initializeAuth() {
        try {
            // 저장된 토큰 확인
            await this.loadStoredTokens();
            
            // 토큰 유효성 검증
            if (this.accessToken) {
                const isValid = await this.validateToken(this.accessToken);
                if (isValid) {
                    await this.loadUserProfile();
                    this.startTokenRefreshTimer();
                } else {
                    await this.refreshAccessToken();
                }
            }
            
            // 세션 타임아웃 모니터링 시작
            this.startSessionTimeout();
            
            console.log('[Auth] 인증 시스템 초기화 완료');
            
        } catch (error) {
            console.error('[Auth] 인증 시스템 초기화 실패:', error);
            this.logout();
        }
    }

    // 사용자 로그인
    async login(email, password, rememberMe = false) {
        try {
            // 로그인 시도 제한 확인
            if (this.isAccountLocked(email)) {
                throw new Error('계정이 일시적으로 잠겨있습니다. 잠시 후 다시 시도해주세요.');
            }

            // 입력값 검증
            this.validateLoginInput(email, password);

            // 로그인 요청
            const response = await this.sendLoginRequest(email, password);
            
            if (response.success) {
                // 토큰 저장
                this.accessToken = response.accessToken;
                this.refreshToken = response.refreshToken;
                this.currentUser = response.user;
                
                // 로컬 저장소에 토큰 저장 (Remember Me 옵션)
                if (rememberMe) {
                    await this.storeTokens(true);
                } else {
                    await this.storeTokens(false); // 세션 저장소만 사용
                }
                
                // 로그인 성공 처리
                this.onLoginSuccess();
                
                // 로그인 시도 초기화
                this.clearLoginAttempts(email);
                
                return {
                    success: true,
                    user: this.currentUser,
                    message: '로그인에 성공했습니다.'
                };
                
            } else {
                // 로그인 실패 처리
                this.handleLoginFailure(email);
                throw new Error(response.message || '로그인에 실패했습니다.');
            }
            
        } catch (error) {
            console.error('[Auth] 로그인 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 소셜 로그인 (Google OAuth)
    async loginWithGoogle() {
        try {
            // Google OAuth 설정 확인
            if (!window.google || !window.google.accounts) {
                throw new Error('Google OAuth 라이브러리가 로드되지 않았습니다.');
            }

            return new Promise((resolve, reject) => {
                window.google.accounts.oauth2.initTokenClient({
                    client_id: process.env.GOOGLE_CLIENT_ID || 'demo_google_client_id',
                    scope: 'email profile openid',
                    callback: async (response) => {
                        try {
                            if (response.access_token) {
                                // Google 사용자 정보 가져오기
                                const userInfo = await this.getGoogleUserInfo(response.access_token);
                                
                                // 서버에 소셜 로그인 요청
                                const loginResult = await this.processSocialLogin('google', userInfo, response.access_token);
                                
                                if (loginResult.success) {
                                    this.accessToken = loginResult.accessToken;
                                    this.refreshToken = loginResult.refreshToken;
                                    this.currentUser = loginResult.user;
                                    
                                    await this.storeTokens(true);
                                    this.onLoginSuccess();
                                    
                                    resolve({
                                        success: true,
                                        user: this.currentUser,
                                        message: 'Google 로그인에 성공했습니다.'
                                    });
                                } else {
                                    reject(new Error(loginResult.message));
                                }
                            } else {
                                reject(new Error('Google OAuth 인증에 실패했습니다.'));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    }
                }).requestAccessToken();
            });
            
        } catch (error) {
            console.error('[Auth] Google 로그인 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 네이버 로그인 (Naver OAuth)
    async loginWithNaver() {
        try {
            // 네이버 로그인 SDK 확인
            if (!window.naver || !window.naver.LoginWithNaverId) {
                throw new Error('네이버 로그인 SDK가 로드되지 않았습니다.');
            }

            return new Promise((resolve, reject) => {
                const naverLogin = new window.naver.LoginWithNaverId({
                    clientId: process.env.NAVER_CLIENT_ID || 'demo_naver_client_id',
                    callbackUrl: window.location.origin + '/auth/naver/callback',
                    isPopup: true,
                    callbackHandle: true
                });

                naverLogin.init();
                
                naverLogin.getLoginStatus(async (status) => {
                    try {
                        if (status) {
                            const userInfo = {
                                id: naverLogin.user.getId(),
                                email: naverLogin.user.getEmail(),
                                name: naverLogin.user.getName(),
                                profileImage: naverLogin.user.getProfileImage()
                            };
                            
                            const loginResult = await this.processSocialLogin('naver', userInfo, naverLogin.accessToken);
                            
                            if (loginResult.success) {
                                this.accessToken = loginResult.accessToken;
                                this.refreshToken = loginResult.refreshToken;
                                this.currentUser = loginResult.user;
                                
                                await this.storeTokens(true);
                                this.onLoginSuccess();
                                
                                resolve({
                                    success: true,
                                    user: this.currentUser,
                                    message: '네이버 로그인에 성공했습니다.'
                                });
                            } else {
                                reject(new Error(loginResult.message));
                            }
                        } else {
                            reject(new Error('네이버 로그인에 실패했습니다.'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
                
                naverLogin.login();
            });
            
        } catch (error) {
            console.error('[Auth] 네이버 로그인 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 사용자 등록
    async register(userData) {
        try {
            // 입력값 검증
            this.validateRegistrationInput(userData);
            
            // 비밀번호 해싱
            const hashedPassword = await this.hashPassword(userData.password);
            
            // 개인정보 암호화
            const encryptedData = await this.encryptUserData({
                ...userData,
                password: hashedPassword
            });
            
            // 서버에 등록 요청
            const response = await this.sendRegistrationRequest(encryptedData);
            
            if (response.success) {
                return {
                    success: true,
                    message: '회원가입이 완료되었습니다. 이메일 인증을 진행해주세요.',
                    userId: response.userId
                };
            } else {
                throw new Error(response.message || '회원가입에 실패했습니다.');
            }
            
        } catch (error) {
            console.error('[Auth] 회원가입 실패:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 로그아웃
    async logout() {
        try {
            // 서버에 로그아웃 요청
            if (this.accessToken) {
                await this.sendLogoutRequest(this.accessToken);
            }
            
            // 로컬 데이터 정리
            this.clearAuthData();
            
            // 타이머 정리
            this.clearTimers();
            
            // 로그아웃 이벤트 발생
            this.onLogout();
            
            console.log('[Auth] 로그아웃 완료');
            
        } catch (error) {
            console.error('[Auth] 로그아웃 처리 중 오류:', error);
            // 오류가 있어도 로컬 데이터는 정리
            this.clearAuthData();
        }
    }

    // 토큰 갱신
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('리프레시 토큰이 없습니다.');
            }

            const response = await this.sendTokenRefreshRequest(this.refreshToken);
            
            if (response.success) {
                this.accessToken = response.accessToken;
                if (response.refreshToken) {
                    this.refreshToken = response.refreshToken;
                }
                
                await this.storeTokens();
                this.startTokenRefreshTimer();
                
                console.log('[Auth] 토큰 갱신 완료');
                return true;
                
            } else {
                // 리프레시 실패 시 로그아웃
                console.warn('[Auth] 토큰 갱신 실패, 로그아웃 처리');
                await this.logout();
                return false;
            }
            
        } catch (error) {
            console.error('[Auth] 토큰 갱신 오류:', error);
            await this.logout();
            return false;
        }
    }

    // 사용자 프로필 로드
    async loadUserProfile() {
        try {
            if (!this.accessToken) return null;

            const response = await this.sendProfileRequest(this.accessToken);
            
            if (response.success) {
                this.currentUser = response.user;
                return this.currentUser;
            } else {
                throw new Error('사용자 프로필 로드 실패');
            }
            
        } catch (error) {
            console.error('[Auth] 프로필 로드 실패:', error);
            return null;
        }
    }

    // 비밀번호 해싱
    async hashPassword(password) {
        try {
            // Web Crypto API 사용
            const encoder = new TextEncoder();
            const data = encoder.encode(password + 'mydata_salt_2024');
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('[Auth] 비밀번호 해싱 실패:', error);
            throw new Error('비밀번호 처리 중 오류가 발생했습니다.');
        }
    }

    // 사용자 데이터 암호화
    async encryptUserData(userData) {
        try {
            // 민감한 정보만 암호화
            const sensitiveFields = ['email', 'phone', 'address', 'birthDate'];
            const encryptedData = { ...userData };
            
            for (const field of sensitiveFields) {
                if (userData[field]) {
                    encryptedData[field] = await this.encryptData(userData[field]);
                }
            }
            
            return encryptedData;
            
        } catch (error) {
            console.error('[Auth] 데이터 암호화 실패:', error);
            throw new Error('데이터 암호화 중 오류가 발생했습니다.');
        }
    }

    // 데이터 암호화
    async encryptData(data) {
        try {
            const encoder = new TextEncoder();
            const dataBytes = encoder.encode(data);
            
            // AES-GCM 암호화
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                this.encryptionKey,
                dataBytes
            );
            
            // IV + 암호화된 데이터를 Base64로 인코딩
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedData), iv.length);
            
            return btoa(String.fromCharCode(...combined));
            
        } catch (error) {
            console.error('[Auth] 암호화 실패:', error);
            throw error;
        }
    }

    // 데이터 복호화
    async decryptData(encryptedData) {
        try {
            const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);
            
            const decryptedData = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                this.encryptionKey,
                data
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decryptedData);
            
        } catch (error) {
            console.error('[Auth] 복호화 실패:', error);
            throw error;
        }
    }

    // 암호화 키 생성
    generateEncryptionKey() {
        // 실제 서비스에서는 서버에서 키를 관리
        return crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // 토큰 저장
    async storeTokens(persistent = false) {
        try {
            const storage = persistent ? localStorage : sessionStorage;
            const encryptedTokens = await this.encryptData(JSON.stringify({
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                timestamp: Date.now()
            }));
            
            storage.setItem('mydata_auth_tokens', encryptedTokens);
            
        } catch (error) {
            console.error('[Auth] 토큰 저장 실패:', error);
        }
    }

    // 저장된 토큰 로드
    async loadStoredTokens() {
        try {
            const encryptedTokens = localStorage.getItem('mydata_auth_tokens') || 
                                  sessionStorage.getItem('mydata_auth_tokens');
            
            if (encryptedTokens) {
                const decryptedData = await this.decryptData(encryptedTokens);
                const tokens = JSON.parse(decryptedData);
                
                // 토큰 만료 확인 (24시간)
                if (Date.now() - tokens.timestamp < 86400000) {
                    this.accessToken = tokens.accessToken;
                    this.refreshToken = tokens.refreshToken;
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('[Auth] 토큰 로드 실패:', error);
            return false;
        }
    }

    // 인증 데이터 정리
    clearAuthData() {
        this.currentUser = null;
        this.accessToken = null;
        this.refreshToken = null;
        
        localStorage.removeItem('mydata_auth_tokens');
        sessionStorage.removeItem('mydata_auth_tokens');
        localStorage.removeItem('mydata_login_attempts');
    }

    // 타이머 정리
    clearTimers() {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }

    // 토큰 갱신 타이머 시작
    startTokenRefreshTimer() {
        this.clearTimers();
        
        // 토큰 만료 5분 전에 갱신
        const refreshTime = this.config.tokenExpiry - this.config.refreshThreshold;
        
        this.tokenRefreshTimer = setTimeout(() => {
            this.refreshAccessToken();
        }, refreshTime);
    }

    // 세션 타임아웃 모니터링
    startSessionTimeout() {
        let lastActivity = Date.now();
        
        const resetTimer = () => {
            lastActivity = Date.now();
        };
        
        // 사용자 활동 감지
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        // 타임아웃 체크
        setInterval(() => {
            if (this.currentUser && Date.now() - lastActivity > this.config.sessionTimeout) {
                console.warn('[Auth] 세션 타임아웃으로 자동 로그아웃');
                this.logout();
            }
        }, 60000); // 1분마다 체크
    }

    // 이벤트 핸들러들
    onLoginSuccess() {
        // 로그인 성공 이벤트
        window.dispatchEvent(new CustomEvent('auth:loginSuccess', {
            detail: { user: this.currentUser }
        }));
    }

    onLogout() {
        // 로그아웃 이벤트
        window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    // 유틸리티 메서드들
    isAuthenticated() {
        return !!(this.currentUser && this.accessToken);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getAccessToken() {
        return this.accessToken;
    }

    // 입력값 검증
    validateLoginInput(email, password) {
        if (!email || !password) {
            throw new Error('이메일과 비밀번호를 입력해주세요.');
        }
        
        if (!this.isValidEmail(email)) {
            throw new Error('올바른 이메일 형식이 아닙니다.');
        }
        
        if (password.length < 8) {
            throw new Error('비밀번호는 8자 이상이어야 합니다.');
        }
    }

    validateRegistrationInput(userData) {
        const { email, password, confirmPassword, name, agreeToTerms } = userData;
        
        if (!email || !password || !confirmPassword || !name) {
            throw new Error('모든 필수 항목을 입력해주세요.');
        }
        
        if (!this.isValidEmail(email)) {
            throw new Error('올바른 이메일 형식이 아닙니다.');
        }
        
        if (!this.isStrongPassword(password)) {
            throw new Error('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.');
        }
        
        if (password !== confirmPassword) {
            throw new Error('비밀번호가 일치하지 않습니다.');
        }
        
        if (!agreeToTerms) {
            throw new Error('이용약관에 동의해주세요.');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isStrongPassword(password) {
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return strongRegex.test(password);
    }

    // 로그인 시도 관리
    handleLoginFailure(email) {
        const attempts = this.getLoginAttempts(email);
        const newAttempts = attempts + 1;
        
        localStorage.setItem(`login_attempts_${email}`, JSON.stringify({
            count: newAttempts,
            timestamp: Date.now()
        }));
        
        if (newAttempts >= this.config.maxLoginAttempts) {
            localStorage.setItem(`account_locked_${email}`, Date.now().toString());
        }
    }

    getLoginAttempts(email) {
        try {
            const data = localStorage.getItem(`login_attempts_${email}`);
            if (data) {
                const attempts = JSON.parse(data);
                // 1시간 후 초기화
                if (Date.now() - attempts.timestamp > 3600000) {
                    this.clearLoginAttempts(email);
                    return 0;
                }
                return attempts.count;
            }
        } catch (error) {
            console.error('[Auth] 로그인 시도 확인 오류:', error);
        }
        return 0;
    }

    isAccountLocked(email) {
        try {
            const lockTime = localStorage.getItem(`account_locked_${email}`);
            if (lockTime) {
                const timeSinceLock = Date.now() - parseInt(lockTime);
                if (timeSinceLock < this.config.lockoutDuration) {
                    return true;
                } else {
                    localStorage.removeItem(`account_locked_${email}`);
                }
            }
        } catch (error) {
            console.error('[Auth] 계정 잠금 확인 오류:', error);
        }
        return false;
    }

    clearLoginAttempts(email) {
        localStorage.removeItem(`login_attempts_${email}`);
        localStorage.removeItem(`account_locked_${email}`);
    }

    // API 요청 메서드들 (실제 구현에서는 서버 엔드포인트 연결)
    async sendLoginRequest(email, password) {
        // 실제 구현에서는 서버 API 호출
        await this.delay(1000); // 시뮬레이션
        
        // 데모용 응답
        return {
            success: true,
            accessToken: 'demo_access_token_' + Date.now(),
            refreshToken: 'demo_refresh_token_' + Date.now(),
            user: {
                id: 'user123',
                email: email,
                name: '테스트 사용자',
                profileImage: '',
                role: 'user'
            }
        };
    }

    async sendRegistrationRequest(userData) {
        await this.delay(1000);
        return {
            success: true,
            userId: 'user' + Date.now(),
            message: '회원가입이 완료되었습니다.'
        };
    }

    async sendLogoutRequest(token) {
        await this.delay(500);
        return { success: true };
    }

    async sendTokenRefreshRequest(refreshToken) {
        await this.delay(500);
        return {
            success: true,
            accessToken: 'new_access_token_' + Date.now()
        };
    }

    async sendProfileRequest(token) {
        await this.delay(500);
        return {
            success: true,
            user: this.currentUser
        };
    }

    async validateToken(token) {
        await this.delay(300);
        return token && token.startsWith('demo_access_token');
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 전역 인증 관리자 인스턴스
let authManager = null;

// 인증 시스템 초기화
function initializeAuth() {
    if (!authManager) {
        authManager = new AuthenticationManager();
    }
    return authManager;
}

// 전역 접근을 위한 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthenticationManager, initializeAuth };
} else {
    window.AuthenticationManager = AuthenticationManager;
    window.initializeAuth = initializeAuth;
}
