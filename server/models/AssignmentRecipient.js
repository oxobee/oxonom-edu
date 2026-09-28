const mongoose = require('mongoose');

const assignmentRecipientSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: { type: String, enum: ['pending', 'completed', 'partial', 'incomplete'], default: 'pending', index: true },
    viewedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
});

assignmentRecipientSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentRecipient', assignmentRecipientSchema);
