const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Class = require('../models/Class');

// 1. Get Notifications for current user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.json({
            unreadCount,
            notifications
        });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ message: 'Bildirimler yüklenemedi' });
    }
});

// 2. Mark single notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { $set: { isRead: true } }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error marking notification read:', err);
        res.status(500).json({ message: 'İşlem başarısız' });
    }
});

// 3. Mark all notifications as read
router.patch('/read-all', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error marking all notifications read:', err);
        res.status(500).json({ message: 'İşlem başarısız' });
    }
});

// 4. Delete single notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findOneAndDelete({ _id: id, userId: req.user.id });
        res.json({ success: true, message: 'Bildirim silindi' });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ message: 'Bildirim silinemedi' });
    }
});

// 5. Delete all notifications (Clear)
router.delete('/', verifyToken, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user.id });
        res.json({ success: true, message: 'Tüm bildirimler temizlendi' });
    } catch (err) {
        console.error('Error clearing notifications:', err);
        res.status(500).json({ message: 'Bildirimler temizlenemedi' });
    }
});

// 6. Teacher action on class join request: accept or reject
router.post('/:id/pair-action', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'accept' or 'reject'
        const teacherId = req.user.id;

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Geçersiz işlem türü' });
        }

        const notif = await Notification.findById(id);
        if (!notif) {
            return res.status(404).json({ message: 'Bildirim bulunamadı' });
        }

        if (notif.userId.toString() !== teacherId.toString()) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }

        if (notif.actionStatus && notif.actionStatus !== 'pending') {
            return res.status(400).json({
                message: `Bu talep daha önce ${notif.actionStatus === 'accepted' ? 'kabul edildi' : 'reddedildi'}.`,
                actionStatus: notif.actionStatus
            });
        }

        const studentId = notif.data?.studentId || notif.referenceId;
        const classId = notif.data?.classId;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Öğrenci kaydı bulunamadı' });
        }

        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return res.status(404).json({ message: 'Sınıf kaydı bulunamadı' });
        }

        const className = notif.data?.className || classDoc.name || `${classDoc.grade}/${classDoc.section}`;
        const studentName = notif.data?.studentName || `${student.firstName} ${student.lastName}`;

        if (action === 'accept') {
            student.classId = classDoc._id;
            student.pendingClassId = null;
            student.teacherId = classDoc.teacherId;
            student.grade = classDoc.grade;
            student.section = classDoc.section;
            if (classDoc.schoolName) student.schoolName = classDoc.schoolName;
            student.status = 'active';
            await student.save();

            notif.actionStatus = 'accepted';
            notif.isRead = true;
            await notif.save();

            // Notify the student
            if (student.userId) {
                await Notification.create({
                    userId: student.userId,
                    type: 'system',
                    title: 'Sınıf Eşleşmeniz Onaylandı 🎉',
                    message: `"${className}" sınıfına kabul edildiniz. Artık ders tahtalarına ve ödevlerinize erişebilirsiniz.`,
                    referenceType: 'Class',
                    referenceId: classDoc._id
                });
            }

            return res.json({
                success: true,
                actionStatus: 'accepted',
                message: `${studentName} öğrencisinin ${className} sınıfına katılımı onaylandı.`
            });
        } else {
            student.pendingClassId = null;
            student.status = 'unassigned';
            await student.save();

            notif.actionStatus = 'rejected';
            notif.isRead = true;
            await notif.save();

            // Notify the student
            if (student.userId) {
                await Notification.create({
                    userId: student.userId,
                    type: 'system',
                    title: 'Sınıf Eşleşme Talebi Reddedildi',
                    message: `"${className}" sınıfı için ilettiğiniz eşleşme talebi öğretmen tarafından reddedildi.`,
                    referenceType: 'Class',
                    referenceId: classDoc._id
                });
            }

            return res.json({
                success: true,
                actionStatus: 'rejected',
                message: `${studentName} öğrencisinin eşleşme talebi reddedildi.`
            });
        }
    } catch (err) {
        console.error('Error handling pair action:', err);
        res.status(500).json({ message: 'İşlem sırasında bir hata oluştu' });
    }
});

module.exports = router;
