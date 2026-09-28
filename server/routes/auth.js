const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Guardian = require('../models/Guardian');
const { validateTCKN, encryptTC, maskTC, hashTC } = require('../utils/tckn');
const { sendPasswordResetEmail, sendRegistrationVerificationEmail } = require('../services/emailService');
const { JWT_SECRET } = require('../config/jwt');
const {
  registerValidation,
  validate,
} = require("../middlewares/auth.validator");
const { authLimiter, otpLimiter, globalAuthLimiter } = require('../middlewares/rateLimiter');

router.use(globalAuthLimiter);

const normalizeTr = (str) => (str || '').toLocaleLowerCase('tr-TR').trim();

/**
 * Öğrenci kayıt olduğunda mevcut student_profile ile akıllı eşleştirme yapar.
 * Duplicate profil oluşmasını kesin olarak engeller.
 */
async function matchOrCreateStudentProfile(userId, studentData) {
    const {
        firstName,
        lastName,
        studentNumber,
        schoolNumber,
        schoolName,
        grade,
        section,
        gender,
        birthDate,
        phone,
        email,
        pairingCode
    } = studentData;

    const trimmedFirst = (firstName || '').trim();
    const trimmedLast = (lastName || '').trim();
    const trimmedNumber = (studentNumber || '').trim();
    const trimmedSchoolNo = (schoolNumber || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedCode = (pairingCode || '').trim().toUpperCase();

    let matchedStudent = null;

    // 1. ÖNCELİK 1: Davet / Eşleştirme Kodu ile eşleştirme
    if (trimmedCode) {
        matchedStudent = await Student.findOne({
            pairingCode: trimmedCode,
            userId: null
        });
        if (matchedStudent && trimmedLast) {
            const candidateLast = normalizeTr(matchedStudent.lastName);
            const inputLast = normalizeTr(trimmedLast);
            if (candidateLast && inputLast && candidateLast !== inputLast) {
                matchedStudent = null;
            }
        }
    }

    // 2. ÖNCELİK 2: Öğrenci No / Okul No veya E-posta eşleşmesi + Ad/Soyad doğrulaması
    if (!matchedStudent && (trimmedNumber || trimmedSchoolNo || trimmedEmail)) {
        const orConditions = [];
        if (trimmedNumber) {
            orConditions.push({ studentNumber: trimmedNumber });
            orConditions.push({ schoolNumber: trimmedNumber });
        }
        if (trimmedSchoolNo) {
            orConditions.push({ schoolNumber: trimmedSchoolNo });
            orConditions.push({ studentNumber: trimmedSchoolNo });
        }
        if (trimmedEmail) {
            orConditions.push({ email: trimmedEmail });
        }

        const candidates = await Student.find({
            userId: null,
            $or: orConditions
        });

        // GÜVENLİK KURALI: SADECE ad+soyad ile ASLA eşleştirme yapılmaz!
        for (const candidate of candidates) {
            const candidateFirst = normalizeTr(candidate.firstName);
            const candidateLast = normalizeTr(candidate.lastName);
            const inputFirst = normalizeTr(trimmedFirst);
            const inputLast = normalizeTr(trimmedLast);

            const isNameConsistent = (
                (candidateLast === inputLast && (candidateFirst === inputFirst || candidateFirst.includes(inputFirst) || inputFirst.includes(candidateFirst))) ||
                (candidateFirst === inputFirst && candidateLast === inputLast)
            );

            if (isNameConsistent) {
                matchedStudent = candidate;
                break;
            }
        }
    }

    // 3. Eşleşme veya Yeni Profil
    if (matchedStudent) {
        // MEVCUT PROFILE BAĞLA (DUPLICATE YOK!)
        matchedStudent.userId = userId;
        if (matchedStudent.status !== 'frozen') {
            matchedStudent.status = 'active';
        }
        if (!matchedStudent.schoolNumber && trimmedSchoolNo) matchedStudent.schoolNumber = trimmedSchoolNo;
        if (!matchedStudent.schoolName && schoolName) matchedStudent.schoolName = schoolName.trim();
        if (!matchedStudent.grade && grade) matchedStudent.grade = String(grade).trim();
        if (!matchedStudent.section && section) matchedStudent.section = String(section).trim();
        if (!matchedStudent.gender && gender) matchedStudent.gender = gender;
        if (!matchedStudent.birthDate && birthDate) {
            const d = new Date(birthDate);
            if (!isNaN(d.getTime())) matchedStudent.birthDate = d;
        }
        if (!matchedStudent.phone && phone) matchedStudent.phone = phone.trim();
        if (!matchedStudent.email && trimmedEmail) matchedStudent.email = trimmedEmail;

        await matchedStudent.save();
        return { student: matchedStudent, matched: true };
    } else {
        // Eşleşme yok: Unassigned olarak oluştur
        let parsedBirthDate = undefined;
        if (birthDate) {
            const d = new Date(birthDate);
            if (!isNaN(d.getTime())) parsedBirthDate = d;
        }

        const newStudent = new Student({
            userId,
            teacherId: null,
            classId: null,
            status: 'unassigned',
            firstName: trimmedFirst || 'Öğrenci',
            lastName: trimmedLast || '',
            studentNumber: trimmedNumber,
            schoolNumber: trimmedSchoolNo,
            schoolName: schoolName ? schoolName.trim() : '',
            grade: grade ? String(grade).trim() : '',
            section: section ? String(section).trim() : '',
            gender: gender || '',
            birthDate: parsedBirthDate,
            phone: phone ? phone.trim() : '',
            email: trimmedEmail
        });
        await newStudent.save();
        return { student: newStudent, matched: false };
    }
}

// REGISTER
router.post('/register', authLimiter, registerValidation, validate, async (req, res) => { // ← NEW
    try {
        const { username, email, password, role } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                message: 'Username, email, and password are required',
                error: 'MISSING_FIELDS'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters long',
                error: 'PASSWORD_TOO_SHORT'
            });
        }

        // Check if user exists (case-insensitive)
        const existingUser = await User.findOne({
            $or: [
                { email: { $regex: new RegExp(`^${email}$`, 'i') } },
                { username: { $regex: new RegExp(`^${username}$`, 'i') } }
            ]
        });

        if (existingUser) {
            // If the user exists but their email is not verified, delete them so they can register again
            if (!existingUser.isEmailVerified) {
                const TeacherVerification = require('../models/TeacherVerification');
                await TeacherVerification.deleteMany({ userId: existingUser._id });
                await User.deleteOne({ _id: existingUser._id });
            } else {
                // Determine which field is duplicate
                const isDuplicateEmail = existingUser.email.toLowerCase() === email.toLowerCase();
                const isDuplicateUsername = existingUser.username.toLowerCase() === username.toLowerCase();

                let message = 'User already exists';
                if (isDuplicateEmail && isDuplicateUsername) {
                    message = 'A user with that email and username already exists';
                } else if (isDuplicateEmail) {
                    message = 'A user with that email already exists';
                } else if (isDuplicateUsername) {
                    message = 'A user with that username already exists';
                }
                return res.status(400).json({
                    message,
                    error: 'USER_EXISTS'
                });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const userRole = role || 'student';

        // Only teachers need verification, admins and students are auto-verified
        const needsVerification = userRole === 'teacher';

        // Generate 6-digit verification OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpSalt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, otpSalt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: userRole,
            firstName: req.body.firstName || '',
            lastName: req.body.lastName || '',
            phone: req.body.phone || '',
            nationalId: req.body.nationalId || '',
            birthDate: req.body.birthDate || '',
            startDate: req.body.startDate || '',
            address: req.body.address || '',
            isVerified: !needsVerification, // true for admin/student, false for teacher
            verificationStatus: needsVerification ? 'pending' : 'approved',
            isEmailVerified: false,
            emailVerificationOTP: hashedOtp,
            emailVerificationExpire: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

        const savedUser = await newUser.save();

        let studentProfileResult = null;
        if (userRole === 'student') {
            try {
                studentProfileResult = await matchOrCreateStudentProfile(savedUser._id, req.body);
            } catch (studentErr) {
                console.error('Failed to match/create student profile during registration:', studentErr);
            }
        }

        // Send verification email
        const emailResult = await sendRegistrationVerificationEmail(savedUser.email, savedUser.username, otp);
        if (!emailResult.success) {
            // Cleanup user if email failed on registration
            await User.findByIdAndDelete(savedUser._id);
            if (studentProfileResult?.student && !studentProfileResult?.matched) {
                await Student.findByIdAndDelete(studentProfileResult.student._id);
            } else if (studentProfileResult?.student && studentProfileResult?.matched) {
                await Student.findByIdAndUpdate(studentProfileResult.student._id, { $set: { userId: null } });
            }
            return res.status(500).json({
                message: 'Failed to send verification email. Please check your email and try again.',
                error: 'EMAIL_SEND_FAILED'
            });
        }

        // Create temporary token for document upload / session tracking
        const token = jwt.sign({ id: savedUser._id, role: savedUser.role }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            token,
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
                role: savedUser.role,
                isVerified: savedUser.isVerified,
                verificationStatus: savedUser.verificationStatus,
                isEmailVerified: savedUser.isEmailVerified
            },
            studentProfile: studentProfileResult ? {
                matched: studentProfileResult.matched,
                classId: studentProfileResult.student.classId,
                status: studentProfileResult.student.status,
                pairingCode: studentProfileResult.student.pairingCode
            } : null,
            message: 'Registration successful! A verification code has been sent to your email.'
        });
    } catch (err) {
        console.error('Registration error:', err);

        // Handle MongoDB duplicate key error (code 11000)
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(400).json({
                message: `A user with that ${field} already exists`,
                error: 'DUPLICATE_KEY',
                field: field
            });
        }

        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: Object.values(err.errors).map(e => e.message)
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

