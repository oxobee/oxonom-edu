const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    score: { type: Number, required: true },
    teacherNote: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examResultSchema.index({ examId: 1, score: -1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
