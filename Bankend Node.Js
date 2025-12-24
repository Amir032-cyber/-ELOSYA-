// ===== FICHIER 7: backend-ai-proxy.js =====
// Backend Node.js Express pour sécuriser l'API Elosya

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ===== CONFIGURATION =====
const ELOSYA_AI_CONFIG = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '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',
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100, // 100 requêtes par fenêtre
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

// ===== MIDDLEWARES =====
app.use(helmet()); // Sécurité HTTP
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting par IP
const limiter = rateLimit({
    windowMs: ELOSYA_AI_CONFIG.RATE_LIMIT_WINDOW,
    max: ELOSYA_AI_CONFIG.RATE_LIMIT_MAX,
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api/ai/', limiter);

// ===== ROUTES API =====

// 1. Santé du serveur
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Elosya AI Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// 2. Chat IA principal
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { messages, model = 'gpt-3.5-turbo', temperature = 0.7 } = req.body;
        const userId = req.headers['x-user-id'] || req.ip;

        // Validation
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages invalides' });
        }

        // Préparer la requête pour OpenAI
        const requestBody = {
            model: model,
            messages: [
                { role: 'system', content: ELOSYA_AI_CONFIG.SYSTEM_PROMPT },
                ...messages
            ],
            temperature: temperature,
            max_tokens: ELOSYA_AI_CONFIG.MAX_TOKENS,
            top_p: 0.9,
            frequency_penalty: 0,
            presence_penalty: 0
        };

        // Logger la requête (sans le contenu complet pour la confidentialité)
        console.log(`[AI Request] User: ${userId}, Model: ${model}, Messages: ${messages.length}`);

        // Appeler l'API OpenAI
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ELOSYA_AI_CONFIG.OPENAI_API_KEY}`
                },
                timeout: 30000 // 30 secondes timeout
            }
        );

        // Extraire la réponse
        const aiResponse = response.data.choices[0].message.content;
        const usage = response.data.usage;

        // Logger l'utilisation
        console.log(`[AI Response] Tokens: ${usage.total_tokens}, User: ${userId}`);

        // Retourner la réponse
        res.json({
            success: true,
            message: aiResponse,
            usage: usage,
            model: model,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[AI Error]', error.response?.data || error.message);
        
        // Gestion des erreurs spécifiques
        if (error.response?.status === 401) {
            return res.status(500).json({ error: 'Erreur d\'authentification API' });
        }
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'Limite de quota dépassée' });
        }
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Timeout de l\'API' });
        }
        
        res.status(500).json({ 
            error: 'Erreur du serveur IA',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 3. Analyse de vidéo (fonction spéciale)
app.post('/api/ai/analyze-video', async (req, res) => {
    try {
        const { title, description, metrics, category } = req.body;
        const userId = req.headers['x-user-id'];

        if (!title || !description) {
            return res.status(400).json({ error: 'Titre et description requis' });
        }

        const prompt = `Analyse cette vidéo Elosya et donne des conseils d'amélioration:

TITRE: "${title}"
DESCRIPTION: "${description}"
CATÉGORIE: ${category || 'Non spécifiée'}
MÉTRIQUES: ${metrics ? JSON.stringify(metrics) : 'Non disponibles'}

Donne une analyse structurée avec:
1. Évaluation du titre/description (SEO, attractivité)
2. Suggestions d'amélioration concrètes
3. Hashtags recommandés (10 maximum)
4. Stratégie de promotion spécifique
5. Idées pour la prochaine vidéo dans la série

Sois précis, pratique et encourageant !`;

        const requestBody = {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1500
        };

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ELOSYA_AI_CONFIG.OPENAI_API_KEY}`
                }
            }
        );

        const analysis = response.data.choices[0].message.content;

        res.json({
            success: true,
            analysis: analysis,
            type: 'video_analysis',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Video Analysis Error]', error.message);
        res.status(500).json({ error: 'Erreur lors de l\'analyse' });
    }
});

