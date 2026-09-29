const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../utils/verifyToken');
const Announcement = require('../models/Announcement');
const AnnouncementRecipient = require('../models/AnnouncementRecipient');
const Notification = require('../models/Notification');
const Class = require('../models/Class');
const Student = require('../models/Student');

// 1. Create Announcement (Teacher only)
router.post('/', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { classId, title, content, priority, targetType, targetStudentIds } = req.body;

        if (!title || !content || !classId) {
            return res.status(400).json({ message: 'Başlık, içerik ve sınıf seçimi zorunludur.' });
        }

        const cleanPriority = ['normal', 'important', 'urgent'].includes(priority) ? priority : 'normal';

        // BÜTÜN SINIFLAR SEÇENEĞİ (Toplu Bildirim)
        if (classId === 'all') {
            const teacherClasses = await Class.find(req.user.role === 'admin' ? {} : { teacherId });
            if (!teacherClasses || teacherClasses.length === 0) {
                return res.status(400).json({ message: 'Henüz tanımlanmış bir sınıfınız bulunmamaktadır.' });
            }

            const broadcastGroupId = new mongoose.Types.ObjectId();
            const savedAnnouncements = [];
            const recipientsToInsert = [];
            const notificationsToInsert = [];

            for (const cls of teacherClasses) {
                const announcement = new Announcement({
                    teacherId,
                    classId: cls._id,
                    title: title.trim(),
                    content: content.trim(),
                    priority: cleanPriority,
                    targetType: 'class',
                    targetStudentIds: [],
                    isAllClasses: true,
                    broadcastGroupId
                });

                await announcement.save();
                savedAnnouncements.push(announcement);

                // Bu sınıftaki aktif öğrencilere toplu bildirim hazırla
                const classStudents = await Student.find({ classId: cls._id, isFrozen: { $ne: true } }).select('_id userId');
                for (const s of classStudents) {
                    recipientsToInsert.push({
                        announcementId: announcement._id,
                        studentId: s._id,
                        userId: s.userId || null,
                        isRead: false
                    });

                    if (s.userId) {
                        notificationsToInsert.push({
                            userId: s.userId,
                            type: 'announcement',
                            title: cleanPriority === 'urgent' 
                                ? `🚨 TÜM SINIFLARA ACİL DUYURU: ${announcement.title}` 
                                : `📢 Yeni Duyuru: ${announcement.title}`,
                            message: announcement.content.substring(0, 120),
                            referenceType: 'announcement',
                            referenceId: announcement._id
                        });
                    }
                }
            }

            if (recipientsToInsert.length > 0) {
                await AnnouncementRecipient.insertMany(recipientsToInsert, { ordered: false }).catch(() => {});
            }
            if (notificationsToInsert.length > 0) {
                await Notification.insertMany(notificationsToInsert, { ordered: false }).catch(() => {});
            }

            return res.status(201).json(savedAnnouncements[0]);
        }

        // Tekil Sınıf Doğrulaması
        const classDoc = await Class.findOne({
            _id: classId,
            ...(req.user.role === 'admin' ? {} : { teacherId })
        });
        if (!classDoc) {
            return res.status(403).json({ message: 'Bu sınıf için duyuru oluşturma yetkiniz yok.' });
        }

        const cleanTargetType = targetType === 'students' ? 'students' : 'class';

        let studentIdsToTarget = [];
        if (cleanTargetType === 'students' && Array.isArray(targetStudentIds) && targetStudentIds.length > 0) {
            studentIdsToTarget = targetStudentIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        } else {
            // Find all active students in this class
            const classStudents = await Student.find({ classId, isFrozen: { $ne: true } }).select('_id userId');
            studentIdsToTarget = classStudents.map(s => s._id);
        }

        const announcement = new Announcement({
            teacherId,
            classId,
            title: title.trim(),
            content: content.trim(),
            priority: cleanPriority,
            targetType: cleanTargetType,
            targetStudentIds: cleanTargetType === 'students' ? studentIdsToTarget : []
        });

        await announcement.save();

        // Populate recipients and send notifications
        const studentDocs = await Student.find({ _id: { $in: studentIdsToTarget } }).select('_id userId');
        const recipientsToInsert = [];
        const notificationsToInsert = [];

        for (const s of studentDocs) {
            recipientsToInsert.push({
                announcementId: announcement._id,
                studentId: s._id,
                userId: s.userId || null,
                isRead: false
            });

            if (s.userId) {
                notificationsToInsert.push({
                    userId: s.userId,
                    type: 'announcement',
                    title: cleanPriority === 'urgent' ? `🚨 ACİL DUYURU: ${announcement.title}` : `📢 Yeni Duyuru: ${announcement.title}`,
                    message: announcement.content.substring(0, 120),
                    referenceType: 'announcement',
                    referenceId: announcement._id
                });
            }
        }

        if (recipientsToInsert.length > 0) {
            await AnnouncementRecipient.insertMany(recipientsToInsert, { ordered: false }).catch(() => {});
        }
        if (notificationsToInsert.length > 0) {
            await Notification.insertMany(notificationsToInsert, { ordered: false }).catch(() => {});
        }

        res.status(201).json(announcement);
    } catch (err) {
        console.error('Error creating announcement:', err);
        res.status(500).json({ message: 'Duyuru oluşturulamadı' });
    }
});

