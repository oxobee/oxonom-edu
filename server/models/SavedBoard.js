const mongoose = require('mongoose');

const savedBoardSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    boardName: { type: String, required: true },
    roomId: { type: String, required: true },
    teacherName: { type: String },
    elements: { type: Array, default: [] }, // Snapshot of board at time of saving
    savedAt: { type: Date, default: Date.now },
    color: { type: String, default: '#6366f1' },
    order: { type: Number, default: 0 }
});

// Index to quickly find saved boards for a user
savedBoardSchema.index({ userId: 1, savedAt: -1 });

module.exports = mongoose.model('SavedBoard', savedBoardSchema);
