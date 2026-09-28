const mongoose = require('mongoose');

const meetingMessageSchema = new mongoose.Schema({
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingRequest', required: true, index: true },
    senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['student', 'teacher'], required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('MeetingMessage', meetingMessageSchema);
