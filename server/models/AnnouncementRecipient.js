const mongoose = require('mongoose');

const announcementRecipientSchema = new mongoose.Schema({
    announcementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null }
});

announcementRecipientSchema.index({ announcementId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AnnouncementRecipient', announcementRecipientSchema);
