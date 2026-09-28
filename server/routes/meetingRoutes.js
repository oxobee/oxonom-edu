const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../utils/verifyToken');
const MeetingRequest = require('../models/MeetingRequest');
const MeetingMessage = require('../models/MeetingMessage');
const Notification = require('../models/Notification');
const Class = require('../models/Class');
const Student = require('../models/Student');
const User = require('../models/User');

// Helper to format waiting time in Turkish
const formatWaitTime = (createdAt) => {
    const now = new Date();
    const diffMs = Math.max(0, now - new Date(createdAt));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `${diffDays} gündür bekliyor`;
    }
    if (diffHours > 0) {
        const remMins = diffMins % 60;
        return remMins > 0 ? `${diffHours} saat ${remMins} dk bekliyor` : `${diffHours} saat bekliyor`;
    }
    if (diffMins > 0) {
        return `${diffMins} dk bekliyor`;
    }
    return 'Yeni oluşturuldu';
};

// 1. Create Meeting Request (Student only)
router.post('/', verifyToken, async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user.id }).populate('classId');
        if (!student || !student.classId) {
            return res.status(400).json({ message: 'Sınıf kaydınız bulunmadığından talep oluşturamazsınız.' });
        }

        const { subject, urgency, message } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ message: 'Konu başlığı ve mesaj zorunludur.' });
        }

        const classDoc = await Class.findById(student.classId);
        if (!classDoc || !classDoc.teacherId) {
            return res.status(400).json({ message: 'Sınıfınızın öğretmeni bulunamadı.' });
        }

        const cleanUrgency = ['low', 'normal', 'high', 'urgent'].includes(urgency) ? urgency : 'normal';

        const request = new MeetingRequest({
            studentId: student._id,
            studentUserId: req.user.id,
            teacherId: classDoc.teacherId,
            classId: student.classId,
            subject: subject.trim(),
            urgency: cleanUrgency,
            status: 'waiting_teacher'
        });

        await request.save();

        // Create first message
        const initialMsg = new MeetingMessage({
            requestId: request._id,
            senderUserId: req.user.id,
            senderRole: 'student',
            message: message.trim()
        });
        await initialMsg.save();

        // Notify teacher
        const urgencyLabels = { low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'ACİL' };
        await Notification.create({
            userId: classDoc.teacherId,
            type: 'meeting_request',
            title: `💬 Yeni Görüşme Talebi (${urgencyLabels[cleanUrgency]}): ${student.firstName} ${student.lastName}`,
            message: `${request.subject} - "${initialMsg.message.substring(0, 100)}"`,
            referenceType: 'meeting_request',
            referenceId: request._id
        }).catch(() => {});

        res.status(201).json({
            request,
            initialMessage: initialMsg
        });
    } catch (err) {
        console.error('Error creating meeting request:', err);
        res.status(500).json({ message: 'Talep oluşturulamadı' });
    }
});

// 2. Get Student's Meeting Requests (Student)
router.get('/student', verifyToken, async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user.id });
        if (!student) {
            return res.json([]);
        }

        const requests = await MeetingRequest.find({ studentId: student._id })
            .populate('teacherId', 'username email')
            .populate('classId', 'name grade section')
            .sort({ createdAt: -1 });

        const requestIds = requests.map(r => r._id);
        const latestMessages = await MeetingMessage.aggregate([
            { $match: { requestId: { $in: requestIds } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$requestId',
                    lastMessage: { $first: '$message' },
                    lastSenderRole: { $first: '$senderRole' },
                    lastMessageAt: { $first: '$createdAt' },
                    messageCount: { $sum: 1 }
                }
            }
        ]);

        const msgMap = {};
        latestMessages.forEach(m => {
            msgMap[m._id.toString()] = m;
        });

        const formatted = requests.map(r => {
            const doc = r.toObject();
            doc.waitTimeFormatted = formatWaitTime(r.createdAt);
            doc.lastInfo = msgMap[r._id.toString()] || null;
            return doc;
        });

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching student meeting requests:', err);
        res.status(500).json({ message: 'Talepler alınamadı' });
    }
});

