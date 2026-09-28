const mongoose = require('mongoose');

const generateMatchingCode = (grade, section) => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const cleanGrade = String(grade || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || '1';
    const cleanSection = String(section || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'A';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `EDU-${cleanGrade}${cleanSection}-${randomPart}`;
};

const classSchema = new mongoose.Schema({
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    // Sınıf Öğretmeni Adı (Hızlı ve readonly gösterim için)
    teacherName: {
        type: String,
        default: '',
        trim: true
    },
    // Okul Adı (Zorunlu)
    schoolName: {
        type: String,
        required: true,
        trim: true
    },
    grade: { 
        type: String, 
        required: true, 
        trim: true 
    }, // ör. "2", "3", "5" vb.
    section: { 
        type: String, 
        required: true, 
        trim: true 
    }, // ör. "C", "A", "B"
    academicYear: { 
        type: String, 
        default: '2024-2025', 
        trim: true 
    }, // ör. "2024-2025"
    name: { 
        type: String, 
        required: true, 
        trim: true 
    }, // ör. "2-C" veya "2/C"
    description: { 
        type: String, 
        default: "", 
        trim: true 
    },
    color: { 
        type: String, 
        default: "#6366f1" 
    },
    // Sınıf Eşleşme Kodu (Benzersiz, büyük harf, tahmin edilmesi zor, ör. EDU-2C-X8K4)
    matchingCode: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    // Sınıf aktif mi? (Öğrenci kaydına açık mı?)
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    // Bu sınıfta etkinleştirilmiş modül anahtarları (örn: ['1-dk-okuma'])
    enabledModules: [{
        type: String,
        trim: true
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

// Pre-save to auto-generate unique matchingCode if not present
classSchema.pre('save', function(next) {
    if (!this.matchingCode) {
        this.matchingCode = generateMatchingCode(this.grade, this.section);
    }
    if (typeof next === 'function') next();
});

// Indexes to quickly fetch classes
classSchema.index({ teacherId: 1, createdAt: -1 });
classSchema.index({ matchingCode: 1, isActive: 1 });

classSchema.statics.generateMatchingCode = generateMatchingCode;

module.exports = mongoose.model('Class', classSchema);