// 2. Get Announcements for a class (or all classes for Teacher)
router.get('/class/:classId', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const teacherId = req.user.id;

        let query = {};
        let teacherClasses = [];

        if (classId === 'all') {
            teacherClasses = await Class.find(req.user.role === 'admin' ? {} : { teacherId });
            const classIds = teacherClasses.map(c => c._id);
            query = { classId: { $in: classIds } };
        } else {
            const classDoc = await Class.findOne({
                _id: classId,
                ...(req.user.role === 'admin' ? {} : { teacherId })
            });
            if (!classDoc) {
                return res.status(403).json({ message: 'Yetkisiz erişim' });
            }
            query = { classId };
        }

        const announcements = await Announcement.find(query)
            .populate('teacherId', 'username email')
            .populate('classId', 'name grade section')
            .populate('targetStudentIds', 'firstName lastName studentNumber')
            .sort({ createdAt: -1 });

        // Add read count stats
        const announcementIds = announcements.map(a => a._id);
        const recipientStats = await AnnouncementRecipient.aggregate([
            { $match: { announcementId: { $in: announcementIds } } },
            {
                $group: {
                    _id: '$announcementId',
                    total: { $sum: 1 },
                    readCount: { $sum: { $cond: ['$isRead', 1, 0] } }
                }
            }
        ]);

        const statsMap = {};
        recipientStats.forEach(r => {
            statsMap[r._id.toString()] = { total: r.total, readCount: r.readCount };
        });

        // Group broadcast announcements if classId === 'all'
        if (classId === 'all') {
            const groupedResult = [];
            const seenBroadcastGroups = new Set();

            for (const a of announcements) {
                const doc = a.toObject();
                doc.stats = statsMap[a._id.toString()] || { total: 0, readCount: 0 };

                if (doc.broadcastGroupId) {
                    const bgKey = doc.broadcastGroupId.toString();
                    if (seenBroadcastGroups.has(bgKey)) {
                        // Already included master item, accumulate stats
                        const existing = groupedResult.find(item => item.broadcastGroupId?.toString() === bgKey);
                        if (existing) {
                            existing.stats.total += doc.stats.total;
                            existing.stats.readCount += doc.stats.readCount;
                        }
                        continue;
                    }
                    seenBroadcastGroups.add(bgKey);
                    doc.isAllClasses = true;
                    doc.classCount = teacherClasses.length;
                    groupedResult.push(doc);
                } else {
                    groupedResult.push(doc);
                }
            }

            return res.json(groupedResult);
        }

        const result = announcements.map(a => {
            const doc = a.toObject();
            doc.stats = statsMap[a._id.toString()] || { total: 0, readCount: 0 };
            return doc;
        });

        res.json(result);
    } catch (err) {
        console.error('Error fetching class announcements:', err);
        res.status(500).json({ message: 'Duyurular getirilemedi' });
    }
});

