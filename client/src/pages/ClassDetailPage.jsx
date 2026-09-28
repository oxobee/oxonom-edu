import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Presentation,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Phone,
  Mail,
  Search,
  Key,
  RotateCw,
  Copy,
  Check,
  Building,
  MapPin,
  Snowflake,
  UserCheck,
  User,
  StickyNote,
  CalendarCheck,
  Sparkles
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Button, Card, Badge, EmptyState, Input, AnimatedItem } from '../components/ui';
import BoardsManager from '../components/BoardsManager';
import StudentModal from '../components/StudentModal';
import StudentDetailModal from '../components/StudentDetailModal';
import CreateClassModal from '../components/CreateClassModal';
import ClassAttendanceTab from '../components/ClassAttendanceTab';

const ClassDetailPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTeacher = user?.role === 'teacher';

  const [classData, setClassData] = useState(null);
  const [allClasses, setAllClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Active tab: 'boards' | 'students'
  const [activeTab, setActiveTab] = useState('boards');

  // Modals
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedDetailStudent, setSelectedDetailStudent] = useState(null);

  // Search students
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [deletingStudentId, setDeletingStudentId] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);

  const handleCopyCode = () => {
    if (!classData?.matchingCode) return;
    navigator.clipboard.writeText(classData.matchingCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('Eşleşme kodunu yenilemek istediğinize emin misiniz? Eski kod artık kullanılamayacak.')) {
      return;
    }
    try {
      setRegeneratingCode(true);
      const res = await api.post(`/api/classes/${classId}/regenerate-code`);
      setClassData((prev) => ({ ...prev, matchingCode: res.data.matchingCode }));
      alert('Eşleşme kodu başarıyla yenilendi: ' + res.data.matchingCode);
    } catch (err) {
      console.error('Kod yenilenemedi:', err);
      alert('Eşleşme kodu yenilenirken bir hata oluştu.');
    } finally {
      setRegeneratingCode(false);
    }
  };

  useEffect(() => {
    if (!isTeacher && user?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }
    fetchClassData();
    fetchAllClasses();
    fetchStudents();
  }, [classId]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab, classId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/classes/${classId}`);
      setClassData(res.data);
    } catch (err) {
      console.error('Sınıf detayı alınamadı:', err);
      navigate('/classes', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setAllClasses(res.data || []);
    } catch (err) {
      console.error('Sınıf listesi alınamadı:', err);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      let res;
      try {
        res = await api.get(`/api/classes/${classId}/students`);
      } catch {
        res = await api.get(`/api/students?classId=${classId}`);
      }
      setStudents(res.data || []);
    } catch (err) {
      console.error('Öğrenciler yüklenemedi:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!window.confirm('Bu sınıfı ve içindeki tüm verileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    try {
      await api.delete(`/api/classes/${classId}`);
      navigate('/classes', { replace: true });
    } catch (err) {
      console.error('Sınıf silinemedi:', err);
      alert('Sınıf silinirken bir hata oluştu.');
    }
  };

  const handleDeleteStudent = async (studentId, e) => {
    e.stopPropagation();
    if (!window.confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      setDeletingStudentId(studentId);
      await api.delete(`/api/students/${studentId}`);
      setStudents((prev) => prev.filter((s) => s._id !== studentId));
      if (classData) {
        setClassData((prev) => ({
          ...prev,
          studentCount: Math.max(0, (prev.studentCount || 1) - 1)
        }));
      }
    } catch (err) {
      console.error('Öğrenci silinemedi:', err);
      alert('Öğrenci silinirken bir hata oluştu.');
    } finally {
      setDeletingStudentId(null);
    }
  };

  const handleStudentSaved = () => {
    fetchStudents();
    if (classData) {
      setClassData((prev) => ({
        ...prev,
        studentCount: (prev.studentCount || 0) + (editingStudent ? 0 : 1)
      }));
    }
    setEditingStudent(null);
  };

  const handleToggleFreeze = async (student, e) => {
    e.stopPropagation();
    if (student.status === 'frozen') {
      if (!window.confirm(`${student.firstName} ${student.lastName} isimli öğrencinin kaydı tekrar aktif edilsin mi?`)) {
        return;
      }
      try {
        await api.patch(`/api/students/${student._id}`, { status: 'active', freezeReason: '' });
        fetchStudents();
      } catch (err) {
        console.error('Kayıt aktif edilemedi:', err);
        alert(err.response?.data?.message || 'Hata oluştu.');
      }
    } else {
      const reason = window.prompt(`${student.firstName} ${student.lastName} kaydını dondurma sebebini yazınız (zorunlu):`);
      if (reason === null) return;
      if (!reason.trim()) {
        alert('Dondurma sebebi zorunludur!');
        return;
      }
      try {
        await api.patch(`/api/students/${student._id}`, { status: 'frozen', freezeReason: reason.trim() });
        fetchStudents();
      } catch (err) {
        console.error('Kayıt dondurulamadı:', err);
        alert(err.response?.data?.message || 'Hata oluştu.');
      }
    }
  };

  const filteredStudents = students.filter((s) => {
    const query = studentSearchTerm.toLowerCase().trim();
    if (!query) return true;
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const p1Name = (s.parent1?.name || s.parentName || '').toLowerCase();
    const p1Phone = (s.parent1?.phone || s.parentPhone || '').toLowerCase();
    const p2Name = (s.parent2?.name || '').toLowerCase();
    const p2Phone = (s.parent2?.phone || '').toLowerCase();
    return (
      fullName.includes(query) ||
      (s.studentNumber && s.studentNumber.toLowerCase().includes(query)) ||
      (s.schoolNumber && s.schoolNumber.toLowerCase().includes(query)) ||
      p1Name.includes(query) ||
      p1Phone.includes(query) ||
      p2Name.includes(query) ||
      p2Phone.includes(query)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Sınıf yükleniyor...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!classData) return null;

  return (
    <DashboardLayout>
      <PageHeader
        backTo="/classes"
        breadcrumbs={[
          { label: 'Sınıflarım', path: '/classes' },
          { label: classData.name }
        ]}
        title={classData.name}
        description={classData.description || 'Sınıf tahtaları ve kayıtlı öğrenci listesi.'}
        badge={
          <Badge color="primary" size="sm">
            {classData.academicYear || 'Aktif Dönem'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Edit2}
              onClick={() => setIsEditClassOpen(true)}
            >
              Düzenle
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={Trash2}
              onClick={handleDeleteClass}
            >
              Sınıfı Sil
            </Button>
          </div>
        }
      />

      {/* Redesigned Premium Hero Banner */}
      <div className="mb-6 rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow accent highlights */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Left Info Column */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                {classData.name || 'Sınıf'}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
                {classData.academicYear || '2024-2025'}
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                {classData.schoolName || 'Okul Belirtilmedi'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Sınıf Öğretmeni: <span className="text-slate-200 font-medium">{classData.teacherName || user.username || 'Öğretmen'}</span>
              </p>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Şube</div>
                  <div className="text-xs font-semibold text-white truncate">
                    {classData.grade ? `${classData.grade}/${classData.section || ''}` : classData.name}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Öğrenci</div>
                  <div className="text-xs font-semibold text-emerald-400 truncate">
                    {(students.length > 0 ? students.length : (classData?.studentCount || 0))} Kayıtlı
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                  <Presentation className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Tahta</div>
                  <div className="text-xs font-semibold text-white truncate">
                    {classData.boardCount || 0} Aktif
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Yoklama</div>
                  <div className="text-xs font-semibold text-purple-300 truncate">
                    Hazır
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sınıf Eşleşme Kodu Card */}
          <div className="w-full lg:w-auto shrink-0 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 backdrop-blur-md shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" /> Sınıf Eşleşme Kodu
              </span>
              <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                Öğrenci Kaydı
              </span>
            </div>

            <div className="px-4 py-2.5 bg-black/60 border border-cyan-500/30 rounded-xl font-mono text-lg font-bold text-cyan-300 tracking-widest text-center select-all shadow-inner">
              {classData.matchingCode || 'KOD YOK'}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <Button
                variant={codeCopied ? 'success' : 'primary'}
                size="sm"
                leftIcon={codeCopied ? Check : Copy}
                onClick={handleCopyCode}
                className="flex-1"
              >
                {codeCopied ? 'Kopyalandı' : 'Kodu Kopyala'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                leftIcon={RotateCw}
                isLoading={regeneratingCode}
                onClick={handleRegenerateCode}
                title="Eski kod iptal olur, yeni kod üretilir"
              >
                Yenile
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Tahtalar | Öğrenciler | Yoklama */}
      <div className="flex items-center gap-2 border-b border-border/80 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('boards')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'boards'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <Presentation className="w-4 h-4" />
          <span>Tahtalar</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'boards' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-muted text-muted-foreground'
            }`}
          >
            {classData.boardCount || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'students'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Öğrenciler</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'students' ? 'bg-purple-500/20 text-purple-300' : 'bg-muted text-muted-foreground'
            }`}
          >
            {students.length > 0 ? students.length : (classData?.studentCount || 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Yoklama</span>
        </button>
      </div>

      {/* TAB 1: TAHTALAR */}
      {activeTab === 'boards' && (
        <motion.div
          key="boards-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <BoardsManager
            classId={classId}
            availableClasses={allClasses}
            onBoardCreated={() => {
              setClassData((prev) => ({
                ...prev,
                boardCount: (prev.boardCount || 0) + 1
              }));
            }}
          />
        </motion.div>
      )}

      {/* TAB 2: ÖĞRENCİLER */}
      {activeTab === 'students' && (
        <motion.div
          key="students-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Öğrenci adı, numara veya veli ara..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                leftIcon={Search}
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={UserPlus}
              onClick={() => {
                setEditingStudent(null);
                setIsStudentModalOpen(true);
              }}
            >
              Yeni Öğrenci Ekle
            </Button>
          </div>

          {/* Student Cards */}
          {studentsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Öğrenciler yükleniyor...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title={studentSearchTerm ? 'Öğrenci bulunamadı' : 'Bu sınıfta henüz öğrenci yok'}
              description={
                studentSearchTerm
                  ? 'Farklı bir arama kriteri deneyebilirsiniz.'
                  : 'Sınıfınıza öğrenci ekleyerek veli iletişim bilgilerini ve özel notlarını düzenleyin.'
              }
              actionLabel={!studentSearchTerm ? 'İlk Öğrenciyi Ekle' : undefined}
              actionIcon={Plus}
              onAction={() => {
                setEditingStudent(null);
                setIsStudentModalOpen(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredStudents.map((s, idx) => (
                <AnimatedItem
                  key={s._id}
                  index={idx}
                  onClick={() => setSelectedDetailStudent(s)}
                  className="bg-slate-900/80 hover:bg-slate-900/95 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow-sm shrink-0 ${
                            s.status === 'frozen'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-white group-hover:text-purple-200 transition-colors">
                              {s.firstName} {s.lastName}
                            </h4>
                            {s.status === 'frozen' && (
                              <Badge color="warning" size="sm">
                                <Snowflake className="w-3 h-3 mr-1" /> Donduruldu
                              </Badge>
                            )}
                            {s.studentNumber && (
                              <Badge color="neutral" size="sm">
                                No: {s.studentNumber}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                            {s.nationalIdMasked && (
                              <span className="font-mono text-cyan-300/90 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40 text-[11px]" title="T.C. Kimlik No">
                                {s.nationalIdMasked}
                              </span>
                            )}
                            {s.gender && s.gender !== 'unspecified' && (
                              <span>{s.gender === 'female' ? 'Kız' : 'Erkek'}</span>
                            )}
                            {s.birthDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(s.birthDate).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>

                          {s.address && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                              <span className="truncate max-w-xs">{s.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFreeze(s, e);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            s.status === 'frozen'
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title={s.status === 'frozen' ? 'Kaydı Aktif Et' : 'Kaydı Dondur'}
                        >
                          {s.status === 'frozen' ? <UserCheck className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStudent(s);
                            setIsStudentModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Düzenle / Sınıf Değiştir"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudent(s._id, e);
                          }}
                          disabled={deletingStudentId === s._id}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Freeze Notice */}
                    {s.status === 'frozen' && s.freezeReason && (
                      <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2">
                        <Snowflake className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-300">Dondurulma Sebebi:</strong> {s.freezeReason}
                        </div>
                      </div>
                    )}

                    {/* Student Notes */}
                    {s.notes && (
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 mb-3 flex items-start gap-2">
                        <StickyNote className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{s.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Parents Details Cards */}
                  <div className="pt-3 border-t border-slate-800/80 bg-slate-950/40 -mx-5 -mb-5 p-4 rounded-b-2xl space-y-3">
                    {s.guardians && s.guardians.length > 0 ? (
                      s.guardians.map((g, gIdx) => (
                        <div key={g._id || gIdx} className={gIdx > 0 ? 'pt-2 border-t border-slate-800/50' : ''}>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-purple-400" />
                              {gIdx + 1}. Veli: {g.fullName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-400">
                              {g.relationship}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            {g.phonePrimary && (
                              <a
                                href={`tel:${g.phonePrimary}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                                {g.phonePrimary}
                              </a>
                            )}
                            {g.phoneSecondary && (
                              <a
                                href={`tel:${g.phoneSecondary}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-400 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                                2. Tel: {g.phoneSecondary}
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        {(() => {
                          const p1 = s.parent1 || {
                            name: s.parentName,
                            relationship: s.parentRelationship,
                            phone: s.parentPhone,
                            email: s.parentEmail,
                          };
                          return (
                            <div>
                              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-purple-400" />
                                  1. Veli: {p1?.name || 'Belirtilmedi'}
                                </span>
                                {p1?.relationship && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-400">
                                    {p1.relationship}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs">
                                {p1?.phone && (
                                  <a
                                    href={`tel:${p1.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {p1.phone}
                                  </a>
                                )}
                                {p1?.email && (
                                  <a
                                    href={`mailto:${p1.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                                  >
                                    <Mail className="w-3 h-3" />
                                    {p1.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {s.parent2 && s.parent2.name && (
                          <div className="pt-2 border-t border-slate-800/50">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-indigo-400" />
                                2. Veli: {s.parent2.name}
                              </span>
                              {s.parent2.relationship && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-400">
                                  {s.parent2.relationship}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              {s.parent2.phone && (
                                <a
                                  href={`tel:${s.parent2.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                                >
                                  <Phone className="w-3 h-3" />
                                  {s.parent2.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AnimatedItem>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* TAB 3: YOKLAMA */}
      {activeTab === 'attendance' && (
        <motion.div
          key="attendance-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <ClassAttendanceTab classId={classId} />
        </motion.div>
      )}

      {/* Modals */}
      <CreateClassModal
        isOpen={isEditClassOpen}
        onClose={() => setIsEditClassOpen(false)}
        onSuccess={(updated) => {
          setClassData((prev) => ({ ...prev, ...updated }));
          setIsEditClassOpen(false);
          fetchClassData();
        }}
        initialData={classData}
      />

      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSuccess={handleStudentSaved}
        classId={classId}
        classes={allClasses}
        student={editingStudent}
      />

      <StudentDetailModal
        isOpen={!!selectedDetailStudent}
        onClose={() => setSelectedDetailStudent(null)}
        student={selectedDetailStudent}
        classData={classData}
        onEdit={(st) => {
          setSelectedDetailStudent(null);
          setEditingStudent(st);
          setIsStudentModalOpen(true);
        }}
      />
    </DashboardLayout>
  );
};

export default ClassDetailPage;