// 3. Get Teacher's Meeting Requests Queue (Teacher)
// Organized by Urgency (urgent -> high -> normal -> low), then longest waiting first
router.get('/teacher', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const requests = await MeetingRequest.find({
            teacherId: req.user.role === 'admin' ? { $exists: true } : teacherId
        })
            .populate('studentId', 'firstName lastName studentNumber')
            .populate('classId', 'name grade section')
            .sort({ createdAt: 1 }); // oldest first within category

        // Urgency weight
        const urgencyWeight = { urgent: 4, high: 3, normal: 2, low: 1 };
        const sorted = [...requests].sort((a, b) => {
            const uDiff = (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
            if (uDiff !== 0) return uDiff;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        const formatted = sorted.map(r => {
            const doc = r.toObject();
            doc.waitTimeFormatted = formatWaitTime(r.createdAt);
            return doc;
        });

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching teacher meeting requests:', err);
        res.status(500).json({ message: 'Talepler yüklenemedi' });
    }
});

// 4. Get Meeting Request Details and Messages
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const request = await MeetingRequest.findById(req.params.id)
            .populate('studentId', 'firstName lastName studentNumber')
            .populate('teacherId', 'username email')
            .populate('classId', 'name grade section schoolName');

        if (!request) {
            return res.status(404).json({ message: 'Talep bulunamadı' });
        }

        // Authorization check
        const isTeacherOwner = request.teacherId?._id?.toString() === req.user.id.toString() || req.user.role === 'admin';
        const isStudentOwner = request.studentUserId?.toString() === req.user.id.toString();

        if (!isTeacherOwner && !isStudentOwner) {
            return res.status(403).json({ message: 'Bu talebe erişim yetkiniz yok' });
        }

        const messages = await MeetingMessage.find({ requestId: request._id })
            .populate('senderUserId', 'username role')
            .sort({ createdAt: 1 });

        const doc = request.toObject();
        doc.waitTimeFormatted = formatWaitTime(request.createdAt);

        res.json({
            request: doc,
            messages
        });
    } catch (err) {
        console.error('Error fetching meeting details:', err);
        res.status(500).json({ message: 'Talep detayları alınamadı' });
    }
});

// 5. Send message in Meeting Request (TURN-BASED ENFORCEMENT)
router.post('/:id/message', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Mesaj metni zorunludur' });
        }

        const request = await MeetingRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Talep bulunamadı' });
        }

        if (request.status === 'resolved' || request.status === 'closed') {
            return res.status(400).json({ message: 'Bu görüşme talebi çözülmüş veya kapatılmıştır.' });
        }

        const isTeacher = request.teacherId.toString() === req.user.id.toString() || req.user.role === 'teacher';
        const isStudent = request.studentUserId.toString() === req.user.id.toString();

        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Bu görüşmeye mesaj gönderme yetkiniz yok' });
        }

        // TURN-BASED CHECK:
        // Student cannot send a message if request.status === 'waiting_teacher'
        if (isStudent && !isTeacher) {
            if (request.status === 'waiting_teacher') {
                return res.status(400).json({
                    message: 'Öğretmeninizin yanıtı bekleniyor. Öğretmeniniz cevap verene kadar yeni mesaj gönderemezsiniz.'
                });
            }
        }

        const senderRole = isTeacher ? 'teacher' : 'student';
        const newMsg = new MeetingMessage({
            requestId: request._id,
            senderUserId: req.user.id,
            senderRole,
            message: message.trim()
        });

        await newMsg.save();

        // Update request status based on sender
        if (senderRole === 'teacher') {
            request.status = 'waiting_student';
            request.updatedAt = new Date();
            await request.save();

            // Notify student
            await Notification.create({
                userId: request.studentUserId,
                type: 'meeting_reply',
                title: '💬 Öğretmeniniz Görüşme Talebinizi Yanıtladı',
                message: `"${newMsg.message.substring(0, 100)}"`,
                referenceType: 'meeting_request',
                referenceId: request._id
            }).catch(() => {});
        } else {
            request.status = 'waiting_teacher';
            request.updatedAt = new Date();
            await request.save();

            // Notify teacher
            await Notification.create({
                userId: request.teacherId,
                type: 'meeting_request',
                title: '💬 Öğrencinizden Yeni Mesaj',
                message: `"${newMsg.message.substring(0, 100)}"`,
                referenceType: 'meeting_request',
                referenceId: request._id
            }).catch(() => {});
        }

        res.status(201).json({
            message: newMsg,
            requestStatus: request.status
        });
    } catch (err) {
        console.error('Error sending meeting message:', err);
        res.status(500).json({ message: 'Mesaj gönderilemedi' });
    }
});

