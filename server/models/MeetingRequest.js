const mongoose = require('mongoose');

const meetingRequestSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    studentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    urgency: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
        index: true
    },
    status: {
        type: String,
        enum: ['waiting_teacher', 'waiting_student', 'resolved', 'closed'],
        default: 'waiting_teacher',
        index: true
    },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    closeReason: { type: String, default: '', trim: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedByRole: { type: String, enum: ['teacher', 'student', 'admin', null], default: null }
});

meetingRequestSchema.index({ teacherId: 1, status: 1, urgency: 1, createdAt: -1 });

module.exports = mongoose.model('MeetingRequest', meetingRequestSchema);
