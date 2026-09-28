const mongoose = require('mongoose');

const attendanceRecordSubSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        default: 'present'
    },
    note: { type: String, default: '' }
}, { _id: false });

const attendanceSessionSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attendanceDate: { type: Date, required: true, index: true },
    records: [attendanceRecordSubSchema],
    createdAt: { type: Date, default: Date.now }
});

attendanceSessionSchema.index({ classId: 1, attendanceDate: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
