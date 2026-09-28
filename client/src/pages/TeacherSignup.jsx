import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaArrowRight,
    FaArrowLeft,
    FaEye,
    FaEyeSlash,
    FaShieldAlt,
    FaChalkboardTeacher,
    FaUser,
    FaLock,
    FaFileUpload,
    FaCheckCircle,
    FaCheck,
    FaFileAlt
} from 'react-icons/fa';
import { BsLightningChargeFill } from 'react-icons/bs';
import { PiChalkboardTeacherLight } from "react-icons/pi";
import { validateTCKN, maskTC, transliterateTurkish } from '../utils/tckn';

const isValidPassword = (p) =>
    p && p.length >= 8 && /[0-9]/.test(p) && /[A-Z]/.test(p) && /[^A-Za-z0-9]/.test(p);

const TeacherSignup = () => {
    const navigate = useNavigate();

    // Multi-step state: 1 to 4
    const [step, setStep] = useState(1);

    const [teacherData, setTeacherData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: '',
        nationalId: '',
        birthDate: ''
    });

    const [teacherDocuments, setTeacherDocuments] = useState({
        id_proof: null,
        teaching_certificate: null,
        degree: null
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [teacherError, setTeacherError] = useState('');
    const [teacherLoading, setTeacherLoading] = useState(false);

    const wizardSteps = [
        { num: 1, title: 'Kişisel Bilgiler' },
        { num: 2, title: 'Hesap Bilgileri' },
        { num: 3, title: 'Doğrulama Belgeleri' },
        { num: 4, title: 'Kontrol & Kayıt' }
    ];

    // Step 1 Validation
    const handleNextFromStep1 = () => {
        setTeacherError('');
        if (!teacherData.firstName?.trim() || !teacherData.lastName?.trim()) {
            setTeacherError('Lütfen ad ve soyad alanlarını doldurunuz.');
            return;
        }
        if (teacherData.nationalId && teacherData.nationalId.length === 11 && !validateTCKN(teacherData.nationalId)) {
            setTeacherError('Geçerli bir T.C. Kimlik Numarası giriniz.');
            return;
        }
        setStep(2);
    };

    // Step 2 Validation
    const handleNextFromStep2 = () => {
        setTeacherError('');
        if (!teacherData.username?.trim()) {
            setTeacherError('Kullanıcı adı zorunludur.');
            return;
        }
        if (!teacherData.email?.trim() || !teacherData.email.includes('@')) {
            setTeacherError('Geçerli bir e-posta adresi giriniz.');
            return;
        }
        if (!isValidPassword(teacherData.password)) {
            setTeacherError('Şifre en az 8 karakter olmalı, 1 büyük harf, 1 rakam ve 1 özel karakter içermelidir.');
            return;
        }
        if (teacherData.password !== teacherData.confirmPassword) {
            setTeacherError('Şifreler eşleşmiyor.');
            return;
        }
        setStep(3);
    };

    // Step 3 Validation
    const handleNextFromStep3 = () => {
        setTeacherError('');
        if (!teacherDocuments.id_proof || !teacherDocuments.teaching_certificate) {
            setTeacherError('Lütfen kimlik belgesi ve öğretmenlik sertifikasını yükleyiniz.');
            return;
        }
        setStep(4);
    };

    // Final Submit
    const handleTeacherSubmit = async () => {
        setTeacherError('');
        setTeacherLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, {
                ...teacherData,
                role: 'teacher'
            });
            const registrationToken = res.data.token;

            const formDataUpload = new FormData();
            formDataUpload.append('id_proof', teacherDocuments.id_proof);
            formDataUpload.append('teaching_certificate', teacherDocuments.teaching_certificate);
            if (teacherDocuments.degree) {
                formDataUpload.append('degree', teacherDocuments.degree);
            }

            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/verification/upload-documents`,
                formDataUpload,
                {
                    headers: {
                        'Authorization': `Bearer ${registrationToken}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            navigate('/verify-email', { state: { email: teacherData.email } });
        } catch (err) {
            setTeacherError(err.response?.data?.message || 'Öğretmen kaydı başarısız oldu.');
        } finally {
            setTeacherLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground auth-panel-bg flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-x-hidden">
            {/* Ambient Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full max-w-xl mx-auto flex flex-col relative z-10"
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

                {/* Header Title */}
                <div className="mb-6 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2.5">
                        <PiChalkboardTeacherLight className="text-base" />
                        <span>Öğretmen Başvuru & Kayıt Paneli</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                        Öğretmen Hesabı Oluştur
                    </h2>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                        Sınıflarınızı oluşturup öğrencilerinize eşleşme kodu vermek ve interaktif beyaz tahtaları yönetmek için 4 adımda kaydolun.
                    </p>
                </div>

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
                        Adım {step} / 4: {wizardSteps[step - 1]?.title}
                    </div>
                </div>

                {/* Error Banner */}
                {teacherError && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs sm:text-sm flex items-center gap-2.5"
                    >
                        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                        <span>{teacherError}</span>
                    </motion.div>
                )}

                {/* STEP 1: KİŞİSEL BİLGİLER */}
                {step === 1 && (
                    <motion.div
                        key="teacher-step-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <FaUser className="text-primary" />
                                    <span>Adım 1: Kişisel Bilgiler</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Öğretmen profili ve resmi kayıtlar için ad, soyad ve irtibat bilgilerinizi giriniz.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Ad <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={teacherData.firstName}
                                        onChange={(e) => setTeacherData((prev) => ({ ...prev, firstName: e.target.value }))}
                                        placeholder="Örn: Ayşe"
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Soyad <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={teacherData.lastName}
                                        onChange={(e) => setTeacherData((prev) => ({ ...prev, lastName: e.target.value }))}
                                        placeholder="Örn: Yılmaz"
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                                    />
                                </div>
                            </div>

                            {/* T.C. Kimlik No & Doğum Tarihi */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        T.C. Kimlik No (İsteğe bağlı)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={teacherData.nationalId}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                setTeacherData((prev) => ({ ...prev, nationalId: val }));
                                            }}
                                            placeholder="11 haneli T.C. Kimlik No"
                                            maxLength={11}
                                            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-mono tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                                        />
                                        {teacherData.nationalId?.length === 11 && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                                                {validateTCKN(teacherData.nationalId) ? (
                                                    <span className="text-emerald-500 font-sans font-medium">✓</span>
                                                ) : (
                                                    <span className="text-destructive font-sans">Geçersiz</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Doğum Tarihi (İsteğe bağlı)
                                    </label>
                                    <input
                                        type="date"
                                        value={teacherData.birthDate}
                                        onChange={(e) => setTeacherData((prev) => ({ ...prev, birthDate: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-foreground mb-1">
                                    Telefon Numarası
                                </label>
                                <input
                                    type="tel"
                                    value={teacherData.phone}
                                    onChange={(e) => setTeacherData((prev) => ({ ...prev, phone: e.target.value }))}
                                    placeholder="05XX XXX XX XX"
                                    className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleNextFromStep1}
                                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                            >
                                <span>Devam Et</span>
                                <FaArrowRight className="text-xs" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: HESAP BİLGİLERİ */}
                {step === 2 && (
                    <motion.div
                        key="teacher-step-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <FaLock className="text-primary" />
                                    <span>Adım 2: Hesap Bilgileri</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Giriş yapacağınız kullanıcı adı, e-posta ve güvenli şifrenizi belirleyin.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Kullanıcı Adı <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={teacherData.username}
                                        onChange={(e) => {
                                            const val = transliterateTurkish(e.target.value);
                                            setTeacherData((prev) => ({ ...prev, username: val }));
                                        }}
                                        placeholder="ayse_ogretmen"
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        E-posta <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={teacherData.email}
                                        onChange={(e) => setTeacherData((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="ayse@okul.k12.tr"
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Şifre <span className="text-destructive">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={teacherData.password}
                                            onChange={(e) => setTeacherData((prev) => ({ ...prev, password: e.target.value }))}
                                            placeholder="••••••••"
                                            className="w-full px-3.5 py-2.5 pr-10 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
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
                                            value={teacherData.confirmPassword}
                                            onChange={(e) => setTeacherData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                            placeholder="••••••••"
                                            className="w-full px-3.5 py-2.5 pr-10 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
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

                {/* STEP 3: DOĞRULAMA BELGELERİ */}
                {step === 3 && (
                    <motion.div
                        key="teacher-step-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <FaShieldAlt className="text-primary" />
                                    <span>Adım 3: Mesleki Doğrulama Belgeleri</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Öğretmen hesapları güvenli okul ortamı sağlamak adına yetkili onayından geçer.
                                </p>
                            </div>

                            <div className="space-y-3.5 pt-1">
                                {/* Kimlik Belgesi */}
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70">
                                    <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                                        <span>Kimlik Belgesi (Nüfus Cüzdanı / Pasaport) <span className="text-destructive">*</span></span>
                                        {teacherDocuments.id_proof && <span className="text-emerald-500 font-normal text-[11px] flex items-center gap-1"><FaCheck /> Seçildi</span>}
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                setTeacherDocuments((prev) => ({ ...prev, id_proof: e.target.files[0] }));
                                            }
                                        }}
                                        className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                                    />
                                    {teacherDocuments.id_proof && (
                                        <p className="text-[11px] text-muted-foreground mt-1 font-mono">{teacherDocuments.id_proof.name}</p>
                                    )}
                                </div>

                                {/* Öğretmenlik Sertifikası */}
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70">
                                    <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                                        <span>Öğretmenlik / Görev Belgesi / MEB Kartı <span className="text-destructive">*</span></span>
                                        {teacherDocuments.teaching_certificate && <span className="text-emerald-500 font-normal text-[11px] flex items-center gap-1"><FaCheck /> Seçildi</span>}
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                setTeacherDocuments((prev) => ({ ...prev, teaching_certificate: e.target.files[0] }));
                                            }
                                        }}
                                        className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                                    />
                                    {teacherDocuments.teaching_certificate && (
                                        <p className="text-[11px] text-muted-foreground mt-1 font-mono">{teacherDocuments.teaching_certificate.name}</p>
                                    )}
                                </div>

                                {/* Diploma (Opsiyonel) */}
                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70">
                                    <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                                        <span>Diploma / Mezuniyet Belgesi (İsteğe bağlı)</span>
                                        {teacherDocuments.degree && <span className="text-emerald-500 font-normal text-[11px] flex items-center gap-1"><FaCheck /> Seçildi</span>}
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                setTeacherDocuments((prev) => ({ ...prev, degree: e.target.files[0] }));
                                            }
                                        }}
                                        className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                                    />
                                    {teacherDocuments.degree && (
                                        <p className="text-[11px] text-muted-foreground mt-1 font-mono">{teacherDocuments.degree.name}</p>
                                    )}
                                </div>
                            </div>
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

                {/* STEP 4: KONTROL VE KAYIT ÖZETİ */}
                {step === 4 && (
                    <motion.div
                        key="teacher-step-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="bg-card/90 border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <FaCheckCircle className="text-primary" />
                                    <span>Adım 4: Kontrol ve Kayıt Özeti</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Lütfen bilgilerinizi kontrol ediniz. Kaydınızı onayladığınızda e-posta doğrulama adımına geçilecektir.
                                </p>
                            </div>

                            {/* 1. Kişisel Özet */}
                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                                <div className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/70 pb-1.5 flex items-center gap-1.5">
                                    <FaUser /> Kişisel Bilgiler
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Ad Soyad:</span>
                                        <span className="text-foreground font-medium">{teacherData.firstName} {teacherData.lastName}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Telefon:</span>
                                        <span className="text-foreground font-medium">{teacherData.phone || '-'}</span>
                                    </div>
                                    {teacherData.nationalId && (
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">T.C. Kimlik No:</span>
                                            <span className="text-foreground font-mono font-medium">{maskTC(teacherData.nationalId)}</span>
                                        </div>
                                    )}
                                    {teacherData.birthDate && (
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Doğum Tarihi:</span>
                                            <span className="text-foreground font-medium">{teacherData.birthDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Hesap Özeti */}
                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                                <div className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/70 pb-1.5 flex items-center gap-1.5">
                                    <FaLock /> Hesap Bilgileri
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Kullanıcı Adı:</span>
                                        <span className="text-primary font-mono font-bold text-sm">@{teacherData.username}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">E-posta:</span>
                                        <span className="text-foreground font-medium">{teacherData.email}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Belgeler Özeti */}
                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                                <div className="text-xs font-semibold text-primary uppercase tracking-wider border-b border-border/70 pb-1.5 flex items-center gap-1.5">
                                    <FaFileAlt /> Doğrulama Belgeleri
                                </div>
                                <div className="text-xs space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        <span className="text-foreground font-medium">Kimlik Belgesi:</span>
                                        <span className="text-muted-foreground font-mono text-[11px] truncate">{teacherDocuments.id_proof?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-500">✓</span>
                                        <span className="text-foreground font-medium">Öğretmenlik Belgesi:</span>
                                        <span className="text-muted-foreground font-mono text-[11px] truncate">{teacherDocuments.teaching_certificate?.name}</span>
                                    </div>
                                    {teacherDocuments.degree && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-500">✓</span>
                                            <span className="text-foreground font-medium">Diploma:</span>
                                            <span className="text-muted-foreground font-mono text-[11px] truncate">{teacherDocuments.degree?.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                disabled={teacherLoading}
                                className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <FaArrowLeft className="text-xs" /> Geri
                            </button>
                            <button
                                type="button"
                                onClick={handleTeacherSubmit}
                                disabled={teacherLoading}
                                className="px-7 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {teacherLoading ? (
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

                {/* Switch Link back to Student Registration */}
                <div className="text-center pt-6 mt-4 border-t border-border/70">
                    <p className="text-xs text-muted-foreground">
                        Öğrenci misiniz?{' '}
                        <Link to="/signup" className="text-primary hover:underline font-semibold">
                            Öğrenci Kaydı için buraya tıklayın →
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default TeacherSignup;
