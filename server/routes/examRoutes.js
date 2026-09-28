const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../utils/verifyToken');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Notification = require('../models/Notification');
const Class = require('../models/Class');
const Student = require('../models/Student');

// 1. Create Exam (Teacher)
router.post('/', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { classId, name, subject, topic, examType, description, examDate, maxScore } = req.body;

        if (!name || !subject || !classId || !examDate) {
            return res.status(400).json({ message: 'Sınav adı, ders, sınıf ve sınav tarihi zorunludur.' });
        }

        const classDoc = await Class.findOne({
            _id: classId,
            ...(req.user.role === 'admin' ? {} : { teacherId })
        });
        if (!classDoc) {
            return res.status(403).json({ message: 'Bu sınıf için sınav oluşturma yetkiniz yok.' });
        }

        const cleanType = ['oral', 'midterm', 'final'].includes(examType) ? examType : 'midterm';

        const exam = new Exam({
            teacherId,
            classId,
            name: name.trim(),
            subject: subject.trim(),
            topic: (topic || '').trim(),
            examType: cleanType,
            description: (description || '').trim(),
            examDate: new Date(examDate),
            maxScore: Number(maxScore) || 100
        });

        await exam.save();

        // Notify students in class
        const students = await Student.find({ classId, isFrozen: { $ne: true } }).select('userId');
        const notifications = [];
        const typeLabels = { oral: 'Sözlü', midterm: 'Ara Sınav', final: 'Genel Sınav' };
        for (const s of students) {
            if (s.userId) {
                notifications.push({
                    userId: s.userId,
                    type: 'exam',
                    title: `🎯 Yeni Sınav Duyurusu: ${exam.name}`,
                    message: `${exam.subject} (${typeLabels[exam.examType] || 'Sınav'}) • Tarih: ${new Date(exam.examDate).toLocaleDateString('tr-TR')}`,
                    referenceType: 'exam',
                    referenceId: exam._id
                });
            }
        }
        if (notifications.length > 0) {
            await Notification.insertMany(notifications, { ordered: false }).catch(() => {});
        }

        res.status(201).json(exam);
    } catch (err) {
        console.error('Error creating exam:', err);
        res.status(500).json({ message: 'Sınav oluşturulamadı' });
    }
});

// 2. Get Exams for a class (Teacher)
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

        const exams = await Exam.find({ classId }).sort({ examDate: -1 });
        const examIds = exams.map(e => e._id);

        const results = await ExamResult.aggregate([
            { $match: { examId: { $in: examIds } } },
            {
                $group: {
                    _id: '$examId',
                    gradedCount: { $sum: 1 },
                    avgScore: { $avg: '$score' },
                    highestScore: { $max: '$score' },
                    lowestScore: { $min: '$score' }
                }
            }
        ]);

        const statsMap = {};
        results.forEach(r => {
            statsMap[r._id.toString()] = {
                gradedCount: r.gradedCount,
                avgScore: Math.round((r.avgScore || 0) * 10) / 10,
                highestScore: r.highestScore,
                lowestScore: r.lowestScore
            };
        });

        const totalStudents = await Student.countDocuments({ classId, isFrozen: { $ne: true } });

        const formatted = exams.map(e => {
            const doc = e.toObject();
            doc.stats = statsMap[e._id.toString()] || { gradedCount: 0, avgScore: 0, highestScore: 0, lowestScore: 0 };
            doc.totalStudents = totalStudents;
            return doc;
        });

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching exams:', err);
        res.status(500).json({ message: 'Sınavlar getirilemedi' });
    }
});

