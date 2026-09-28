const mongoose = require('mongoose');

const generatePairingCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ED';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

const studentSchema = new mongoose.Schema({
    // Bağlı Auth Kullanıcı Hesabı (Öğrenci kendi hesabını oluşturduğunda bağlanır)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Öğretmen Referansı (Öğretmen oluşturduğunda veya sınıfa bağlandığında atanır)
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null,
        index: true 
    },
    // Sınıf Referansı (Öğrenci bir sınıfa atandığında)
    classId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Class', 
        default: null,
        index: true 
    },
    // Onay bekleyen sınıf referansı (Eşleşme isteği onay beklerken)
    pendingClassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        default: null,
        index: true
    },
    // Öğrenci Durumu: active (aktif), frozen (donduruldu), unassigned (sınıfsız/eşleşmemiş)
    status: {
        type: String,
        enum: ['active', 'frozen', 'unassigned', 'pending'],
        default: 'active',
        index: true
    },
    // Kayıt dondurulma gerekçesi (status === 'frozen' ise zorunlu açıklama)
    freezeReason: {
        type: String,
        default: '',
        trim: true
    },
    // Öğrenciye özel benzersiz 6 haneli eşleştirme / davet kodu (örn. ED8492)
    pairingCode: {
        type: String,
        uppercase: true,
        trim: true,
        index: true,
        default: generatePairingCode
    },
    // Öğretmen tarafından belirlenen başlangıç giriş şifresi (Giriş bilgileri görüntüleme için)
    initialPassword: {
        type: String,
        default: '',
        trim: true
    },

    // Öğrenci Kişisel Bilgileri
    firstName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    lastName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    studentNumber: { 
        type: String, 
        required: true, 
        trim: true 
    }, // Sınıf / Okul Öğrenci Numarası

    // T.C. Kimlik Numarası Güvenli Saklama Alanları
    nationalIdEncrypted: {
        type: String,
        default: '',
        select: false // Normal sorgularda çekilmez
    },
    nationalIdIv: {
        type: String,
        default: '',
        select: false
    },
    nationalIdTag: {
        type: String,
        default: '',
        select: false
    },
    nationalIdMasked: {
        type: String,
        default: '',
        trim: true
    }, // Yalnızca yetkili görünüm için maskeli (örn: *********42)
    nationalIdHash: {
        type: String,
        default: '',
        select: false // Tek yönlü hash, duplicate kontrolü için
    },

    birthDate: { 
        type: Date,
        required: true
    },
    gender: { 
        type: String, 
        enum: ['Kız', 'Erkek', 'Diğer', 'female', 'male', 'other', 'unspecified', ''], 
        default: 'unspecified' 
    },
    address: {
        type: String,
        default: '',
        trim: true
    }, // İkamet / Adres Bilgisi

    phone: {
        type: String,
        default: '',
        trim: true
    },
    email: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
        index: true
    },
    schoolNumber: {
        type: String,
        default: '',
        trim: true
    },
    schoolName: {
        type: String,
        default: '',
        trim: true
    },
    grade: {
        type: String,
        default: '',
        trim: true
    },
    section: {
        type: String,
        default: '',
        trim: true
    },
    notes: { 
        type: String, 
        default: '', 
        trim: true 
    }, // Öğretmen özel notları (öğrenci göremez)

    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.nationalIdEncrypted;
            delete ret.nationalIdIv;
            delete ret.nationalIdTag;
            delete ret.nationalIdHash;
            return ret;
        }
    },
    toObject: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.nationalIdEncrypted;
            delete ret.nationalIdIv;
            delete ret.nationalIdTag;
            delete ret.nationalIdHash;
            return ret;
        }
    }
});

// Virtual populate for Guardians
studentSchema.virtual('guardians', {
    ref: 'Guardian',
    localField: '_id',
    foreignField: 'studentId',
    options: { sort: { orderIndex: 1 } }
});

// Legacy backward-compatibility virtuals
studentSchema.virtual('parentName').get(function() {
    if (this.guardians && this.guardians.length > 0) return this.guardians[0].fullName;
    return this._parentName || '';
}).set(function(v) {
    this._parentName = v;
});

studentSchema.virtual('parentPhone').get(function() {
    if (this.guardians && this.guardians.length > 0) return this.guardians[0].phonePrimary;
    return this._parentPhone || '';
}).set(function(v) {
    this._parentPhone = v;
});

studentSchema.virtual('parentRelationship').get(function() {
    if (this.guardians && this.guardians.length > 0) return this.guardians[0].relationship;
    return this._parentRelationship || 'Anne';
}).set(function(v) {
    this._parentRelationship = v;
});

// Pre-save to guarantee pairingCode
studentSchema.pre('save', function(next) {
    if (!this.pairingCode) {
        this.pairingCode = generatePairingCode();
    }
    if (typeof next === 'function') {
        next();
    }
});

// Indexes
studentSchema.index({ classId: 1, lastName: 1, firstName: 1 });
studentSchema.index({ teacherId: 1, createdAt: -1 });

// Unique student number per class (only for active students with a valid classId)
studentSchema.index(
    { classId: 1, studentNumber: 1 },
    { 
        unique: true, 
        partialFilterExpression: { 
            classId: { $type: 'objectId' }, 
            status: 'active', 
            studentNumber: { $type: 'string', $gt: '' } 
        } 
    }
);

// National ID hash index for fast collision checking
studentSchema.index({ nationalIdHash: 1 }, { sparse: true });

// Unique index only when userId is an ObjectId (allows multiple students with no user account)
studentSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } });

module.exports = mongoose.model('Student', studentSchema);
