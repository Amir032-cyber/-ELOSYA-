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
// ===== GESTION DU FLUX VIDÉO TIKTOK-STYLE =====

class VideoFeed {
    constructor() {
        this.currentVideoIndex = 0;
        this.videos = [];
        this.isPlaying = false;
        this.currentVideo = null;
        this.videoContainers = [];
        this.isDragging = false;
        this.startY = 0;
        this.currentTranslateY = 0;
        this.autoPlayEnabled = true;
        this.preloadedVideos = new Map();
    }
    
    // ===== INITIALISATION =====
    async init() {
        console.log('🎬 Initialisation flux vidéo...');
        
        try {
            // Récupérer les éléments DOM
            this.feedContainer = document.getElementById('videoFeed');
            if (!this.feedContainer) {
                console.warn('Conteneur vidéo non trouvé');
                return;
            }
            
            // Charger les vidéos
            await this.loadVideos();
            
            // Initialiser les événements
            this.initEvents();
            
            // Démarrer l'autoplay
            if (this.autoPlayEnabled && this.videoContainers.length > 0) {
                this.playCurrentVideo();
            }
            
            // Précharger les vidéos suivantes
            this.preloadNextVideos();
            
            console.log(`✅ Flux vidéo initialisé (${this.videos.length} vidéos)`);
            
        } catch (error) {
            console.error('❌ Erreur initialisation flux:', error);
            this.showError('Impossible de charger le flux vidéo');
        }
    }
    
    // ===== CHARGEMENT DES VIDÉOS =====
    async loadVideos(page = 1) {
        try {
            // Afficher le loading
            this.showLoading();
            
            // Récupérer les vidéos depuis l'API
            const response = await this.fetchVideos(page);
            this.videos = response.videos;
            
            // Vider le conteneur
            this.feedContainer.innerHTML = '';
            
            // Créer les conteneurs vidéo
            this.videos.forEach((video, index) => {
                const videoElement = this.createVideoElement(video, index);
                this.feedContainer.appendChild(videoElement);
            });
            
            // Mettre à jour les références
            this.videoContainers = Array.from(this.feedContainer.querySelectorAll('.video-container'));
            
            // Cacher le loading
            this.hideLoading();
            
        } catch (error) {
            console.error('Erreur chargement vidéos:', error);
            this.showError('Erreur de chargement des vidéos');
        }
    }
    
