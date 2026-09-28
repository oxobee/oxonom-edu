const router = require('express').Router();
const User = require('../models/User');
const TeacherVerification = require('../models/TeacherVerification');
const Board = require('../models/Board');
const SavedBoard = require('../models/SavedBoard');
const verifyToken = require('../utils/verifyToken');
const verifyAdmin = require('../utils/verifyAdmin');

// Apply authentication and admin verification to ALL routes in this file
router.use(verifyToken);
router.use(verifyAdmin);

/**
 * GET /api/admin/pending-teachers
 * Get all pending teacher verification requests
 * Requires: Admin authentication
 */
router.get('/pending-teachers', async (req, res) => {
    try {
        // Find all teachers with pending verification
        const pendingTeachers = await User.find({
            role: 'teacher',
            verificationStatus: 'pending',
            isEmailVerified: { $ne: false }
        }).select('username email createdAt');

        // Get verification details for each teacher
        const teachersWithDocs = await Promise.all(
            pendingTeachers.map(async (teacher) => {
                const verification = await TeacherVerification.findOne({ userId: teacher._id });
                return {
                    id: teacher._id,
                    username: teacher.username,
                    email: teacher.email,
                    registeredAt: teacher.createdAt,
                    documents: verification ? verification.documents : [],
                    hasDocuments: !!verification
                };
            })
        );

        res.json(teachersWithDocs);
    } catch (err) {
        console.error('Error fetching pending teachers:', err);
        res.status(500).json({ message: 'Failed to fetch pending teachers', error: err.message });
    }
});

/**
 * GET /api/admin/all-teachers
 * Get all teachers with their verification status
 */
router.get('/all-teachers', async (req, res) => {
    try {
        const teachers = await User.find({ 
            role: 'teacher',
            isEmailVerified: { $ne: false }
        })
            .select('username email verificationStatus isVerified verificationDate createdAt')
            .sort({ createdAt: -1 });

        res.json(teachers);
    } catch (err) {
        console.error('Error fetching teachers:', err);
        res.status(500).json({ message: 'Failed to fetch teachers', error: err.message });
    }
});

// Delete a teacher account
router.delete('/teacher/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Find the teacher
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        if (user.role !== 'teacher') {
            return res.status(400).json({ message: 'User is not a teacher' });
        }

        // Delete teacher verification records
        await TeacherVerification.deleteMany({ userId });

        // Delete the user
        await User.findByIdAndDelete(userId);

        res.json({ message: 'Teacher removed successfully' });
    } catch (err) {
        console.error('Error removing teacher:', err);
        res.status(500).json({ message: 'Failed to remove teacher', error: err.message });
    }
});

/**
 * GET /api/admin/all-students
 * Get all students with their registration details
 */
router.get('/all-students', async (req, res) => {
    try {
        const students = await User.find({ 
            role: 'student',
            isEmailVerified: { $ne: false }
        })
            .select('username email createdAt')
            .sort({ createdAt: -1 });

        res.json(students);
    } catch (err) {
        console.error('Error fetching students:', err);
        res.status(500).json({ message: 'Failed to fetch students', error: err.message });
    }
});

/**
 * DELETE /api/admin/user/:userId
 * Comprehensive user deletion with cleanup of all related data
 * Use this for complete user removal (students, teachers, or any user)
 */
router.delete('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Find the user first
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[ADMIN] Deleting user: ${user.username} (${user.email})`);

        // Clean up all related data
        await TeacherVerification.deleteMany({ userId });
        await SavedBoard.deleteMany({ userId });

        // Update boards created by this user (set creator to null instead of deleting boards)
        await Board.updateMany(
            { createdBy: userId },
            { $set: { createdBy: null } }
        );

        // Delete the user
        await User.findByIdAndDelete(userId);
        res.json({
            message: 'User deleted successfully',
            deletedUser: {
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({
            message: 'Failed to delete user',
            error: err.message
        });
    }
});

/**
 * GET /api/admin/demo-settings
 * Retrieve demo mode status, auto-reset state, and timing info
 */
router.get('/demo-settings', async (req, res) => {
    try {
        const { getDemoStatus } = require('../services/demoService');
        const status = await getDemoStatus();
        res.json(status);
    } catch (err) {
        console.error('Error getting demo settings:', err);
        res.status(500).json({ message: 'Failed to get demo settings', error: err.message });
    }
});

/**
 * POST /api/admin/demo-settings
 * Toggle demo mode auto-reset on/off
 * When enabled, automatically runs seedDemoData with latest modules and restarts 30-min timer
 */
router.post('/demo-settings', async (req, res) => {
    try {
        const { autoResetEnabled } = req.body;
        const { setAutoResetEnabled } = require('../services/demoService');
        const status = await setAutoResetEnabled(autoResetEnabled);
        res.json({
            message: autoResetEnabled 
                ? 'Demo otomatik sıfırlama açıldı ve tüm sistem en güncel modüllerle sıfırlandı.' 
                : 'Demo otomatik sıfırlama durduruldu. Yaptığınız tüm düzenlemeler korunacak.',
            ...status
        });
    } catch (err) {
        console.error('Error updating demo settings:', err);
        res.status(500).json({ message: 'Failed to update demo settings', error: err.message });
    }
});

/**
 * POST /api/admin/demo-reset-now
 * Manually trigger demo environment reset to latest state immediately
 */
router.post('/demo-reset-now', async (req, res) => {
    try {
        const { seedDemoData, getDemoStatus } = require('../services/demoService');
        const result = await seedDemoData();
        const status = await getDemoStatus();
        res.json({
            message: 'Demo ortamı en güncel modüller ve ayarlar ile başarıyla sıfırlandı.',
            ...result,
            ...status
        });
    } catch (err) {
        console.error('Error manually resetting demo:', err);
        res.status(500).json({ message: 'Demo sıfırlama başarısız oldu', error: err.message });
    }
});

module.exports = router;
