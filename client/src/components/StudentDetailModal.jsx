import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit2,
  User,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  Calendar,
  School,
  StickyNote,
  Users,
  Snowflake,
  UserCheck,
  Hash
} from 'lucide-react';

const StudentDetailModal = ({
  isOpen,
  onClose,
  student,
  classData,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'auth' | 'guardians' | 'class'
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen || !student) return null;

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const username = student.userId?.username || student.username || '';
  const email = student.userId?.email || student.email || '';
  const initialPassword = student.initialPassword || '';
  const pairingCode = student.pairingCode || '';

  const parent1 = student.parent1 || (student.guardians && student.guardians[0]) || null;
  const parent2 = student.parent2 || (student.guardians && student.guardians[1]) || null;

  const tabs = [
    { id: 'personal', label: 'Temel Bilgiler', icon: User },
    { id: 'auth', label: 'Giriş & Hesap', icon: Key },
    { id: 'guardians', label: 'Veli Bilgileri', icon: Users },
    { id: 'class', label: 'Sınıf & Okul', icon: School }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 flex flex-col max-h-[90vh]"
        >
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border-b border-slate-800/80 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md shrink-0 border ${
                    student.status === 'frozen'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-purple-600/25 text-purple-300 border-purple-500/40'
                  }`}
                >
                  {student.firstName?.[0]}{student.lastName?.[0]}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {student.firstName} {student.lastName}
                    </h3>
                    {student.status === 'frozen' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Snowflake className="w-3 h-3" /> Donduruldu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <UserCheck className="w-3 h-3" /> Aktif Öğrenci
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <span>No: <strong className="text-slate-200">{student.studentNumber || '-'}</strong></span>
                    {student.schoolNumber && (
                      <>
                        <span>•</span>
                        <span>Okul No: <strong className="text-slate-200">{student.schoolNumber}</strong></span>
                      </>
                    )}
                    {classData?.name && (
                      <>
                        <span>•</span>
                        <span className="text-purple-300 font-medium">{classData.name}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onEdit) onEdit(student);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Öğrenci Bilgilerini Düzenle"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Düzenle</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-1 scrollbar-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
            {/* 1. PERSONAL INFORMATION */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Adı Soyadı</p>
                    <p className="text-sm font-semibold text-white">
                      {student.firstName} {student.lastName}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">T.C. Kimlik Numarası</p>
                    <p className="text-sm font-mono font-medium text-cyan-300">
                      {student.nationalIdMasked || 'Belirtilmedi'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Sınıf Öğrenci No / Okul No</p>
                    <p className="text-sm font-medium text-white">
                      {student.studentNumber || '-'} {student.schoolNumber ? `(Okul No: ${student.schoolNumber})` : ''}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Cinsiyet</p>
                    <p className="text-sm font-medium text-white">
                      {student.gender === 'female' || student.gender === 'Kız'
                        ? 'Kız'
                        : student.gender === 'male' || student.gender === 'Erkek'
                        ? 'Erkek'
                        : 'Belirtilmedi'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Doğum Tarihi</p>
                    <p className="text-sm font-medium text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {student.birthDate
                        ? new Date(student.birthDate).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        : 'Belirtilmedi'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Telefon / İletişim</p>
                    <p className="text-sm font-medium text-white flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {student.phone || 'Öğrenci telefonu girilmedi'}
                    </p>
                  </div>
                </div>

                {/* Adres */}
                <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>İkametgah / Ev Adresi</span>
                  </p>
                  <p className="text-sm text-slate-200">
                    {student.address || 'Adres bilgisi girilmedi.'}
                  </p>
                </div>

                {/* Öğretmen Notları */}
                {student.notes && (
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                      <span>Öğretmen Özel Notları</span>
                    </p>
                    <p className="text-sm text-slate-300 italic">"{student.notes}"</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. AUTH & LOGIN CREDENTIALS */}
            {activeTab === 'auth' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-purple-300 block mb-0.5">Öğrenci Giriş Bilgileri</strong>
                    Öğrenci sisteme bu bilgiler ile veya davet / eşleştirme kodu ile giriş yapabilir. Bilgileri kopyalayıp öğrenciye veya velisine iletebilirsiniz.
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Kullanıcı Adı */}
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">Öğrenci Kullanıcı Adı</p>
                      <p className="text-sm font-semibold text-white font-mono truncate">
                        {username || 'Hesap bulunamadı'}
                      </p>
                    </div>
                    {username && (
                      <button
                        type="button"
                        onClick={() => handleCopy(username, 'username')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === 'username' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* E-posta */}
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">Giriş E-postası</p>
                      <p className="text-sm font-semibold text-white truncate">
                        {email || 'E-posta tanımlanmamış'}
                      </p>
                    </div>
                    {email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(email, 'email')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === 'email' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Şifre */}
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">Giriş Şifresi (İlk Belirlenen)</p>
                      <p className="text-sm font-mono font-semibold text-amber-300 truncate">
                        {initialPassword ? (
                          showPassword ? initialPassword : '••••••••••••'
                        ) : (
                          <span className="text-slate-400 font-sans font-normal text-xs">
                            Şifre belirlenmedi (Öğrenci veya veli şifre belirlemiş olabilir)
                          </span>
                        )}
                      </p>
                    </div>
                    {initialPassword && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors cursor-pointer"
                          title={showPassword ? 'Gizle' : 'Göster'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(initialPassword, 'password')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
                        >
                          {copiedKey === 'password' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sınıf Davet / Eşleştirme Kodu */}
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Öğrenci Eşleştirme Kodu</p>
                      <p className="text-sm font-mono font-bold text-purple-400 tracking-wider">
                        {pairingCode || '-'}
                      </p>
                    </div>
                    {pairingCode && (
                      <button
                        type="button"
                        onClick={() => handleCopy(pairingCode, 'pairingCode')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === 'pairingCode' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. GUARDIANS */}
            {activeTab === 'guardians' && (
              <div className="space-y-4">
                {/* 1. Veli */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/60">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      1. Veli Bilgileri {parent1?.relationship ? `(${parent1.relationship})` : ''}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Birincil İletişim
                    </span>
                  </div>

                  {parent1 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 mb-0.5">Adı Soyadı</p>
                        <p className="text-sm font-semibold text-white">{parent1.name || parent1.fullName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Yakınlık</p>
                        <p className="text-sm font-medium text-slate-200">{parent1.relationship || 'Anne'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Telefon Numarası</p>
                        {parent1.phone || parent1.phonePrimary ? (
                          <a
                            href={`tel:${parent1.phone || parent1.phonePrimary}`}
                            className="text-sm font-medium text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {parent1.phone || parent1.phonePrimary}
                          </a>
                        ) : (
                          <p className="text-slate-400">-</p>
                        )}
                      </div>
                      {parent1.phoneSecondary && (
                        <div>
                          <p className="text-slate-400 mb-0.5">İkincil Telefon</p>
                          <a
                            href={`tel:${parent1.phoneSecondary}`}
                            className="text-sm font-medium text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {parent1.phoneSecondary}
                          </a>
                        </div>
                      )}
                      {parent1.email && (
                        <div className="sm:col-span-2">
                          <p className="text-slate-400 mb-0.5">Veli E-postası</p>
                          <a
                            href={`mailto:${parent1.email}`}
                            className="text-sm font-medium text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            {parent1.email}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">1. Veli bilgisi tanımlanmamış.</p>
                  )}
                </div>

                {/* 2. Veli */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/60">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      2. Veli Bilgileri {parent2?.relationship ? `(${parent2.relationship})` : ''}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      İkincil İletişim
                    </span>
                  </div>

                  {parent2 && (parent2.name || parent2.fullName) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 mb-0.5">Adı Soyadı</p>
                        <p className="text-sm font-semibold text-white">{parent2.name || parent2.fullName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Yakınlık</p>
                        <p className="text-sm font-medium text-slate-200">{parent2.relationship || 'Baba'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Telefon Numarası</p>
                        {parent2.phone || parent2.phonePrimary ? (
                          <a
                            href={`tel:${parent2.phone || parent2.phonePrimary}`}
                            className="text-sm font-medium text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {parent2.phone || parent2.phonePrimary}
                          </a>
                        ) : (
                          <p className="text-slate-400">-</p>
                        )}
                      </div>
                      {parent2.phoneSecondary && (
                        <div>
                          <p className="text-slate-400 mb-0.5">İkincil Telefon</p>
                          <a
                            href={`tel:${parent2.phoneSecondary}`}
                            className="text-sm font-medium text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {parent2.phoneSecondary}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">2. Veli bilgisi tanımlanmamış veya isteğe bağlı olarak boş bırakılmış.</p>
                  )}
                </div>
              </div>
            )}

            {/* 4. CLASS & SCHOOL */}
            {activeTab === 'class' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Kayıtlı Sınıf</p>
                    <p className="text-sm font-bold text-purple-300">
                      {classData?.name || student.classId?.name || 'Sınıf atanmadı'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Şube & Seviye</p>
                    <p className="text-sm font-medium text-white">
                      {classData?.grade ? `${classData.grade}. Sınıf` : ''} {classData?.section ? `(${classData.section} Şubesi)` : ''}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Kurum / Okul Adı</p>
                    <p className="text-sm font-medium text-white">
                      {classData?.schoolName || student.schoolName || 'Merkez İlkokulu'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-xs text-slate-400 mb-1">Eğitim Yılı</p>
                    <p className="text-sm font-medium text-white">
                      {classData?.academicYear || '2024 - 2025'}
                    </p>
                  </div>
                </div>

                {classData?.matchingCode && (
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-indigo-300 mb-0.5">Sınıf Katılım Kodu</p>
                      <p className="text-sm font-mono font-bold text-white tracking-widest">
                        {classData.matchingCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(classData.matchingCode, 'classCode')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                    >
                      {copiedKey === 'classCode' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-slate-500">
              ID: <span className="font-mono">{student._id}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onEdit) onEdit(student);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Düzenle</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StudentDetailModal;
