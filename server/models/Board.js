const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    elements: { type: Array, default: [] },
    allowedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    allowStudentEditing: { type: Boolean, default: false }, // FIX #95: persist toggle state to DB
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['teacher', 'student'] },
        joinedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    color: { type: String, default: '#6366f1' },
    order: { type: Number, default: 0 },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
    isPasswordProtected: { type: Boolean, default: false },
    passwordHash: { type: String, default: null },
    boardDate: { type: Date, default: Date.now },
    groupTitle: { type: String, default: '', trim: true }
});

module.exports = mongoose.model('Board', boardSchema);
