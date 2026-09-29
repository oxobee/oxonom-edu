const express = require('express');
const router = express.Router();
const Module = require('../models/Module');
const Class = require('../models/Class');
const verifyToken = require('../utils/verifyToken');
const verifyAdmin = require('../utils/verifyAdmin');
const upload = require('../middleware/upload');

// Helper to normalize YouTube URLs and embed snippets
function normalizeYouTubeEmbedUrl(input) {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim();
    // If it's an iframe tag
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
    }
    // youtu.be/VIDEO_ID
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i);
    if (shortMatch && shortMatch[1]) {
        return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }
    // youtube.com/watch?v=VIDEO_ID
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/i);
    if (watchMatch && watchMatch[1]) {
        return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    return trimmed;
}

/**
 * 1. GET /api/modules
 * Public/Teacher: Returns active modules with teacher's assigned classes if logged in
 */
router.get('/', async (req, res) => {
    try {
        const modules = await Module.find({ isActive: true }).sort({ order: 1, createdAt: -1 });

        let userRole = null;
        let studentClass = null;
        let teacherClasses = [];
        let authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_oxonom_edu_secure_jwt_token_2025');
                if (decoded && decoded.id) {
                    const User = require('../models/User');
                    const Student = require('../models/Student');
                    const user = await User.findById(decoded.id).select('role');
                    if (user) {
                        userRole = user.role;
                        if (user.role === 'teacher') {
                            teacherClasses = await Class.find({ teacherId: decoded.id, isActive: true })
                                .select('_id name grade section schoolName enabledModules');
                        } else if (user.role === 'student') {
                            const student = await Student.findOne({ userId: decoded.id, status: 'active' }).populate('classId');
                            if (student && student.classId) {
                                studentClass = student.classId;
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore token errors for public listing
            }
        }

        // If user is a student: strictly return ONLY modules enabled for their specific class!
        if (userRole === 'student') {
            if (!studentClass) {
                return res.json({
                    modules: [],
                    role: 'student',
                    studentClass: null,
                    message: 'Henüz aktif bir sınıfa atanmadınız.'
                });
            }

            const allowedKeys = Array.isArray(studentClass.enabledModules) ? studentClass.enabledModules : [];
            const filtered = modules.filter(m => allowedKeys.includes(m.key));

            return res.json({
                modules: filtered,
                role: 'student',
                studentClass: {
                    _id: studentClass._id,
                    name: studentClass.name,
                    grade: studentClass.grade,
                    section: studentClass.section,
                    schoolName: studentClass.schoolName
                }
            });
        }

        // If teacher or admin/public:
        const enriched = modules.map(m => {
            const mObj = m.toObject();
            if (teacherClasses.length > 0) {
                const assigned = teacherClasses.filter(c => Array.isArray(c.enabledModules) && c.enabledModules.includes(m.key));
                mObj.assignedClasses = assigned.map(c => ({
                    _id: c._id,
                    name: c.name,
                    grade: c.grade,
                    section: c.section
                }));
                mObj.assignedCount = assigned.length;
            } else {
                mObj.assignedClasses = [];
                mObj.assignedCount = 0;
            }
            return mObj;
        });

        res.json({
            modules: enriched,
            role: userRole || 'guest',
            teacherClasses: teacherClasses.map(c => ({
                _id: c._id,
                name: c.name,
                grade: c.grade,
                section: c.section,
                schoolName: c.schoolName,
                enabledModules: c.enabledModules || []
            }))
        });
    } catch (err) {
        console.error('Error fetching modules:', err);
        res.status(500).json({ message: 'Modüller getirilemedi.' });
    }
});

/**
 * 2. POST /api/modules/assign-classes
 * Teacher: Assign or unassign a module to specific classes
 */
router.post('/assign-classes', verifyToken, async (req, res) => {
    try {
        const { moduleKey, classIds } = req.body;
        if (!moduleKey || !Array.isArray(classIds)) {
            return res.status(400).json({ message: 'Modül anahtarı ve sınıf listesi gereklidir.' });
        }

        const teacherId = req.user.id;
        // Verify classes belong to this teacher
        const myClasses = await Class.find({ teacherId });
        const myClassIds = myClasses.map(c => c._id.toString());

        const requestedClassIds = classIds.filter(id => myClassIds.includes(String(id)));

        // Remove moduleKey from classes not selected
        await Class.updateMany(
            { teacherId, _id: { $nin: requestedClassIds } },
            { $pull: { enabledModules: moduleKey } }
        );

        // Add moduleKey to selected classes
        await Class.updateMany(
            { teacherId, _id: { $in: requestedClassIds } },
            { $addToSet: { enabledModules: moduleKey } }
        );

        const updatedClasses = await Class.find({ teacherId }).select('_id name grade section enabledModules');
        res.json({
            success: true,
            message: 'Modül sınıf yetkileri başarıyla güncellendi.',
            moduleKey,
            assignedClassIds: requestedClassIds,
            classes: updatedClasses
        });
    } catch (err) {
        console.error('Error assigning module to classes:', err);
        res.status(500).json({ message: 'Sınıf ataması kaydedilemedi.' });
    }
});

/**
 * 3. GET /api/modules/admin/all
 * Superadmin: Fetch all modules (active and passive)
 */
router.get('/admin/all', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const modules = await Module.find().sort({ order: 1, createdAt: -1 });
        res.json(modules);
    } catch (err) {
        console.error('Admin fetch modules error:', err);
        res.status(500).json({ message: 'Modül listesi yüklenemedi.' });
    }
});

