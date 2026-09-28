const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../utils/verifyToken');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const AttendanceSession = require('../models/AttendanceSession');

// Helper to calculate averages safely
const safeAvg = (arr) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

// 1. Get Class Analytics Report (Teacher only)
router.get('/class/:classId', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const { examType, startDate, endDate } = req.query;

        const classDoc = await Class.findOne({
            _id: classId,
            ...(req.user.role === 'admin' ? {} : { teacherId: req.user.id })
        });
        if (!classDoc) {
            return res.status(403).json({ message: 'Bu sınıfın raporlarına erişim yetkiniz yok' });
        }

        // 1. Fetch Students
        const students = await Student.find({ classId, isFrozen: { $ne: true } })
            .select('firstName lastName studentNumber')
            .sort({ firstName: 1, lastName: 1 });

        const studentIds = students.map(s => s._id);

        // 2. Fetch Attendance Sessions (with optional date range)
        const attendanceQuery = { classId };
        if (startDate || endDate) {
            attendanceQuery.attendanceDate = {};
            if (startDate) attendanceQuery.attendanceDate.$gte = new Date(startDate);
            if (endDate) attendanceQuery.attendanceDate.$lte = new Date(endDate);
        }
        const attendanceSessions = await AttendanceSession.find(attendanceQuery).sort({ attendanceDate: 1 });

        // 3. Fetch Exams & Results
        const examQuery = { classId };
        if (examType && ['oral', 'midterm', 'final'].includes(examType)) {
            examQuery.examType = examType;
        }
        if (startDate || endDate) {
            examQuery.examDate = {};
            if (startDate) examQuery.examDate.$gte = new Date(startDate);
            if (endDate) examQuery.examDate.$lte = new Date(endDate);
        }
        const exams = await Exam.find(examQuery).sort({ examDate: 1 });
        const examIds = exams.map(e => e._id);

        const examResults = await ExamResult.find({ examId: { $in: examIds } });

        // 4. Compute Attendance Analytics
        const attendanceTrends = attendanceSessions.map(sess => {
            let p = 0, a = 0, l = 0, e = 0;
            sess.records.forEach(r => {
                if (r.status === 'present') p++;
                else if (r.status === 'absent') a++;
                else if (r.status === 'late') l++;
                else if (r.status === 'excused') e++;
            });
            const tot = p + a + l + e;
            const rate = tot > 0 ? Math.round(((p + e) / tot) * 100) : 100;
            return {
                date: sess.attendanceDate,
                formattedDate: new Date(sess.attendanceDate).toLocaleDateString('tr-TR'),
                present: p,
                absent: a,
                late: l,
                excused: e,
                total: tot,
                rate
            };
        });

        const studentAttendanceStats = {};
        students.forEach(s => {
            studentAttendanceStats[s._id.toString()] = {
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

        attendanceSessions.forEach(sess => {
            sess.records.forEach(r => {
                const sId = r.studentId.toString();
                if (studentAttendanceStats[sId]) {
                    studentAttendanceStats[sId].total++;
                    if (r.status === 'present') studentAttendanceStats[sId].present++;
                    else if (r.status === 'absent') studentAttendanceStats[sId].absent++;
                    else if (r.status === 'late') studentAttendanceStats[sId].late++;
                    else if (r.status === 'excused') studentAttendanceStats[sId].excused++;
                }
            });
        });

        // 5. Compute Exam Analytics
        const examMap = {};
        exams.forEach(e => {
            examMap[e._id.toString()] = e;
        });

        // Subject averages
        const subjectScores = {};
        // Type averages
        const typeScores = { oral: [], midterm: [], final: [] };
        // Student exam scores
        const studentExamScores = {};
        students.forEach(s => {
            studentExamScores[s._id.toString()] = {
                oral: [],
                midterm: [],
                final: [],
                all: []
            };
        });

        const allScoresList = [];
        examResults.forEach(r => {
            const ex = examMap[r.examId.toString()];
            if (!ex) return;

            const score = r.score;
            allScoresList.push(score);

            // Subject
            if (!subjectScores[ex.subject]) subjectScores[ex.subject] = [];
            subjectScores[ex.subject].push(score);

            // Type
            if (typeScores[ex.examType]) typeScores[ex.examType].push(score);

            // Student
            const sId = r.studentId.toString();
            if (studentExamScores[sId]) {
                if (studentExamScores[sId][ex.examType]) {
                    studentExamScores[sId][ex.examType].push(score);
                }
                studentExamScores[sId].all.push(score);
            }
        });

        const subjectAverages = Object.keys(subjectScores).map(subject => ({
            subject,
            average: safeAvg(subjectScores[subject]),
            count: subjectScores[subject].length
        }));

        const typeAverages = {
            oral: safeAvg(typeScores.oral),
            midterm: safeAvg(typeScores.midterm),
            final: safeAvg(typeScores.final)
        };

        // 6. Build Master Student Performance Table
        const studentPerformance = students.map(s => {
            const sId = s._id.toString();
            const att = studentAttendanceStats[sId] || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            const exScores = studentExamScores[sId] || { oral: [], midterm: [], final: [], all: [] };

            const attRate = att.total > 0 ? Math.round(((att.present + att.excused) / att.total) * 100) : 100;

            return {
                studentId: s._id,
                fullName: `${s.firstName} ${s.lastName}`,
                studentNumber: s.studentNumber,
                attendance: {
                    present: att.present,
                    absent: att.absent,
                    late: att.late,
                    excused: att.excused,
                    total: att.total,
                    rate: attRate
                },
                exams: {
                    oralAvg: safeAvg(exScores.oral),
                    midtermAvg: safeAvg(exScores.midterm),
                    finalAvg: safeAvg(exScores.final),
                    overallAvg: safeAvg(exScores.all),
                    totalExamsTaken: exScores.all.length
                }
            };
        });

        // Overall summary statistics
        const totalSessions = attendanceSessions.length;
        const totalPresent = Object.values(studentAttendanceStats).reduce((acc, c) => acc + c.present, 0);
        const totalRecords = Object.values(studentAttendanceStats).reduce((acc, c) => acc + c.total, 0);
        const overallAttendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 100;
        const overallExamAverage = safeAvg(allScoresList);

        // Absence ranking (top absentees first)
        const absenceRanking = [...studentPerformance].sort((a, b) => b.attendance.absent - a.attendance.absent);

        res.json({
            classInfo: {
                id: classDoc._id,
                name: classDoc.name,
                schoolName: classDoc.schoolName,
                grade: classDoc.grade,
                section: classDoc.section,
                academicYear: classDoc.academicYear
            },
            summary: {
                totalStudents: students.length,
                totalSessions,
                overallAttendanceRate,
                totalExams: exams.length,
                overallExamAverage,
                highestExamScore: allScoresList.length > 0 ? Math.max(...allScoresList) : 0,
                lowestExamScore: allScoresList.length > 0 ? Math.min(...allScoresList) : 0
            },
            attendanceTrends,
            absenceRanking,
            subjectAverages,
            typeAverages,
            studentPerformance
        });
    } catch (err) {
        console.error('Error generating class report:', err);
        res.status(500).json({ message: 'Rapor oluşturulamadı' });
    }
});

// 2. Get Student Detail Report Drilldown (Teacher)
router.get('/class/:classId/student/:studentId', verifyToken, async (req, res) => {
    try {
        const { classId, studentId } = req.params;
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Öğrenci bulunamadı' });
        }

        // Attendance records
        const attendanceSessions = await AttendanceSession.find({
            classId,
            'records.studentId': student._id
        }).sort({ attendanceDate: 1 });

        let present = 0, absent = 0, late = 0, excused = 0;
        const attendanceHistory = [];
        attendanceSessions.forEach(sess => {
            const r = sess.records.find(rec => rec.studentId.toString() === student._id.toString());
            if (r) {
                if (r.status === 'present') present++;
                else if (r.status === 'absent') absent++;
                else if (r.status === 'late') late++;
                else if (r.status === 'excused') excused++;

                attendanceHistory.push({
                    date: sess.attendanceDate,
                    status: r.status,
                    note: r.note
                });
            }
        });

        const totalAttendance = present + absent + late + excused;
        const attendanceRate = totalAttendance > 0 ? Math.round(((present + excused) / totalAttendance) * 100) : 100;

        // Exam records
        const exams = await Exam.find({ classId }).sort({ examDate: 1 });
        const examIds = exams.map(e => e._id);
        const results = await ExamResult.find({ examId: { $in: examIds }, studentId: student._id });

        const resultMap = {};
        results.forEach(r => {
            resultMap[r.examId.toString()] = r;
        });

        const examHistory = [];
        const oralScores = [];
        const midtermScores = [];
        const finalScores = [];
        const allScores = [];

        exams.forEach(e => {
            const r = resultMap[e._id.toString()];
            if (r) {
                examHistory.push({
                    examId: e._id,
                    name: e.name,
                    subject: e.subject,
                    examType: e.examType,
                    date: e.examDate,
                    score: r.score,
                    maxScore: e.maxScore,
                    teacherNote: r.teacherNote
                });

                allScores.push(r.score);
                if (e.examType === 'oral') oralScores.push(r.score);
                else if (e.examType === 'midterm') midtermScores.push(r.score);
                else if (e.examType === 'final') finalScores.push(r.score);
            }
        });

        res.json({
            student: {
                id: student._id,
                fullName: `${student.firstName} ${student.lastName}`,
                studentNumber: student.studentNumber
            },
            attendance: {
                total: totalAttendance,
                present,
                absent,
                late,
                excused,
                attendanceRate,
                history: attendanceHistory
            },
            exams: {
                oralAvg: safeAvg(oralScores),
                midtermAvg: safeAvg(midtermScores),
                finalAvg: safeAvg(finalScores),
                overallAvg: safeAvg(allScores),
                history: examHistory
            }
        });
    } catch (err) {
        console.error('Error fetching student detail report:', err);
        res.status(500).json({ message: 'Öğrenci detay raporu alınamadı' });
    }
});

module.exports = router;
