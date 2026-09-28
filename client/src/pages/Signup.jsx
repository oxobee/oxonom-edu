import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../lib/api';
import { motion } from 'framer-motion';
import {
    FaArrowRight,
    FaArrowLeft,
    FaUser,
    FaEnvelope,
    FaLock,
    FaEye,
    FaEyeSlash,
    FaIdCard,
    FaCalendarAlt,
    FaKey,
    FaCheckCircle,
    FaUserTie,
    FaPlus,
    FaTrash,
    FaShieldAlt,
    FaSearch,
    FaExclamationTriangle,
    FaUserGraduate,
    FaUsers
} from 'react-icons/fa';
import { BsLightningChargeFill } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';
import StudentCharacter from '../components/StudentCharacter';
import { validateTCKN, maskTC, transliterateTurkish } from '../utils/tckn';

const isValidPassword = (p) =>
    p && p.length >= 8 && /[0-9]/.test(p) && /[A-Z]/.test(p) && /[^A-Za-z0-9]/.test(p);

const Signup = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // ==========================================
    // STUDENT 5-STEP WIZARD STATE
    // ==========================================
    const [step, setStep] = useState(1);
    const [wizardError, setWizardError] = useState('');
    const [wizardSubmitting, setWizardSubmitting] = useState(false);

    // Step 1: Sınıfını Bul
    const [matchingCodeInput, setMatchingCodeInput] = useState('');
    const [classInfo, setClassInfo] = useState(null);
    const [codeLookupLoading, setCodeLookupLoading] = useState(false);
    const [codeLookupError, setCodeLookupError] = useState('');

    // Step 2: Öğrenci Bilgileri
    const [studentData, setStudentData] = useState({
        nationalId: '',
        firstName: '',
        lastName: '',
        studentNumber: '',
        birthDate: '',
        gender: 'female',
        address: ''
    });

    // Step 3: Veli Bilgileri
    const [hasSecondGuardian, setHasSecondGuardian] = useState(false);
    const [guardian1, setGuardian1] = useState({
        fullName: '',
        relationship: 'Anne',
        phonePrimary: '',
        phoneSecondary: ''
    });
    const [guardian2, setGuardian2] = useState({
        fullName: '',
        relationship: 'Baba',
        phonePrimary: '',
        phoneSecondary: ''
    });

    // Step 4: Hesap Bilgileri
    const [accountData, setAccountData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        username: ''
    });
    const [usernameStatus, setUsernameStatus] = useState({
        checking: false,
        available: null,
        message: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Associated students lookup for shared email or guardian phone
    const [guardian1AssociatedStudents, setGuardian1AssociatedStudents] = useState([]);
    const [guardian2AssociatedStudents, setGuardian2AssociatedStudents] = useState([]);
    const [emailAssociatedStudents, setEmailAssociatedStudents] = useState([]);

    // Debounced lookup for Guardian 1 phone
    useEffect(() => {
        const rawDigits = (guardian1.phonePrimary || '').replace(/\D/g, '');
        if (rawDigits.length < 10) {
            setGuardian1AssociatedStudents([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await api.get(`/api/auth/lookup-associated-students?phone=${encodeURIComponent(rawDigits)}`);
                setGuardian1AssociatedStudents(res.data?.students || []);
            } catch (err) {
                console.error('Guardian 1 lookup error:', err);
                setGuardian1AssociatedStudents([]);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [guardian1.phonePrimary]);

    // Debounced lookup for Guardian 2 phone
    useEffect(() => {
        const rawDigits = (guardian2.phonePrimary || '').replace(/\D/g, '');
        if (rawDigits.length < 10) {
            setGuardian2AssociatedStudents([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await api.get(`/api/auth/lookup-associated-students?phone=${encodeURIComponent(rawDigits)}`);
                setGuardian2AssociatedStudents(res.data?.students || []);
            } catch (err) {
                console.error('Guardian 2 lookup error:', err);
                setGuardian2AssociatedStudents([]);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [guardian2.phonePrimary]);

    // Debounced lookup for Account email
    useEffect(() => {
        const em = (accountData.email || '').trim().toLowerCase();
        if (!em || !em.includes('@') || em.length < 5) {
            setEmailAssociatedStudents([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await api.get(`/api/auth/lookup-associated-students?email=${encodeURIComponent(em)}`);
                setEmailAssociatedStudents(res.data?.students || []);
            } catch (err) {
                console.error('Email lookup error:', err);
                setEmailAssociatedStudents([]);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [accountData.email]);

    // Clear error messages after timeout
    useEffect(() => {
        if (wizardError) {
            const timer = setTimeout(() => setWizardError(''), 6000);
            return () => clearTimeout(timer);
        }
    }, [wizardError]);

    // Live check username availability with debounce
    useEffect(() => {
        const u = accountData.username?.trim();
        if (!u || u.length < 3) {
            setUsernameStatus({ checking: false, available: null, message: '' });
            return;
        }

        const timer = setTimeout(async () => {
            setUsernameStatus((prev) => ({ ...prev, checking: true }));
            try {
                const res = await api.get(`/api/auth/check-username?username=${encodeURIComponent(u)}`);
                if (res.data?.available) {
                    setUsernameStatus({ checking: false, available: true, message: 'Kullanıcı adı kullanılabilir.' });
                } else {
                    setUsernameStatus({ checking: false, available: false, message: 'Bu kullanıcı adı zaten kullanılıyor. Lütfen başka bir kullanıcı adı seçin.' });
                }
            } catch (err) {
                setUsernameStatus({ checking: false, available: null, message: '' });
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [accountData.username]);

    // Auto-generate username suggestion based on firstName (translating Turkish characters)
    const fetchSuggestedUsername = async (name) => {
        if (!name?.trim()) return;
        try {
            const res = await api.get(`/api/auth/suggest-username?firstName=${encodeURIComponent(name.trim())}`);
            if (res.data?.username) {
                setAccountData((prev) => ({
                    ...prev,
                    username: res.data.username
                }));
                setUsernameStatus({ checking: false, available: true, message: 'Otomatik kullanıcı adı önerildi.' });
            }
        } catch (err) {
            console.error('Suggest username failed:', err);
            // Fallback client-side transliteration
            const fallback = transliterateTurkish(name);
            setAccountData((prev) => ({ ...prev, username: fallback }));
        }
    };

    // ------------------------------------------
    // STEP 1: CLASS CODE LOOKUP
    // ------------------------------------------
    const handleLookupClass = async (e) => {
        if (e) e.preventDefault();
        const code = matchingCodeInput.trim().toUpperCase();
        if (!code) {
            setCodeLookupError('Lütfen öğretmeninizden aldığınız sınıf kodunu giriniz.');
            return;
        }

        setCodeLookupLoading(true);
        setCodeLookupError('');
        setClassInfo(null);

        try {
            const res = await api.get(`/api/classes/lookup/${encodeURIComponent(code)}`);
            setClassInfo(res.data);
            setWizardError('');
        } catch (err) {
            console.error('Lookup error:', err);
            setClassInfo(null);
            setCodeLookupError('Geçersiz sınıf kodu. Lütfen öğretmeninizden aldığınız kodu kontrol edin.');
        } finally {
            setCodeLookupLoading(false);
        }
    };

    // ------------------------------------------
    // STEP NAVIGATION VALIDATIONS
    // ------------------------------------------
    const handleNextFromStep1 = () => {
        if (!classInfo) {
            setWizardError('Lütfen önce geçerli bir sınıf kodu girerek sınıfınızı bulun.');
            return;
        }
        setWizardError('');
        setStep(2);
    };

    const handleNextFromStep2 = () => {
        const { nationalId, firstName, lastName, studentNumber, birthDate, gender, address } = studentData;

        if (!nationalId?.trim()) {
            setWizardError('T.C. Kimlik Numarası zorunludur.');
            return;
        }
        if (!validateTCKN(nationalId.trim())) {
            setWizardError('Geçersiz T.C. Kimlik Numarası! Lütfen 11 haneli geçerli kimlik numaranızı giriniz.');
            return;
        }
        if (!firstName?.trim() || !lastName?.trim()) {
            setWizardError('Ad ve Soyad alanları zorunludur.');
            return;
        }
        if (!studentNumber?.trim()) {
            setWizardError('Öğrenci Numarası zorunludur.');
            return;
        }
        if (!birthDate) {
            setWizardError('Doğum Tarihi zorunludur.');
            return;
        }
        if (!gender) {
            setWizardError('Cinsiyet seçimi zorunludur.');
            return;
        }
        if (!address?.trim()) {
            setWizardError('Adres alanı zorunludur.');
            return;
        }

        // Trigger username suggestion when proceeding
        if (!accountData.username) {
            fetchSuggestedUsername(firstName);
        }

        setWizardError('');
        setStep(3);
    };

    const handleNextFromStep3 = () => {
        if (!guardian1.fullName?.trim() || !guardian1.relationship?.trim() || !guardian1.phonePrimary?.trim()) {
            setWizardError('1. Veli için Ad Soyad, Yakınlık Derecesi ve İletişim Numarası 1 zorunludur.');
            return;
        }

        if (hasSecondGuardian) {
            if (!guardian2.fullName?.trim() || !guardian2.relationship?.trim() || !guardian2.phonePrimary?.trim()) {
                setWizardError('İkinci veli eklendiğinde; Ad Soyad, Yakınlık Derecesi ve İletişim Numarası 1 zorunludur.');
                return;
            }
        }

        // If username not yet generated, fetch it now
        if (!accountData.username && studentData.firstName) {
            fetchSuggestedUsername(studentData.firstName);
        }

        setWizardError('');
        setStep(4);
    };

    const handleNextFromStep4 = () => {
        const { email, password, confirmPassword, username } = accountData;

        if (!username?.trim()) {
            setWizardError('Kullanıcı adı zorunludur.');
            return;
        }
        if (usernameStatus.available === false) {
            setWizardError('Bu kullanıcı adı zaten kullanılıyor. Lütfen başka bir kullanıcı adı seçin.');
            return;
        }
        if (!email?.trim()) {
            setWizardError('E-posta adresi zorunludur.');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setWizardError('Geçerli bir e-posta adresi giriniz.');
            return;
        }
        if (!password) {
            setWizardError('Şifre alanı zorunludur.');
            return;
        }
        if (!isValidPassword(password)) {
            setWizardError('Şifre en az 8 karakter olmalı; en az bir büyük harf, bir rakam ve bir özel karakter içermelidir.');
            return;
        }
        if (password !== confirmPassword) {
            setWizardError('Şifre ve Şifre Tekrar alanları birbiriyle uyuşmuyor.');
            return;
        }

        setWizardError('');
        setStep(5);
    };

    // ------------------------------------------
    // STEP 5: FINAL REGISTRATION SUBMISSION
    // ------------------------------------------
    const handleFinalSubmit = async () => {
        setWizardError('');
        setWizardSubmitting(true);

        try {
            const guardiansPayload = [
                {
                    fullName: guardian1.fullName.trim(),
                    relationship: guardian1.relationship.trim(),
                    phonePrimary: guardian1.phonePrimary.trim(),
                    phoneSecondary: guardian1.phoneSecondary?.trim() || ''
                }
            ];

            if (hasSecondGuardian && guardian2.fullName?.trim()) {
                guardiansPayload.push({
                    fullName: guardian2.fullName.trim(),
                    relationship: guardian2.relationship.trim(),
                    phonePrimary: guardian2.phonePrimary.trim(),
                    phoneSecondary: guardian2.phoneSecondary?.trim() || ''
                });
            }

            const payload = {
                matchingCode: classInfo.matchingCode,
                nationalId: studentData.nationalId.trim(),
                firstName: studentData.firstName.trim(),
                lastName: studentData.lastName.trim(),
                studentNumber: studentData.studentNumber.trim(),
                birthDate: studentData.birthDate,
                gender: studentData.gender,
                address: studentData.address.trim(),
                guardians: guardiansPayload,
                email: accountData.email.trim().toLowerCase(),
                password: accountData.password,
                username: transliterateTurkish(accountData.username.trim())
            };

            const res = await api.post('/api/auth/register-student', payload);

            if (res.data?.token) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/login', { state: { registered: true } });
            }
        } catch (err) {
            console.error('Kayıt başarısız:', err);
            const msg = err.response?.data?.message || 'Kayıt sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol ediniz.';
            setWizardError(msg);
        } finally {
            setWizardSubmitting(false);
        }
    };

    const wizardSteps = [
        { num: 1, title: 'Sınıfını Bul' },
        { num: 2, title: 'Öğrenci Bilgileri' },
        { num: 3, title: 'Veli Bilgileri' },
        { num: 4, title: 'Hesap Bilgileri' },
        { num: 5, title: 'Kontrol ve Kayıt' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground auth-panel-bg flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-x-hidden">
            {/* Ambient Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full max-w-2xl mx-auto flex flex-col relative z-10"
            >
                {/* Top Branding & Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                            <BsLightningChargeFill className="text-base" />
                        </div>
                        <span className="font-bold text-xl sm:text-2xl text-foreground tracking-tight">Oxonom Edu</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            <span>Giriş Yap</span>
                            <FaArrowRight className="text-[10px]" />
                        </Link>
                    </div>
                </div>

                {/* Title */}
                <div className="mb-6 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2.5">
                        <FaUserGraduate className="text-base" />
                        <span>Öğrenci Kayıt Portalı</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                        Öğrenci Kaydı
                    </h2>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                        Öğretmeninizden aldığınız sınıf koduyla kaydınızı 5 kolay adımda tamamlayın.
                    </p>
                </div>

                {/* Error Banner */}
                {wizardError && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs sm:text-sm flex items-center gap-2.5"
                    >
                        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                        <span>{wizardError}</span>
                    </motion.div>
                )}

                {/* ======================================================== */}
                {/* STUDENT 5-STEP WIZARD */}
                {/* ======================================================== */}
                <div className="w-full pb-8">
                    {/* Stepper Progress Bar */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between relative mb-2">
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />
                            <div
                                className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
                                style={{ width: `${((step - 1) / (wizardSteps.length - 1)) * 100}%` }}
                            />
                            {wizardSteps.map((s) => (
                                <div
                                    key={s.num}
                                    className="relative z-10 flex flex-col items-center cursor-pointer"
                                    onClick={() => {
                                        if (s.num < step) setStep(s.num);
                                    }}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                                            step === s.num
                                                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                                : step > s.num
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-muted text-muted-foreground border border-border'
                                        }`}
                                    >
                                        {step > s.num ? '✓' : s.num}
                                    </div>
                                    <span className={`text-[10px] mt-1 hidden sm:block ${step === s.num ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                        {s.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="text-center sm:hidden text-xs font-semibold text-primary">
                            Adım {step} / 5: {wizardSteps[step - 1]?.title}
                        </div>
                    </div>

                    {/* STEP 1: SINIFINI BUL */}
                    {step === 1 && (
                        <motion.div
                            key="step-1"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl backdrop-blur-sm">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <FaKey className="text-primary" />
                                        <span>Adım 1: Sınıfını Bul</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Öğretmeninizden aldığınız sınıf eşleşme kodunu girerek sınıfınızı onaylayın.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-foreground">
                                        Sınıf Eşleşme Kodu <span className="text-destructive">*</span>
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="text"
                                            value={matchingCodeInput}
                                            onChange={(e) => {
                                                setMatchingCodeInput(e.target.value.toUpperCase());
                                                setCodeLookupError('');
                                            }}
                                            placeholder="Örn: EDU-2C-A7K9"
                                            maxLength={24}
                                            className="flex-1 px-4 py-3 bg-background border border-input rounded-xl text-base font-mono font-bold tracking-wider text-foreground uppercase placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleLookupClass}
                                            disabled={codeLookupLoading || !matchingCodeInput.trim()}
                                            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer shrink-0"
                                        >
                                            {codeLookupLoading ? (
                                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                            ) : (
                                                <FaSearch className="text-xs" />
                                            )}
                                            <span>Sınıfı Sorgula</span>
                                        </button>
                                    </div>
                                    {codeLookupError && (
                                        <p className="text-xs text-destructive pt-1 flex items-center gap-1.5">
                                            <span>⚠️</span> {codeLookupError}
                                        </p>
                                    )}
                                </div>

                                {/* Readonly Class Card Preview */}
                                {classInfo && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3"
                                    >
                                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                                            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <FaCheckCircle className="text-sm" /> Sınıf Doğrulandı
                                            </span>
                                            <span className="text-[11px] font-mono text-foreground bg-muted/80 px-2 py-0.5 rounded border border-border">
                                                {classInfo.matchingCode}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                            <div>
                                                <span className="text-[11px] text-muted-foreground block">Okul:</span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {classInfo.schoolName || 'Atatürk İlkokulu'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-muted-foreground block">Sınıf:</span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {classInfo.grade ? `${classInfo.grade}/${classInfo.section || ''}` : classInfo.name}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-muted-foreground block">Öğretmen:</span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {classInfo.teacherName || 'Yetkili Öğretmen'}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={handleNextFromStep1}
                                    disabled={!classInfo}
                                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-md disabled:opacity-40 transition-all cursor-pointer"
                                >
                                    <span>Devam Et</span>
                                    <FaArrowRight className="text-xs" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: ÖĞRENCİ BİLGİLERİ */}
                    {step === 2 && (
                        <motion.div
                            key="step-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl backdrop-blur-sm">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <FaUser className="text-primary" />
                                        <span>Adım 2: Öğrenci Bilgileri</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        T.C. Kimlik numaranız şifrelenerek güvenle saklanır, düz metin tutulmaz.
                                    </p>
                                </div>

                                {/* T.C. Kimlik No */}
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        T.C. Kimlik No <span className="text-destructive">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={studentData.nationalId}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                setStudentData((prev) => ({ ...prev, nationalId: val }));
                                            }}
                                            placeholder="11 haneli T.C. Kimlik No"
                                            maxLength={11}
                                            className={`w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-mono tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                                                studentData.nationalId.length === 11
                                                    ? validateTCKN(studentData.nationalId)
                                                        ? 'border-emerald-500 focus:ring-emerald-500'
                                                        : 'border-destructive focus:ring-destructive'
                                                    : 'border-input focus:ring-ring focus:border-ring'
                                            }`}
                                        />
                                        {studentData.nationalId.length === 11 && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                                                {validateTCKN(studentData.nationalId) ? (
                                                    <span className="text-emerald-500 flex items-center gap-1 font-sans font-medium">
                                                        ✓ Doğrulandı ({maskTC(studentData.nationalId)})
                                                    </span>
                                                ) : (
                                                    <span className="text-destructive font-sans">
                                                        Geçersiz T.C.
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Ad & Soyad */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Ad <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={studentData.firstName}
                                            onChange={(e) => setStudentData((prev) => ({ ...prev, firstName: e.target.value }))}
                                            placeholder="Örn: Erçil"
                                            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Soyad <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={studentData.lastName}
                                            onChange={(e) => setStudentData((prev) => ({ ...prev, lastName: e.target.value }))}
                                            placeholder="Örn: Uğurlu"
                                            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                        />
                                    </div>
                                </div>

                                {/* Öğrenci No & Doğum Tarihi & Cinsiyet */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Öğrenci No <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={studentData.studentNumber}
                                            onChange={(e) => setStudentData((prev) => ({ ...prev, studentNumber: e.target.value }))}
                                            placeholder="Örn: 104"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Doğum Tarihi <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={studentData.birthDate}
                                            onChange={(e) => setStudentData((prev) => ({ ...prev, birthDate: e.target.value }))}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Cinsiyet <span className="text-destructive">*</span>
                                        </label>
                                        <select
                                            value={studentData.gender}
                                            onChange={(e) => setStudentData((prev) => ({ ...prev, gender: e.target.value }))}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                        >
                                            <option value="female">Kız</option>
                                            <option value="male">Erkek</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Adres */}
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Adres <span className="text-destructive">*</span>
                                    </label>
                                    <textarea
                                        value={studentData.address}
                                        onChange={(e) => setStudentData((prev) => ({ ...prev, address: e.target.value }))}
                                        rows={2}
                                        placeholder="Ev adresi (mahalle, cadde, sokak, ilçe, il)"
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <FaArrowLeft className="text-xs" /> Geri
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextFromStep2}
                                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                                >
                                    <span>Devam Et</span>
                                    <FaArrowRight className="text-xs" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: VELİ BİLGİLERİ */}
                    {step === 3 && (
                        <motion.div
                            key="step-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl backdrop-blur-sm">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <FaUserTie className="text-primary" />
                                        <span>Adım 3: Veli Bilgileri</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        1. Veli bilgisi zorunludur. İsteğe bağlı olarak ikinci veli ekleyebilirsiniz.
                                    </p>
                                </div>

                                {/* 1. Veli (Zorunlu) */}
                                <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-3">
                                    <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border/70 pb-2">
                                        <FaUserTie /> 1. Veli Bilgileri (Zorunlu)
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                Veli Adı Soyadı <span className="text-destructive">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={guardian1.fullName}
                                                onChange={(e) => setGuardian1((prev) => ({ ...prev, fullName: e.target.value }))}
                                                placeholder="Örn: Uğur Uğurlu"
                                                className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                Yakınlık Derecesi <span className="text-destructive">*</span>
                                            </label>
                                            <select
                                                value={guardian1.relationship}
                                                onChange={(e) => setGuardian1((prev) => ({ ...prev, relationship: e.target.value }))}
                                                className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                            >
                                                <option value="Baba">Baba</option>
                                                <option value="Anne">Anne</option>
                                                <option value="Vasi">Vasi</option>
                                                <option value="Abla">Abla</option>
                                                <option value="Ağabey">Ağabey</option>
                                                <option value="Diğer">Diğer</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                İletişim Numarası 1 <span className="text-destructive">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={guardian1.phonePrimary}
                                                onChange={(e) => setGuardian1((prev) => ({ ...prev, phonePrimary: e.target.value }))}
                                                placeholder="05XX XXX XX XX"
                                                className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-foreground mb-1">
                                                İletişim Numarası 2 (İsteğe bağlı)
                                            </label>
                                            <input
                                                type="tel"
                                                value={guardian1.phoneSecondary}
                                                onChange={(e) => setGuardian1((prev) => ({ ...prev, phoneSecondary: e.target.value }))}
                                                placeholder="05XX XXX XX XX"
                                                className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                            />
                                        </div>
                                    </div>

                                    {guardian1AssociatedStudents.length > 0 && (
                                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                                            <div className="flex items-center gap-1.5 font-medium text-primary">
                                                <FaUsers className="text-sm shrink-0" />
                                                <span>Bu numaraya tanımlı {guardian1AssociatedStudents.length} adet öğrenci bulundu:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                {guardian1AssociatedStudents.map((st) => (
                                                    <span key={st._id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background/80 border border-border text-foreground font-mono text-[11px] shadow-sm">
                                                        <FaUserGraduate className="text-[10px] text-primary" />
                                                        <span className="font-semibold">{st.maskedName}</span>
                                                        {st.className && <span className="text-muted-foreground text-[10px]">({st.className})</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Veli Toggle Button or Card */}
                                {!hasSecondGuardian ? (
                                    <button
                                        type="button"
                                        onClick={() => setHasSecondGuardian(true)}
                                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                    >
                                        <FaPlus className="text-xs" />
                                        <span>+ İkinci Veli Ekle</span>
                                    </button>
                                ) : (
                                    <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-3 relative">
                                        <div className="flex items-center justify-between border-b border-border/70 pb-2">
                                            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                                <FaUserTie /> 2. Veli Bilgileri
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHasSecondGuardian(false);
                                                    setGuardian2({ fullName: '', relationship: 'Anne', phonePrimary: '', phoneSecondary: '' });
                                                }}
                                                className="text-xs text-destructive hover:opacity-80 flex items-center gap-1 cursor-pointer"
                                            >
                                                <FaTrash className="text-[10px]" /> Kaldır
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">
                                                    Veli Adı Soyadı <span className="text-destructive">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={guardian2.fullName}
                                                    onChange={(e) => setGuardian2((prev) => ({ ...prev, fullName: e.target.value }))}
                                                    placeholder="Örn: Ebru Uğurlu"
                                                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">
                                                    Yakınlık Derecesi <span className="text-destructive">*</span>
                                                </label>
                                                <select
                                                    value={guardian2.relationship}
                                                    onChange={(e) => setGuardian2((prev) => ({ ...prev, relationship: e.target.value }))}
                                                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                                >
                                                    <option value="Anne">Anne</option>
                                                    <option value="Baba">Baba</option>
                                                    <option value="Vasi">Vasi</option>
                                                    <option value="Abla">Abla</option>
                                                    <option value="Ağabey">Ağabey</option>
                                                    <option value="Diğer">Diğer</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">
                                                    İletişim Numarası 1 <span className="text-destructive">*</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={guardian2.phonePrimary}
                                                    onChange={(e) => setGuardian2((prev) => ({ ...prev, phonePrimary: e.target.value }))}
                                                    placeholder="05XX XXX XX XX"
                                                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">
                                                    İletişim Numarası 2 (İsteğe bağlı)
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={guardian2.phoneSecondary}
                                                    onChange={(e) => setGuardian2((prev) => ({ ...prev, phoneSecondary: e.target.value }))}
                                                    placeholder="05XX XXX XX XX"
                                                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                                />
                                            </div>
                                        </div>

                                        {guardian2AssociatedStudents.length > 0 && (
                                            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                                                <div className="flex items-center gap-1.5 font-medium text-primary">
                                                    <FaUsers className="text-sm shrink-0" />
                                                    <span>Bu numaraya tanımlı {guardian2AssociatedStudents.length} adet öğrenci bulundu:</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                    {guardian2AssociatedStudents.map((st) => (
                                                        <span key={st._id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background/80 border border-border text-foreground font-mono text-[11px] shadow-sm">
                                                            <FaUserGraduate className="text-[10px] text-primary" />
                                                            <span className="font-semibold">{st.maskedName}</span>
                                                            {st.className && <span className="text-muted-foreground text-[10px]">({st.className})</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <FaArrowLeft className="text-xs" /> Geri
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextFromStep3}
                                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                                >
                                    <span>Devam Et</span>
                                    <FaArrowRight className="text-xs" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: HESAP BİLGİLERİ */}
                    {step === 4 && (
                        <motion.div
                            key="step-4"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl backdrop-blur-sm">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <FaLock className="text-primary" />
                                        <span>Adım 4: Hesap Bilgileri</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Oxonom Edu platformuna giriş yapacağınız kullanıcı adı, e-posta ve şifrenizi belirleyin.
                                    </p>
                                </div>

                                {/* CRITICAL NOTICE BOX */}
                                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-sm">
                                    <FaExclamationTriangle className="text-amber-500 text-base mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-amber-600 dark:text-amber-300 text-sm">Giriş Bilgilerinizi Not Edin!</p>
                                        <p className="mt-1 leading-relaxed text-xs opacity-90">
                                            Bu kullanıcı adı ve şifreniz ile sisteme giriş yapacaksınız. Lütfen kullanıcı adı ve şifrenizi bir yere not edin, unutmayın!
                                        </p>
                                    </div>
                                </div>

                                {/* Kullanıcı Adı */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-foreground">
                                            Kullanıcı Adı <span className="text-destructive">*</span>
                                        </label>
                                        {usernameStatus.checking ? (
                                            <span className="text-[11px] text-primary animate-pulse">Kontrol ediliyor...</span>
                                        ) : usernameStatus.available === true ? (
                                            <span className="text-[11px] text-emerald-500 font-medium">✓ Kullanıcı adı müsait</span>
                                        ) : usernameStatus.available === false ? (
                                            <span className="text-[11px] text-destructive font-medium">✗ Kullanılıyor</span>
                                        ) : null}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={accountData.username}
                                            onChange={(e) => {
                                                const converted = transliterateTurkish(e.target.value);
                                                setAccountData((prev) => ({ ...prev, username: converted }));
                                            }}
                                            placeholder="ercil"
                                            className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-mono tracking-wide text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                                                usernameStatus.available === false
                                                    ? 'border-destructive focus:ring-destructive'
                                                    : usernameStatus.available === true
                                                    ? 'border-emerald-500/80 focus:ring-emerald-500'
                                                    : 'border-input focus:ring-ring focus:border-ring'
                                            }`}
                                        />
                                    </div>
                                    {usernameStatus.available === false ? (
                                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                            <span>⚠️</span> {usernameStatus.message}
                                        </p>
                                    ) : (
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            İsminize göre otomatik oluşturuldu (Türkçe karakterler otomatik düzeltildi). İsterseniz değiştirebilirsiniz.
                                        </p>
                                    )}
                                </div>

                                {/* E-posta Adresi */}
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        E-posta Adresi <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={accountData.email}
                                        onChange={(e) => setAccountData((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="ogrenci@example.com"
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    />
                                    {emailAssociatedStudents.length > 0 && (
                                        <div className="mt-2.5 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                                            <div className="flex items-center gap-1.5 font-medium text-primary">
                                                <FaUsers className="text-sm shrink-0" />
                                                <span>Bu e-posta adresine tanımlı {emailAssociatedStudents.length} adet öğrenci bulundu:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                {emailAssociatedStudents.map((st) => (
                                                    <span key={st._id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background/80 border border-border text-foreground font-mono text-[11px] shadow-sm">
                                                        <FaUserGraduate className="text-[10px] text-primary" />
                                                        <span className="font-semibold">{st.maskedName}</span>
                                                        {st.className && <span className="text-muted-foreground text-[10px]">({st.className})</span>}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground pt-0.5">
                                                Kardeşler veya aynı veliye bağlı öğrenciler aynı e-posta adresini paylaşabilir.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Şifre & Şifre Tekrar */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Şifre <span className="text-destructive">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={accountData.password}
                                                onChange={(e) => setAccountData((prev) => ({ ...prev, password: e.target.value }))}
                                                placeholder="••••••••"
                                                maxLength={64}
                                                className="w-full px-3.5 py-2.5 pr-10 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                            >
                                                {showPassword ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Şifre Tekrar <span className="text-destructive">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={accountData.confirmPassword}
                                                onChange={(e) => setAccountData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                maxLength={64}
                                                className="w-full px-3.5 py-2.5 pr-10 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                            >
                                                {showConfirmPassword ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Şifreniz en az 8 karakter olmalı, 1 büyük harf, 1 rakam ve 1 özel karakter içermelidir.
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <FaArrowLeft className="text-xs" /> Geri
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextFromStep4}
                                    disabled={usernameStatus.available === false}
                                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    <span>Kontrol Et</span>
                                    <FaArrowRight className="text-xs" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5: KONTROL VE KAYIT */}
                    {step === 5 && (
                        <motion.div
                            key="step-5"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl backdrop-blur-sm">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <FaShieldAlt className="text-primary" />
                                        <span>Adım 5: Kontrol ve Kayıt Özeti</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Lütfen girdiğiniz bilgileri kontrol edin. Onayladığınızda kaydınız tamamlanacak ve doğrudan öğrenci paneline yönlendirileceksiniz.
                                    </p>
                                </div>

                                {/* CRITICAL NOTICE BOX IN STEP 5 AS WELL */}
                                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-sm">
                                    <FaExclamationTriangle className="text-amber-500 text-base mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-amber-600 dark:text-amber-300">Önemli Hatırlatma:</p>
                                        <p className="mt-0.5 leading-relaxed text-xs opacity-90">
                                            Giriş yaparken bu kullanıcı adı (<strong>{accountData.username}</strong>) ve belirlediğiniz şifrenizi kullanacaksınız. Lütfen not edin ve unutmayın!
                                        </p>
                                    </div>
                                </div>

                                {/* 1. Sınıf Özeti */}
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/70 pb-1.5">
                                        <span>Sınıf Bilgileri</span>
                                        <span className="font-mono text-foreground font-bold">{classInfo?.matchingCode}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Okul:</span>
                                            <span className="text-foreground font-medium">{classInfo?.schoolName}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Sınıf:</span>
                                            <span className="text-foreground font-medium">{classInfo?.grade ? `${classInfo.grade}/${classInfo.section || ''}` : classInfo?.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Öğretmen:</span>
                                            <span className="text-foreground font-medium">{classInfo?.teacherName}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Öğrenci Özeti */}
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                                    <div className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/70 pb-1.5 flex items-center gap-1.5">
                                        <FaUser /> Öğrenci Bilgileri
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Ad Soyad:</span>
                                            <span className="text-foreground font-medium">{studentData.firstName} {studentData.lastName}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Öğrenci No:</span>
                                            <span className="text-foreground font-medium">{studentData.studentNumber}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">T.C. Kimlik No:</span>
                                            <span className="text-foreground font-mono font-medium">{maskTC(studentData.nationalId)}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Doğum Tarihi:</span>
                                            <span className="text-foreground font-medium">{studentData.birthDate}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Cinsiyet:</span>
                                            <span className="text-foreground font-medium">{studentData.gender === 'female' ? 'Kız' : 'Erkek'}</span>
                                        </div>
                                        <div className="sm:col-span-3">
                                            <span className="text-muted-foreground block text-[11px]">Adres:</span>
                                            <span className="text-foreground font-medium">{studentData.address}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Veli Özeti */}
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                                    <div className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/70 pb-1.5 flex items-center gap-1.5">
                                        <FaUserTie /> Veli Bilgileri
                                    </div>
                                    <div className="text-xs space-y-2">
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">1. Veli:</span>
                                            <span className="text-foreground font-medium">{guardian1.fullName} ({guardian1.relationship}) — Tel: {guardian1.phonePrimary}</span>
                                        </div>
                                        {hasSecondGuardian && guardian2.fullName && (
                                            <div className="pt-1 border-t border-border/50">
                                                <span className="text-muted-foreground block text-[11px]">2. Veli:</span>
                                                <span className="text-foreground font-medium">{guardian2.fullName} ({guardian2.relationship}) — Tel: {guardian2.phonePrimary}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. Hesap Özeti */}
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                                    <div className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/70 pb-1.5 flex items-center gap-1.5">
                                        <FaLock /> Giriş / Hesap Bilgileri
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Kullanıcı Adı:</span>
                                            <span className="text-primary font-mono font-bold text-sm">{accountData.username}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">E-posta:</span>
                                            <span className="text-foreground font-medium">{accountData.email}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    disabled={wizardSubmitting}
                                    className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <FaArrowLeft className="text-xs" /> Geri
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFinalSubmit}
                                    disabled={wizardSubmitting}
                                    className="px-7 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {wizardSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                            <span>Kaydınız Yapılıyor...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaCheckCircle className="text-base" />
                                            <span>Kaydı Tamamla</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Switch Link to Teacher Registration */}
                    <div className="text-center pt-6 mt-4 border-t border-border/70">
                        <p className="text-xs text-muted-foreground">
                            Öğretmen misiniz?{' '}
                            <Link to="/signup-teacher" className="text-primary hover:underline font-semibold">
                                Öğretmen Kaydı için buraya tıklayın →
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
