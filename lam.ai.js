    <!-- Script JavaScript -->
    <script>
        // ===== CONFIGURATION =====
        const ELOSYA_AI_CONFIG = {
            BACKEND_URL: 'http://localhost:3001/api/ai',
            DEFAULT_MODEL: 'gpt-3.5-turbo',
            MAX_TOKENS: 2000,
            SYSTEM_PROMPT: `Tu es Lam.AI, l'assistant IA intégré à Elosya, une plateforme vidéo française.
Règles :
1. Réponds toujours en français sauf demande contraire
2. Sois professionnel, utile et créatif
3. Aide avec les sujets vidéo, création de contenu, marketing, technique
4. Recommande du contenu Elosya quand c'est pertinent
5. Propose des idées pour améliorer les vidéos des créateurs
6. Formate tes réponses avec des listes, titres et emojis quand c'est utile
7. Sois enthousiaste et encourageant !`
        };

        // ===== ÉTAT GLOBAL =====
        let currentConversation = [];
        let isTyping = false;
        let currentModel = ELOSYA_AI_CONFIG.DEFAULT_MODEL;
        let userSubscription = null;

        // ===== INITIALISATION =====
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Initialisation Lam.AI Elosya...');
            
            // Charger l'historique
            loadChatHistory();
            
            // Vérifier l'abonnement
            checkSubscription();
            
            // Configurer les événements
            setupEventListeners();
            
            // Tester la connexion backend
            testBackendConnection();
        });

        // ===== ÉVÉNEMENTS =====
        function setupEventListeners() {
            // Envoi de message
            const sendBtn = document.getElementById('send-btn');
            const chatInput = document.getElementById('chat-input');
            
            if (sendBtn && chatInput) {
                sendBtn.addEventListener('click', sendMessage);
                
                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });
                
                chatInput.addEventListener('input', () => {
                    autoResizeTextarea(chatInput);
                });
            }
            
            // Changement de modèle
            const modelSelect = document.getElementById('model-select');
            if (modelSelect) {
                modelSelect.addEventListener('change', (e) => {
                    changeModel(e.target.value);
                });
            }
            
            // Boutons
            document.getElementById('new-chat-btn')?.addEventListener('click', startNewChat);
            document.getElementById('sidebar-new-chat')?.addEventListener('click', startNewChat);
            document.getElementById('pro-features-btn')?.addEventListener('click', showProFeatures);
            document.getElementById('upgrade-btn')?.addEventListener('click', showUpgradeModal);
            document.getElementById('sidebar-upgrade-btn')?.addEventListener('click', showUpgradeModal);
            document.getElementById('history-btn')?.addEventListener('click', toggleHistory);
            
            // Raccourcis clavier
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + N pour nouveau chat
                if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                    e.preventDefault();
                    startNewChat();
                }
                
                // Ctrl/Cmd + L pour focus input
                if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                    e.preventDefault();
                    document.getElementById('chat-input')?.focus();
                }
                
                // Échap pour fermer modales
                if (e.key === 'Escape') {
                    closeAllModals();
                }
            });
        }

        // ===== GESTION DES MESSAGES =====
        async function sendMessage() {
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            
            if (!message || isTyping) return;
            
            // Ajouter le message utilisateur
            addMessageToUI(message, 'user');
            currentConversation.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });
            
            // Vider et redimensionner l'input
            input.value = '';
            autoResizeTextarea(input);
            
            // Afficher l'indicateur de saisie
            showTypingIndicator();
            
            try {
                // Appeler le backend
                const response = await callBackendAPI(currentConversation);
                
                // Ajouter la réponse
                addMessageToUI(response, 'ai');
                currentConversation.push({
                    role: 'assistant',
                    content: response,
                    timestamp: new Date().toISOString()
                });
                
                // Sauvegarder la conversation
                saveConversation();
                
            } catch (error) {
                console.error('❌ Erreur:', error);
                addMessageToUI(
                    "Désolé, une erreur s'est produite. Veuillez réessayer ou vérifier votre connexion au serveur.",
                    'ai'
                );
            } finally {
                removeTypingIndicator();
            }
        }

        async function callBackendAPI(messages) {
            const response = await fetch(`${ELOSYA_AI_CONFIG.BACKEND_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': getUserId()
                },
                body: JSON.stringify({
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    model: currentModel,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }
            
            const data = await response.json();
            return data.message;
        }

        // ===== INTERFACE UTILISATEUR =====
        function addMessageToUI(content, sender) {
            const messagesContainer = document.getElementById('chat-messages');
            if (!messagesContainer) return;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}-message fade-in`;
            
            const icon = sender === 'user' ? 'fa-user' : 'fa-brain';
            const iconColor = sender === 'user' ? 'user-icon' : 'ai-icon';
            const senderName = sender === 'user' ? 'Vous' : 'Lam.AI';
            
            // Formater le message
            const formattedContent = formatMessage(content);
            
            messageDiv.innerHTML = `
                <div class="message-header">
                    <i class="fas ${icon} ${iconColor} message-icon"></i>
                    <strong>${senderName}</strong>
                    ${sender === 'ai' ? '<span style="font-size: 0.8rem; background: rgba(16, 185, 129, 0.2); padding: 2px 8px; border-radius: 12px; margin-left: 10px;"><i class="fas fa-play-circle"></i> Elosya</span>' : ''}
                </div>
                <div class="message-content">
                    ${formattedContent}
                </div>
            `;
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function formatMessage(content) {
            // Formater markdown basique
            let formatted = content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            
            // Ajouter des paragraphes
            formatted = `<p>${formatted}</p>`;
            
            // Formater les listes
            formatted = formatted.replace(/^\d+\.\s(.*)$/gm, '<li>$1</li>');
            if (formatted.includes('<li>')) {
                formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>');
            }
            
            return formatted;
        }

        function showTypingIndicator() {
            isTyping = true;
            
            const messagesContainer = document.getElementById('chat-messages');
            if (!messagesContainer) return;
            
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typing-indicator';
            typingDiv.className = 'message ai-message fade-in';
            typingDiv.innerHTML = `
                <div class="message-header">
                    <i class="fas fa-brain ai-icon message-icon"></i>
                    <strong>Lam.AI</strong>
                </div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
            
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function removeTypingIndicator() {
            isTyping = false;
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        // ===== GESTION DES CONVERSATIONS =====
        function startNewChat() {
            if (currentConversation.length > 0) {
                if (!confirm('Voulez-vous démarrer une nouvelle conversation ? La conversation actuelle sera sauvegardée.')) {
                    return;
                }
                saveConversation();
            }
            
            currentConversation = [];
            
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="message ai-message fade-in">
                        <div class="message-header">
                            <i class="fas fa-brain ai-icon message-icon"></i>
                            <strong>Lam.AI</strong>
                            <span style="font-size: 0.8rem; background: rgba(16, 185, 129, 0.2); padding: 2px 8px; border-radius: 12px; margin-left: 10px;">
                                <i class="fas fa-play-circle"></i> Elosya Edition
                            </span>
                        </div>
                        <div class="message-content">
                            <h4 style="margin-bottom: 10px;">🎬 Nouvelle conversation démarrée !</h4>
                            <p>Comment puis-je vous aider avec votre contenu Elosya aujourd'hui ?</p>
                            <p style="margin-top: 10px; padding: 10px; background: rgba(37, 99, 235, 0.1); border-radius: 8px;">
                                <i class="fas fa-lightbulb"></i> <strong>Idée :</strong> Demandez-moi "Génère 5 idées de vidéos sur le développement web" ou "Analyse cette description vidéo : [votre description]"
                            </p>
                        </div>
                    </div>
                `;
            }
            
            showNotification('Nouvelle conversation démarrée', 'info');
        }

        function saveConversation() {
            if (currentConversation.length === 0) return;
            
            const conversation = {
                id: generateId(),
                title: generateConversationTitle(),
                messages: [...currentConversation],
                model: currentModel,
                timestamp: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Sauvegarder dans localStorage
            let savedChats = JSON.parse(localStorage.getItem('elosya_ai_chats') || '[]');
            savedChats.push(conversation);
            
            // Garder seulement les 20 derniers chats
            savedChats = savedChats.slice(-20);
            
            localStorage.setItem('elosya_ai_chats', JSON.stringify(savedChats));
            updateChatList();
        }

        function loadChatHistory() {
            const savedChats = JSON.parse(localStorage.getItem('elosya_ai_chats') || '[]');
            updateChatList(savedChats);
        }

        function updateChatList(chats = null) {
            const chatList = document.getElementById('chat-list');
            if (!chatList) return;
            
            if (!chats) {
                chats = JSON.parse(localStorage.getItem('elosya_ai_chats') || '[]');
            }
            
            // Trier par date (plus récent en premier)
            chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            
            if (chats.length === 0) {
                chatList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--gray-color);">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>Aucune conversation sauvegardée</p>
                    </div>
                `;
                return;
            }
            
            chatList.innerHTML = chats.map(chat => `
                <div class="chat-item" data-chat-id="${chat.id}">
                    <i class="fas fa-comment chat-icon"></i>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; margin-bottom: 4px;">${chat.title}</div>
                        <div style="font-size: 0.8rem; color: var(--gray-color);">
                            ${formatDate(chat.updatedAt)}
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Ajouter les événements
            document.querySelectorAll('.chat-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const chatId = e.currentTarget.dataset.chatId;
                    loadChat(chatId);
                });
            });
        }

        function loadChat(chatId) {
            const savedChats = JSON.parse(localStorage.getItem('elosya_ai_chats') || '[]');
            const chat = savedChats.find(c => c.id === chatId);
            
            if (!chat) return;
            
            currentConversation = chat.messages;
            currentModel = chat.model;
            
            // Mettre à jour l'interface
            updateModelDisplay();
            
            // Afficher les messages
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
                
                chat.messages.forEach(message => {
                    const sender = message.role === 'user' ? 'user' : 'ai';
                    addMessageToUI(message.content, sender);
                });
            }
            
            // Mettre à jour la sélection
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.chatId === chatId) {
                    item.classList.add('active');
                }
            });
            
            showNotification(`Conversation "${chat.title}" chargée`, 'info');
        }

        // ===== FONCTIONS SPÉCIALES ELOSYA =====
        async function suggestVideoIdeas() {
            const topic = prompt('Sur quel thème voulez-vous des idées de vidéos ?', 'tutoriel développement web');
            if (!topic) return;
            
            showTypingIndicator();
            
            try {
                const response = await fetch(`${ELOSYA_AI_CONFIG.BACKEND_URL}/generate-ideas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': getUserId()
                    },
                    body: JSON.stringify({
                        topic: topic,
                        count: 5,
                        style: 'educational'
                    })
                });
                
                if (!response.ok) throw new Error('Erreur serveur');
                
                const data = await response.json();
                addMessageToUI(data.ideas, 'ai');
                
            } catch (error) {
                console.error('Erreur:', error);
                addMessageToUI("Désolé, je n'ai pas pu générer d'idées. Veuillez réessayer.", 'ai');
            } finally {
                removeTypingIndicator();
            }
        }

        async function analyzeVideo() {
            const title = prompt('Titre de la vidéo :', 'Mon Super Tutoriel Python');
            const description = prompt('Description de la vidéo :', 'Apprenez Python en 30 minutes');
            
            if (!title || !description) return;
            
            showTypingIndicator();
            
            try {
                const response = await fetch(`${ELOSYA_AI_CONFIG.BACKEND_URL}/analyze-video`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': getUserId()
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        metrics: {
                            views: 0,
                            likes: 0,
                            comments: 0
                        }
                    })
                });
                
                if (!response.ok) throw new Error('Erreur serveur');
                
                const data = await response.json();
                addMessageToUI(data.analysis, 'ai');
                
            } catch (error) {
                console.error('Erreur:', error);
                addMessageToUI("Désolé, je n'ai pas pu analyser la vidéo. Veuillez réessayer.", 'ai');
            } finally {
                removeTypingIndicator();
            }
        }

        async function generateDescription() {
            const title = prompt('Titre de la vidéo :', 'Les Secrets du Montage Vidéo');
            const keywords = prompt('Mots-clés (séparés par des virgules) :', 'tutoriel, montage, premiere pro, français').split(',');
            
            if (!title) return;
            
            showTypingIndicator();
            
            try {
                const response = await fetch(`${ELOSYA_AI_CONFIG.BACKEND_URL}/generate-description`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': getUserId()
                    },
                    body: JSON.stringify({
                        topic: topic,
                        count: 5,
                        style: 'educational'
                    })
                });
                
                if (!response.ok) throw new Error('Erreur serveur');
                
                const data = await response.json();
                addMessageToUI(data.ideas, 'ai');
                
            } catch (error) {
                console.error('Erreur:', error);
                addMessageToUI("Désolé, je n'ai pas pu générer d'idées. Veuillez réessayer.", 'ai');
            } finally {
                removeTypingIndicator();
            }
        }

        async function analyzeVideo() {
            const title = prompt('Titre de la vidéo :', 'Mon Super Tutoriel Python');
            const description = prompt('Description de la vidéo :', 'Apprenez Python en 30 minutes');
            
            if (!title || !description) return;
            
            showTypingIndicator();
            
            try {
                const response = await fetch(`${ELOSYA_AI_CONFIG.BACKEND_URL}/analyze-video`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': getUserId()
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        metrics: {
                            views: 0,
                            likes: 0,
                            comments: 0
                        }
                    })
                });
                
                if (!response.ok) throw new Error('Erreur serveur');
                
                const data = await response.json();
                addMessageToUI(data.analysis, 'ai');
                
            } catch (error) {
                console.error('Erreur:', error);
                addMessageToUI("Désolé, je n'ai pas pu analyser la vidéo. Veuillez réessayer.", 'ai');
            } finally {
                removeTypingIndicator();
            }
        }

        async function generateDescription() {
            const title = prompt('Titre de la vidéo :', 'Les Secrets du Montage Vidéo');
            const keywords = prompt('Mots-clés (séparés par des virgules) :', 'tutoriel, montage, premiere pro, français').split(',');
            
            if (!title) return;
            
            showTypingIndicator();
            
            try {
                const response = await fetch(`${ELOSYA_AI_CONFIG.BACKEND_URL}/generate-description`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': getUserId()
                    },
                    body: JSON.stringify({
                        title: title,
                        keywords: keywords.map(k => k.trim()),
                        videoType: 'tutorial',
                        duration: '10:00'
                    })
                });
                
                if (!response.ok) throw new Error('Erreur serveur');
                
                const data = await response.json();
                addMessageToUI(data.description, 'ai');
                
            } catch (error) {
                console.error('Erreur:', error);
                addMessageToUI("Désolé, je n'ai pas pu générer la description. Veuillez réessayer.", 'ai');
            } finally {
                removeTypingIndicator();
            }
        }

        // ===== FONCTIONS PRO =====
        function showProFeatures() {
            const content = `
                <h3><i class="fas fa-crown"></i> Fonctions Professionnelles</h3>
                <p>Accédez à des fonctionnalités avancées pour optimiser votre expérience Elosya:</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                    <div style="background: rgba(124, 58, 237, 0.1); padding: 15px; border-radius: 10px; border: 1px solid rgba(124, 58, 237, 0.3);">
                        <h4 style="margin: 0 0 10px 0;"><i class="fas fa-chart-line"></i> Analyse avancée</h4>
                        <p style="margin: 0; font-size: 0.9rem;">Analyse détaillée des performances vidéo avec insights personnalisés</p>
                    </div>
                    
                    <div style="background: rgba(37, 99, 235, 0.1); padding: 15px; border-radius: 10px; border: 1px solid rgba(37, 99, 235, 0.3);">
                        <h4 style="margin: 0 0 10px 0;"><i class="fas fa-bolt"></i> GPT-4 Turbo</h4>
                        <p style="margin: 0; font-size: 0.9rem;">Accès aux modèles les plus puissants et rapides</p>
                    </div>
                    
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.3);">
                        <h4 style="margin: 0 0 10px 0;"><i class="fas fa-robot"></i> Génération longue</h4>
                        <p style="margin: 0; font-size: 0.9rem;">Génération de scripts complets (jusqu'à 4000 tokens)</p>
                    </div>
                    
                    <div style="background: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.3);">
                        <h4 style="margin: 0 0 10px 0;"><i class="fas fa-image"></i> Génération d'images</h4>
                        <p style="margin: 0; font-size: 0.9rem;">Création de miniatures et visuels avec DALL-E</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn btn-pro" style="width: 100%;" onclick="showUpgradeModal(); closeModal('pro-features');">
                        <i class="fas fa-rocket"></i> Passer à la version Pro (19.99€/mois)
                    </button>
                </div>
            `;
            
            showModal('pro-features', 'Fonctions Pro', content);
        }

        function showUpgradeModal() {
            const content = `
                <h3><i class="fas fa-rocket"></i> Passez à Lam.AI Pro</h3>
                
                <div style="margin: 20px 0;">
                    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                        <h4 style="margin: 0 0 10px 0;"><i class="fas fa-star"></i> Plan Pro</h4>
                        <p style="font-size: 2rem; margin: 10px 0;">19.99€<small style="font-size: 1rem; color: #94a3b8;">/mois</small></p>
                        
                        <ul style="text-align: left; margin: 20px 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">✅ Accès à GPT-4 et GPT-4 Turbo</li>
                            <li style="margin-bottom: 8px;">✅ 1000 requêtes par jour</li>
                            <li style="margin-bottom: 8px;">✅ Génération longue (4000 tokens)</li>
                            <li style="margin-bottom: 8px;">✅ Analyse vidéo avancée</li>
                            <li style="margin-bottom: 8px;">✅ Support prioritaire</li>
                            <li style="margin-bottom: 8px;">✅ Pas de file d'attente</li>
                        </ul>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <button class="btn btn-pro" style="width: 100%; margin-bottom: 10px;" onclick="processPayment('pro')">
                        <i class="fas fa-credit-card"></i> S'abonner maintenant
                    </button>
                    <button class="btn btn-outline" style="width: 100%;" onclick="closeModal('upgrade')">
                        Plus tard
                    </button>
                </div>

                     <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <p style="margin: 0; font-size: 0.9rem; color: #94a3b8;">
                        <i class="fas fa-shield-alt"></i> Paiement 100% sécurisé. Annulation à tout moment. 
                        Essai gratuit de 7 jours inclus.
                    </p>
                </div>
            `;
            
            showModal('upgrade', 'Mise à niveau', content);
        }

        // ===== UTILITAIRES =====
        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }

        function generateConversationTitle() {
            if (currentConversation.length === 0) return 'Nouvelle conversation';
            
            const firstUserMessage = currentConversation.find(msg => msg.role === 'user');
            if (firstUserMessage) {
                const content = firstUserMessage.content;
                return content.length > 30 ? content.substring(0, 30) + '...' : content;
            }
            
            return 'Conversation sans titre';
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'À l\'instant';
            if (diffMins < 60) return `Il y a ${diffMins} min`;
            if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`;
            
            return date.toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short',
                year: 'numeric'
            });
        }

        function autoResizeTextarea(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        }

        function getUserId() {
            // Générer un ID utilisateur unique
            let userId = localStorage.getItem('elosya_user_id');
            if (!userId) {
                userId = 'user_' + generateId();
                localStorage.setItem('elosya_user_id', userId);
            }
            return userId;
        }

        function changeModel(modelKey) {
            const models = {
                'gpt-3.5': 'gpt-3.5-turbo',
                'gpt-4': 'gpt-4',
                'gpt-4-turbo': 'gpt-4-turbo-preview'
            };
            
            const model = models[modelKey];
            if (model && model !== currentModel) {
                currentModel = model;
                showNotification(`Modèle changé: ${modelKey}`, 'info');
            }
        }

        function updateModelDisplay() {
            const modelSelect = document.getElementById('model-select');
            if (!modelSelect) return;
            
            // Trouver la clé correspondant au modèle actuel
            const models = {
                'gpt-3.5-turbo': 'gpt-3.5',
                'gpt-4': 'gpt-4',
                'gpt-4-turbo-preview': 'gpt-4-turbo'
            };
            
            const currentKey = models[currentModel];
            if (currentKey && modelSelect.value !== currentKey) {
                modelSelect.value = currentKey;
            }
        }

        function checkSubscription() {
            const subscription = localStorage.getItem('elosya_ai_subscription');
            if (subscription) {
                try {
                    userSubscription = JSON.parse(subscription);
                    updateUIForSubscription();
                } catch (error) {
                    console.error('Erreur parsing subscription:', error);
                }
            }
        }

        function updateUIForSubscription() {
            if (!userSubscription) return;
            
            // Mettre à jour les boutons
            document.querySelectorAll('.btn-pro, .model-pro').forEach(btn => {
                btn.innerHTML = '<i class="fas fa-crown"></i> Pro activé';
                btn.disabled = true;
                btn.style.opacity = '0.8';
            });
            
            // Ajouter le badge
            const proBadge = document.getElementById('pro-badge');
            if (proBadge) {
                proBadge.style.display = 'inline-flex';
                proBadge.innerHTML = `
                    <i class="fas fa-crown"></i>
                    ${userSubscription.plan === 'enterprise' ? 'Entreprise' : 'Pro'}
                `;
            }
        }

        // ===== MODALES ET NOTIFICATIONS =====
        function showModal(modalId, title, content) {
            const modal = document.getElementById(`modal-${modalId}`);
            if (!modal) return;
            
            // Mettre à jour le contenu
            const contentElement = modal.querySelector('.modal-body');
            if (contentElement) {
                contentElement.innerHTML = content;
            }
            
            // Afficher la modale
            modal.style.display = 'flex';
        }

        function closeModal(modalId) {
            const modal = document.getElementById(`modal-${modalId}`);
            if (modal) {
                modal.style.display = 'none';
            }
        }

        function closeAllModals() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        function toggleHistory() {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                const isHidden = sidebar.style.display === 'none';
                sidebar.style.display = isHidden ? 'flex' : 'none';
            }
        }

        // ===== FONCTIONS DE TEST =====
        async function testBackendConnection() {
            try {
                const response = await fetch(`${ELOSYA_AI_CONFIG.BACKEND_URL}/check`);
                if (response.ok) {
                    console.log('✅ Backend connecté');
                } else {
                    console.warn('⚠️ Backend non accessible');
                    showNotification('Connexion backend limitée', 'warning');
                }
            } catch (error) {
                console.error('❌ Erreur connexion backend:', error);
                showNotification('Serveur backend non disponible', 'error');
            }
        }

        // ===== FONCTIONS D'EXPORT =====
        function clearChat() {
            if (confirm('Voulez-vous vraiment effacer toute la conversation ?')) {
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div class="message ai-message fade-in">
                            <div class="message-header">
                                <i class="fas fa-brain ai-icon message-icon"></i>
                                <strong>Lam.AI</strong>
                            </div>
                            <div class="message-content">
                                Conversation effacée. Comment puis-je vous aider ?
                            </div>
                        </div>
                    `;
                }
                currentConversation = [];
                showNotification('Conversation effacée', 'info');
            }
        }

        function exportConversation() {
            if (currentConversation.length === 0) {
                showNotification('Aucune conversation à exporter', 'warning');
                return;
            }
            
            const exportData = {
                title: generateConversationTitle(),
                messages: currentConversation,
                exportedAt: new Date().toISOString(),
                source: 'Elosya Lam.AI'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `elosya-chat-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Conversation exportée', 'success');
        }

        // ===== FONCTIONS DE PAIEMENT (simulées) =====
        function processPayment(plan) {
            showNotification('🔄 Traitement du paiement...', 'info');
            
            setTimeout(() => {
                const subscription = {
                    plan: plan,
                    status: 'active',
                    subscribedAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                };
                
                localStorage.setItem('elosya_ai_subscription', JSON.stringify(subscription));
                userSubscription = subscription;
                
                updateUIForSubscription();
                closeModal('upgrade');
                
                showNotification(
                    plan === 'enterprise' 
                        ? '🚀 Plan Entreprise activé !' 
                        : '✅ Abonnement Pro activé ! 🎉', 
                    'success'
                );
                
            }, 2000);
        }

        // ===== FONCTIONS GLOBALES POUR ELOSYA =====
        window.openElosyaAI = function(context, data = {}) {
            let prompt = '';
            
            switch(context) {
                case 'video_analysis':
                    prompt = `Analyse cette vidéo Elosya et donne des conseils:
Titre: ${data.title || 'Non spécifié'}
Description: ${data.description || 'Non spécifiée'}
Vues: ${data.views || 0}
Likes: ${data.likes || 0}

Donne des suggestions d'amélioration.`;
                    break;
                    
                case 'script_generation':
                    prompt = `Génère un script pour une vidéo sur: ${data.topic || 'sujet non spécifié'}
Durée: ${data.duration || 10} minutes
Type: ${data.videoType || 'tutoriel'}

Crée un script structuré avec introduction, contenu principal et conclusion.`;
                    break;
                    
                case 'thumbnail_ideas':
                    prompt = `Propose des idées de miniatures pour: ${data.videoTitle || 'cette vidéo'}
Style: ${data.style || 'moderne et accrocheur'}
Cible: ${data.targetAudience || 'public général'}

Fournis 3 concepts différents avec descriptions détaillées.`;
                    break;
                    
                case 'seo_optimization':
                    prompt = `Optimise ce contenu pour le SEO Elosya:
Titre actuel: ${data.title || ''}
Description: ${data.description || ''}
Mots-clés: ${data.keywords ? data.keywords.join(', ') : ''}

Propose un titre optimisé, une description enrichie et des hashtags pertinents.`;
                    break;
                    
                default:
                    prompt = `Aide-moi avec: ${context}`;
            }
            
            // Remplir l'input
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value = prompt;
                chatInput.focus();
                autoResizeTextarea(chatInput);
                
                // Scroll vers le chat
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer) {
                    chatContainer.scrollIntoView({ behavior: 'smooth' });
                }
                
                showNotification('Prompt prêt à envoyer', 'info');
            }
        };

        // ===== FONCTIONS D'INITIALISATION GLOBALE =====
        console.log('✅ Lam.AI Elosya initialisé avec succès');
        showNotification('Lam.AI pour Elosya est prêt ! 🎬🤖', 'success');
    </script>
</body>
</html>
