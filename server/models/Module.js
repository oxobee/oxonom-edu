const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    shortDescription: {
        type: String,
        required: true,
        trim: true
    },
    longDescription: {
        type: String,
        required: true,
        trim: true
    },
    coverImage: {
        type: String,
        default: ''
    },
    images: [{
        type: String,
        trim: true
    }],
    videoUrl: {
        type: String,
        default: ''
    },
    videoEmbedCode: {
        type: String,
        default: ''
    },
    badgeText: {
        type: String,
        default: 'Eklenti'
    },
    category: {
        type: String,
        default: 'Tahta Araçları'
    },
    targetGrades: [{
        type: String,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    order: {
        type: Number,
        default: 0
    },
    features: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Module', moduleSchema);
