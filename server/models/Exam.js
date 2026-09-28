const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, default: '', trim: true },
    examType: { 
        type: String, 
        enum: ['oral', 'midterm', 'final'], 
        default: 'midterm',
        index: true 
    },
    description: { type: String, default: '' },
    examDate: { type: Date, required: true, index: true },
    maxScore: { type: Number, default: 100 },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Exam', examSchema);