    async fetchVideos(page = 1) {
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/feed?page=${page}&limit=10`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.log('Falling back to mock data');
            return this.getMockVideos();
        }
    }
    
    getMockVideos() {
        return {
            videos: [
                {
                    id: '1',
                    url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-practicing-yoga-4451-large.mp4',
                    title: 'Yoga matinal',
                    description: 'Commencez votre journée avec énergie positive 🧘‍♀️✨',
                    user: {
                        id: 'user1',
                        username: '@yoga_master',
                        avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
                        badges: ['verified']
                    },
                    stats: {
                        likes: 1520,
                        comments: 89,
                        shares: 45,
                        coins: 12,
                        views: 12500
                    },
                    duration: 45,
                    hashtags: ['#yoga', '#bienêtre', '#santémentale'],
                    location: 'Paris, France',
                    timestamp: '2h',
                    monetized: true,
                    earnings: 8.75
                },
                {
                    id: '2',
                    url: 'https://assets.mixkit.co/videos/preview/mixkit-happy-young-people-dancing-at-a-party-2382-large.mp4',
                    title: 'Danse thérapie',
                    description: 'Libérez vos émotions par la danse 💃🕺',
                    user: {
                        id: 'user2',
                        username: '@dance_therapy',
                        avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
                        badges: ['premium', 'verified']
                    },
                    stats: {
                        likes: 2450,
                        comments: 156,
                        shares: 89,
                        coins: 28,
                        views: 32000
                    },
                    duration: 60,
                    hashtags: ['#danse', '#thérapie', '#positivité'],
                    location: 'Lyon, France',
                    timestamp: '4h',
                    monetized: true,
                    earnings: 15.20
                }
            ],
            page: 1,
            total: 2
        };
    }
    
    // ===== CRÉATION DES ÉLÉMENTS VIDÉO =====
    createVideoElement(videoData, index) {
        const template = document.getElementById('videoTemplate');
        const clone = template.content.cloneNode(true);
        const container = clone.querySelector('.video-container');
        
        // Données de base
        container.dataset.videoId = videoData.id;
        container.dataset.index = index;
        
        // Vidéo
        const video = container.querySelector('.video-player');
        video.dataset.src = videoData.url;
        video.poster = this.generateThumbnailUrl(videoData.id);
        
        // Informations utilisateur
        container.querySelector('.username').textContent = videoData.user.username;
        container.querySelector('.user-avatar').src = videoData.user.avatar;
        container.querySelector('.user-avatar').alt = videoData.user.username;
        
        // Badges utilisateur
        const badgeContainer = container.querySelector('.user-badges');
        if (badgeContainer && videoData.user.badges) {
            badgeContainer.innerHTML = videoData.user.badges
                .map(badge => `<span class="badge ${badge}">${this.getBadgeSymbol(badge)}</span>`)
                .join('');
        }
        
        // Description et hashtags
        container.querySelector('.video-description').textContent = videoData.description;
        container.querySelector('.hashtags').textContent = videoData.hashtags?.join(' ') || '';
        
        // Statistiques
        container.querySelector('.likes-count').textContent = this.formatNumber(videoData.stats.likes);
        container.querySelector('.comments-count').textContent = this.formatNumber(videoData.stats.comments);
        container.querySelector('.shares-count').textContent = this.formatNumber(videoData.stats.shares);
        container.querySelector('.coins-count').textContent = this.formatNumber(videoData.stats.coins);
        container.querySelector('.views-count').textContent = this.formatNumber(videoData.stats.views);
        
        // Métadonnées
        container.querySelector('.video-title').textContent = videoData.title;
        container.querySelector('.time-ago').textContent = videoData.timestamp;
        container.querySelector('.location').textContent = videoData.location || '';
        
        // Boutons d'action
        this.setupActionButtons(container, videoData);
        
        // Événements vidéo
        video.addEventListener('loadeddata', () => {
            this.onVideoLoaded(video, container);
        });
        
        video.addEventListener('ended', () => {
            this.onVideoEnded(videoData.id);
        });
        
        video.addEventListener('timeupdate', () => {
            this.updateVideoProgress(video, container);
        });
        
        return container;
    }
    
    // ===== GESTION DES ÉVÉNEMENTS =====
    initEvents() {
        // Swipe/touch events
        this.initSwipeEvents();
        
        // Keyboard navigation
        this.initKeyboardEvents();
        
        // Scroll events
        this.initScrollEvents();
        
        // Visibility events
        this.initVisibilityEvents();
        
        // Network events
        this.initNetworkEvents();
    }
    
    initSwipeEvents() {
        let startY = 0;
        let isDragging = false;
        
        this.feedContainer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
            this.isDragging = true;
        }, { passive: true });
        
        this.feedContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            // Limiter le déplacement
            if (Math.abs(diff) > 50) {
                e.preventDefault();
            }
        }, { passive: false });
        
        this.feedContainer.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            const endY = e.changedTouches[0].clientY;
            const diff = startY - endY;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.nextVideo();
                } else {
                    this.previousVideo();
                }
            }
            
            isDragging = false;
            this.isDragging = false;
        });
        
        // Mouse drag pour desktop
        let mouseStartY = 0;
        let isMouseDragging = false;
        
        this.feedContainer.addEventListener('mousedown', (e) => {
            mouseStartY = e.clientY;
            isMouseDragging = true;
        });
        
        this.feedContainer.addEventListener('mousemove', (e) => {
            if (!isMouseDragging) return;
            
            const diff = mouseStartY - e.clientY;
            if (Math.abs(diff) > 100) {
                if (diff > 0) {
                    this.nextVideo();
                } else {
                    this.previousVideo();
                }
                isMouseDragging = false;
            }
        });
        
        this.feedContainer.addEventListener('mouseup', () => {
            isMouseDragging = false;
        });
        
        this.feedContainer.addEventListener('mouseleave', () => {
            isMouseDragging = false;
        });
    }
    
    initKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Ignorer si un input est focus
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(e.key) {
                case 'ArrowDown':
                case ' ':
                    e.preventDefault();
                    this.nextVideo();
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    this.previousVideo();
                    break;
                    
                case 'm':
                case 'M':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                    
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                    
                case 'l':
                case 'L':
                    e.preventDefault();
                    this.likeCurrentVideo();
                    break;
            }
        });
    }
    
    initScrollEvents() {
        let lastScrollTime = 0;
        const scrollThrottle = 100; // ms
        
        window.addEventListener('wheel', (e) => {
            const now = Date.now();
            if (now - lastScrollTime < scrollThrottle) return;
            
            lastScrollTime = now;
            
            if (Math.abs(e.deltaY) > 50) {
                if (e.deltaY > 0) {
                    this.nextVideo();
                } else {
                    this.previousVideo();
                }
            }
        }, { passive: true });
    }
    
    initVisibilityEvents() {
        // Pause quand la page n'est pas visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseCurrentVideo();
            } else {
                this.playCurrentVideo();
            }
        });
    }
    
    initNetworkEvents() {
        // Surveiller la qualité réseau
        window.addEventListener('online', () => {
            this.onNetworkRestored();
        });
        
        window.addEventListener('offline', () => {
            this.onNetworkLost();
        });
    }
    
    // ===== NAVIGATION VIDÉO =====
    nextVideo() {
        if (this.currentVideoIndex >= this.videoContainers.length - 1) {
            // Charger plus de vidéos
            this.loadMoreVideos();
            return;
        }
        
        const currentContainer = this.videoContainers[this.currentVideoIndex];
        const nextContainer = this.videoContainers[this.currentVideoIndex + 1];
        
        // Animation de transition
        currentContainer.style.transform = 'translateY(-100vh)';
        nextContainer.style.transform = 'translateY(0)';
        
        // Mettre à jour l'index
        this.currentVideoIndex++;
        
        // Arrêter la vidéo précédente
        this.pauseVideo(currentContainer);
        
        // Jouer la nouvelle vidéo
        this.playVideo(nextContainer);
        
        // Suivre la vue
        this.trackVideoView(nextContainer.dataset.videoId);
        
        // Précharger les vidéos suivantes
        this.preloadNextVideos();
        
        // Mettre à jour l'URL
        this.updateURL(nextContainer.dataset.videoId);
    }
    
    previousVideo() {
        if (this.currentVideoIndex <= 0) return;
        
        const currentContainer = this.videoContainers[this.currentVideoIndex];
        const prevContainer = this.videoContainers[this.currentVideoIndex - 1];
        
        // Animation de transition
        currentContainer.style.transform = 'translateY(100vh)';
        prevContainer.style.transform = 'translateY(0)';
        
        // Mettre à jour l'index
        this.currentVideoIndex--;
        
        // Arrêter la vidéo précédente
        this.pauseVideo(currentContainer);
        
        // Jouer la nouvelle vidéo
        this.playVideo(prevContainer);
        
        // Mettre à jour l'URL
        this.updateURL(prevContainer.dataset.videoId);
    }
    
    playVideo(container) {
        const video = container.querySelector('.video-player');
        if (!video) return;
        
        // Charger la source si nécessaire
        if (!video.src && video.dataset.src) {
            video.src = video.dataset.src;
        }
        
        // Jouer la vidéo
        video.play().then(() => {
            this.isPlaying = true;
            container.classList.add('playing');
        }).catch(error => {
            console.log('Autoplay prevented:', error);
            // Afficher le bouton play
            container.classList.add('play-paused');
        });
    }
    
    pauseVideo(container) {
        const video = container.querySelector('.video-player');
        if (video) {
            video.pause();
            container.classList.remove('playing');
        }
    }
    
    playCurrentVideo() {
        if (this.videoContainers[this.currentVideoIndex]) {
            this.playVideo(this.videoContainers[this.currentVideoIndex]);
        }
    }
    
    pauseCurrentVideo() {
        if (this.videoContainers[this.currentVideoIndex]) {
            this.pauseVideo(this.videoContainers[this.currentVideoIndex]);
        }
    }
    
    // ===== ACTIONS UTILISATEUR =====
    setupActionButtons(container, videoData) {
        // Like
        const likeBtn = container.querySelector('.like-btn');
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLike(container, videoData.id);
        });
        
        // Comment
        const commentBtn = container.querySelector('.comment-btn');
        commentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openComments(container, videoData.id);
        });
        
        // Share
        const shareBtn = container.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.shareVideo(container, videoData);
        });
        
        // Coins
        const coinsBtn = container.querySelector('.coins-btn');
        coinsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sendCoins(container, videoData.id);
        });
        
        // Menu
        const menuBtn = container.querySelector('.menu-btn');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showVideoMenu(container, videoData);
        });
        
        // Follow
        const followBtn = container.querySelector('.follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFollow(container, videoData.user.id);
            });
        }
    }
    
    async toggleLike(container, videoId) {
        const likeBtn = container.querySelector('.like-btn');
        const likeCount = container.querySelector('.likes-count');
        
        const isLiked = likeBtn.classList.contains('liked');
        
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/like`, {
                method: isLiked ? 'DELETE' : 'POST',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                // Mettre à jour UI
                likeBtn.classList.toggle('liked');
                
                let count = parseInt(likeCount.textContent.replace(/[^0-9]/g, '')) || 0;
                count = isLiked ? count - 1 : count + 1;
                likeCount.textContent = this.formatNumber(count);
                
                // Animation
                likeBtn.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    likeBtn.style.transform = 'scale(1)';
                }, 300);
                
