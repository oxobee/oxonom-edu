const mongoose = require('mongoose');

const guardianSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    relationship: {
        type: String,
        required: true,
        enum: ['Anne', 'Baba', 'Vasi', 'Büyükanne', 'Büyükbaba', 'Kardeş', 'Diğer'],
        trim: true
    },
    phonePrimary: {
        type: String,
        required: true,
        trim: true
    },
    phoneSecondary: {
        type: String,
        default: '',
        trim: true
    },
    orderIndex: {
        type: Number,
        default: 1,
        enum: [1, 2],
        index: true
    }
}, {
    timestamps: true,
    collection: 'student_guardians'
});

// Index to quickly fetch guardians for a student ordered by orderIndex
guardianSchema.index({ studentId: 1, orderIndex: 1 });

module.exports = mongoose.model('Guardian', guardianSchema);