function transliterateTurkish(str) {
    if (!str) return '';
    const map = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ı': 'i', 'I': 'i', 'İ': 'i', 'i': 'i',
        'ö': 'o', 'Ö': 'o',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u'
    };
    return str
        .split('')
        .map(char => map[char] !== undefined ? map[char] : char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

async function generateUniqueUsername(firstName) {
    let base = transliterateTurkish(firstName);
    if (!base) base = 'ogrenci';

    const existing = await User.findOne({ username: base });
    if (!existing) {
        return base;
    }

    let counter = 1;
    while (true) {
        const candidate = `${base}${String(counter).padStart(3, '0')}`;
        const found = await User.findOne({ username: candidate });
        if (!found) {
            return candidate;
        }
        counter++;
    }
}

// Suggest unique username based on first name (with Turkish character cleaning)
router.get('/suggest-username', async (req, res) => {
    try {
        const firstName = String(req.query.firstName || '').trim();
        if (!firstName) {
            return res.status(400).json({ message: 'İsim parametresi gereklidir.' });
        }
        const suggested = await generateUniqueUsername(firstName);
        res.json({ username: suggested });
    } catch (err) {
        console.error('Suggest username error:', err);
        res.status(500).json({ message: 'Kullanıcı adı üretilemedi.' });
    }
});

// Check if username is already taken
router.get('/check-username', async (req, res) => {
    try {
        const rawUsername = String(req.query.username || '').trim();
        const username = transliterateTurkish(rawUsername);
        if (!username) {
            return res.json({ available: false, message: 'Geçersiz kullanıcı adı.' });
        }
        const user = await User.findOne({ username });
        if (user) {
            return res.json({ available: false, message: 'Bu kullanıcı adı zaten kullanılıyor. Lütfen başka bir kullanıcı adı seçin.' });
        }
        return res.json({ available: true, message: 'Kullanıcı adı müsait.' });
    } catch (err) {
        console.error('Check username error:', err);
        res.status(500).json({ message: 'Kontrol yapılırken hata oluştu.' });
    }
});

// Mask name helper for privacy: First 2 letters of first name, rest stars; first 2 letters of last name, rest stars
const maskWord = (word) => {
    if (!word) return '';
    const trimmed = word.trim();
    if (trimmed.length <= 2) return trimmed;
    return trimmed.slice(0, 2) + '*'.repeat(trimmed.length - 2);
};

const maskStudentFullName = (firstName, lastName) => {
    const fParts = (firstName || '').trim().split(/\s+/).filter(Boolean).map(maskWord).join(' ');
    const lParts = (lastName || '').trim().split(/\s+/).filter(Boolean).map(maskWord).join(' ');
    return `${fParts} ${lParts}`.trim();
};

// LOOKUP ASSOCIATED STUDENTS BY EMAIL OR GUARDIAN PHONE
router.get('/lookup-associated-students', async (req, res) => {
    try {
        const { email, phone } = req.query;
        const cleanEmail = String(email || '').trim().toLowerCase();
        const rawPhone = String(phone || '').trim();
        const cleanDigits = rawPhone.replace(/\D/g, '');

        if (!cleanEmail && cleanDigits.length < 7) {
            return res.json({ count: 0, students: [] });
        }

        const studentIds = new Set();
        const studentDocs = [];

        // 1. Search by Phone (in Guardians collection, Student.phone, and Student parent fields)
        if (cleanDigits.length >= 7) {
            const last10 = cleanDigits.slice(-10);
            const phoneRegex = new RegExp(last10);

            // Check Guardians collection
            const matchingGuardians = await Guardian.find({
                $or: [
                    { phonePrimary: { $regex: phoneRegex } },
                    { phoneSecondary: { $regex: phoneRegex } }
                ]
            }).select('studentId');

            matchingGuardians.forEach(g => {
                if (g.studentId) studentIds.add(g.studentId.toString());
            });

            // Check Student phone fields
            const matchingByPhone = await Student.find({
                $or: [
                    { phone: { $regex: phoneRegex } },
                    { 'parent1.phone': { $regex: phoneRegex } },
                    { 'parent2.phone': { $regex: phoneRegex } }
                ],
                status: { $ne: 'deleted' }
            }).select('_id firstName lastName classId').populate('classId', 'name grade section');

            matchingByPhone.forEach(s => {
                const sId = s._id.toString();
                if (!studentIds.has(sId)) {
                    studentIds.add(sId);
                    studentDocs.push(s);
                }
            });
        }

        // 2. Search by Email (in Student.email, User.email via userId, Student.parent1.email/parent2.email)
        if (cleanEmail && cleanEmail.includes('@')) {
            const escapedEmail = cleanEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const emailRegex = new RegExp(`^${escapedEmail}$`, 'i');

            // Find Users with this email
            const usersWithEmail = await User.find({ email: emailRegex }).select('_id');
            const userIds = usersWithEmail.map(u => u._id);

            const matchingByEmail = await Student.find({
                $or: [
                    { email: emailRegex },
                    { userId: { $in: userIds } },
                    { 'parent1.email': emailRegex },
                    { 'parent2.email': emailRegex }
                ],
                status: { $ne: 'deleted' }
            }).select('_id firstName lastName classId').populate('classId', 'name grade section');

            matchingByEmail.forEach(s => {
                const sId = s._id.toString();
                if (!studentIds.has(sId)) {
                    studentIds.add(sId);
                    studentDocs.push(s);
                }
            });
        }

        // If we found studentIds from Guardians that aren't yet in studentDocs, fetch them
        const remainingIds = [...studentIds].filter(id => !studentDocs.some(s => s._id.toString() === id));
        if (remainingIds.length > 0) {
            const extraDocs = await Student.find({
                _id: { $in: remainingIds },
                status: { $ne: 'deleted' }
            }).select('_id firstName lastName classId').populate('classId', 'name grade section');
            studentDocs.push(...extraDocs);
        }

        const results = studentDocs.map(s => {
            const masked = maskStudentFullName(s.firstName, s.lastName);
            const className = s.classId ? (s.classId.name || `${s.classId.grade || ''}-${s.classId.section || ''}`) : '';
            return {
                _id: s._id,
                maskedName: masked,
                className
            };
        });

        const queryType = cleanEmail ? 'e-posta adresine' : 'numaraya';
        const msg = results.length > 0
            ? `Bu ${queryType} tanımlı ${results.length} adet öğrenci bulundu`
            : '';

        return res.json({
            count: results.length,
            message: msg,
            queryType: cleanEmail ? 'email' : 'phone',
            students: results
        });
    } catch (err) {
        console.error('Lookup associated students error:', err);
        res.status(500).json({ count: 0, students: [], message: 'Öğrenci kontrolü sırasında hata oluştu' });
    }
});

// STUDENT 5-STEP REGISTRATION WITH CLASS MATCHING CODE
router.post('/register-student', authLimiter, async (req, res) => {
    try {
        const {
            matchingCode,
            nationalId,
            firstName,
            lastName,
            studentNumber,
            birthDate,
            gender,
            address,
            guardians,
            email,
            password
        } = req.body;

        // 1. Validate Sınıf Kodu (matchingCode)
        const cleanCode = String(matchingCode || '').trim().toUpperCase();
        if (!cleanCode) {
            return res.status(400).json({ message: 'Sınıf eşleşme kodu zorunludur.' });
        }

        const targetClass = await Class.findOne({
            matchingCode: cleanCode,
            isActive: { $ne: false }
        });

        if (!targetClass) {
            return res.status(400).json({ message: 'Bu eşleşme koduna ait aktif bir sınıf bulunamadı.' });
        }

        // 2. Validate TC Kimlik Numarası
        const cleanNationalId = String(nationalId || '').trim();
        if (!validateTCKN(cleanNationalId)) {
            return res.status(400).json({ message: 'Geçersiz T.C. Kimlik Numarası. Lütfen 11 haneli geçerli kimlik numaranızı giriniz.' });
        }

        const tcHash = hashTC(cleanNationalId);
        const duplicateTC = await Student.findOne({ nationalIdHash: tcHash, status: 'active' });
        if (duplicateTC) {
            return res.status(400).json({ message: 'Girilen bilgilerle mevcut bir öğrenci kaydı bulundu. Lütfen öğretmeninizle iletişime geçin.' });
        }

        // 3. Validate Student Personal Details
        const cleanFirst = String(firstName || '').trim();
        const cleanLast = String(lastName || '').trim();
        const cleanNumber = String(studentNumber || '').trim();
        const cleanAddress = String(address || '').trim();

        if (!cleanFirst || !cleanLast) {
            return res.status(400).json({ message: 'Ad ve Soyad alanları zorunludur.' });
        }
        if (!cleanNumber) {
            return res.status(400).json({ message: 'Öğrenci numarası zorunludur.' });
        }
        if (!birthDate) {
            return res.status(400).json({ message: 'Doğum tarihi zorunludur.' });
        }
        if (!cleanAddress) {
            return res.status(400).json({ message: 'Adres alanı zorunludur.' });
        }

        // Check duplicate studentNumber in this class
        const existingInClass = await Student.findOne({
            classId: targetClass._id,
            studentNumber: cleanNumber,
            status: 'active'
        });

        if (existingInClass && existingInClass.userId) {
            return res.status(400).json({ message: 'Bu sınıfta aynı öğrenci numarasına sahip kayıtlı bir öğrenci bulunmaktadır.' });
        }

        // 4. Validate Guardians
        const gList = Array.isArray(guardians) ? guardians : [];
        if (gList.length < 1 || !gList[0]?.fullName?.trim() || !gList[0]?.relationship?.trim() || !gList[0]?.phonePrimary?.trim()) {
            return res.status(400).json({ message: 'En az 1 veli bilgisi (Ad Soyad, Yakınlık Derecesi ve İletişim Numarası 1) zorunludur.' });
        }

        if (gList.length > 2) {
            return res.status(400).json({ message: 'En fazla 2 veli eklenebilir.' });
        }

        // If Guardian 2 provided
        if (gList[1] && (gList[1].fullName || gList[1].phonePrimary || gList[1].relationship)) {
            if (!gList[1].fullName?.trim() || !gList[1].relationship?.trim() || !gList[1].phonePrimary?.trim()) {
                return res.status(400).json({ message: 'İkinci veli için Ad Soyad, Yakınlık Derecesi ve İletişim Numarası 1 zorunludur.' });
            }
        }

        // 5. Validate Account (Email & Password)
        const cleanEmail = String(email || '').toLowerCase().trim();
        if (!cleanEmail) {
            return res.status(400).json({ message: 'E-posta adresi zorunludur.' });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Şifre en az 8 karakter uzunluğunda olmalıdır.' });
        }

        // Note: Multiple student accounts (e.g. siblings) can share the same parent email.
        // We only prevent using a teacher or admin staff email as a student login.
        const existingStaff = await User.findOne({
            email: cleanEmail,
            role: { $in: ['teacher', 'admin'] }
        });
        if (existingStaff) {
            return res.status(400).json({ message: 'Bu e-posta adresi bir öğretmen veya yönetici hesabına aittir. Lütfen veli veya öğrenci e-posta adresinizi giriniz.' });
        }

        let username = (req.body.username || '').trim();
        if (username) {
            username = transliterateTurkish(username);
            const exists = await User.findOne({ username });
            if (exists) {
                return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor. Lütfen başka bir kullanıcı adı seçin.' });
            }
        } else {
            username = await generateUniqueUsername(cleanFirst);
        }

        const uniqueUsername = username;

        // 6. Create User
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username: uniqueUsername,
            email: cleanEmail,
            password: hashedPassword,
            role: 'student',
            isVerified: true,
            isEmailVerified: true,
            verificationStatus: 'approved'
        });
        const savedUser = await newUser.save();

        // 7. Create or Merge Student Profile
        const tcData = encryptTC(cleanNationalId);
        let studentDoc = null;

        if (existingInClass && !existingInClass.userId) {
            // Merge with teacher-created student record
            existingInClass.userId = savedUser._id;
            existingInClass.firstName = cleanFirst;
            existingInClass.lastName = cleanLast;
            existingInClass.birthDate = new Date(birthDate);
            existingInClass.gender = gender || 'unspecified';
            existingInClass.address = cleanAddress;
            existingInClass.nationalIdEncrypted = tcData.encrypted;
            existingInClass.nationalIdIv = tcData.iv;
            existingInClass.nationalIdTag = tcData.tag;
            existingInClass.nationalIdMasked = tcData.masked;
            existingInClass.nationalIdHash = tcData.hash;
            existingInClass.email = cleanEmail;
            existingInClass.schoolName = targetClass.schoolName;
            existingInClass.grade = targetClass.grade;
            existingInClass.section = targetClass.section;
            existingInClass.teacherId = targetClass.teacherId;
            existingInClass.status = 'active';
            await existingInClass.save();
            studentDoc = existingInClass;
        } else {
            studentDoc = new Student({
                userId: savedUser._id,
                teacherId: targetClass.teacherId,
                classId: targetClass._id,
                status: 'active',
                firstName: cleanFirst,
                lastName: cleanLast,
                studentNumber: cleanNumber,
                schoolName: targetClass.schoolName,
                grade: targetClass.grade,
                section: targetClass.section,
                birthDate: new Date(birthDate),
                gender: gender || 'unspecified',
                address: cleanAddress,
                nationalIdEncrypted: tcData.encrypted,
                nationalIdIv: tcData.iv,
                nationalIdTag: tcData.tag,
                nationalIdMasked: tcData.masked,
                nationalIdHash: tcData.hash,
                email: cleanEmail
            });
            await studentDoc.save();
        }

        // 8. Create Guardian Records in student_guardians
        await Guardian.deleteMany({ studentId: studentDoc._id });
        const createdGuardians = [];

        const g1 = await Guardian.create({
            studentId: studentDoc._id,
            fullName: gList[0].fullName.trim(),
            relationship: gList[0].relationship || 'Veli',
            phonePrimary: gList[0].phonePrimary.trim(),
            phoneSecondary: gList[0].phoneSecondary ? gList[0].phoneSecondary.trim() : '',
            orderIndex: 1
        });
        createdGuardians.push(g1);

        if (gList[1] && gList[1].fullName?.trim()) {
            const g2 = await Guardian.create({
                studentId: studentDoc._id,
                fullName: gList[1].fullName.trim(),
                relationship: gList[1].relationship || 'Veli',
                phonePrimary: gList[1].phonePrimary.trim(),
                phoneSecondary: gList[1].phoneSecondary ? gList[1].phoneSecondary.trim() : '',
                orderIndex: 2
            });
            createdGuardians.push(g2);
        }

        // 9. Generate JWT login token for instant authenticated entry
        const token = jwt.sign(
            { id: savedUser._id, username: savedUser.username, role: 'student' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            token,
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
                role: 'student',
                firstName: studentDoc.firstName,
                lastName: studentDoc.lastName
            },
            student: {
                id: studentDoc._id,
                firstName: studentDoc.firstName,
                lastName: studentDoc.lastName,
                studentNumber: studentDoc.studentNumber,
                nationalIdMasked: studentDoc.nationalIdMasked,
                classId: targetClass._id,
                className: targetClass.name,
                schoolName: targetClass.schoolName,
                teacherName: targetClass.teacherName,
                guardians: createdGuardians
            },
            message: 'Tebrikler! Sınıf kaydınız başarıyla tamamlandı.'
        });
    } catch (err) {
        console.error('Student registration error:', err);
        res.status(500).json({ message: err.message || 'Kayıt işlemi sırasında bir hata oluştu.' });
    }
});

