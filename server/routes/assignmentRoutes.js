const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../utils/verifyToken');
const Assignment = require('../models/Assignment');
const AssignmentRecipient = require('../models/AssignmentRecipient');
const Notification = require('../models/Notification');
const Class = require('../models/Class');
const Student = require('../models/Student');
const upload = require('../middleware/upload');

// 1. Create Assignment (Teacher) - Supports both JSON and multipart form data with images
router.post('/', verifyToken, upload.array('images', 5), async (req, res) => {
    try {
        const teacherId = req.user.id;
        let { classId, title, subject, topic, description, assignmentType, targetStudentIds, dueAt, attachments } = req.body;

        if (typeof targetStudentIds === 'string') {
            try { targetStudentIds = JSON.parse(targetStudentIds); } catch(e) { targetStudentIds = [targetStudentIds]; }
        }
        if (typeof attachments === 'string') {
            try { attachments = JSON.parse(attachments); } catch(e) { attachments = []; }
        }

        if (!title || !subject || !topic || !description || !classId || !dueAt) {
            return res.status(400).json({ message: 'Tüm zorunlu alanları doldurunuz (Başlık, Ders, Konu, Açıklama, Sınıf, Son Teslim).' });
        }

        const classDoc = await Class.findOne({
            _id: classId,
            ...(req.user.role === 'admin' ? {} : { teacherId })
        });
        if (!classDoc) {
            return res.status(403).json({ message: 'Bu sınıf için ödev oluşturma yetkiniz yok.' });
        }

        const cleanType = assignmentType === 'individual' ? 'individual' : 'class';
        let studentIdsToTarget = [];
        if (cleanType === 'individual' && Array.isArray(targetStudentIds) && targetStudentIds.length > 0) {
            studentIdsToTarget = targetStudentIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        } else {
            const classStudents = await Student.find({ classId, isFrozen: { $ne: true } }).select('_id userId');
            studentIdsToTarget = classStudents.map(s => s._id);
        }

        // Process file attachments from multer if any
        const finalAttachments = Array.isArray(attachments) ? [...attachments] : [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                finalAttachments.push({
                    fileUrl: `/uploads/${file.filename}`,
                    fileType: file.mimetype,
                    fileName: file.originalname
                });
            }
        }

        const assignment = new Assignment({
            teacherId,
            classId,
            title: title.trim(),
            subject: subject.trim(),
            topic: topic.trim(),
            description: description.trim(),
            assignmentType: cleanType,
            targetStudentIds: cleanType === 'individual' ? studentIdsToTarget : [],
            assignedAt: new Date(),
            dueAt: new Date(dueAt),
            attachments: finalAttachments
        });

        await assignment.save();

        // Create recipients and notifications
        const studentDocs = await Student.find({ _id: { $in: studentIdsToTarget } }).select('_id userId');
        const recipientsToInsert = [];
        const notificationsToInsert = [];

        for (const s of studentDocs) {
            recipientsToInsert.push({
                assignmentId: assignment._id,
                studentId: s._id,
                userId: s.userId || null,
                status: 'pending'
            });

            if (s.userId) {
                notificationsToInsert.push({
                    userId: s.userId,
                    type: 'assignment',
                    title: `📝 Yeni Ödev: ${assignment.subject} - ${assignment.title}`,
                    message: `${assignment.topic} • Son Teslim: ${new Date(assignment.dueAt).toLocaleDateString('tr-TR')}`,
                    referenceType: 'assignment',
                    referenceId: assignment._id
                });
            }
        }

        if (recipientsToInsert.length > 0) {
            await AssignmentRecipient.insertMany(recipientsToInsert, { ordered: false }).catch(() => {});
        }
        if (notificationsToInsert.length > 0) {
            await Notification.insertMany(notificationsToInsert, { ordered: false }).catch(() => {});
        }

        res.status(201).json(assignment);
    } catch (err) {
        console.error('Error creating assignment:', err);
        res.status(500).json({ message: 'Ödev oluşturulamadı' });
    }
});

