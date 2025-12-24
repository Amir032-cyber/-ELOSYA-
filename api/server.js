// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Connexion MongoDB
mongoose.connect('mongodb://localhost:27017/elosya', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Modèles
const Video = require('./models/Video');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

// Configuration multer pour upload vidéo
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/videos';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non supporté'), false);
        }
    }
});

// ========== ROUTES API ==========

// Upload vidéo
app.post('/api/upload/video', upload.single('video'), async (req, res) => {
    try {
        const { title, description, hashtags, visibility, monetize } = req.body;
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        const video = new Video({
            title,
            description,
            hashtags: JSON.parse(hashtags),
            videoUrl: `/uploads/videos/${req.file.filename}`,
            thumbnailUrl: await generateThumbnail(req.file.path),
            userId,
            visibility,
            monetize: monetize === 'true',
            stats: {
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                coins: 0
            },
            earnings: 0
        });
        
        await video.save();
        
        res.json({
            success: true,
            videoId: video._id,
            message: 'Vidéo publiée avec succès',
            estimatedEarnings: calculateEstimatedEarnings(video)
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Récupérer feed vidéo
app.get('/api/feed', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        
        const videos = await Video.find({ visibility: 'public' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'username avatar')
            .lean();
        
        // Formater pour frontend
        const formattedVideos = videos.map(video => ({
            id: video._id,
            url: video.videoUrl,
            user: {
                username: video.userId?.username || '@anonymous',
                avatar: video.userId?.avatar || '/default-avatar.png'
            },
            description: video.description,
            likes: video.stats.likes,
            comments: video.stats.comments,
            shares: video.stats.shares,
            coins: video.stats.coins,
            location: video.location || 'Non spécifié',
            hashtags: video.hashtags,
            timestamp: formatTimeAgo(video.createdAt),
            earnings: video.earnings
        }));
        
        res.json({
            success: true,
            videos: formattedVideos,
            page: parseInt(page),
            total: await Video.countDocuments({ visibility: 'public' })
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Like vidéo
app.post('/api/like/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const userId = req.headers['x-user-id'];
        
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ error: 'Vidéo non trouvée' });
        }
        
        // Vérifier si déjà liké
        const alreadyLiked = video.likes.includes(userId);
        
        if (alreadyLiked) {
            // Unlike
            video.likes = video.likes.filter(id => id !== userId);
            video.stats.likes -= 1;
        } else {
            // Like
            video.likes.push(userId);
            video.stats.likes += 1;
            
            // Calculer gains (0.05€ par 20 likes)
            if (video.stats.likes % 20 === 0 && video.monetize) {
                const earnings = 0.05;
                video.earnings += earnings;
                
                // Ajouter transaction
                await Transaction.create({
                    userId: video.userId,
                    videoId: video._id,
                    type: 'like_revenue',
                    amount: earnings,
                    description: `Gains via likes (${video.stats.likes} likes)`
                });
                
                // Mettre à jour portefeuille utilisateur
                await User.findByIdAndUpdate(video.userId, {
                    $inc: { walletBalance: earnings }
                });
            }
        }
        
        await video.save();
        
        res.json({
            success: true,
            liked: !alreadyLiked,
            likes: video.stats.likes,
            earnings: video.earnings
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Partager vidéo
app.post('/api/share/:videoId', async (req, res) => {
    try {
        const videoId = req.params.videoId;
        
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({ error: 'Vidéo non trouvée' });
        }
        
        video.stats.shares += 1;
        
        // Calculer gains (0.10€ par 10 shares)
        if (video.stats.shares % 10 === 0 && video.monetize) {
            const earnings = 0.10;
            video.earnings += earnings;
            
            await Transaction.create({
                userId: video.userId,
                videoId: video._id,
                type: 'share_revenue',
                amount: earnings,
                description: `Gains via partages (${video.stats.shares} shares)`
            });
            
            await User.findByIdAndUpdate(video.userId, {
                $inc: { walletBalance: earnings }
            });
        }
        
        await video.save();
        
        res.json({
            success: true,
            shares: video.stats.shares,
            earnings: video.earnings
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Envoyer des pièces
app.post('/api/send-coins', async (req, res) => {
    try {
        const { videoId, amount } = req.body;
        const senderId = req.headers['x-user-id'];
        
        if (!senderId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        
        const video = await Video.findById(videoId).populate('userId');
        if (!video) {
            return res.status(404).json({ error: 'Vidéo non trouvée' });
        }
        
        const sender = await User.findById(senderId);
        const receiver = video.userId;
        
        // Vérifier solde
        if (sender.walletBalance < amount * 0.10) { // 0.10€ par pièce
            return res.status(400).json({ error: 'Solde insuffisant' });
        }
        
        // Débiter expéditeur
        const cost = amount * 0.10;
        sender.walletBalance -= cost;
        await sender.save();
        
        // Créditer créateur
        receiver.walletBalance += cost * 0.85; // 85% au créateur, 15% plateforme
        await receiver.save();
        
        // Mettre à jour stats vidéo
        video.stats.coins += amount;
        video.earnings += cost * 0.85;
        await video.save();
        
        // Créer transactions
        await Transaction.create([
            {
                userId: senderId,
                type: 'coin_sent',
                amount: -cost,
                description: `Envoi de ${amount} pièces à @${receiver.username}`
            },
            {
                userId: receiver._id,
                type: 'coin_received',
                amount: cost * 0.85,
                description: `Réception de ${amount} pièces de @${sender.username}`
            }
        ]);
        
        res.json({
            success: true,
            coinsSent: amount,
            cost: cost.toFixed(2) + '€',
            receiverEarnings: (cost * 0.85).toFixed(2) + '€',
            newBalance: sender.walletBalance.toFixed(2) + '€'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Statistiques monétisation
app.get('/api/earnings/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const stats = {
            totalEarnings: 0,
            todayEarnings: 0,
            videosCount: 0,
            bySource: {
                views: 0,
                likes: 0,
                shares: 0,
                comments: 0,
                coins: 0
            }
        };
        
        // Récupérer toutes les vidéos de l'utilisateur
        const videos = await Video.find({ userId });
        stats.videosCount = videos.length;
        
        // Calculer gains totaux
        videos.forEach(video => {
            stats.totalEarnings += video.earnings || 0;
            
            // Gains aujourd'hui
            if (video.updatedAt >= today) {
                stats.todayEarnings += video.earnings || 0;
            }
        });
        
        // Récupérer transactions
        const transactions = await Transaction.find({ userId });
        transactions.forEach(transaction => {
            if (transaction.type.includes('view')) stats.bySource.views += transaction.amount;
            else if (transaction.type.includes('like')) stats.bySource.likes += transaction.amount;
            else if (transaction.type.includes('share')) stats.bySource.shares += transaction.amount;
            else if (transaction.type.includes('comment')) stats.bySource.comments += transaction.amount;
            else if (transaction.type.includes('coin')) stats.bySource.coins += transaction.amount;
        });
        
        res.json({
            success: true,
            stats,
            eligibility: checkMonetizationEligibility(stats)
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fonctions utilitaires
function calculateEstimatedEarnings(video) {
    const estimates = {
        per1000Views: 0.01,
        per20Likes: 0.05,
        per10Shares: 0.10,
        per50Comments: 0.02
    };
    
    return {
        potential: `Jusqu'à ${(estimates.per1000Views * 10).toFixed(2)}€ pour 10K vues`,
        breakdown: estimates
    };
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}j`;
    return `${Math.floor(seconds / 604800)}sem`;
}

function checkMonetizationEligibility(stats) {
    const requirements = {
        minFollowers: 10000,
        minVideos: 10,
        minEngagement: 0.05 // 5%
    };
    
    const eligibility = {
        eligible: stats.videosCount >= requirements.minVideos,
        missing: []
    };
    
    if (stats.videosCount < requirements.minVideos) {
        eligibility.missing.push(`${requirements.minVideos - stats.videosCount} vidéos supplémentaires`);
    }
    
    return eligibility;
}

async function generateThumbnail(videoPath) {
    // Utiliser ffmpeg pour générer une miniature
    // Implémentation simplifiée
    return '/thumbnails/default.jpg';
}

// Démarrer serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur Elosya démarré sur le port ${PORT}`);
    console.log(`📹 API vidéo: http://localhost:${PORT}/api`);
    console.log(`💾 Dossier uploads: http://localhost:${PORT}/uploads`);
});
// models/Video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500
    },
    videoUrl: {
        type: String,
        required: true
    },
    thumbnailUrl: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hashtags: [{
        type: String,
        lowercase: true
    }],
    visibility: {
        type: String,
        enum: ['public', 'premium', 'private'],
        default: 'public'
    },
    monetize: {
        type: Boolean,
        default: true
    },
    stats: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        coins: { type: Number, default: 0 },
        saves: { type: Number, default: 0 }
    },
    earnings: {
        type: Number,
        default: 0
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    location: String,
    duration: Number,
    aspectRatio: String,
    isVerified: {
        type: Boolean,
        default: false
    },
    tags: [String],
    category: {
        type: String,
        enum: ['bienêtre', 'yoga', 'méditation', 'fitness', 'nutrition', 'thérapie', 'autres']
    }
}, {
    timestamps: true
});

// Index pour recherche
videoSchema.index({ title: 'text', description: 'text', hashtags: 'text' });
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ 'stats.views': -1 });
videoSchema.index({ 'stats.likes': -1 });

module.exports = mongoose.model('Video', videoSchema);
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: '/default-avatar.png'
    },
    bio: {
        type: String,
        maxlength: 200
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    badges: [{
        type: String,
        enum: ['blue', 'black', 'gold', 'verified', 'premium']
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isCreator: {
        type: Boolean,
        default: false
    },
    creatorSince: Date,
    totalEarnings: {
        type: Number,
        default: 0
    },
    kycVerified: {
        type: Boolean,
        default: false
    },
    kycData: {
        fullName: String,
        idNumber: String,
        documentUrl: String,
        verifiedAt: Date
    },
    settings: {
        notifications: {
            likes: { type: Boolean, default: true },
            comments: { type: Boolean, default: true },
            shares: { type: Boolean, default: true },
            earnings: { type: Boolean, default: true }
        },
        privacy: {
            profile: { type: String, enum: ['public', 'private'], default: 'public' },
            showEarnings: { type: Boolean, default: false }
        }
    },
    lastLogin: Date,
    isOnline: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
# Initialiser projet
npm init -y

# Installer dépendances
npm install express mongoose multer cors bcrypt jsonwebtoken
npm install -D nodemon

# Structure des dossiers
mkdir -p api/models uploads/videos uploads/thumbnails js
{
  "scripts": {
    "start": "node api/server.js",
    "dev": "nodemon api/server.js"
  }
}
# 1. Démarrer MongoDB
mongod

# 2. Démarrer le serveur
npm run dev

# 3. Ouvrir dans le navigateur
# - feed.html (Flux vidéo)
# - upload.html (Upload)
# - http://localhost:3000/api/feed (API)