// 4. Génération d'idées de vidéos
app.post('/api/ai/generate-ideas', async (req, res) => {
    try {
        const { topic, count = 5, style = 'educational' } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Thème requis' });
        }

        const prompt = `En tant qu'expert en création de contenu vidéo pour Elosya, propose ${count} idées de vidéos sur le thème: "${topic}".

Style: ${style}

Pour chaque idée, fournis:
1. Titre accrocheur (max 60 caractères)
2. Description courte (1-2 phrases)
3. Durée recommandée
4. Type de format (tutoriel, vlog, interview, etc.)
5. 5 hashtags pertinents
6. Public cible
7. Difficulté de production (Facile/Moyen/Difficile)

Formate la réponse en JSON valide.`;

        const requestBody = {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 2000,
            response_format: { type: "json_object" }
        };

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ELOSYA_AI_CONFIG.OPENAI_API_KEY}`
                }
            }
        );

        const ideasJson = response.data.choices[0].message.content;
        const ideas = JSON.parse(ideasJson);

        res.json({
            success: true,
            ideas: ideas,
            count: count,
            topic: topic,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Ideas Generation Error]', error.message);
        res.status(500).json({ error: 'Erreur lors de la génération d\'idées' });
    }
});

// 5. Génération de description YouTube
app.post('/api/ai/generate-description', async (req, res) => {
    try {
        const { title, keywords = [], videoType = 'tutorial', duration } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Titre requis' });
        }

        const prompt = `Génère une description YouTube/Elosya professionnelle pour la vidéo: "${title}"

Type de vidéo: ${videoType}
Durée: ${duration || 'Non spécifiée'}
Mots-clés: ${keywords.length > 0 ? keywords.join(', ') : 'Aucun'}

Instructions:
- Longueur: 150-300 mots
- Format optimisé pour le SEO YouTube
- Inclure des appels à l'action (like, abonnement, commentaire, cloche)
- Ajouter des timestamps si pertinent
- Utiliser des emojis modérément (max 5)
- Ajouter des liens pertinents
- Inclure des crédits si nécessaire

Structure recommandée:
1. Introduction accrocheuse
2. Description du contenu
3. Timestamps (si tutoriel)
4. Appels à l'action
5. Liens utiles
6. Hashtags

Fournis aussi 10 hashtags pertinents.`;

        const requestBody = {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
        };

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ELOSYA_AI_CONFIG.OPENAI_API_KEY}`
                }
            }
        );

        const description = response.data.choices[0].message.content;

        res.json({
            success: true,
            description: description,
            title: title,
            videoType: videoType,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Description Generation Error]', error.message);
        res.status(500).json({ error: 'Erreur lors de la génération' });
    }
});

// 6. Vérification d'API key
app.get('/api/ai/check', async (req, res) => {
    try {
        const response = await axios.get('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${ELOSYA_AI_CONFIG.OPENAI_API_KEY}`
            },
            timeout: 10000
        });

        res.json({
            success: true,
            message: 'API OpenAI fonctionnelle',
            models: response.data.data.slice(0, 10).map(m => m.id),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'API OpenAI non accessible',
            details: error.message
        });
    }
});

// 7. Statistiques d'utilisation
app.get('/api/ai/stats', (req, res) => {
    // Ici tu pourrais connecter à une base de données
    // Pour l'instant, retourne des stats basiques
    res.json({
        success: true,
        stats: {
            totalRequests: 0, // À implémenter avec une DB
            activeUsers: 0,
            popularModels: ['gpt-3.5-turbo'],
            averageResponseTime: '1.2s'
        },
        timestamp: new Date().toISOString()
    });
});

// ===== GESTION DES ERREURS =====
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
    console.error('[Server Error]', err.stack);
    res.status(500).json({ 
        error: 'Erreur interne du serveur',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===== DÉMARRAGE DU SERVEUR =====
app.listen(PORT, () => {
    console.log(`🚀 Serveur Elosya AI démarré sur le port ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🤖 API AI: http://localhost:${PORT}/api/ai/chat`);
});

// ===== GESTION DES SIGNALS =====
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu. Arrêt gracieux...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Signal SIGINT reçu. Arrêt du serveur...');
    process.exit(0);
});

// Export pour les tests
module.exports = app;
