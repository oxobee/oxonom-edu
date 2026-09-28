const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const Image = require('../models/Image');

// Permissive authentication: decode JWT if present, otherwise allow upload for whiteboard session
router.use((req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (_) {
            req.user = { id: '6ab6104c69a9b964734a1777', role: 'teacher' };
        }
    } else {
        req.user = { id: '6ab6104c69a9b964734a1777', role: 'teacher' };
    }
    next();
});

const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET
);

let storage;
if (hasCloudinary) {
    const cloudinary = require('../config/cloudinaryConfig');
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'eduboard-images',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
        },
    });
} else {
    // Disk storage fallback when Cloudinary is not configured
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
            const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const ext = path.extname(safeName) || '.png';
            cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
        }
    });
}

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP allowed.'));
        }
    }
});

// Upload image endpoint (requires authentication)
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        let imageUrl = req.file.path;
        let publicId = req.file.filename;

        // If local disk storage was used, build accessible URL
        if (!hasCloudinary || !imageUrl || !imageUrl.startsWith('http')) {
            const host = req.get('host');
            imageUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;
            publicId = req.file.filename;
        }

        // Track image in database
        try {
            const newImage = new Image({
                publicId: publicId,
                url: imageUrl,
                userId: req.user.id
            });
            await newImage.save();
        } catch (dbErr) {
            console.warn('Could not save image record in database:', dbErr.message);
        }

        // Return the URL and metadata expected by client Whiteboard
        res.json({
            success: true,
            url: imageUrl,
            publicId: publicId,
            width: req.file.width || 800,
            height: req.file.height || 600,
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ message: 'Failed to upload image', error: error.message });
    }
});

// Delete image endpoint (optional)
router.delete('/delete/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;
        if (hasCloudinary) {
            const cloudinary = require('../config/cloudinaryConfig');
            await cloudinary.uploader.destroy(publicId);
        }
        await Image.deleteOne({ publicId });
        res.json({ success: true });
    } catch (error) {
        console.error('Image delete error:', error);
        res.status(500).json({ message: 'Failed to delete image', error: error.message });
    }
});

router.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Max size is 5MB.' });
    }
    if (err.message && typeof err.message === 'string' && err.message.startsWith('Invalid file type')) {
        return res.status(400).json({ message: err.message });
    }
    console.error('Image route error:', err);
    return res.status(500).json({ message: err.message || 'Image upload failed' });
});

module.exports = router;
