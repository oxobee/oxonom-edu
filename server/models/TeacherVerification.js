const mongoose = require('mongoose');

const TeacherVerificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    documents: [{
        type: {
            type: String,
            default: 'degree'
        },
        title: {
            type: String
        },
        fileName: {
            type: String
        },
        fileSize: {
            type: Number
        },
        fileType: {
            type: String
        },
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            default: ''
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNotes: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('TeacherVerification', TeacherVerificationSchema);