/**
 * 4. POST /api/modules/admin
 * Superadmin: Create new module
 */
router.post('/admin', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const {
            key,
            title,
            shortDescription,
            longDescription,
            coverImage,
            images,
            videoUrl,
            videoEmbedCode,
            badgeText,
            category,
            targetGrades,
            isActive,
            order,
            features
        } = req.body;

        if (!title || !shortDescription || !longDescription) {
            return res.status(400).json({ message: 'Başlık, kısa açıklama ve detaylı açıklama zorunludur.' });
        }

        const cleanKey = (key || title)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || `modul-${Date.now()}`;

        // Check if key already exists
        const exists = await Module.findOne({ key: cleanKey });
        if (exists) {
            return res.status(400).json({ message: `"${cleanKey}" anahtarına sahip bir modül zaten mevcut.` });
        }

        const normalizedVideo = normalizeYouTubeEmbedUrl(videoEmbedCode || videoUrl);
        const imagesList = Array.isArray(images) ? images.filter(Boolean) : [];
        const finalCover = coverImage ? coverImage.trim() : (imagesList[0] || '');

        const newModule = new Module({
            key: cleanKey,
            title: title.trim(),
            shortDescription: shortDescription.trim(),
            longDescription: longDescription.trim(),
            coverImage: finalCover,
            images: imagesList.length > 0 ? imagesList : (finalCover ? [finalCover] : []),
            videoUrl: normalizedVideo,
            videoEmbedCode: videoEmbedCode ? videoEmbedCode.trim() : '',
            badgeText: badgeText ? badgeText.trim() : 'Eklenti',
            category: category ? category.trim() : 'Tahta Araçları',
            targetGrades: Array.isArray(targetGrades) ? targetGrades : [],
            features: Array.isArray(features) ? features : [],
            isActive: isActive !== false,
            order: Number(order) || 0
        });

        await newModule.save();
        res.status(201).json(newModule);
    } catch (err) {
        console.error('Error creating module:', err);
        res.status(500).json({ message: 'Modül oluşturulurken hata meydana geldi: ' + err.message });
    }
});

/**
 * 5. PUT /api/modules/admin/:id
 * Superadmin: Update module
 */
