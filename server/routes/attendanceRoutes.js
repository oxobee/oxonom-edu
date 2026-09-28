const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../utils/verifyToken');
const AttendanceSession = require('../models/AttendanceSession');
const Class = require('../models/Class');
const Student = require('../models/Student');

// Helper to normalize date to start of day UTC
const normalizeDate = (d) => {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

// 1. Save or Update Attendance Session (Teacher)
router.post('/session', verifyToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { classId, attendanceDate, records } = req.body;

        if (!classId || !attendanceDate || !Array.isArray(records)) {
            return res.status(400).json({ message: 'Sınıf, tarih ve yoklama kayıtları zorunludur.' });
        }

        const classDoc = await Class.findOne({
            _id: classId,
            ...(req.user.role === 'admin' ? {} : { teacherId })
        });
        if (!classDoc) {
            return res.status(403).json({ message: 'Bu sınıf için yoklama alma yetkiniz yok.' });
        }

        const normDate = normalizeDate(attendanceDate);

        // Sanitize records
        const cleanRecords = records.map(r => ({
            studentId: r.studentId,
            status: ['present', 'absent', 'late', 'excused'].includes(r.status) ? r.status : 'present',
            note: (r.note || '').trim()
        }));

        const session = await AttendanceSession.findOneAndUpdate(
            { classId, attendanceDate: normDate },
            {
                $set: {
                    teacherId,
                    records: cleanRecords,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, session });
    } catch (err) {
        console.error('Error saving attendance session:', err);
        res.status(500).json({ message: 'Yoklama kaydedilemedi' });
    }
});

// 2. Get Attendance Session for a class and date (Teacher)
router.get('/session', verifyToken, async (req, res) => {
    try {
        const { classId, date } = req.query;
        if (!classId) {
            return res.status(400).json({ message: 'Sınıf seçilmelidir' });
        }

        const targetDate = normalizeDate(date || new Date());

        const session = await AttendanceSession.findOne({
            classId,
            attendanceDate: targetDate
        });

        // Get all active students of this class
        const students = await Student.find({ classId, isFrozen: { $ne: true } })
            .select('firstName lastName studentNumber')
            .sort({ firstName: 1, lastName: 1 });

        const recordMap = {};
        if (session && session.records) {
            session.records.forEach(r => {
                recordMap[r.studentId.toString()] = { status: r.status, note: r.note };
            });
        }

        // Return combined list, defaulting to 'present' if no record exists yet
        const combined = students.map(s => {
            const rec = recordMap[s._id.toString()];
            return {
                studentId: s._id,
                studentNumber: s.studentNumber,
                firstName: s.firstName,
                lastName: s.lastName,
                fullName: `${s.firstName} ${s.lastName}`,
                status: rec ? rec.status : 'present',
                note: rec ? rec.note : '',
                hasExistingRecord: !!rec
            };
        });

        res.json({
            date: targetDate,
            isExistingSession: !!session,
            students: combined
        });
    } catch (err) {
        console.error('Error fetching attendance session:', err);
        res.status(500).json({ message: 'Yoklama verisi alınamadı' });
    }
});

// 3. Get Student Attendance Stats (Student or Teacher)
router.get('/student/:studentId', verifyToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Öğrenci bulunamadı' });
        }

        // Authorization check: student can only view their own, teacher can view their students
        if (req.user.role === 'student' && student.userId?.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Yetkisiz erişim' });
        }

        // Fetch all attendance sessions containing this student
        const sessions = await AttendanceSession.find({
            classId: student.classId,
            'records.studentId': student._id
        }).sort({ attendanceDate: -1 });

        let present = 0;
        let absent = 0;
        let late = 0;
        let excused = 0;
        const history = [];

        sessions.forEach(sess => {
            const rec = sess.records.find(r => r.studentId.toString() === student._id.toString());
            if (rec) {
                if (rec.status === 'present') present++;
                else if (rec.status === 'absent') absent++;
                else if (rec.status === 'late') late++;
                else if (rec.status === 'excused') excused++;

                history.push({
                    date: sess.attendanceDate,
                    status: rec.status,
                    note: rec.note
                });
            }
        });

        const total = present + absent + late + excused;
        // Devam oranı: ((present + (late * 0.5) + excused) / total) * 100 or simply present / total
        const attendanceRate = total > 0 ? Math.round(((present + excused) / total) * 100) : 100;

        res.json({
            studentId: student._id,
            fullName: `${student.firstName} ${student.lastName}`,
            totalSessions: total,
            present,
            absent,
            late,
            excused,
            attendanceRate,
            history: history.slice(0, 30) // last 30 days
        });
    } catch (err) {
        console.error('Error fetching student attendance:', err);
        res.status(500).json({ message: 'Devamsızlık bilgisi alınamadı' });
    }
});

// 4. Get Class Attendance Summary (Teacher)
router.get('/class/:classId/summary', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const classDoc = await Class.findOne({
            _id: classId,
            ...(req.user.role === 'admin' ? {} : { teacherId: req.user.id })
        });
        if (!classDoc) {
            return res.status(403).json({ message: 'Yetkisiz erişim' });
        }

        const students = await Student.find({ classId, isFrozen: { $ne: true } })
            .select('firstName lastName studentNumber')
            .sort({ firstName: 1, lastName: 1 });

        const sessions = await AttendanceSession.find({ classId });

        const studentStats = {};
        students.forEach(s => {
            studentStats[s._id.toString()] = {
                studentId: s._id,
                fullName: `${s.firstName} ${s.lastName}`,
                studentNumber: s.studentNumber,
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                total: 0
            };
        });

        sessions.forEach(sess => {
            sess.records.forEach(r => {
                const sId = r.studentId.toString();
                if (studentStats[sId]) {
                    studentStats[sId].total++;
                    if (r.status === 'present') studentStats[sId].present++;
                    else if (r.status === 'absent') studentStats[sId].absent++;
                    else if (r.status === 'late') studentStats[sId].late++;
                    else if (r.status === 'excused') studentStats[sId].excused++;
                }
            });
        });

        const list = Object.values(studentStats).map(s => {
            const rate = s.total > 0 ? Math.round(((s.present + s.excused) / s.total) * 100) : 100;
            return {
                ...s,
                attendanceRate: rate
            };
        });

        // Sort by absences descending
        list.sort((a, b) => b.absent - a.absent);

        res.json({
            totalSessions: sessions.length,
            students: list
        });
    } catch (err) {
        console.error('Error fetching class attendance summary:', err);
        res.status(500).json({ message: 'Sınıf yoklama özeti alınamadı' });
    }
});

module.exports = router;
