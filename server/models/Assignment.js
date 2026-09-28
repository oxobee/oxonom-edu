const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true }, // e.g. Matematik, Türkçe
    topic: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    assignmentType: { 
        type: String, 
        enum: ['class', 'individual'], 
        default: 'class',
        index: true
    },
    targetStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    assignedAt: { type: Date, default: Date.now },
    dueAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    attachments: [{
        fileUrl: { type: String, required: true },
        fileType: { type: String, default: 'image' },
        fileName: { type: String, default: 'attachment' }
    }],
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Assignment', assignmentSchema);