// LOGIN
router.post('/login', authLimiter, async (req, res) => { // ← NEW
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: 'E-posta / kullanıcı adı ve şifre zorunludur.',
                error: 'MISSING_CREDENTIALS'
            });
        }

        // Check user by email or username (supports multiple students sharing the same parent email)
        const identifier = email.trim();
        const escapedIdentifier = identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const candidates = await User.find({
            $or: [
                { email: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } },
                { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } }
            ]
        });
        if (!candidates || candidates.length === 0) {
            return res.status(400).json({
                message: 'Geçersiz kullanıcı adı, e-posta veya şifre.',
                error: 'INVALID_CREDENTIALS'
            });
        }

        // Find candidate matching the password
        let user = null;
        for (const candidate of candidates) {
            let isMatch = await bcrypt.compare(password, candidate.password);
            if (!isMatch && (candidate.isDemo || candidate.username === 'demo_ogretmen' || candidate.username === 'demo_ogrenci') && (password === 'Demo1234!' || password === 'Ogrenci123!')) {
                isMatch = true;
            }
            if (isMatch) {
                user = candidate;
                break;
            }
        }

        if (!user) {
            return res.status(400).json({
                message: 'Geçersiz kullanıcı adı, e-posta veya şifre.',
                error: 'INVALID_CREDENTIALS'
            });
        }

        // Check if email is verified
        if (user.isEmailVerified === false) {
            return res.status(403).json({
                message: 'E-posta adresiniz henüz doğrulanmamış. Lütfen önce e-postanızı doğrulayın.',
                error: 'EMAIL_NOT_VERIFIED',
                email: user.email
            });
        }

        // Check if teacher is verified
        if (user.role === 'teacher' && !user.isVerified) {
            return res.status(403).json({
                message: 'Öğretmen hesabınız yönetici onayı bekliyor.',
                error: 'ACCOUNT_NOT_VERIFIED',
                verificationStatus: user.verificationStatus,
                rejectionReason: user.rejectionReason
            });
        }

        // Create token
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                verificationStatus: user.verificationStatus,
                isDemo: user.isDemo || user.username === 'demo_ogretmen' || user.username === 'demo_ogrenci'
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// FORGOT PASSWORD
router.post('/forgot-password', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user but do not reveal existence in the response
        const user = await User.findOne({ email });

        // Only send OTP email internally when user exists and email is verified
        if (user && user.isEmailVerified) {
            try {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const salt = await bcrypt.genSalt(10);
                const hashedOtp = await bcrypt.hash(otp, salt);

                user.resetPasswordOTP = hashedOtp;
                user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
                await user.save();

                const emailResult = await sendPasswordResetEmail(user.email, user.username, otp);
                if (!emailResult.success) {
                    user.resetPasswordOTP = undefined;
                    user.resetPasswordExpire = undefined;
                    await user.save();
                    console.error('Forgot password: failed to send reset email for', user.email);
                }
            } catch (err) {
                // Do not reveal internal errors to the client. Log and continue.
                console.error('Forgot password internal error:', err);
            }
        }

        // Always return a generic success message so callers cannot probe registered emails
        return res.status(200).json({ message: 'If an account with that email exists, an OTP has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// VERIFY OTP
router.post('/verify-otp', otpLimiter, async (req, res) => { // ← NEW
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await User.findOne({
            email,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user || !user.resetPasswordOTP) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const isMatch = await bcrypt.compare(otp.toString(), user.resetPasswordOTP);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Generate a temporary token for resetting password
        const resetToken = jwt.sign(
            { id: user._id, type: 'password_reset' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({
            message: 'OTP verified successfully',
            resetToken
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// RESET PASSWORD
router.put('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        if (decoded.type !== 'password_reset') {
            return res.status(400).json({ message: 'Invalid token type' });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear OTP fields
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// VERIFY REGISTRATION OTP
router.post('/verify-registration-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await User.findOne({
            email,
            emailVerificationExpire: { $gt: Date.now() }
        });

        if (!user || !user.emailVerificationOTP) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        const isMatch = await bcrypt.compare(otp.toString(), user.emailVerificationOTP);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Update status and clear fields
        user.isEmailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationExpire = undefined;

        const savedUser = await user.save();

        // Create login token
        const token = jwt.sign({ id: savedUser._id, role: savedUser.role }, JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            token,
            user: {
                id: savedUser._id,
                username: savedUser.username,
                email: savedUser.email,
                role: savedUser.role,
                isVerified: savedUser.isVerified,
                verificationStatus: savedUser.verificationStatus,
                isEmailVerified: savedUser.isEmailVerified
            },
            message: 'Email verified successfully! Registration complete.'
        });
    } catch (error) {
        console.error('Verify registration OTP error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// RESEND REGISTRATION OTP
router.post('/resend-registration-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No registered user found with this email address.' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'This email is already verified.' });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpSalt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, otpSalt);

        user.emailVerificationOTP = hashedOtp;
        user.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const emailResult = await sendRegistrationVerificationEmail(user.email, user.username, otp);
        if (!emailResult.success) {
            return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
        }

        res.status(200).json({ message: 'Verification code resent successfully!' });
    } catch (error) {
        console.error('Resend registration OTP error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// CHECK ROLE
router.post('/check-role', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'A valid email string is required' });
        }

        // Escape regex special characters to prevent regex injection or parsing crash
        const escapedIdentifier = email.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

        // Find user by email or username (case-insensitive and trimmed)
        const user = await User.findOne({
            $or: [
                { email: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } },
                { username: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } }
            ]
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ role: user.role });
    } catch (err) {
        console.error('Check role error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Helper to verify Google Access Token supporting older Node.js versions
const verifyGoogleAccessToken = (token) => {
    return new Promise((resolve, reject) => {
        if (typeof fetch === 'function') {
            fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`)
                .then(response => {
                    if (!response.ok) {
                        return reject(new Error('Invalid Google access token'));
                    }
                    return response.json();
                })
                .then(data => resolve(data))
                .catch(err => reject(err));
        } else {
            const https = require('https');
            https.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode !== 200) {
                            reject(new Error(parsed.error_description || 'Invalid Google access token'));
                        } else {
                            resolve(parsed);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        }
    });
};

// GOOGLE LOGIN & SIGNUP (STUDENTS ONLY)
router.post('/google-login', authLimiter, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                message: 'Google token is required',
                error: 'MISSING_TOKEN'
            });
        }

        // Verify token with Google's API (using access token helper)
        const payload = await verifyGoogleAccessToken(token);

        // Check email verification status in the Google token
        const isGoogleEmailVerified = payload.email_verified === 'true' || payload.email_verified === true;
        if (!isGoogleEmailVerified) {
            return res.status(400).json({
                message: 'Google account email is not verified',
                error: 'EMAIL_NOT_VERIFIED'
            });
        }

        const email = payload.email;

        // Check if user already exists
        let user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (user) {
            // User exists. 
            // If they are a teacher, they must be verified by admin.
            if (user.role === 'teacher' && !user.isVerified) {
                return res.status(403).json({
                    message: 'Your account is pending verification. Please wait for admin approval.',
                    error: 'ACCOUNT_NOT_VERIFIED',
                    verificationStatus: user.verificationStatus,
                    rejectionReason: user.rejectionReason
                });
            }

            // Ensure isEmailVerified is true, as Google has verified it
            if (!user.isEmailVerified) {
                user.isEmailVerified = true;
                await user.save();
            }
        } else {
            // Create user (Sign-up flow)
            // Generate unique username
            let baseUsername = payload.name 
                ? payload.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() 
                : '';
            
            if (baseUsername.length < 3) {
                baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            }
            if (baseUsername.length < 3) {
                baseUsername = 'student';
            }

            let username = baseUsername;
            let userExists = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
            while (userExists) {
                username = baseUsername + Math.floor(1000 + Math.random() * 9000);
                userExists = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
            }

            // Generate secure random password
            const crypto = require('crypto');
            const tempPassword = crypto.randomBytes(16).toString('hex') + 'Aa1!';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(tempPassword, salt);

            user = new User({
                username,
                email,
                password: hashedPassword,
                role: 'student', // Students only
                isVerified: true, // Students are auto-verified
                verificationStatus: 'approved',
                isEmailVerified: true // Already verified by Google
            });

            await user.save();
        }

        // Create JWT login token
        const loginToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token: loginToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                verificationStatus: user.verificationStatus
            }
        });

    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: err.message
        });
    }
});

router.matchOrCreateStudentProfile = matchOrCreateStudentProfile;

module.exports = router;
