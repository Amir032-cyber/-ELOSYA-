// ===== CONFIGURATION GLOBALE =====
const ELOSYA_CONFIG = {
    API_URL: 'https://api.elosya.com',
    LOCAL_API: 'http://localhost:3000/api',
    VIDEO_LIMIT: 500 * 1024 * 1024,
    EARNING_RATES: {
        per1000Views: 0.01,
        per20Likes: 0.05,
        per10Shares: 0.10,
        per50Comments: 0.02,
        coinValue: 0.10
    }
};

// ===== INITIALISATION DE L'APPLICATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Elosya - Initialisation...');
    
    try {
        // 1. Initialiser les composants UI
        initUIComponents();
        
        // 2. Initialiser l'authentification
        await initAuth();
        
        // 3. Détecter la page et initialiser les fonctionnalités spécifiques
        const page = detectCurrentPage();
        await initPageFeatures(page);
        
        // 4. Vérifier la connexion
        await checkInternetConnection();
        
        // 5. Initialiser les notifications
        initNotifications();
        
        console.log('✅ Application initialisée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showError('Une erreur est survenue lors du chargement');
    }
});

// ===== DÉTECTION DE PAGE =====
function detectCurrentPage() {
    const path = window.location.pathname;
    
    if (path.includes('feed.html') || path === '/') return 'feed';
    if (path.includes('upload.html')) return 'upload';
    if (path.includes('profile.html')) return 'profile';
    if (path.includes('wallet.html')) return 'wallet';
    if (path.includes('premium.html')) return 'premium';
    if (path.includes('ai-therapist.html') || path.includes('lam-ai.html')) return 'ai';
    if (path.includes('community.html')) return 'community';
    if (path.includes('login.html')) return 'login';
    if (path.includes('register.html')) return 'register';
    
    return 'home';
}

// ===== INITIALISATION DES FONCTIONNALITÉS PAR PAGE =====
async function initPageFeatures(page) {
    switch(page) {
        case 'feed':
            await import('./feed.js').then(module => module.initVideoFeed());
            break;
        case 'upload':
            await import('./upload.js').then(module => module.initVideoUpload());
            break;
        case 'profile':
            await import('./profile.js').then(module => module.initUserProfile());
            break;
        case 'wallet':
            await import('./wallet.js').then(module => module.initWallet());
            break;
        case 'ai':
            await import('./ai-therapist.js').then(module => module.initAIChat());
            break;
        case 'premium':
            await import('./premium.js').then(module => module.initPremiumFeatures());
            break;
    }
}

// ===== VÉRIFICATION CONNEXION INTERNET =====
async function checkInternetConnection() {
    if (!navigator.onLine) {
        showOfflineWarning();
        return false;
    }
    
    try {
        const response = await fetch(`${ELOSYA_CONFIG.API_URL}/health`, {
            method: 'HEAD',
            timeout: 5000
        });
        
        if (!response.ok) {
            showWarning('Le serveur semble rencontrer des difficultés');
        }
        
        return response.ok;
    } catch (error) {
        showWarning('Problème de connexion au serveur');
        return false;
    }
}

// ===== GESTION DES ERREURS =====
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'global-error';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

function showOfflineWarning() {
    const offlineDiv = document.createElement('div');
    offlineDiv.className = 'offline-warning';
    offlineDiv.innerHTML = `
        <div class="offline-content">
            <i class="fas fa-wifi-slash"></i>
            <span>Vous êtes hors ligne. Certaines fonctionnalités sont limitées.</span>
        </div>
    `;
    
    document.body.appendChild(offlineDiv);
    
    // Surveiller le retour en ligne
    window.addEventListener('online', () => {
        offlineDiv.innerHTML = `
            <div class="offline-content reconnecting">
                <i class="fas fa-wifi"></i>
                <span>Connexion rétablie !</span>
            </div>
        `;
        
        setTimeout(() => offlineDiv.remove(), 3000);
    });
}

// ===== GESTION DU SPLASH SCREEN =====
function initSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) return;
    
    // Animation d'entrée
    splashScreen.style.opacity = '1';
    
    // Simulation chargement
    const progressBar = document.querySelector('.splash-progress');
    if (progressBar) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                // Cacher le splash screen
                setTimeout(() => {
                    splashScreen.style.opacity = '0';
                    setTimeout(() => {
                        splashScreen.style.display = 'none';
                        
                        // Déclencher animations d'entrée
                        document.dispatchEvent(new CustomEvent('splash:complete'));
                        
                    }, 500);
                }, 300);
            }
            progressBar.style.width = `${progress}%`;
        }, 50);
    }
}

// ===== ÉVÉNEMENTS GLOBAUX =====
document.addEventListener('splash:complete', () => {
    // Initialiser les animations de page
    if (typeof initPageAnimations === 'function') {
        initPageAnimations();
    }
});