// 2. Get Assignments for a class (Teacher)
router.get('/class/:classId', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const teacherId = req.user.id;

        const classDoc = await Class.findOne({
            _id: classId,
            ...(req.user.role === 'admin' ? {} : { teacherId })
        });
        if (!classDoc) {
            return res.status(403).json({ message: 'Yetkisiz erişim' });
        }

        const assignments = await Assignment.find({ classId })
            .populate('teacherId', 'username email')
            .populate('targetStudentIds', 'firstName lastName studentNumber')
            .sort({ createdAt: -1 });

        const assignmentIds = assignments.map(a => a._id);
        const recipientStats = await AssignmentRecipient.aggregate([
            { $match: { assignmentId: { $in: assignmentIds } } },
            {
                $group: {
                    _id: '$assignmentId',
                    total: { $sum: 1 },
                    completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
                    incompleteCount: { $sum: { $cond: [{ $in: ['$status', ['incomplete', 'pending']] }, 1, 0] } }
                }
            }
        ]);

        const statsMap = {};
        recipientStats.forEach(r => {
            statsMap[r._id.toString()] = {
                total: r.total,
                completedCount: r.completedCount,
                partialCount: r.partialCount,
                incompleteCount: r.incompleteCount
            };
        });

        const result = assignments.map(a => {
            const doc = a.toObject();
            doc.stats = statsMap[a._id.toString()] || { total: 0, completedCount: 0, partialCount: 0, incompleteCount: 0 };
            return doc;
        });

        res.json(result);
    } catch (err) {
        console.error('Error fetching assignments:', err);
        res.status(500).json({ message: 'Ödevler yüklenemedi' });
    }
});

// 3. Get Assignments for Student (Student only)
router.get('/student', verifyToken, async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user.id });
        if (!student || !student.classId) {
            return res.json([]);
        }

        const assignments = await Assignment.find({
            classId: student.classId,
            status: 'active',
            $or: [
                { assignmentType: 'class' },
                { targetStudentIds: student._id }
            ]
        })
            .populate('teacherId', 'username email')
            .populate('classId', 'name grade section')
            .sort({ dueAt: 1 });

        const assignmentIds = assignments.map(a => a._id);
        const myRecipients = await AssignmentRecipient.find({
            assignmentId: { $in: assignmentIds },
            studentId: student._id
        });

        const recMap = {};
        myRecipients.forEach(r => {
            recMap[r.assignmentId.toString()] = r;
        });

        const now = new Date();
        const result = assignments.map(a => {
            const doc = a.toObject();
            const rec = recMap[a._id.toString()];
            doc.studentStatus = rec ? rec.status : 'pending';
            doc.completedAt = rec ? rec.completedAt : null;
            doc.isIndividual = a.assignmentType === 'individual';

            // Calculate timing status
            const due = new Date(a.dueAt);
            const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
            doc.daysRemaining = diffDays;
            if (doc.studentStatus === 'completed') {
                doc.timingCategory = 'completed';
            } else if (diffDays < 0) {
                doc.timingCategory = 'overdue';
            } else if (diffDays <= 2) {
                doc.timingCategory = 'upcoming';
            } else {
                doc.timingCategory = 'active';
            }

            return doc;
        });

        res.json(result);
    } catch (err) {
        console.error('Error fetching student assignments:', err);
        res.status(500).json({ message: 'Ödevler alınamadı' });
    }
});

// 4. Student marks assignment as completed/pending
router.patch('/:id/toggle-complete', verifyToken, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const student = await Student.findOne({ userId: req.user.id });
        if (!student) {
            return res.status(404).json({ message: 'Öğrenci bulunamadı' });
        }

        const existing = await AssignmentRecipient.findOne({ assignmentId, studentId: student._id });
        const newStatus = existing && existing.status === 'completed' ? 'pending' : 'completed';

        const updated = await AssignmentRecipient.findOneAndUpdate(
            { assignmentId, studentId: student._id },
            {
                $set: {
                    status: newStatus,
                    completedAt: newStatus === 'completed' ? new Date() : null,
                    userId: req.user.id
                }
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, status: updated.status });
    } catch (err) {
        console.error('Error toggling assignment complete:', err);
        res.status(500).json({ message: 'İşlem başarısız' });
    }
});

