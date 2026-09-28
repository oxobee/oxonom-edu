const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduboard';
const DEFAULT_PASSWORD = 'Ugur2803*';

const usersToSeed = [
    {
        username: 'ugur_admin',
        email: 'ugur@oxonom.com',
        role: 'admin',
        isVerified: true,
        verificationStatus: 'approved',
        isEmailVerified: true
    },
    {
        username: 'oxonom_ogretmen',
        email: 'ogretmen@oxonom.com',
        role: 'teacher',
        isVerified: true,
        verificationStatus: 'approved',
        isEmailVerified: true
    },
    {
        username: 'oxonom_ogrenci',
        email: 'ogrenci@oxonom.com',
        role: 'student',
        isVerified: true,
        verificationStatus: 'approved',
        isEmailVerified: true
    }
];

async function seedOxonomUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB:', MONGODB_URI);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

        for (const u of usersToSeed) {
            const existing = await User.findOne({ email: u.email });
            if (existing) {
                existing.username = u.username;
                existing.password = hashedPassword;
                existing.role = u.role;
                existing.isVerified = u.isVerified;
                existing.verificationStatus = u.verificationStatus;
                existing.isEmailVerified = u.isEmailVerified;
                await existing.save();
                console.log(`🔄 Güncellendi: ${u.email} (${u.role}) - Şifre: ${DEFAULT_PASSWORD}`);
            } else {
                const newUser = new User({
                    ...u,
                    password: hashedPassword
                });
                await newUser.save();
                console.log(`✨ Oluşturuldu: ${u.email} (${u.role}) - Şifre: ${DEFAULT_PASSWORD}`);
            }
        }

        // Link student profile for oxonom_ogrenci
        const ogrenciUser = await User.findOne({ email: 'ogrenci@oxonom.com' });
        const ogretmenUser = await User.findOne({ email: 'ogretmen@oxonom.com' });
        const Class = require('./models/Class');
        const Student = require('./models/Student');
        
        let teacherClass = null;
        if (ogretmenUser) {
            teacherClass = await Class.findOne({ teacherId: ogretmenUser._id });
        }
        if (!teacherClass) {
            teacherClass = await Class.findOne({ isActive: { $ne: false } });
        }

        if (ogrenciUser && teacherClass) {
            let sDoc = await Student.findOne({ userId: ogrenciUser._id });
            if (!sDoc) {
                sDoc = await Student.findOne({ email: ogrenciUser.email });
            }
            if (sDoc) {
                sDoc.userId = ogrenciUser._id;
                sDoc.classId = teacherClass._id;
                sDoc.teacherId = teacherClass.teacherId;
                sDoc.status = 'active';
                await sDoc.save();
                console.log(`🔗 Öğrenci profili bağlandı: ${ogrenciUser.username} -> Sınıf: ${teacherClass.name}`);
            } else {
                sDoc = new Student({
                    userId: ogrenciUser._id,
                    teacherId: teacherClass.teacherId,
                    classId: teacherClass._id,
                    firstName: 'Demir',
                    lastName: 'Yıldız',
                    studentNumber: '105',
                    birthDate: new Date('2014-03-21'),
                    email: ogrenciUser.email,
                    status: 'active'
                });
                await sDoc.save();
                console.log(`✨ Yeni öğrenci profili oluşturuldu: ${ogrenciUser.username} -> Sınıf: ${teacherClass.name}`);
            }
        }

        console.log('\n🎉 Tüm kullanıcılar ve profiller başarıyla hazırlandı!');
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Hata oluştu:', err);
        process.exit(1);
    }
}

seedOxonomUsers();
