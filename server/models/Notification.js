const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['announcement', 'assignment', 'exam', 'meeting_request', 'meeting_reply', 'system', 'class_join_request'],
        required: true,
        index: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    referenceType: { type: String, default: null },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actionStatus: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', null],
        default: null
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Notification', notificationSchema);