                // Notification
                if (!isLiked) {
                    showNotification('Vidéo likée!', 'success');
                    
                    // Vérifier si le créateur gagne de l'argent (tous les 20 likes)
                    if (count % 20 === 0) {
                        this.checkCreatorEarnings(videoId, 'like');
                    }
                }
            }
        } catch (error) {
            console.error('Like error:', error);
        }
    }
    
    async shareVideo(container, videoData) {
        const shareBtn = container.querySelector('.share-btn');
        const shareCount = container.querySelector('.shares-count');
        
        try {
            const shareUrl = `${window.location.origin}/video/${videoData.id}`;
                        // Enregistrer le partage
            await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoData.id}/share`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            // Vérifier les gains (tous les 10 partages)
            if (count % 10 === 0) {
                this.checkCreatorEarnings(videoData.id, 'share');
            }
            
        } catch (error) {
            console.error('Share error:', error);
        }
    }
    
    async sendCoins(container, videoId) {
        const amount = prompt('Combien de pièces Elosya voulez-vous envoyer? (1 pièce = 0.10€)');
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return;
        }
        
        try {
            showLoading('Envoi des pièces...');
            
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/coins`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: parseInt(amount) })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Mettre à jour le compteur
                const coinsCount = container.querySelector('.coins-count');
                let count = parseInt(coinsCount.textContent.replace(/[^0-9]/g, '')) || 0;
                count += parseInt(amount);
                coinsCount.textContent = this.formatNumber(count);
                
                showNotification(`${amount} pièces envoyées! (${(amount * 0.10).toFixed(2)}€)`, 'success');
            }
        } catch (error) {
            console.error('Send coins error:', error);
            showNotification('Erreur lors de l\'envoi', 'error');
        } finally {
            hideLoading();
        }
    }
    
    async openComments(container, videoId) {
        // Ouvrir modal de commentaires
        const modal = document.getElementById('commentsModal');
        if (!modal) return;
        
        // Charger les commentaires
        try {
            showLoading('Chargement des commentaires...');
            
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/comments`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const comments = await response.json();
                
                // Afficher les commentaires
                this.displayComments(modal, comments);
                
                // Ouvrir la modal
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);
                
                // Setup comment form
                this.setupCommentForm(modal, videoId);
            }
        } catch (error) {
            console.error('Load comments error:', error);
            showNotification('Erreur chargement commentaires', 'error');
        } finally {
            hideLoading();
        }
    }
    
    displayComments(modal, comments) {
        const container = modal.querySelector('.comments-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (comments.length === 0) {
            container.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comment-slash"></i>
                    <p>Soyez le premier à commenter!</p>
                </div>
            `;
            return;
        }
        
        comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            container.appendChild(commentElement);
        });
    }
    
    createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
            <div class="comment-header">
                <img src="${comment.user.avatar}" alt="${comment.user.username}" class="comment-avatar">
                <div class="comment-user">
                    <strong>${comment.user.username}</strong>
                    <span class="comment-time">${this.formatTimeAgo(comment.createdAt)}</span>
                </div>
            </div>
            <div class="comment-content">
                ${comment.content}
            </div>
            <div class="comment-actions">
                <button class="comment-like" data-comment-id="${comment.id}">
                    <i class="fas fa-heart"></i> ${this.formatNumber(comment.likes)}
                </button>
                <button class="comment-reply">
                    <i class="fas fa-reply"></i> Répondre
                </button>
            </div>
        `;
        
        return div;
    }
    
    setupCommentForm(modal, videoId) {
        const form = modal.querySelector('.comment-form');
        const input = modal.querySelector('.comment-input');
        const submitBtn = modal.querySelector('.comment-submit');
        
        if (!form || !input) return;
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const content = input.value.trim();
            if (!content) return;
            
            try {
                const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/comments`, {
                    method: 'POST',
                    headers: {
                        ...this.getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content })
                });
                
                if (response.ok) {
                    const newComment = await response.json();
                    
                    // Ajouter le commentaire à la liste
                    const container = modal.querySelector('.comments-container');
                    const commentElement = this.createCommentElement(newComment);
                    
                    // Si pas de commentaires, remplacer le message
                    const noComments = container.querySelector('.no-comments');
                    if (noComments) {
                        container.innerHTML = '';
                    }
                    
                    container.prepend(commentElement);
                    
                    // Clear input
                    input.value = '';
                    
                    // Mettre à jour le compteur dans le feed
                    this.updateCommentCount(videoId, 1);
                    
                    // Vérifier les gains (tous les 50 commentaires)
                    this.checkCreatorEarnings(videoId, 'comment');
                }
            } catch (error) {
                console.error('Post comment error:', error);
                showNotification('Erreur publication commentaire', 'error');
            }
        };
    }
    
    updateCommentCount(videoId, increment = 1) {
        // Trouver le conteneur vidéo
        const container = this.videoContainers.find(c => c.dataset.videoId === videoId);
        if (!container) return;
        
        const commentCount = container.querySelector('.comments-count');
        if (commentCount) {
            let count = parseInt(commentCount.textContent.replace(/[^0-9]/g, '')) || 0;
            count += increment;
            commentCount.textContent = this.formatNumber(count);
        }
    }
    
    async showVideoMenu(container, videoData) {
        const menu = document.createElement('div');
        menu.className = 'video-menu';
        menu.innerHTML = `
            <div class="menu-content">
                <button class="menu-item report-btn">
                    <i class="fas fa-flag"></i> Signaler
                </button>
                <button class="menu-item save-btn">
                    <i class="fas fa-bookmark"></i> Sauvegarder
                </button>
                <button class="menu-item not-interested-btn">
                    <i class="fas fa-eye-slash"></i> Pas intéressé
                </button>
                <button class="menu-item copy-link-btn">
                    <i class="fas fa-link"></i> Copier le lien
                </button>
                ${videoData.user.id === this.getCurrentUserId() ? `
                    <button class="menu-item delete-btn">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                    <button class="menu-item stats-btn">
                        <i class="fas fa-chart-bar"></i> Statistiques
                    </button>
                ` : ''}
            </div>
        `;
        
        // Positionner le menu
        const rect = container.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom - 200}px`;
        menu.style.right = '20px';
        
        document.body.appendChild(menu);
        
        // Fermer au clic ailleurs
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && e.target !== container.querySelector('.menu-btn')) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
        
        // Ajouter les événements
        this.setupMenuEvents(menu, container, videoData);
    }
    
    setupMenuEvents(menu, container, videoData) {
        // Signaler
        menu.querySelector('.report-btn')?.addEventListener('click', () => {
            this.reportVideo(videoData.id);
            menu.remove();
        });
        
        // Sauvegarder
        menu.querySelector('.save-btn')?.addEventListener('click', async () => {
            await this.saveVideo(videoData.id);
            menu.remove();
        });
        
        // Copier lien
        menu.querySelector('.copy-link-btn')?.addEventListener('click', () => {
            const url = `${window.location.origin}/video/${videoData.id}`;
            navigator.clipboard.writeText(url);
            showNotification('Lien copié!', 'success');
            menu.remove();
        });
        
        // Supprimer (si propriétaire)
        menu.querySelector('.delete-btn')?.addEventListener('click', async () => {
            if (confirm('Supprimer cette vidéo définitivement?')) {
                await this.deleteVideo(videoData.id);
                menu.remove();
            }
        });
        
        // Statistiques (si propriétaire)
        menu.querySelector('.stats-btn')?.addEventListener('click', () => {
            this.showVideoStats(videoData.id);
            menu.remove();
        });
    }
    
    async reportVideo(videoId) {
        const reason = prompt('Raison du signalement:');
        if (!reason) return;
        
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/report`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });
            
            if (response.ok) {
                showNotification('Signalement envoyé', 'success');
            }
        } catch (error) {
            console.error('Report error:', error);
        }
    }
    
    async saveVideo(videoId) {
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/save`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                showNotification('Vidéo sauvegardée', 'success');
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    }
    
    async deleteVideo(videoId) {
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                showNotification('Vidéo supprimée', 'success');
                
                // Retirer de la liste
                const container = this.videoContainers.find(c => c.dataset.videoId === videoId);
                if (container) {
                    container.remove();
                    this.videoContainers = this.videoContainers.filter(c => c.dataset.videoId !== videoId);
                    
                    // Si c'est la vidéo courante, passer à la suivante
                    if (container.dataset.index === this.currentVideoIndex.toString()) {
                        this.nextVideo();
                    }
                }
            }
        } catch (error) {
            console.error('Delete error:', error);
            showNotification('Erreur suppression', 'error');
        }
    }
    
    async showVideoStats(videoId) {
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/stats`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const stats = await response.json();
                this.displayStatsModal(stats);
            }
        } catch (error) {
            console.error('Stats error:', error);
        }
    }
    
    displayStatsModal(stats) {
        const modal = document.createElement('div');
        modal.className = 'stats-modal';
        modal.innerHTML = `
            <div class="stats-content">
                <div class="stats-header">
                    <h3>📊 Statistiques de la vidéo</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.views)}</div>
                        <div class="stat-label">Vues</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.likes)}</div>
                        <div class="stat-label">Likes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.comments)}</div>
                        <div class="stat-label">Commentaires</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.shares)}</div>
                        <div class="stat-label">Partages</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.coins)}</div>
                        <div class="stat-label">Pièces</div>
                    </div>
                    <div class="stat-card earnings">
                        <div class="stat-value">${stats.earnings?.toFixed(2) || '0.00'}€</div>
                        <div class="stat-label">Gains totaux</div>
                    </div>
                </div>
                <div class="stats-details">
                    <h4>Détails des gains</h4>
                    <ul>
                        <li>Vues: ${(stats.earnings_breakdown?.views || 0).toFixed(2)}€</li>
                        <li>Likes: ${(stats.earnings_breakdown?.likes || 0).toFixed(2)}€</li>
                        <li>Partages: ${(stats.earnings_breakdown?.shares || 0).toFixed(2)}€</li>
                        <li>Commentaires: ${(stats.earnings_breakdown?.comments || 0).toFixed(2)}€</li>
                        <li>Pièces: ${(stats.earnings_breakdown?.coins || 0).toFixed(2)}€</li>
                    </ul>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fermer
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    async toggleFollow(container, userId) {
        const followBtn = container.querySelector('.follow-btn');
        if (!followBtn) return;
        
        const isFollowing = followBtn.classList.contains('following');
        
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/users/${userId}/follow`, {
                method: isFollowing ? 'DELETE' : 'POST',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                followBtn.classList.toggle('following');
                followBtn.innerHTML = isFollowing ? 
                    '<i class="fas fa-user-plus"></i> Suivre' :
                    '<i class="fas fa-user-check"></i> Suivi';
                
                showNotification(
                    isFollowing ? 'Vous ne suivez plus cet utilisateur' : 'Vous suivez maintenant cet utilisateur',
                    'success'
                );
            }
        } catch (error) {
            console.error('Follow error:', error);
        }
    }
    
    // ===== FONCTIONS UTILITAIRES =====
    getAuthHeaders() {
        const token = localStorage.getItem('elosya_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    
    getCurrentUserId() {
        const userData = localStorage.getItem('elosya_user');
        if (!userData) return null;
        
        try {
            const user = JSON.parse(userData);
            return user._id || user.id;
        } catch (error) {
            return null;
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    formatTimeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 7) {
            return date.toLocaleDateString();
        } else if (days > 0) {
            return `${days}j`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}min`;
        } else {
            return 'À l\'instant';
        }
    }
    
    getBadgeSymbol(badge) {
        const symbols = {
            'verified': '✓',
            'premium': '⚫',
            'blue': '🔵',
            'gold': '🟡',
            'creator': '⭐'
        };
        return symbols[badge] || '•';
    }
    
    generateThumbnailUrl(videoId) {
        return `${ELOSYA_CONFIG.API_URL}/videos/${videoId}/thumbnail`;
    }
    
    // ===== GESTION DES ERREURS =====
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'feed-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="location.reload()">Réessayer</button>
        `;
        
        this.feedContainer.appendChild(errorDiv);
    }
    
    showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'feed-loading';
        loadingDiv.innerHTML = `
            <div classe             // Enregistrer le partage
            await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoData.id}/share`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            // Vérifier les gains (tous les 10 partages)
            if (count % 10 === 0) {
                this.checkCreatorEarnings(videoData.id, 'share');
            }
            
        } catch (error) {
            console.error('Share error:', error);
        }
    }
    
    async sendCoins(container, videoId) {
        const amount = prompt('Combien de pièces Elosya voulez-vous envoyer? (1 pièce = 0.10€)');
        
        if (!amount || isNaN(amount) || amount <= 0) {
            return;
        }
        
        try {
            showLoading('Envoi des pièces...');
            
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/coins`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: parseInt(amount) })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Mettre à jour le compteur
                const coinsCount = container.querySelector('.coins-count');
                let count = parseInt(coinsCount.textContent.replace(/[^0-9]/g, '')) || 0;
                count += parseInt(amount);
                coinsCount.textContent = this.formatNumber(count);
                
                showNotification(`${amount} pièces envoyées! (${(amount * 0.10).toFixed(2)}€)`, 'success');
            }
        } catch (error) {
            console.error('Send coins error:', error);
            showNotification('Erreur lors de l\'envoi', 'error');
        } finally {
            hideLoading();
        }
    }
    
    async openComments(container, videoId) {
        // Ouvrir modal de commentaires
        const modal = document.getElementById('commentsModal');
        if (!modal) return;
        
        // Charger les commentaires
        try {
            showLoading('Chargement des commentaires...');
            
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/comments`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const comments = await response.json();
                
                // Afficher les commentaires
                this.displayComments(modal, comments);
                
                // Ouvrir la modal
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);
                
                // Setup comment form
                this.setupCommentForm(modal, videoId);
            }
        } catch (error) {
            console.error('Load comments error:', error);
            showNotification('Erreur chargement commentaires', 'error');
        } finally {
            hideLoading();
        }
    }
    
    displayComments(modal, comments) {
        const container = modal.querySelector('.comments-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (comments.length === 0) {
            container.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comment-slash"></i>
                    <p>Soyez le premier à commenter!</p>
                </div>
            `;
            return;
        }
        
        comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            container.appendChild(commentElement);
        });
    }
    
    createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
            <div class="comment-header">
                <img src="${comment.user.avatar}" alt="${comment.user.username}" class="comment-avatar">
                <div class="comment-user">
                    <strong>${comment.user.username}</strong>
                    <span class="comment-time">${this.formatTimeAgo(comment.createdAt)}</span>
                </div>
            </div>
            <div class="comment-content">
                ${comment.content}
            </div>
            <div class="comment-actions">
                <button class="comment-like" data-comment-id="${comment.id}">
                    <i class="fas fa-heart"></i> ${this.formatNumber(comment.likes)}
                </button>
                <button class="comment-reply">
                    <i class="fas fa-reply"></i> Répondre
                </button>
            </div>
        `;
        
        return div;
    }
    
    setupCommentForm(modal, videoId) {
        const form = modal.querySelector('.comment-form');
        const input = modal.querySelector('.comment-input');
        const submitBtn = modal.querySelector('.comment-submit');
        
        if (!form || !input) return;
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const content = input.value.trim();
            if (!content) return;
            
            try {
                const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/comments`, {
                    method: 'POST',
                    headers: {
                        ...this.getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content })
                });
                
                if (response.ok) {
                    const newComment = await response.json();
                    
                    // Ajouter le commentaire à la liste
                    const container = modal.querySelector('.comments-container');
                    const commentElement = this.createCommentElement(newComment);
                    
                    // Si pas de commentaires, remplacer le message
                    const noComments = container.querySelector('.no-comments');
                    if (noComments) {
                        container.innerHTML = '';
                    }
                    
                    container.prepend(commentElement);
                    
                    // Clear input
                    input.value = '';
                    
                    // Mettre à jour le compteur dans le feed
                    this.updateCommentCount(videoId, 1);
                    
                    // Vérifier les gains (tous les 50 commentaires)
                    this.checkCreatorEarnings(videoId, 'comment');
                }
            } catch (error) {
                console.error('Post comment error:', error);
                showNotification('Erreur publication commentaire', 'error');
            }
        };
    }
    
    updateCommentCount(videoId, increment = 1) {
        // Trouver le conteneur vidéo
        const container = this.videoContainers.find(c => c.dataset.videoId === videoId);
        if (!container) return;
        
        const commentCount = container.querySelector('.comments-count');
        if (commentCount) {
            let count = parseInt(commentCount.textContent.replace(/[^0-9]/g, '')) || 0;
            count += increment;
            commentCount.textContent = this.formatNumber(count);
        }
    }
    
    async showVideoMenu(container, videoData) {
        const menu = document.createElement('div');
        menu.className = 'video-menu';
        menu.innerHTML = `
            <div class="menu-content">
                <button class="menu-item report-btn">
                    <i class="fas fa-flag"></i> Signaler
                </button>
                <button class="menu-item save-btn">
                    <i class="fas fa-bookmark"></i> Sauvegarder
                </button>
                <button class="menu-item not-interested-btn">
                    <i class="fas fa-eye-slash"></i> Pas intéressé
                </button>
                <button class="menu-item copy-link-btn">
                    <i class="fas fa-link"></i> Copier le lien
                </button>
                ${videoData.user.id === this.getCurrentUserId() ? `
                    <button class="menu-item delete-btn">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                    <button class="menu-item stats-btn">
                        <i class="fas fa-chart-bar"></i> Statistiques
                    </button>
                ` : ''}
            </div>
        `;
        
        // Positionner le menu
        const rect = container.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom - 200}px`;
        menu.style.right = '20px';
        
        document.body.appendChild(menu);
        
        // Fermer au clic ailleurs
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && e.target !== container.querySelector('.menu-btn')) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
        
        // Ajouter les événements
        this.setupMenuEvents(menu, container, videoData);
    }
    
    setupMenuEvents(menu, container, videoData) {
        // Signaler
        menu.querySelector('.report-btn')?.addEventListener('click', () => {
            this.reportVideo(videoData.id);
            menu.remove();
        });
        
        // Sauvegarder
        menu.querySelector('.save-btn')?.addEventListener('click', async () => {
            await this.saveVideo(videoData.id);
            menu.remove();
        });
        
        // Copier lien
        menu.querySelector('.copy-link-btn')?.addEventListener('click', () => {
            const url = `${window.location.origin}/video/${videoData.id}`;
            navigator.clipboard.writeText(url);
            showNotification('Lien copié!', 'success');
            menu.remove();
        });
        
        // Supprimer (si propriétaire)
        menu.querySelector('.delete-btn')?.addEventListener('click', async () => {
            if (confirm('Supprimer cette vidéo définitivement?')) {
                await this.deleteVideo(videoData.id);
                menu.remove();
            }
        });
        
        // Statistiques (si propriétaire)
        menu.querySelector('.stats-btn')?.addEventListener('click', () => {
            this.showVideoStats(videoData.id);
            menu.remove();
        });
    }
    
    async reportVideo(videoId) {
        const reason = prompt('Raison du signalement:');
        if (!reason) return;
        
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/report`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });
            
            if (response.ok) {
                showNotification('Signalement envoyé', 'success');
            }
        } catch (error) {
            console.error('Report error:', error);
        }
    }
    
    async saveVideo(videoId) {
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/save`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                showNotification('Vidéo sauvegardée', 'success');
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    }
    
    async deleteVideo(videoId) {
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                showNotification('Vidéo supprimée', 'success');
                
                // Retirer de la liste
                const container = this.videoContainers.find(c => c.dataset.videoId === videoId);
                if (container) {
                    container.remove();
                    this.videoContainers = this.videoContainers.filter(c => c.dataset.videoId !== videoId);
                    
                    // Si c'est la vidéo courante, passer à la suivante
                    if (container.dataset.index === this.currentVideoIndex.toString()) {
                        this.nextVideo();
                    }
                }
            }
        } catch (error) {
            console.error('Delete error:', error);
            showNotification('Erreur suppression', 'error');
        }
    }
    
    async showVideoStats(videoId) {
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/videos/${videoId}/stats`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const stats = await response.json();
                this.displayStatsModal(stats);
            }
        } catch (error) {
            console.error('Stats error:', error);
        }
    }
    
    displayStatsModal(stats) {
        const modal = document.createElement('div');
        modal.className = 'stats-modal';
        modal.innerHTML = `
            <div class="stats-content">
                <div class="stats-header">
                    <h3>📊 Statistiques de la vidéo</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.views)}</div>
                        <div class="stat-label">Vues</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.likes)}</div>
                        <div class="stat-label">Likes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.comments)}</div>
                        <div class="stat-label">Commentaires</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.shares)}</div>
                        <div class="stat-label">Partages</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.formatNumber(stats.coins)}</div>
                        <div class="stat-label">Pièces</div>
                    </div>
                    <div class="stat-card earnings">
                        <div class="stat-value">${stats.earnings?.toFixed(2) || '0.00'}€</div>
                        <div class="stat-label">Gains totaux</div>
                    </div>
                </div>
                <div class="stats-details">
                    <h4>Détails des gains</h4>
                    <ul>
                        <li>Vues: ${(stats.earnings_breakdown?.views || 0).toFixed(2)}€</li>
                        <li>Likes: ${(stats.earnings_breakdown?.likes || 0).toFixed(2)}€</li>
                        <li>Partages: ${(stats.earnings_breakdown?.shares || 0).toFixed(2)}€</li>
                        <li>Commentaires: ${(stats.earnings_breakdown?.comments || 0).toFixed(2)}€</li>
                        <li>Pièces: ${(stats.earnings_breakdown?.coins || 0).toFixed(2)}€</li>
                    </ul>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fermer
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    async toggleFollow(container, userId) {
        const followBtn = container.querySelector('.follow-btn');
        if (!followBtn) return;
        
        const isFollowing = followBtn.classList.contains('following');
        
        try {
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/users/${userId}/follow`, {
                method: isFollowing ? 'DELETE' : 'POST',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                followBtn.classList.toggle('following');
                followBtn.innerHTML = isFollowing ? 
                    '<i class="fas fa-user-plus"></i> Suivre' :
                    '<i class="fas fa-user-check"></i> Suivi';
                
                showNotification(
                    isFollowing ? 'Vous ne suivez plus cet utilisateur' : 'Vous suivez maintenant cet utilisateur',
                    'success'
                );
            }
        } catch (error) {
            console.error('Follow error:', error);
        }
    }
    
    // ===== FONCTIONS UTILITAIRES =====
    getAuthHeaders() {
        const token = localStorage.getItem('elosya_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    
    getCurrentUserId() {
        const userData = localStorage.getItem('elosya_user');
        if (!userData) return null;
        
        try {
            const user = JSON.parse(userData);
            return user._id || user.id;
        } catch (error) {
            return null;
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    formatTimeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 7) {
            return date.toLocaleDateString();
        } else if (days > 0) {
            return `${days}j`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}min`;
        } else {
            return 'À l\'instant';
        }
    }
    
    getBadgeSymbol(badge) {
        const symbols = {
            'verified': '✓',
            'premium': '⚫',
            'blue': '🔵',
            'gold': '🟡',
            'creator': '⭐'
        };
        return symbols[badge] || '•';
    }
    
    generateThumbnailUrl(videoId) {
        return `${ELOSYA_CONFIG.API_URL}/videos/${videoId}/thumbnail`;
    }
    
    // ===== GESTION DES ERREURS =====
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'feed-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="location.reload()">Réessayer</button>
        `;
        
        this.feedContainer.appendChild(errorDiv);
    }
    
    showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'feed-loading';
        loadingDiv.innerHTML = `
            <div class         const video = this.videoPreview;
        
        return new Promise((resolve) => {
            const metadata = {
                duration: video.duration || 0,
                width: video.videoWidth || 0,
                height: video.videoHeight || 0,
                bitrate: null,
                codec: null,
                framerate: null
            };
            
            // Formater la durée
            metadata.formattedDuration = this.formatDuration(metadata.duration);
            
            // Calculer la taille approximative
            metadata.estimatedSize = this.calculateEstimatedSize(metadata);
            
            // Calculer le débit binaire
            if (this.file && metadata.duration > 0) {
                metadata.bitrate = Math.round((this.file.size * 8) / metadata.duration / 1000);
            }
            
            // Détecter le codec (simplifié)
            metadata.codec = this.detectCodec(this.file);
            
            // Sauvegarder les métadonnées
            this.videoMetadata = metadata;
            
            // Afficher les métadonnées
            this.displayMetadata(metadata);
            
            resolve(metadata);
        });
    }
    
    // ===== CALCUL GAINS POTENTIELS =====
    calculatePotentialEarnings() {
        const earningsDisplay = document.getElementById('potentialEarnings');
        if (!earningsDisplay) return;
        
        // Facteurs influençant les gains
        const baseRate = ELOSYA_CONFIG.BASE_EARNINGS_RATE; // 0.01€ par 1000 vues
        const qualityMultiplier = this.calculateQualityMultiplier();
        const durationMultiplier = this.calculateDurationMultiplier();
        const creatorMultiplier = this.getCreatorMultiplier();
        
        // Estimation basée sur les vidéos similaires
        const estimatedViews = 10000; // Estimation initiale
        const estimatedEarnings = (estimatedViews / 1000) * baseRate * 
                                  qualityMultiplier * durationMultiplier * creatorMultiplier;
        
        earningsDisplay.innerHTML = `
            <div class="earnings-card">
                <h4><i class="fas fa-coins"></i> Gains estimés</h4>
                <p class="earnings-amount">${estimatedEarnings.toFixed(2)} €</p>
                <small>Pour ~${estimatedViews.toLocaleString()} vues estimées</small>
                
                <div class="earnings-breakdown">
                    <div class="breakdown-item">
                        <span>Multiplicateur qualité:</span>
                        <span class="multiplier">x${qualityMultiplier.toFixed(2)}</span>
                    </div>
                    <div class="breakdown-item">
                        <span>Multiplicateur durée:</span>
                        <span class="multiplier">x${durationMultiplier.toFixed(2)}</span>
                    </div>
                    <div class="breakdown-item">
                        <span>Bonus créateur:</span>
                        <span class="multiplier">x${creatorMultiplier.toFixed(2)}</span>
                    </div>
                </div>
                
                <button class="btn btn-sm btn-outline" onclick="videoUploader.showEarningsDetails()">
                    <i class="fas fa-chart-line"></i> Détails
                </button>
            </div>
        `;
    }
    
    calculateQualityMultiplier() {
        if (!this.videoMetadata) return 1.0;
        
        let multiplier = 1.0;
        
        // Résolution
        if (this.videoMetadata.width >= 3840) multiplier *= 1.5; // 4K
        else if (this.videoMetadata.width >= 1920) multiplier *= 1.3; // Full HD
        else if (this.videoMetadata.width >= 1280) multiplier *= 1.1; // HD
        
        // Débit binaire
        if (this.videoMetadata.bitrate > 10000) multiplier *= 1.2;
        else if (this.videoMetadata.bitrate > 5000) multiplier *= 1.1;
        
        return multiplier;
    }
    
    calculateDurationMultiplier() {
        if (!this.videoMetadata) return 1.0;
        
        const duration = this.videoMetadata.duration;
        if (duration > 600) return 1.5; // >10 min
        if (duration > 300) return 1.3; // 5-10 min
        if (duration > 120) return 1.1; // 2-5 min
        if (duration > 60) return 1.0; // 1-2 min
        
        return 0.8; // <1 min
    }
    
    getCreatorMultiplier() {
        // Vérifier le statut du créateur
        const creatorStatus = localStorage.getItem('creator_status') || 'basic';
        const multipliers = {
            'verified': 1.5,
            'premium': 2.0,
            'partner': 2.5,
            'basic': 1.0
        };
        
        return multipliers[creatorStatus] || 1.0;
    }
    
    // ===== UPLOAD EN CHUNKS =====
    async startChunkedUpload() {
        if (!this.file) {
            showNotification('Aucun fichier sélectionné', 'error');
            return;
        }
        
        this.isUploading = true;
        this.uploadedChunks = 0;
        this.totalChunks = Math.ceil(this.file.size / this.chunkSize);
        
        // Afficher la progression
        this.showProgressBar();
        
        // Initier l'upload
        try {
            // 1. Initier la session d'upload
            this.uploadId = await this.initiateUploadSession();
            
            // 2. Uploader chaque chunk
            for (let chunkIndex = 0; chunkIndex < this.totalChunks; chunkIndex++) {
                await this.uploadChunk(chunkIndex);
            }
            
            // 3. Finaliser l'upload
            await this.finalizeUpload();
            
            showNotification('Upload terminé avec succès!', 'success');
            
        } catch (error) {
            console.error('Erreur upload:', error);
            showNotification(`Échec upload: ${error.message}`, 'error');
            
            // Option de reprise
            this.showResumeOption();
        } finally {
            this.isUploading = false;
        }
    }
    
    async initiateUploadSession() {
        const response = await fetch(`${ELOSYA_CONFIG.API_URL}/upload/init`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: this.file.name,
                filesize: this.file.size,
                filetype: this.file.type,
                total_chunks: this.totalChunks,
                video_metadata: this.videoMetadata
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Échec initialisation upload');
        }
        
        return data.upload_id;
    }
    
    async uploadChunk(chunkIndex) {
        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        const chunk = this.file.slice(start, end);
        
        let retries = 0;
        
        while (retries < this.maxRetries) {
            try {
                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('chunk_index', chunkIndex);
                formData.append('upload_id', this.uploadId);
                formData.append('total_chunks', this.totalChunks);
                
                const response = await fetch(`${ELOSYA_CONFIG.API_URL}/upload/chunk`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: formData
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Échec upload chunk');
                }
                
                // Mettre à jour la progression
                this.uploadedChunks++;
                this.updateProgress();
                
                return; // Succès
                
            } catch (error) {
                retries++;
                
                if (retries >= this.maxRetries) {
                    throw new Error(`Échec après ${this.maxRetries} tentatives: ${error.message}`);
                }
                
                // Attendre avant de réessayer
                await this.delay(1000 * retries);
            }
        }
    }
    
    async finalizeUpload() {
        const formData = new FormData();
        formData.append('upload_id', this.uploadId);
        formData.append('video_data', JSON.stringify({
            title: document.getElementById('videoTitle').value,
            description: document.getElementById('videoDescription').value,
            category: document.getElementById('videoCategory').value,
            privacy: document.getElementById('videoPrivacy').value,
            hashtags: this.hashtags,
            thumbnail: this.thumbnail
        }));
        
        const response = await fetch(`${ELOSYA_CONFIG.API_URL}/upload/finalize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Échec finalisation');
        }
        
        // Redirection vers la vidéo
        if (data.video_id) {
            setTimeout(() => {
                window.location.href = `/video/${data.video_id}`;
            }, 2000);
        }
    }
    
    // ===== PROGRESSION =====
    showProgressBar() {
        const progressContainer = document.getElementById('uploadProgress');
        if (!progressContainer) return;
        
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = `
            <div class="progress">
                <div class="progress-bar" role="progressbar" style="width: 0%"></div>
            </div>
            <div class="progress-info">
                <span class="progress-text">Préparation...</span>
                <span class="progress-percentage">0%</span>
            </div>
            <div class="upload-details">
                <span><i class="fas fa-file"></i> ${this.file.name}</span>
                <span><i class="fas fa-hdd"></i> ${(this.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                <span><i class="fas fa-layer-group"></i> ${this.totalChunks} parties</span>
            </div>
        `;
    }
    
    updateProgress() {
        const progress = (this.uploadedChunks / this.totalChunks) * 100;
        this.uploadProgress = progress;
        
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        const progressPercentage = document.querySelector('.progress-percentage');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Upload en cours... (${this.uploadedChunks}/${this.totalChunks})`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(progress)}%`;
        }
    }
    
    // ===== UTILITAIRES =====
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    calculateEstimatedSize(metadata) {
        // Estimation basée sur la durée et la résolution
        const baseRate = 1000000; // 1 Mbps
        let bitrate = baseRate;
        
        if (metadata.width >= 3840) bitrate *= 8; // 4K
        else if (metadata.width >= 1920) bitrate *= 5; // Full HD
        else if (metadata.width >= 1280) bitrate *= 2; // HD
        
        const estimatedSize = (bitrate * metadata.duration) / 8; // en bytes
        
        return {
            bytes: estimatedSize,
            formatted: this.formatBytes(estimatedSize)
        };
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    detectCodec(file) {
        // Détection basique du codec
        if (file.type.includes('mp4')) return 'H.264/MPEG-4';
        if (file.type.includes('webm')) return 'VP9/VP8';
        if (file.type.includes('mov')) return 'ProRes/H.264';
        if (file.type.includes('avi')) return 'DivX/Xvid';
        
        return 'Inconnu';
    }
    
    addHashtag(tag) {
        if (!tag || tag.length === 0) return;
        
        // Nettoyer le hashtag
        tag = tag.replace(/[^\w\s#]/g, '').trim();
        
        if (!tag.startsWith('#')) {
            tag = '#' + tag;
        }
        
        // Vérifier les doublons
        if (this.hashtags.includes(tag)) {
            showNotification('Ce hashtag existe déjà', 'warning');
            return;
        }
        
        // Limiter le nombre de hashtags
        if (this.hashtags.length >= 10) {
            showNotification('Maximum 10 hashtags autorisés', 'warning');
            return;
        }
        
        // Ajouter le hashtag
        this.hashtags.push(tag);
        
        // Afficher le hashtag
        const hashtagElement = document.createElement('div');
        hashtagElement.className = 'hashtag-item';
        hashtagElement.innerHTML = `
            ${tag}
            <button onclick="videoUploader.removeHashtag('${tag}')" class="hashtag-remove">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        if (this.hashtagContainer) {
            this.hashtagContainer.appendChild(hashtagElement);
        }
    }
    
    removeHashtag(tag) {
        this.hashtags = this.hashtags.filter(t => t !== tag);
        
        // Mettre à jour l'affichage
        if (this.hashtagContainer) {
            this.hashtagContainer.innerHTML = '';
            this.hashtags.forEach(tag => {
                this.addHashtag(tag.replace('#', ''));
            });
        }
    }
    
    displayMetadata(metadata) {
        const metadataContainer = document.getElementById('videoMetadata');
        if (!metadataContainer) return;
        
        metadataContainer.innerHTML = `
            <div class="metadata-grid">
                <div class="metadata-item">
                    <i class="fas fa-clock"></i>
                    <div>
                        <span class="metadata-label">Durée</span>
                        <span class="metadata-value">${metadata.formattedDuration}</span>
                    </div>
                </div>
                <div class="metadata-item">
                    <i class="fas fa-expand"></i>
                    <div>
                        <span class="metadata-label">Résolution</span>
                        <span class="metadata-value">${metadata.width}×${metadata.height}</span>
                    </div>
                </div>
                <div class="metadata-item">
                    <i class="fas fa-tachometer-alt"></i>
                    <div>
                        <span class="metadata-label">Débit</span>
                        <span class="metadata-value">${metadata.bitrate ? metadata.bitrate + ' kbps' : 'N/A'}</span>
                    </div>
                </div>
                <div class="metadata-item">
                    <i class="fas fa-code"></i>
                    <div>
                        <span class="metadata-label">Codec</span>
                        <span class="metadata-value">${metadata.codec}</span>
                    </div>
                </div>
                <div class="metadata-item">
                    <i class="fas fa-weight-hanging"></i>
                    <div>
                        <span class="metadata-label">Taille estimée</span>
                        <span class="metadata-value">${metadata.estimatedSize?.formatted || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===== GESTION ERREURS =====
    showResumeOption() {
        const resumeOption = document.getElementById('resumeOption');
        if (!resumeOption) return;
        
        resumeOption.style.display = 'block';
        resumeOption.innerHTML = `
            <div class="alert alert-warning">
                <h4><i class="fas fa-exclamation-triangle"></i> Upload interrompu</h4>
                <p>${this.uploadedChunks}/${this.totalChunks} parties uploadées</p>
                <button onclick="videoUploader.resumeUpload()" class="btn btn-warning">
                    <i class="fas fa-play"></i> Reprendre l'upload
                </button>
                <button onclick="videoUploader.cancelUpload()" class="btn btn-outline">
                    <i class="fas fa-times"></i> Annuler
                </button>
            </div>
        `;
    }
    
    async resumeUpload() {
        if (!this.uploadId) {
            showNotification('Aucun upload à reprendre', 'error');
            return;
        }
        
        try {
            // Récupérer l'état de l'upload
            const response = await fetch(`${ELOSYA_CONFIG.API_URL}/upload/status/${this.uploadId}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.uploadedChunks = data.uploaded_chunks || 0;
                await this.startChunkedUpload();
            }
            
        } catch (error) {
            console.error('Erreur reprise:', error);
        }
    }
    
    cancelUpload() {
        if (confirm('Voulez-vous vraiment annuler cet upload?')) {
            this.resetUpload();
            showNotification('Upload annulé', 'info');
        }
    }
    
    resetUpload() {
        this.file = null;
        this.uploadId = null;
        this.isUploading = false;
        this.uploadProgress = 0;
        
        // Réinitialiser l'interface
        if (this.uploadArea) {
            this.uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <h4>Glissez-déposez votre vidéo</h4>
                <p>ou cliquez pour parcourir</p>
                <small>MP4, MOV, AVI jusqu'à ${ELOSYA_CONFIG.VIDEO_LIMIT / (1024 * 1024)}MB</small>
            `;
        }
        
        // Cacher la progression
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // Cacher la prévisualisation
        if (this.videoPreview) {
            this.videoPreview.style.display = 'none';
            this.videoPreview.src = '';
        }
        
        if (this.thumbnailPreview) {
            this.thumbnailPreview.style.display = 'none';
            this.thumbnailPreview.src = '';
        }
        
        // Cacher les métadonnées
        const metadataContainer = document.getElementById('videoMetadata');
        if (metadataContainer) {
            metadataContainer.innerHTML = '';
        }
    }
    

