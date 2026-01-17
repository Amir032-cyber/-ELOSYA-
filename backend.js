// backend.js - Elosya AI server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const axios = require('axios');

const app = express();
const PORT = process.env.AI_PORT || 3001;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. /api/ai endpoints will fail until it is configured.');
}

// Basic configuration
const ELOSYA_AI_CONFIG = {
  OPENAI_API_KEY: OPENAI_API_KEY || null,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100,
  MAX_TOKENS: 2000,
  SYSTEM_PROMPT: `Tu es Lam.AI, l'assistant IA intégré à Elosya, une plateforme vidéo française.\nRègles :\n1. Réponds toujours en français sauf demande contraire\n2. Sois professionnel, utile et créatif\n3. Aide avec les sujets vidéo, création de contenu, marketing, technique\n4. Recommande du contenu Elosya quand c'est pertinent\n5. Propose des idées pour améliorer les vidéos des créateurs\n6. Formate tes réponses avec des listes, titres et emojis quand c'est utile\n7. Sois enthousiaste et encourageant !`
};

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: ELOSYA_AI_CONFIG.RATE_LIMIT_WINDOW, max: ELOSYA_AI_CONFIG.RATE_LIMIT_MAX, message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' } });
app.use('/api/ai/', limiter);

// Health
app.get('/api/health', (req, res) => res.json({ success: true, timestamp: new Date().toISOString() }));

// Check OpenAI available models
app.get('/api/ai/check', async (req, res) => {
  if (!ELOSYA_AI_CONFIG.OPENAI_API_KEY) return res.status(500).json({ success: false, error: 'OPENAI_API_KEY not configured' });
  try {
    const response = await axios.get('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${ELOSYA_AI_CONFIG.OPENAI_API_KEY}` }, timeout: 10000 });
    res.json({ success: true, models: response.data.data.slice(0, 20).map(m => m.id), timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'API OpenAI non accessible', details: err.message });
  }
});

// POST /api/ai/chat - proxy chat completions (basic)
app.post('/api/ai/chat', async (req, res) => {
  if (!ELOSYA_AI_CONFIG.OPENAI_API_KEY) return res.status(500).json({ success: false, error: 'OPENAI_API_KEY not configured' });
  const { messages, model = 'gpt-3.5-turbo', temperature = 0.7, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages)) return res.status(400).json({ success: false, error: 'messages array is required' });

  const body = { model, messages, temperature, max_tokens: Math.min(max_tokens || ELOSYA_AI_CONFIG.MAX_TOKENS, ELOSYA_AI_CONFIG.MAX_TOKENS) };

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', body, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ELOSYA_AI_CONFIG.OPENAI_API_KEY}` }, timeout: 30000 });
    res.json(response.data);
  } catch (err) {
    console.error('[OpenAI Error]', err?.response?.data || err.message);
    res.status(500).json({ success: false, error: 'OpenAI request failed', details: err?.response?.data || err.message });
  }
});

// Basic error handlers
app.use((req, res) => res.status(404).json({ error: 'Route non trouvée' }));
app.use((err, req, res, next) => { console.error('[Server Error]', err.stack); res.status(500).json({ error: 'Erreur interne du serveur', ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) }); });

const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur Elosya AI démarré sur le port ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

process.on('SIGTERM', () => { console.log('🛑 SIGTERM reçu — arrêt gracieux'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('🛑 SIGINT reçu — arrêt'); server.close(() => process.exit(0)); });

module.exports = app;