// ===== EXPORT =====
if (typeof module !== 'undefined') {
    module.exports = { ELOSYA_CONFIG, detectCurrentPage };
}
// ===== GESTIONNAIRE D'AUTHENTIFICATION =====
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.sessionStart = null;
    }
    
    // ===== INITIALISATION =====
    async init() {
        console.log('🔐 Initialisation authentification...');
        
        try {
            await this.loadSession();
            this.setupEventListeners();
            this.updateAuthUI();
            
            if (this.isAuthenticated()) {
                this.startSessionRefresh();
                await this.validateSession();
            }
            
            console.log('✅ Authentification initialisée');
            
        } catch (error) {
            console.error('❌ Erreur initialisation auth:', error);
        }
    }
    
    // ===== CHARGEMENT SESSION =====
    async loadSession() {
        const userData = localStorage.getItem('elosya_user');
        const token = localStorage.getItem('elosya_token');
        const sessionStart = localStorage.getItem('elosya_session_start');
        
        if (userData && token) {
            this.currentUser = JSON.parse(userData);
            this.token = token;
            this.sessionStart = parseInt(sessionStart) || Date.now();
            
            // Vérifier si la session est expirée
            const sessionAge = Date.now() - this.sessionStart;
            const maxSessionAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
            
            if (sessionAge > maxSessionAge) {
                console.log('Session expirée');
                await this.logout();
                return;
            }
        }
    }
    
    // ===== CONNEXION =====
    async login(email, password) {
        try {
            showLoading('Connexion en cours...');
            
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Identifiants invalides');
            }
            
            // Sauvegarder session
            this.currentUser = data.user;
            this.token = data.token;
            this.sessionStart = Date.now();
            
            localStorage.setItem('elosya_user', JSON.stringify(data.user));
            localStorage.setItem('elosya_token', data.token);
            localStorage.setItem('elosya_session_start', this.sessionStart.toString());
            
            // Mettre à jour l'UI
            this.updateAuthUI();
            this.startSessionRefresh();
            
            // Déclencher événement
            document.dispatchEvent(new CustomEvent('auth:login', {
                detail: { user: data.user }
            }));
            
            showNotification('Connexion réussie !', 'success');
            
            // Redirection
            setTimeout(() => {
                const redirectTo = data.user.isCreator ? 'feed.html' : 'index.html';
                window.location.href = redirectTo;
            }, 1500);
            
            return data;
            
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        } finally {
            hideLoading();
        }
    }
    
    // ===== INSCRIPTION =====
    async register(userData) {
        try {
            showLoading('Création de votre compte...');
            
            // Validation
            if (!this.validateRegistration(userData)) {
                throw new Error('Données d\'inscription invalides');
            }
            
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de l\'inscription');
            }
            
            // Auto-login après inscription
            await this.login(userData.email, userData.password);
            
            showNotification('Compte créé avec succès !', 'success');
            
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        } finally {
            hideLoading();
        }
    }
    
    // ===== VALIDATION INSCRIPTION =====
    validateRegistration(userData) {
        const errors = [];
        
        // Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            errors.push('Email invalide');
        }
        
        // Mot de passe
        if (userData.password.length < 8) {
            errors.push('Le mot de passe doit contenir au moins 8 caractères');
        }
        
        if (userData.password !== userData.confirmPassword) {
            errors.push('Les mots de passe ne correspondent pas');
        }
        
        // Nom d'utilisateur
        if (userData.username.length < 3) {
            errors.push('Le nom d\'utilisateur doit contenir au moins 3 caractères');
        }
        
        if (errors.length > 0) {
            showNotification(errors.join(', '), 'error');
            return false;
        }
        
        return true;
    }
    
    // ===== DÉCONNEXION =====
    async logout() {
        try {
            showLoading('Déconnexion...');
            
            // Appeler API de logout si connecté
            if (this.isAuthenticated()) {
                await fetch(`${ELOSYA_CONFIG.API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
            
        } catch (error) {
            console.log('Logout API error:', error);
        } finally {
            // Nettoyer le stockage local
            this.clearLocalStorage();
            
            this.currentUser = null;
            this.token = null;
            this.sessionStart = null;
            
            // Mettre à jour l'UI
            this.updateAuthUI();
            
            // Déclencher événement
            document.dispatchEvent(new CustomEvent('auth:logout'));
            
            showNotification('Déconnexion réussie', 'success');
            
            // Rediriger vers l'accueil
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
            hideLoading();
        }
    }
    
    // ===== MISE À JOUR UI =====
    updateAuthUI() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;
        
        if (this.isAuthenticated()) {
            // Menu utilisateur connecté
            headerActions.innerHTML = this.getAuthenticatedMenu();
            this.initUserDropdown();
        } else {
            // Boutons connexion/inscription
            headerActions.innerHTML = this.getUnauthenticatedMenu();
        }
    }
    
    getAuthenticatedMenu() {
        const username = this.currentUser?.username || 'Utilisateur';
        const initials = this.getUserInitials();
        const color = this.getUserColor();
        
        return `
            <div class="user-dropdown">
                <div class="user-avatar" style="background: ${color}">
                    ${initials}
                    ${this.currentUser?.badges?.includes('premium') ? 
                        '<span class="badge-indicator premium">⚫</span>' : ''}
                </div>
                <div class="dropdown-content">
                    <a href="profile.html?id=${this.currentUser._id}">
                        <i class="fas fa-user"></i> Mon Profil
                        ${this.getBadgeIcons()}
                    </a>
                    <a href="wallet.html">
                        <i class="fas fa-wallet"></i> Mon Portefeuille
                        <span class="wallet-balance">${this.currentUser?.walletBalance?.toFixed(2) || '0.00'}€</span>
                    </a>
                    <a href="videos.html">
                        <i class="fas fa-video"></i> Mes Vidéos
                    </a>
                    <a href="creator-dashboard.html">
                        <i class="fas fa-chart-line"></i> Tableau de bord
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="settings.html">
                        <i class="fas fa-cog"></i> Paramètres
                    </a>
                    <a href="#" onclick="authManager.logout()" class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Déconnexion
                    </a>
                </div>
            </div>
        `;
    }
    
    getUnauthenticatedMenu() {
        return `
            <a href="login.html" class="btn btn-outline">Connexion</a>
            <a href="register.html" class="btn btn-primary">Inscription</a>
        `;
    }
    
    // ===== UTILITAIRES UTILISATEUR =====
    getUserInitials() {
        if (!this.currentUser?.username) return '??';
        return this.currentUser.username
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    getUserColor() {
        if (!this.currentUser?.username) return 'var(--primary)';
        
        const colors = [
            'linear-gradient(135deg, #6C63FF, #FF6584)',
            'linear-gradient(135deg, #06D6A0, #118AB2)',
            'linear-gradient(135deg, #FFD166, #EF476F)',
            'linear-gradient(135deg, #8338EC, #3A86FF)'
        ];
        
        const hash = this.currentUser.username
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        return colors[hash % colors.length];
    }
    
    getBadgeIcons() {
        if (!this.currentUser?.badges) return '';
        
        const badgeIcons = {
            'blue': '🔵',
            'black': '⚫',
            'gold': '🟡',
            'verified': '✓',
            'premium': '👑'
        };
        
        return this.currentUser.badges
            .map(badge => `<span class="badge-icon">${badgeIcons[badge] || '•'}</span>`)
            .join('');
    }
    
    // ===== DROPDOWN UTILISATEUR =====
    initUserDropdown() {
        const dropdown = document.querySelector('.user-dropdown');
        if (!dropdown) return;
        
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        
        // Fermer en cliquant ailleurs
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });
        
        // Fermer avec ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.remove('active');
            }
        });
    }
    
    // ===== VÉRIFICATION SESSION =====
    async validateSession() {
        if (!this.isAuthenticated()) return false;
        
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                // Session invalide, déconnecter
                await this.logout();
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.log('Session validation failed:', error);
            return false;
        }
    }
    
    // ===== RAFRAÎCHISSEMENT TOKEN =====
    async refreshToken() {
        if (!this.token) return;
        
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                localStorage.setItem('elosya_token', data.token);
            }
        } catch (error) {
            console.log('Token refresh failed:', error);
        }
    }
    
    startSessionRefresh() {
        // Rafraîchir le token toutes les 15 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshToken();
        }, 15 * 60 * 1000);
    }
    
    // ===== NETTOYAGE =====
    clearLocalStorage() {
        localStorage.removeItem('elosya_user');
        localStorage.removeItem('elosya_token');
        localStorage.removeItem('elosya_session_start');
        
        // Nettoyer aussi les données temporaires
        sessionStorage.clear();
    }
    
    stopSessionRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
    
    // ===== VÉRIFICATIONS =====
    isAuthenticated() {
        return !!this.currentUser && !!this.token;
    }
    
    isPremium() {
        return this.currentUser?.badges?.includes('premium') || false;
    }
    
    isCreator() {
        return this.currentUser?.isCreator || false;
    }
    
    hasBadge(badgeName) {
        return this.currentUser?.badges?.includes(badgeName) || false;
    }
    
    // ===== ÉCOUTEURS D'ÉVÉNEMENTS =====
    setupEventListeners() {
        // Écouter les événements d'authentification
        document.addEventListener('auth:login', (e) => {
            console.log('Événement auth:login déclenché');
        });
        
        document.addEventListener('auth:logout', () => {
            console.log('Événement auth:logout déclenché');
            this.stopSessionRefresh();
        });
        
        // Surveiller les onglets
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated()) {
                this.validateSession();
            }
        });
    }
    
    // ===== GETTERS =====
    getUser() {
        return this.currentUser;
    }
    
    getToken() {
        return this.token;
    }
    
    getUserId() {
        return this.currentUser?._id;
    }
    
    getUsername() {
        return this.currentUser?.username;
    }
}

// ===== INITIALISATION =====
let authManager = null;

async function initAuth() {
    authManager = new AuthManager();
    await authManager.init();
    return authManager;
}

// ===== FONCTIONS GLOBALES =====
function logout() {
    if (authManager) {
        authManager.logout();
    }
}

function isLoggedIn() {
    return authManager?.isAuthenticated() || false;
}

function getCurrentUser() {
    return authManager?.getUser() || null;
}

// ===== EXPORT =====
if (typeof module !== 'undefined') {
    module.exports = { AuthManager, initAuth, logout, isLoggedIn, getCurrentUser };
              }