router.put('/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const moduleDoc = await Module.findById(id);
        if (!moduleDoc) {
            return res.status(404).json({ message: 'Modül bulunamadı.' });
        }

        const {
            title,
            shortDescription,
            longDescription,
            coverImage,
            images,
            videoUrl,
            videoEmbedCode,
            badgeText,
            category,
            targetGrades,
            isActive,
            order,
            features
        } = req.body;

        if (title !== undefined) moduleDoc.title = title.trim();
        if (shortDescription !== undefined) moduleDoc.shortDescription = shortDescription.trim();
        if (longDescription !== undefined) moduleDoc.longDescription = longDescription.trim();
        if (images !== undefined) {
            moduleDoc.images = Array.isArray(images) ? images.filter(Boolean) : [];
        }

        // Ensure coverImage is always valid and present in images
        if (moduleDoc.images && moduleDoc.images.length > 0) {
            const requestedCover = coverImage ? coverImage.trim() : '';
            if (requestedCover && moduleDoc.images.includes(requestedCover)) {
                moduleDoc.coverImage = requestedCover;
            } else {
                moduleDoc.coverImage = moduleDoc.images[0];
            }
        } else {
            moduleDoc.coverImage = coverImage ? coverImage.trim() : '';
        }

        if (badgeText !== undefined) moduleDoc.badgeText = badgeText.trim();
        if (category !== undefined) moduleDoc.category = category.trim();
        if (targetGrades !== undefined) moduleDoc.targetGrades = Array.isArray(targetGrades) ? targetGrades : [];
        if (features !== undefined) moduleDoc.features = Array.isArray(features) ? features : [];
        if (isActive !== undefined) moduleDoc.isActive = !!isActive;
        if (order !== undefined) moduleDoc.order = Number(order) || 0;

        if (videoEmbedCode !== undefined || videoUrl !== undefined) {
            moduleDoc.videoEmbedCode = videoEmbedCode || '';
            moduleDoc.videoUrl = normalizeYouTubeEmbedUrl(videoEmbedCode || videoUrl);
        }

        await moduleDoc.save();
        res.json(moduleDoc);
    } catch (err) {
        console.error('Error updating module:', err);
        res.status(500).json({ message: 'Modül güncellenirken hata meydana geldi: ' + err.message });
    }
});

/**
 * 6. PATCH /api/modules/admin/:id/toggle
 * Superadmin: Toggle module active/passive
 */
router.patch('/admin/:id/toggle', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const moduleDoc = await Module.findById(id);
        if (!moduleDoc) {
            return res.status(404).json({ message: 'Modül bulunamadı.' });
        }

        moduleDoc.isActive = !moduleDoc.isActive;
        await moduleDoc.save();

        res.json({
            success: true,
            _id: moduleDoc._id,
            key: moduleDoc.key,
            title: moduleDoc.title,
            isActive: moduleDoc.isActive
        });
    } catch (err) {
        console.error('Error toggling module status:', err);
        res.status(500).json({ message: 'Modül durumu değiştirilemedi.' });
    }
});

/**
 * 7. DELETE /api/modules/admin/:id
 * Superadmin: Delete module
 */
router.delete('/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const moduleDoc = await Module.findById(id);
        if (!moduleDoc) {
            return res.status(404).json({ message: 'Modül bulunamadı.' });
        }

        // Clean up from all classes
        await Class.updateMany(
            { enabledModules: moduleDoc.key },
            { $pull: { enabledModules: moduleDoc.key } }
        );

        await Module.findByIdAndDelete(id);
        res.json({ success: true, message: `"${moduleDoc.title}" modülü başarıyla silindi.` });
    } catch (err) {
        console.error('Error deleting module:', err);
        res.status(500).json({ message: 'Modül silinirken hata meydana geldi.' });
    }
});

/**
 * 8. POST /api/modules/upload-image
 * Superadmin: Upload 16:9 module cover image
 */
router.post('/upload-image', verifyToken, verifyAdmin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Lütfen bir görsel dosyası seçiniz.' });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            imageUrl,
            filename: req.file.filename
        });
    } catch (err) {
        console.error('Module image upload error:', err);
        res.status(500).json({ message: 'Görsel yüklenemedi: ' + err.message });
    }
});

/**
 * 9. POST /api/modules/upload-images
 * Superadmin: Upload multiple module images
 */
router.post('/upload-images', verifyToken, verifyAdmin, upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Lütfen en az bir görsel dosyası seçiniz.' });
        }
        const imageUrls = req.files.map(f => `/uploads/${f.filename}`);
        res.json({
            success: true,
            imageUrls
        });
    } catch (err) {
        console.error('Module multiple images upload error:', err);
        res.status(500).json({ message: 'Görseller yüklenemedi: ' + err.message });
    }
});

module.exports = router;