// 3. Get Student Announcements (Student only)
router.get('/student', verifyToken, async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user.id });
        if (!student || !student.classId) {
            return res.json([]);
        }

        // Find announcements for student's class where either targetType is 'class' or student._id is in targetStudentIds
        const announcements = await Announcement.find({
            classId: student.classId,
            $or: [
                { targetType: 'class' },
                { targetStudentIds: student._id }
            ]
        })
            .populate('teacherId', 'username email')
            .populate('classId', 'name grade section')
            .sort({ createdAt: -1 });

        const announcementIds = announcements.map(a => a._id);
        const myRecipients = await AnnouncementRecipient.find({
            announcementId: { $in: announcementIds },
            studentId: student._id
        });

        const readMap = {};
        myRecipients.forEach(r => {
            readMap[r.announcementId.toString()] = { isRead: r.isRead, readAt: r.readAt };
        });

        const result = announcements.map(a => {
            const doc = a.toObject();
            const rec = readMap[a._id.toString()];
            doc.isRead = rec ? rec.isRead : false;
            doc.readAt = rec ? rec.readAt : null;
            return doc;
        });

        res.json(result);
    } catch (err) {
        console.error('Error fetching student announcements:', err);
        res.status(500).json({ message: 'Duyurular alınamadı' });
    }
});

// 4. Mark Announcement as Read (Student)
router.patch('/:id/read', verifyToken, async (req, res) => {
    try {
        const announcementId = req.params.id;
        const student = await Student.findOne({ userId: req.user.id });
        if (!student) {
            return res.status(404).json({ message: 'Öğrenci bulunamadı' });
        }

        await AnnouncementRecipient.findOneAndUpdate(
            { announcementId, studentId: student._id },
            { $set: { isRead: true, readAt: new Date(), userId: req.user.id } },
            { upsert: true, new: true }
        );

        // Also mark corresponding notification as read if exists
        await Notification.updateMany(
            { userId: req.user.id, referenceId: announcementId, referenceType: 'announcement' },
            { $set: { isRead: true } }
        );

        res.json({ success: true, message: 'Duyuru okundu olarak işaretlendi' });
    } catch (err) {
        console.error('Error marking announcement as read:', err);
        res.status(500).json({ message: 'İşlem başarısız' });
    }
});

// 5. Delete Announcement (Teacher)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const announcement = await Announcement.findOne({
            _id: req.params.id,
            ...(req.user.role === 'admin' ? {} : { teacherId: req.user.id })
        });
        if (!announcement) {
            return res.status(404).json({ message: 'Duyuru bulunamadı veya yetkisiz' });
        }

        if (announcement.broadcastGroupId) {
            const groupAnnouncements = await Announcement.find({ broadcastGroupId: announcement.broadcastGroupId });
            const groupIds = groupAnnouncements.map(a => a._id);
            await AnnouncementRecipient.deleteMany({ announcementId: { $in: groupIds } });
            await Notification.deleteMany({ referenceId: { $in: groupIds }, referenceType: 'announcement' });
            await Announcement.deleteMany({ broadcastGroupId: announcement.broadcastGroupId });
        } else {
            await AnnouncementRecipient.deleteMany({ announcementId: announcement._id });
            await Notification.deleteMany({ referenceId: announcement._id, referenceType: 'announcement' });
            await Announcement.findByIdAndDelete(announcement._id);
        }

        res.json({ success: true, message: 'Duyuru silindi' });
    } catch (err) {
        console.error('Error deleting announcement:', err);
        res.status(500).json({ message: 'Duyuru silinemedi' });
    }
});

module.exports = router;