// 3. Get Grading Sheet for an exam (Teacher)
router.get('/:examId/grading', verifyToken, async (req, res) => {
    try {
        const { examId } = req.params;
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Sınav bulunamadı' });
        }

        if (req.user.role !== 'admin' && exam.teacherId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Bu sınavı notlandırma yetkiniz yok' });
        }

        const students = await Student.find({ classId: exam.classId, isFrozen: { $ne: true } })
            .select('firstName lastName studentNumber')
            .sort({ firstName: 1, lastName: 1 });

        const results = await ExamResult.find({ examId });
        const resultMap = {};
        results.forEach(r => {
            resultMap[r.studentId.toString()] = {
                score: r.score,
                teacherNote: r.teacherNote || '',
                updatedAt: r.updatedAt
            };
        });

        const studentGradingList = students.map(s => {
            const resData = resultMap[s._id.toString()];
            return {
                studentId: s._id,
                studentNumber: s.studentNumber,
                fullName: `${s.firstName} ${s.lastName}`,
                score: resData ? resData.score : null,
                teacherNote: resData ? resData.teacherNote : '',
                isGraded: !!resData
            };
        });

        res.json({
            exam,
            students: studentGradingList
        });
    } catch (err) {
        console.error('Error fetching grading sheet:', err);
        res.status(500).json({ message: 'Notlandırma listesi yüklenemedi' });
    }
});

// 4. Save/Update Grade for a student (Teacher)
router.post('/:examId/grade', verifyToken, async (req, res) => {
    try {
        const { examId } = req.params;
        const { studentId, score, teacherNote } = req.body;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Sınav bulunamadı' });
        }

        if (req.user.role !== 'admin' && exam.teacherId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Yetkisiz işlem' });
        }

        if (score === undefined || score === null || score === '' || isNaN(score)) {
            return res.status(400).json({ message: 'Geçerli bir puan giriniz' });
        }

        const numericScore = Number(score);
        if (numericScore < 0 || numericScore > exam.maxScore) {
            return res.status(400).json({ message: `Puan 0 ile ${exam.maxScore} arasında olmalıdır.` });
        }

        const result = await ExamResult.findOneAndUpdate(
            { examId, studentId },
            {
                $set: {
                    score: numericScore,
                    teacherNote: (teacherNote || '').trim(),
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        // Send notification to student user
        const student = await Student.findById(studentId).select('userId');
        if (student && student.userId) {
            await Notification.create({
                userId: student.userId,
                type: 'exam',
                title: `📊 Sınav Notu Açıklandı: ${exam.name}`,
                message: `${exam.subject} sınavından ${numericScore}/${exam.maxScore} aldınız. Öğretmen Notu: ${result.teacherNote ? `"${result.teacherNote}"` : 'Yok'}`,
                referenceType: 'exam',
                referenceId: exam._id
            }).catch(() => {});
        }

        res.json({ success: true, result });
    } catch (err) {
        console.error('Error saving exam grade:', err);
        res.status(500).json({ message: 'Not kaydedilemedi' });
    }
});

// 5. Get Student Exams (Student only)
router.get('/student', verifyToken, async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user.id });
        if (!student || !student.classId) {
            return res.json([]);
        }

        const exams = await Exam.find({ classId: student.classId })
            .populate('teacherId', 'username email')
            .sort({ examDate: -1 });

        const examIds = exams.map(e => e._id);
        const [myResults, allResults] = await Promise.all([
            ExamResult.find({ examId: { $in: examIds }, studentId: student._id }),
            ExamResult.find({ examId: { $in: examIds } }).sort({ score: -1 })
        ]);

        const myResultMap = {};
        myResults.forEach(r => {
            myResultMap[r.examId.toString()] = r;
        });

        // Calculate class stats and ranks per exam
        const examStats = {};
        examIds.forEach(id => {
            examStats[id.toString()] = { list: [] };
        });
        allResults.forEach(r => {
            const eId = r.examId.toString();
            if (examStats[eId]) {
                examStats[eId].list.push(r);
            }
        });

        const formatted = exams.map(e => {
            const doc = e.toObject();
            const myRes = myResultMap[e._id.toString()];
            const list = examStats[e._id.toString()]?.list || [];

            let classAverage = 0;
            let rank = null;

            if (list.length > 0) {
                const total = list.reduce((sum, item) => sum + item.score, 0);
                classAverage = Math.round((total / list.length) * 10) / 10;

                if (myRes) {
                    // Calculate rank (1-indexed)
                    const index = list.findIndex(item => item.studentId.toString() === student._id.toString());
                    if (index !== -1) {
                        rank = index + 1;
                    }
                }
            }

            doc.myScore = myRes ? myRes.score : null;
            doc.teacherNote = myRes ? myRes.teacherNote : '';
            doc.classAverage = classAverage;
            doc.rank = rank;
            doc.totalGraded = list.length;
            return doc;
        });

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching student exams:', err);
        res.status(500).json({ message: 'Sınav sonuçları alınamadı' });
    }
});

