const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const User = require('../models/User');
const TeacherVerification = require('../models/TeacherVerification');
const verifyToken = require('../utils/verifyToken');

const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Cloudinary or disk storage fallback
const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let storage;
if (hasCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'teacher_verifications',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'odt', 'txt'],
            resource_type: 'auto'
        }
    });
} else {
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
            const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const ext = path.extname(safeName) || '';
            cb(null, 'doc-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
        }
    });
}

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    }
});

/**
 * GET /api/teachers/profile
 * Get current teacher's profile details and uploaded documents
 */
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        const verification = await TeacherVerification.findOne({ userId });

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                nationalId: user.nationalId || '',
                birthDate: user.birthDate || '',
                startDate: user.startDate || '',
                address: user.address || '',
                isVerified: user.isVerified,
                verificationStatus: user.verificationStatus,
                verificationDate: user.verificationDate,
                createdAt: user.createdAt
            },
            verification: verification ? {
                status: verification.status,
                documents: verification.documents || [],
                adminNotes: verification.adminNotes || ''
            } : {
                status: user.verificationStatus || 'pending',
                documents: [],
                adminNotes: ''
            }
        });
    } catch (err) {
        console.error('Error fetching teacher profile:', err);
        res.status(500).json({ message: 'Profil bilgileri alınamadı.', error: err.message });
    }
});

/**
 * PUT /api/teachers/profile
 * Update current teacher's profile details
 */
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        const {
            firstName,
            lastName,
            phone,
            nationalId,
            birthDate,
            startDate,
            address
        } = req.body;

        if (firstName !== undefined) user.firstName = firstName.trim();
        if (lastName !== undefined) user.lastName = lastName.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (nationalId !== undefined) user.nationalId = nationalId.trim();
        if (birthDate !== undefined) user.birthDate = birthDate.trim();
        if (startDate !== undefined) user.startDate = startDate.trim();
        if (address !== undefined) user.address = address.trim();

        await user.save();

        res.json({
            message: 'Profil bilgileri başarıyla güncellendi.',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                nationalId: user.nationalId,
                birthDate: user.birthDate,
                startDate: user.startDate,
                address: user.address,
                isVerified: user.isVerified,
                verificationStatus: user.verificationStatus
            }
        });
    } catch (err) {
        console.error('Error updating teacher profile:', err);
        res.status(500).json({ message: 'Profil güncellenemedi.', error: err.message });
    }
});

/**
 * POST /api/teachers/upload-document
 * Upload one or multiple documents for teacher (drag & drop support)
 */
router.post('/upload-document', verifyToken, upload.any(), async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        const files = req.files || (req.file ? [req.file] : []);
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'Lütfen yüklenecek en az bir dosya seçiniz.' });
        }

        let verification = await TeacherVerification.findOne({ userId });
        if (!verification) {
            verification = new TeacherVerification({
                userId,
                documents: [],
                status: 'pending'
            });
        }

        const defaultType = req.body.type || 'degree';
        const defaultTitle = req.body.title || '';
        const newlyUploaded = [];

        for (const file of files) {
            const fileUrl = file.path && file.path.startsWith('http')
                ? file.path
                : `/uploads/${file.filename}`;

            const docType = req.body[`type_${file.originalname}`] || defaultType;
            const docTitle = req.body[`title_${file.originalname}`] || defaultTitle || file.originalname;

            const docObj = {
                type: docType,
                title: docTitle,
                fileName: file.originalname,
                fileSize: file.size,
                fileType: file.mimetype,
                url: fileUrl,
                publicId: file.filename || file.originalname,
                uploadedAt: new Date()
            };

            verification.documents.push(docObj);
            newlyUploaded.push(docObj);
        }

        await verification.save();

        res.json({
            message: `${newlyUploaded.length} dosya başarıyla yüklendi.`,
            uploaded: newlyUploaded,
            documents: verification.documents
        });
    } catch (err) {
        console.error('Error uploading teacher documents:', err);
        res.status(500).json({ message: 'Belgeler yüklenemedi.', error: err.message });
    }
});

/**
 * DELETE /api/teachers/documents/:docId
 * Delete an uploaded document from teacher verification
 */
router.delete('/documents/:docId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const verification = await TeacherVerification.findOne({ userId });
        if (!verification) {
            return res.status(404).json({ message: 'Doğrulama kaydı bulunamadı.' });
        }

        const docId = req.params.docId;
        verification.documents = verification.documents.filter(d => 
            d._id.toString() !== docId && d.publicId !== docId
        );

        await verification.save();

        res.json({
            message: 'Belge silindi.',
            documents: verification.documents
        });
    } catch (err) {
        console.error('Error deleting teacher document:', err);
        res.status(500).json({ message: 'Belge silinemedi.' });
    }
});

module.exports = router;