// 6. Resolve Meeting Request (Teacher)
router.patch('/:id/resolve', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const request = await MeetingRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Talep bulunamadı' });
        }

        if (request.teacherId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Yetkisiz işlem' });
        }

        request.status = 'resolved';
        request.closedAt = new Date();
        request.updatedAt = new Date();
        await request.save();

        // Notify student
        await Notification.create({
            userId: request.studentUserId,
            type: 'meeting_reply',
            title: '✅ Görüşme Talebiniz Çözüldü Olarak İşaretlendi',
            message: `"${request.subject}" konulu görüşmeniz tamamlandı.`,
            referenceType: 'meeting_request',
            referenceId: request._id
        }).catch(() => {});

        res.json({ success: true, message: 'Görüşme çözüldü olarak işaretlendi', request });
    } catch (err) {
        console.error('Error resolving meeting request:', err);
        res.status(500).json({ message: 'İşlem başarısız' });
    }
});

// 7. Close Meeting Request with optional reason (Teacher or Student)
router.patch('/:id/close', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { closeReason } = req.body;
        const request = await MeetingRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Talep bulunamadı' });
        }

        const isTeacher = request.teacherId.toString() === req.user.id.toString() || req.user.role === 'teacher' || req.user.role === 'admin';
        const isStudent = request.studentUserId.toString() === req.user.id.toString();

        if (!isTeacher && !isStudent) {
            return res.status(403).json({ message: 'Bu talebi kapatma yetkiniz yok' });
        }

        const cleanReason = (closeReason || '').trim();
        request.status = 'closed';
        request.closedAt = new Date();
        request.updatedAt = new Date();
        request.closeReason = cleanReason;
        request.closedBy = req.user.id;
        request.closedByRole = isTeacher ? 'teacher' : 'student';
        await request.save();

        const closerLabel = isTeacher ? 'Öğretmen' : 'Öğrenci';
        const closeMsgText = cleanReason
            ? `🔒 Görüşme talebi ${closerLabel} tarafından kapatıldı. Açıklama: "${cleanReason}"`
            : `🔒 Görüşme talebi ${closerLabel} tarafından kapatıldı.`;

        await MeetingMessage.create({
            requestId: request._id,
            senderUserId: req.user.id,
            senderRole: isTeacher ? 'teacher' : 'student',
            message: closeMsgText
        }).catch(() => {});

        const recipientUserId = isTeacher ? request.studentUserId : request.teacherId;
        await Notification.create({
            userId: recipientUserId,
            type: 'meeting_reply',
            title: `🔒 Görüşme Talebi Kapatıldı: ${request.subject}`,
            message: closeMsgText,
            referenceType: 'meeting_request',
            referenceId: request._id
        }).catch(() => {});

        res.json({ success: true, message: 'Görüşme talebi kapatıldı', request });
    } catch (err) {
        console.error('Error closing meeting request:', err);
        res.status(500).json({ message: 'İşlem başarısız' });
    }
});

module.exports = router;