// 6. Get Privacy-Safe Leaderboard for an exam (Students & Teachers)
router.get('/:examId/leaderboard', verifyToken, async (req, res) => {
    try {
        const { examId } = req.params;
        const exam = await Exam.findById(examId)
            .populate('teacherId', 'username')
            .populate('classId', 'name grade section schoolName');
        if (!exam) {
            return res.status(404).json({ message: 'Sınav bulunamadı' });
        }

        // Authorization check
        let currentStudentId = null;
        if (req.user.role === 'student') {
            const student = await Student.findOne({ userId: req.user.id });
            if (!student || !student.classId || student.classId.toString() !== exam.classId._id.toString()) {
                return res.status(403).json({ message: 'Bu sınavın sıralamasına erişim yetkiniz yok.' });
            }
            currentStudentId = student._id.toString();
        } else if (req.user.role === 'teacher') {
            if (exam.teacherId._id.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Yetkisiz erişim' });
            }
        }

        // Fetch all results for this exam sorted by score descending
        const results = await ExamResult.find({ examId })
            .populate({
                path: 'studentId',
                select: 'firstName lastName studentNumber'
            })
            .sort({ score: -1, createdAt: 1 });

        const totalStudents = await Student.countDocuments({ classId: exam.classId._id, isFrozen: { $ne: true } });

        // Build strict privacy leaderboard: NO TC, NO PHONE, NO ADDRESS, NO GUARDIAN
        let currentRank = 1;
        const leaderboard = [];
        let totalScore = 0;
        let highestScore = results.length > 0 ? results[0].score : 0;
        let lowestScore = results.length > 0 ? results[results.length - 1].score : 0;

        results.forEach((r, idx) => {
            if (idx > 0 && r.score < results[idx - 1].score) {
                currentRank = idx + 1;
            }
            totalScore += r.score;

            const isCurrent = currentStudentId && r.studentId && r.studentId._id.toString() === currentStudentId;

            leaderboard.push({
                rank: currentRank,
                studentId: r.studentId?._id,
                studentName: r.studentId ? `${r.studentId.firstName} ${r.studentId.lastName}` : 'Öğrenci',
                score: r.score,
                isCurrentStudent: !!isCurrent
            });
        });

        const classAverage = results.length > 0 ? Math.round((totalScore / results.length) * 10) / 10 : 0;

        const podium = leaderboard.slice(0, 3);

        res.json({
            exam: {
                id: exam._id,
                name: exam.name,
                subject: exam.subject,
                topic: exam.topic,
                examType: exam.examType,
                maxScore: exam.maxScore,
                examDate: exam.examDate,
                teacherName: exam.teacherId?.username,
                className: exam.classId?.name,
                schoolName: exam.classId?.schoolName
            },
            stats: {
                classAverage,
                highestScore,
                lowestScore,
                totalGraded: results.length,
                totalStudents
            },
            podium,
            leaderboard
        });
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ message: 'Sıralama tablosu alınamadı' });
    }
});

// 7. Delete Exam (Teacher)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const exam = await Exam.findOne({
            _id: req.params.id,
            ...(req.user.role === 'admin' ? {} : { teacherId: req.user.id })
        });
        if (!exam) {
            return res.status(404).json({ message: 'Sınav bulunamadı veya yetkisiz' });
        }

        await ExamResult.deleteMany({ examId: exam._id });
        await Notification.deleteMany({ referenceId: exam._id, referenceType: 'exam' });
        await Exam.findByIdAndDelete(exam._id);

        res.json({ success: true, message: 'Sınav silindi' });
    } catch (err) {
        console.error('Error deleting exam:', err);
        res.status(500).json({ message: 'Sınav silinemedi' });
    }
});

module.exports = router;