// 4b. Update assignment status explicitly ('completed' | 'partial' | 'incomplete')
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const { status, studentId: targetStudentId } = req.body;

        const validStatuses = ['completed', 'partial', 'incomplete', 'pending'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Geçersiz ödev durumu' });
        }

        let studentId = targetStudentId;
        if (!studentId && req.user.role === 'student') {
            const student = await Student.findOne({ userId: req.user.id });
            if (!student) {
                return res.status(404).json({ message: 'Öğrenci bulunamadı' });
            }
            studentId = student._id;
        }

        if (!studentId) {
            return res.status(400).json({ message: 'Öğrenci ID belirtilmelidir' });
        }

        const updated = await AssignmentRecipient.findOneAndUpdate(
            { assignmentId, studentId },
            {
                $set: {
                    status,
                    completedAt: status === 'completed' ? new Date() : null,
                    userId: req.user.id
                }
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, status: updated.status });
    } catch (err) {
        console.error('Error updating assignment status:', err);
        res.status(500).json({ message: 'İşlem başarısız' });
    }
});

// 4c. Get full student list and completion statuses for an assignment (Teacher)
router.get('/:id/recipients', verifyToken, async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: 'Ödev bulunamadı' });
        }

        // Determine which students should be returned
        let students = [];
        if (assignment.assignmentType === 'individual' && assignment.targetStudentIds && assignment.targetStudentIds.length > 0) {
            students = await Student.find({ _id: { $in: assignment.targetStudentIds } })
                .select('firstName lastName studentNumber schoolNumber phone email avatar');
        } else {
            students = await Student.find({ classId: assignment.classId })
                .select('firstName lastName studentNumber schoolNumber phone email avatar');
        }

        const existingRecipients = await AssignmentRecipient.find({ assignmentId });
        const recipientMap = {};
        existingRecipients.forEach(r => {
            recipientMap[r.studentId.toString()] = r;
        });

        const list = students.map(student => {
            const r = recipientMap[student._id.toString()];
            return {
                studentId: student._id,
                name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'İsimsiz Öğrenci',
                studentNumber: student.studentNumber || student.schoolNumber || '-',
                phone: student.phone || '',
                email: student.email || '',
                status: r ? r.status : 'pending',
                completedAt: r ? r.completedAt : null,
                notes: r ? r.notes : ''
            };
        });

        res.json({
            assignment: {
                _id: assignment._id,
                title: assignment.title,
                subject: assignment.subject,
                topic: assignment.topic,
                dueAt: assignment.dueAt
            },
            students: list
        });
    } catch (err) {
        console.error('Error fetching assignment recipients:', err);
        res.status(500).json({ message: 'Öğrenci durumları yüklenemedi' });
    }
});

// 5. Delete Assignment (Teacher)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const assignment = await Assignment.findOne({
            _id: req.params.id,
            ...(req.user.role === 'admin' ? {} : { teacherId: req.user.id })
        });
        if (!assignment) {
            return res.status(404).json({ message: 'Ödev bulunamadı veya yetkisiz' });
        }

        await AssignmentRecipient.deleteMany({ assignmentId: assignment._id });
        await Notification.deleteMany({ referenceId: assignment._id, referenceType: 'assignment' });
        await Assignment.findByIdAndDelete(assignment._id);

        res.json({ success: true, message: 'Ödev silindi' });
    } catch (err) {
        console.error('Error deleting assignment:', err);
        res.status(500).json({ message: 'Ödev silinemedi' });
    }
});

module.exports = router;
