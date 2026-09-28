const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    priority: { 
        type: String, 
        enum: ['normal', 'important', 'urgent'], 
        default: 'normal',
        index: true
    },
    targetType: { 
        type: String, 
        enum: ['class', 'students'], 
        default: 'class' 
    },
    targetStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Announcement', announcementSchema);
