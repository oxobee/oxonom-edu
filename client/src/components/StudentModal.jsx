import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaUserGraduate,
    FaTimes,
    FaCheck,
    FaPhone,
    FaEnvelope,
    FaCalendarAlt,
    FaIdCard,
    FaUserTie,
    FaStickyNote,
    FaChalkboardTeacher,
    FaSnowflake,
    FaExchangeAlt,
    FaPlusCircle,
    FaMinusCircle
} from 'react-icons/fa';
import api from '../lib/api';

const StudentModal = ({
    isOpen,
    onClose,
    onSuccess,
    classId: initialClassId,
    classes = [],
    student = null // If passed, edit mode
}) => {
    const isEdit = !!student;
    const [selectedClassId, setSelectedClassId] = useState(initialClassId || '');
    
    // Öğrenci Kişisel Bilgileri
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [schoolNumber, setSchoolNumber] = useState('');
    const [gender, setGender] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [notes, setNotes] = useState('');

    // Kayıt Durumu & Dondurma
    const [status, setStatus] = useState('active');
    const [freezeReason, setFreezeReason] = useState('');

    // 1. Veli Bilgileri (Zorunlu)
    const [parent1Name, setParent1Name] = useState('');
    const [parent1Relationship, setParent1Relationship] = useState('Anne');
    const [parent1Phone, setParent1Phone] = useState('');
    const [parent1Email, setParent1Email] = useState('');
    const [parent1Notes, setParent1Notes] = useState('');

    // 2. Veli Bilgileri (İsteğe Bağlı)
    const [hasParent2, setHasParent2] = useState(false);
    const [parent2Name, setParent2Name] = useState('');
    const [parent2Relationship, setParent2Relationship] = useState('Baba');
    const [parent2Phone, setParent2Phone] = useState('');
    const [parent2Email, setParent2Email] = useState('');
    const [parent2Notes, setParent2Notes] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (student) {
            // Find class ID (can be populated object or id string)
            const resolvedClassId = typeof student.classId === 'object' && student.classId?._id
                ? student.classId._id
                : (student.classId || initialClassId || '');
            setSelectedClassId(resolvedClassId);
            setFirstName(student.firstName || '');
            setLastName(student.lastName || '');
            setStudentNumber(student.studentNumber || '');
            setSchoolNumber(student.schoolNumber || '');
            setGender(student.gender || '');
            setPhone(student.phone || '');
            setEmail(student.email || '');
            setNotes(student.notes || '');

            setStatus(student.status || 'active');
            setFreezeReason(student.freezeReason || '');

            if (student.birthDate) {
                try {
                    const d = new Date(student.birthDate);
                    setBirthDate(isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]);
                } catch {
                    setBirthDate('');
                }
            } else {
                setBirthDate('');
            }

            // 1. Veli
            const p1 = student.parent1 || {};
            setParent1Name(p1.name || student.parentName || '');
            setParent1Relationship(p1.relationship || student.parentRelationship || 'Anne');
            setParent1Phone(p1.phone || student.parentPhone || '');
            setParent1Email(p1.email || student.parentEmail || '');
            setParent1Notes(p1.notes || student.parentNotes || '');

            // 2. Veli
            const p2 = student.parent2 || {};
            if (p2.name) {
                setHasParent2(true);
                setParent2Name(p2.name);
                setParent2Relationship(p2.relationship || 'Baba');
                setParent2Phone(p2.phone || '');
                setParent2Email(p2.email || '');
                setParent2Notes(p2.notes || '');
            } else {
                setHasParent2(false);
                setParent2Name('');
                setParent2Relationship('Baba');
                setParent2Phone('');
                setParent2Email('');
                setParent2Notes('');
            }
        } else {
            setSelectedClassId(initialClassId || (classes[0]?._id || ''));
            setFirstName('');
            setLastName('');
            setStudentNumber('');
            setSchoolNumber('');
            setGender('');
            setBirthDate('');
            setPhone('');
            setEmail('');
            setNotes('');
            setStatus('active');
            setFreezeReason('');

            setParent1Name('');
            setParent1Relationship('Anne');
            setParent1Phone('');
            setParent1Email('');
            setParent1Notes('');

            setHasParent2(false);
            setParent2Name('');
            setParent2Relationship('Baba');
            setParent2Phone('');
            setParent2Email('');
            setParent2Notes('');
        }
        setError('');
    }, [student, initialClassId, classes, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const targetClass = selectedClassId || initialClassId;
        if (!isEdit && !targetClass) {
            setError('Lütfen bir sınıf seçin veya önce bir sınıf oluşturun.');
            return;
        }

        if (!firstName.trim() || !lastName.trim()) {
            setError('Öğrenci adı ve soyadı zorunludur.');
            return;
        }

        if (!parent1Name.trim()) {
            setError('1. Veli adı soyadı zorunludur.');
            return;
        }

        if (status === 'frozen' && !freezeReason.trim()) {
            setError('Öğrenci kaydı dondurulurken dondurulma gerekçesi belirtilmelidir.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                studentNumber: studentNumber.trim(),
                schoolNumber: schoolNumber.trim(),
                gender: gender || '',
                birthDate: birthDate ? new Date(birthDate).toISOString() : null,
                phone: phone.trim(),
                email: email.trim().toLowerCase(),
                notes: notes.trim(),
                status,
                freezeReason: status === 'frozen' ? freezeReason.trim() : '',
                classId: selectedClassId || targetClass,
                parent1: {
                    name: parent1Name.trim(),
                    relationship: parent1Relationship.trim(),
                    phone: parent1Phone.trim(),
                    email: parent1Email.trim(),
                    notes: parent1Notes.trim()
                },
                parent2: hasParent2 ? {
                    name: parent2Name.trim(),
                    relationship: parent2Relationship.trim(),
                    phone: parent2Phone.trim(),
                    email: parent2Email.trim(),
                    notes: parent2Notes.trim()
                } : { name: '', relationship: '', phone: '', email: '', notes: '' }
            };

            let res;
            if (isEdit) {
                // Update
                res = await api.patch(`/api/students/${student._id}`, payload);
            } else {
                // Create
                res = await api.post(`/api/classes/${targetClass}/students`, payload);
            }

            if (onSuccess) {
                onSuccess(res.data);
            }
            onClose();
        } catch (err) {
            console.error('Öğrenci kaydetme hatası:', err);
            setError(err.response?.data?.message || err.message || 'Öğrenci kaydedilirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-background/80 backdrop-blur-xs">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.18 }}
                    className="relative w-full max-w-2xl my-6 bg-card border border-border rounded-xl shadow-xl overflow-hidden text-card-foreground flex flex-col max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border/60 bg-card flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                                <FaUserGraduate className="text-base" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground tracking-tight">
                                    {isEdit ? 'Öğrenci Bilgilerini Düzenle' : 'Yeni Öğrenci Ekle'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Öğrenci, veli ve sınıf bilgilerini tanımlayın
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                            aria-label="Kapat"
                        >
                            <FaTimes />
                        </button>
                    </div>

                    {/* Scrollable Form Body */}
                    <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
                        {error && (
                            <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* TOP SECTION: Sınıf ve Kayıt Durumu */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                            {/* Sınıf Seçimi / Değiştirme */}
                            <div>
                                <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                    <FaChalkboardTeacher className="text-primary" /> 
                                    {isEdit ? 'Kayıtlı Sınıf (Sınıfı Değiştir)' : 'Ait Olduğu Sınıf *'}
                                </label>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="" disabled>Sınıf Seçiniz</option>
                                    {classes.map((cls) => (
                                        <option key={cls._id} value={cls._id}>
                                            {cls.name} ({cls.academicYear})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Kayıt Durumu (Aktif / Donduruldu) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <FaSnowflake className="text-amber-400" /> Kayıt Durumu
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium focus:outline-none border ${
                                        status === 'frozen'
                                            ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 focus:ring-2 focus:ring-amber-500'
                                            : 'bg-slate-800/90 border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500'
                                    }`}
                                >
                                    <option value="active">Aktif Öğrenci</option>
                                    <option value="frozen">❄️ Kayıt Donduruldu</option>
                                </select>
                            </div>

                            {/* Dondurulma Sebebi (Zorunlu if frozen) */}
                            {status === 'frozen' && (
                                <div className="md:col-span-2 pt-2 border-t border-slate-800 animate-fade-in">
                                    <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                                        Dondurulma Sebebi / Gerekçe <span className="text-rose-400">*</span>
                                    </label>
                                    <textarea
                                        rows="2"
                                        required
                                        placeholder="Örn: Sağlık izni sebebiyle 1. dönem donduruldu..."
                                        value={freezeReason}
                                        onChange={(e) => setFreezeReason(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-amber-950/20 border border-amber-500/30 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500 resize-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* SECTION 1: ÖĞRENCİ KİŞİSEL BİLGİLERİ */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                <FaIdCard /> Öğrenci Kişisel Bilgileri
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Adı <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Örn: Ahmet"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Soyadı <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Örn: Yılmaz"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Öğrenci Numarası
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Örn: 1042"
                                        value={studentNumber}
                                        onChange={(e) => setStudentNumber(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Okul Numarası
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Örn: 202401"
                                        value={schoolNumber}
                                        onChange={(e) => setSchoolNumber(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Cinsiyet
                                    </label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Belirtilmedi</option>
                                        <option value="Kız">Kız</option>
                                        <option value="Erkek">Erkek</option>
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                                        <FaCalendarAlt className="text-slate-400" /> Doğum Tarihi
                                    </label>
                                    <input
                                        type="date"
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                                        <FaPhone className="text-slate-400" /> Öğrenci Telefonu
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="05XX XXX XX XX"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                                        <FaEnvelope className="text-slate-400" /> Öğrenci E-postası
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="ogrenci@okul.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                                    <FaStickyNote className="text-slate-400" /> Öğretmen Özel Notları (Gizli)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Öğrenci hakkında özel durumlar, akademik seviye, ilgi alanları..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* SECTION 2: 1. VELİ BİLGİLERİ (ZORUNLU) */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                                <span className="text-purple-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <FaUserTie /> 1. Veli Bilgileri (Zorunlu)
                                </span>
                                <span className="text-[11px] text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 font-medium">
                                    Birincil İletişim
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        1. Veli Adı Soyadı <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Örn: Ayşe Yılmaz"
                                        value={parent1Name}
                                        onChange={(e) => setParent1Name(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Yakınlık Derecesi
                                    </label>
                                    <select
                                        value={parent1Relationship}
                                        onChange={(e) => setParent1Relationship(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="Anne">Anne</option>
                                        <option value="Baba">Baba</option>
                                        <option value="Vasi">Vasi</option>
                                        <option value="Büyükanne / Büyükbaba">Büyükanne / Büyükbaba</option>
                                        <option value="Abla / Ağabey">Abla / Ağabey</option>
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                        <FaPhone className="text-slate-400" /> Telefon Numarası
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="05XX XXX XX XX"
                                        value={parent1Phone}
                                        onChange={(e) => setParent1Phone(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                        <FaEnvelope className="text-slate-400" /> E-posta Adresi
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="veli@ornek.com"
                                        value={parent1Email}
                                        onChange={(e) => setParent1Email(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                                    <FaStickyNote className="text-slate-400" /> 1. Veli Notları
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Ulaşılabilecek uygun saatler, acil durum uyarıları..."
                                    value={parent1Notes}
                                    onChange={(e) => setParent1Notes(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* SECTION 3: 2. VELİ BİLGİLERİ (İSTEĞE BAĞLI / TERCİHEN) */}
                        <div className="space-y-4 pt-2 border-t border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <FaUserTie className="text-indigo-400" /> 2. Veli Bilgileri (İsteğe Bağlı)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setHasParent2(!hasParent2)}
                                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1 px-2 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    {hasParent2 ? (
                                        <>
                                            <FaMinusCircle /> 2. Veliyi Kaldır
                                        </>
                                    ) : (
                                        <>
                                            <FaPlusCircle /> + 2. Veli Ekle
                                        </>
                                    )}
                                </button>
                            </div>

                            {hasParent2 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                                2. Veli Adı Soyadı
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Örn: Mehmet Yılmaz"
                                                value={parent2Name}
                                                onChange={(e) => setParent2Name(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                                Yakınlık Derecesi
                                            </label>
                                            <select
                                                value={parent2Relationship}
                                                onChange={(e) => setParent2Relationship(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="Baba">Baba</option>
                                                <option value="Anne">Anne</option>
                                                <option value="Vasi">Vasi</option>
                                                <option value="Büyükanne / Büyükbaba">Büyükanne / Büyükbaba</option>
                                                <option value="Abla / Ağabey">Abla / Ağabey</option>
                                                <option value="Diğer">Diğer</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                <FaPhone className="text-slate-400" /> Telefon Numarası
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="05XX XXX XX XX"
                                                value={parent2Phone}
                                                onChange={(e) => setParent2Phone(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                                <FaEnvelope className="text-slate-400" /> E-posta Adresi
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="veli2@ornek.com"
                                                value={parent2Email}
                                                onChange={(e) => setParent2Email(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                                            <FaStickyNote className="text-slate-400" /> 2. Veli Notları
                                        </label>
                                        <textarea
                                            rows="2"
                                            placeholder="İkincil iletişim notları..."
                                            value={parent2Notes}
                                            onChange={(e) => setParent2Notes(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 resize-none"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="pt-4 border-t border-border flex items-center justify-end space-x-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 active:scale-98 cursor-pointer"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <FaCheck className="text-xs" />
                                        <span>{isEdit ? 'Değişiklikleri Kaydet' : 'Öğrenciyi Kaydet'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default StudentModal;
