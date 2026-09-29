import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Blocks,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  School,
  Settings2,
  X,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Check,
  Info,
  Layers,
  GraduationCap,
  Eye,
  ArrowUpRight,
  Filter,
  LayoutGrid,
  ListTree
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import ModuleMediaSlider from '../components/ModuleMediaSlider';
import LetterWritingScreen from '../components/LetterWritingScreen';
import ReadingScreen from '../components/ReadingScreen';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  EmptyState
} from '../components/ui';

// MEB Müfredatına Uygun Ders / Alan Tanımları
const SUBJECT_DEFINITIONS = [
  {
    key: 'turkce',
    name: 'Türkçe & Okuma-Yazma',
    icon: '📖',
    badgeVariant: 'primary',
    description: 'Hızlı okuma, dik temel abece, ses grupları ve harf yazılış yönü atölyeleri',
    colorBorder: 'border-blue-500/30 dark:border-blue-500/20',
    colorBg: 'bg-blue-500/5',
    colorText: 'text-blue-500 dark:text-blue-400'
  },
  {
    key: 'matematik',
    name: 'Matematik',
    icon: '🔢',
    badgeVariant: 'success',
    description: 'Ritmik sayma, yüzlük tablo, sayı doğrusu ve temel işlem atölyeleri',
    colorBorder: 'border-emerald-500/30 dark:border-emerald-500/20',
    colorBg: 'bg-emerald-500/5',
    colorText: 'text-emerald-500 dark:text-emerald-400'
  },
  {
    key: 'fen',
    name: 'Fen Bilimleri',
    icon: '🔬',
    badgeVariant: 'warning',
    description: 'Güneş sistemi, gezegenler, mevsimler ve etkileşimli doğa simülasyonları',
    colorBorder: 'border-purple-500/30 dark:border-purple-500/20',
    colorBg: 'bg-purple-500/5',
    colorText: 'text-purple-500 dark:text-purple-400'
  },
  {
    key: 'araclar',
    name: 'Tahta & Sınıf Araçları',
    icon: '🛠️',
    badgeVariant: 'outline',
    description: 'Akıllı tahta sınıf yönetimi, kura çarkı, grup oluşturucu ve yarışma kronometresi',
    colorBorder: 'border-amber-500/30 dark:border-amber-500/20',
    colorBg: 'bg-amber-500/5',
    colorText: 'text-amber-500 dark:text-amber-400'
  }
];

// Modülün hangi ana derse ait olduğunu belirleyen yardımcı
function getModuleSubjectKey(mod) {
  const subj = (mod.subject || '').toLowerCase();
  const cat = (mod.category || '').toLowerCase();
  if (subj.includes('türk') || cat.includes('okuma') || cat.includes('yaz') || cat.includes('harf') || cat.includes('abece')) {
    return 'turkce';
  }
  if (subj.includes('mat') || cat.includes('sayı') || cat.includes('ritmik') || cat.includes('hesap')) {
    return 'matematik';
  }
  if (subj.includes('fen') || cat.includes('uzay') || cat.includes('gezegen') || cat.includes('doğa')) {
    return 'fen';
  }
  return 'araclar';
}

const ModulesPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [modules, setModules] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(user.role || 'teacher');
  const [studentClassInfo, setStudentClassInfo] = useState(null);

  // Standalone Running Module (Tahtaya ihtiyaç duymadan doğrudan çalıştırma)
  const [activeRunningModule, setActiveRunningModule] = useState(null); // 'harf-cizgi-atolyesi' | '1-dk-okuma'

  // --- KATEGORİZASYON VE FİLTRE STATE'LERİ ---
  // 1. Sınıf Filtresi (Öğretmenler için: 'all' veya classId)
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  // 2. Ders Filtresi (Hem öğrenci hem öğretmen için: 'all' veya 'turkce' | 'matematik' | 'fen' | 'araclar')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // 3. Öğretmen Gruplama Modu: 'by-subject' (Derslere Göre) veya 'by-class' (Sınıflara Göre)
  const [teacherGroupingMode, setTeacherGroupingMode] = useState('by-subject');

  // Detail Modal state
  const [selectedModule, setSelectedModule] = useState(null);

  // Assign Classes Modal state
  const [assigningModule, setAssigningModule] = useState(null);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/modules');
      setModules(res.data.modules || []);
      setTeacherClasses(res.data.teacherClasses || []);
      if (res.data.role) setUserRole(res.data.role);
      if (res.data.studentClass) setStudentClassInfo(res.data.studentClass);
    } catch (err) {
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (moduleItem) => {
    setSelectedModule(moduleItem);
    const initialSelected = (moduleItem.assignedClasses || []).map(c => c._id);
    setSelectedClassIds(initialSelected);
  };

  const handleOpenAssignModal = (moduleItem) => {
    setAssigningModule(moduleItem);
    const initialSelected = (moduleItem.assignedClasses || []).map(c => c._id);
    setSelectedClassIds(initialSelected);
    setAssignmentFeedback(null);
  };

  const handleToggleClass = (classId) => {
    setSelectedClassIds(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSelectAllClasses = () => {
    setSelectedClassIds(teacherClasses.map(c => c._id));
  };

  const handleClearAllClasses = () => {
    setSelectedClassIds([]);
  };

  const handleSaveAssignment = async (moduleKeyToSave) => {
    const key = moduleKeyToSave || assigningModule?.key;
    if (!key) return;

    setSavingAssignment(true);
    setAssignmentFeedback(null);
    try {
      await api.post('/api/modules/assign-classes', {
        moduleKey: key,
        classIds: selectedClassIds
      });

      setAssignmentFeedback({
        type: 'success',
        message: 'Modül sınıf yetkileri başarıyla güncellendi!'
      });

      await fetchModules();

      setTimeout(() => {
        setAssigningModule(null);
        setAssignmentFeedback(null);
      }, 900);
    } catch (err) {
      console.error('Error saving module assignment:', err);
      setAssignmentFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Sınıf ataması kaydedilemedi.'
      });
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleLaunchModule = (mod) => {
    if (mod.key === 'harf-cizgi-atolyesi' || mod.key === '1-dk-okuma') {
      setActiveRunningModule(mod.key);
    } else {
      // Diğer modüller için zengin tanıtım modalını aç
      handleOpenDetails(mod);
    }
  };

  // --- FİLTRELENMİŞ MODÜLLER HESAPLAMASI ---
  const targetClass = teacherClasses.find(c => c._id === selectedClassFilter);

  // Sınıf filtresine uyan modüller
  const classFilteredModules = useMemo(() => {
    return modules.filter(m => {
      if (userRole === 'student') return true; // Öğrenci zaten sadece kendi sınıfının modüllerini alıyor
      if (selectedClassFilter === 'all') return true;
      if (!targetClass) return true;
      return (targetClass.enabledModules || []).includes(m.key);
    });
  }, [modules, selectedClassFilter, targetClass, userRole]);

  // Hem sınıf hem ders filtresine uyan modüller
  const fullyFilteredModules = useMemo(() => {
    return classFilteredModules.filter(m => {
      if (selectedSubjectFilter === 'all') return true;
      return getModuleSubjectKey(m) === selectedSubjectFilter;
    });
  }, [classFilteredModules, selectedSubjectFilter]);

  // Ders bazlı modül sayıları
  const subjectCounts = useMemo(() => {
    const counts = { all: classFilteredModules.length };
    SUBJECT_DEFINITIONS.forEach(s => {
      counts[s.key] = classFilteredModules.filter(m => getModuleSubjectKey(m) === s.key).length;
    });
    return counts;
  }, [classFilteredModules]);

  // Tekil Modül Kartı Render Bileşeni
  const renderModuleCard = (mod) => {
    const isAssignedToAny = mod.assignedCount > 0;
    const assignedNames = (mod.assignedClasses || []).map(c => c.name).join(', ');
    const subjectInfo = SUBJECT_DEFINITIONS.find(s => s.key === getModuleSubjectKey(mod)) || SUBJECT_DEFINITIONS[0];

    return (
      <motion.div
        key={mod._id}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col"
      >
        <Card
          onClick={() => handleOpenDetails(mod)}
          className="cursor-pointer group flex flex-col h-full overflow-hidden rounded-2xl border border-border/80 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 bg-card/60 hover:bg-card/90 backdrop-blur-xs select-none"
        >
          {/* 16:9 Cover Image / Media Slider Container */}
          <div className="relative aspect-video w-full overflow-hidden bg-slate-950 border-b border-border/60">
            <ModuleMediaSlider
              module={mod}
              inModal={false}
              onMediaClick={() => handleOpenDetails(mod)}
            />

            {/* Üst Kategori & Rozetler */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-black/70 backdrop-blur-md text-white/90 border border-white/15 shadow-sm flex items-center gap-1.5">
                <span>{subjectInfo.icon}</span>
                <span>{subjectInfo.name}</span>
              </span>

              {mod.badgeText && (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1">
                  {mod.badgeText}
                </span>
              )}
            </div>

            {/* Alt Kademeler */}
            {mod.targetGrades && mod.targetGrades.length > 0 && (
              <div className="absolute bottom-3 left-3 text-xs text-white pointer-events-none z-10">
                <span className="inline-flex items-center gap-1.5 text-[11px] bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full font-medium text-slate-200 border border-white/15">
                  <GraduationCap className="w-3 h-3 text-amber-400" />
                  {mod.targetGrades.map(g => `${g}. Sınıf`).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Kart İçeriği */}
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {mod.title}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-muted/60 group-hover:bg-primary/10 border border-border/60 group-hover:border-primary/20 flex items-center justify-center shrink-0 transition-all">
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {mod.shortDescription}
              </p>

              {/* Özellik Etiketleri */}
              {mod.features && mod.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {mod.features.slice(0, 3).map((feat, fIdx) => (
                    <span
                      key={fIdx}
                      className="text-[10px] px-2.5 py-0.5 rounded-md bg-muted/50 text-foreground/80 border border-border/50 font-medium"
                    >
                      {feat}
                    </span>
                  ))}
                  {mod.features.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground border border-border/30">
                      +{mod.features.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Kart Altı: Sınıf Durumu & Aksiyon Butonları */}
            <div className="pt-3 border-t border-border/60 space-y-3">
              {/* Sınıf Durumu (Öğretmenler için) */}
              {userRole !== 'student' && (
                <div className="flex items-center justify-between gap-2 text-xs py-2 px-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-muted-foreground font-medium text-[11px] shrink-0">Sınıf Durumu:</span>
                  {isAssignedToAny ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 truncate text-right">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{mod.assignedCount} Sınıfta Etkin ({assignedNames})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                      <span>Tümünde Pasif</span>
                    </span>
                  )}
                </div>
              )}

              {/* Aksiyon Butonları */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchModule(mod);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.98]"
                  title="Modülü Başlat"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Modülü Başlat</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetails(mod);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-border/80 hover:border-primary/40 bg-card hover:bg-muted/70 text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap active:scale-[0.98] shadow-2xs"
                  title="İncele"
                >
                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>İncele</span>
                </button>

                {userRole !== 'student' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAssignModal(mod);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs whitespace-nowrap active:scale-[0.98]"
                    title="Sınıf Yetkilerini Ata"
                  >
                    <Settings2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Ata</span>
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Sayfa Başlığı */}
        <PageHeader
          breadcrumbs={[
            { label: 'Panelim', to: '/dashboard' },
            { label: 'Modüller' }
          ]}
          badge="✨ Eğitim & Akıllı Tahta Araçları"
          badgeVariant="primary"
          title="Ders & Eğitim Modülleri"
          description={
            userRole === 'student'
              ? 'Sınıfınıza özel olarak tanımlanmış interaktif ders modülleri aşağıda derslere göre kategorize edilmiştir.'
              : 'Derslerinizi ve akıllı tahta deneyiminizi zenginleştiren modüller. Modülleri sınıflara ve ders alanlarına göre filtreleyebilir ve yönetebilirsiniz.'
          }
        />

        {/* ========================================================================= */}
        {/* A. ÖĞRENCİ PROFİLİ BİLGİ ALANI                                            */}
        {/* ========================================================================= */}
        {userRole === 'student' && studentClassInfo && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xl shrink-0 shadow-inner">
                🎓
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {studentClassInfo.name} ({studentClassInfo.grade}. Sınıf)
                  </h3>
                  <Badge variant="primary" size="xs">
                    {studentClassInfo.schoolName}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Öğretmeninizin sınıfınız için aktif ettiği ders modülleri aşağıda derslere göre kategorize edilmiştir.
                </p>
              </div>
            </div>
            <Badge variant="primary" size="sm" className="shrink-0 font-bold">
              {modules.length} Aktif Modül
            </Badge>
          </div>
        )}

        {/* ========================================================================= */}
        {/* B. ÖĞRETMEN PROFİLİ: SINIF VE DERS KATEGORİ ÇUBUKLARI                      */}
        {/* ========================================================================= */}
        {userRole !== 'student' && (
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
            {/* Üst Satır: Gruplama Modu Seçici & Özet */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Modül Kategori & Filtre Yönetimi
                </span>
                <span className="text-xs text-muted-foreground">
                  ({fullyFilteredModules.length} modül görüntüleniyor)
                </span>
              </div>

              {/* Gruplama Modu Butonları (Sınıfa Göre vs Derse Göre) */}
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTeacherGroupingMode('by-subject')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    teacherGroupingMode === 'by-subject'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Derslere Göre Grupla"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Derslere Göre Grupla</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTeacherGroupingMode('by-class')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    teacherGroupingMode === 'by-class'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Sınıflara Göre Grupla"
                >
                  <ListTree className="w-3.5 h-3.5" />
                  <span>Sınıflara Göre Grupla</span>
                </button>
              </div>
            </div>

            {/* 1. Kategori Satırı: SINIFLARA GÖRE FİLTRE */}
            {teacherClasses.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1.5 shrink-0 min-w-[100px]">
                  <School className="w-3.5 h-3.5 text-primary" />
                  Sınıf Seçimi:
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedClassFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedClassFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  Tüm Sınıflar ({modules.length})
                </button>

                {teacherClasses.map((cls) => {
                  const count = modules.filter(m => (cls.enabledModules || []).includes(m.key)).length;
                  return (
                    <button
                      key={cls._id}
                      type="button"
                      onClick={() => setSelectedClassFilter(cls._id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        selectedClassFilter === cls._id
                          ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                          : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>{cls.name}</span>
                      <span className="text-[10px] opacity-75">({cls.grade}. Sınıf)</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        selectedClassFilter === cls._id
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Kategori Satırı: DERSLERE GÖRE FİLTRE */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-border/40">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1.5 shrink-0 min-w-[100px]">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Ders Alanı:
              </span>

              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Tüm Dersler ({classFilteredModules.length})
              </button>

              {SUBJECT_DEFINITIONS.map((subj) => {
                const count = subjectCounts[subj.key] || 0;
                return (
                  <button
                    key={subj.key}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(subj.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      selectedSubjectFilter === subj.key
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{subj.icon}</span>
                    <span>{subj.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      selectedSubjectFilter === subj.key
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* C. ÖĞRENCİ PROFİLİ: DERS KATEGORİ ÇUBUĞU                                  */}
        {/* ========================================================================= */}
        {userRole === 'student' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedSubjectFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedSubjectFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              📚 Tüm Dersler ({classFilteredModules.length})
            </button>

            {SUBJECT_DEFINITIONS.map((subj) => {
              const count = subjectCounts[subj.key] || 0;
              if (count === 0) return null; // Öğrenci için sıfır olan dersi gizle

              return (
                <button
                  key={subj.key}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(subj.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedSubjectFilter === subj.key
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{subj.icon}</span>
                  <span>{subj.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedSubjectFilter === subj.key
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* D. MODÜL LİSTELEME ALANI (KATEGORİZE EDİLMİŞ GÖRÜNÜM)                     */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="p-20 text-center text-muted-foreground text-sm space-y-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Modüller yükleniyor...</p>
          </div>
        ) : fullyFilteredModules.length === 0 ? (
          <Card className="chrome-pattern p-12">
            <EmptyState
              icon={Blocks}
              title="Bu Kriterlere Uygun Modül Bulunamadı"
              description={
                userRole === 'student'
                  ? 'Öğretmeniniz seçtiğiniz ders için henüz bir modül aktif etmedi.'
                  : 'Seçtiğiniz sınıf veya ders alanında tanımlı modül bulunamadı. Filtreleri temizleyerek tüm modülleri inceleyebilirsiniz.'
              }
            />
          </Card>
        ) : (
          /* ======================================================================= */
          /* GÖRÜNÜM 1: DERSLERE GÖRE KATEGORİZE GÖRÜNÜM (ÖĞRENCİ VE ÖĞRETMEN İÇİN)   */
          /* ======================================================================= */
          userRole === 'student' || teacherGroupingMode === 'by-subject' ? (
            <div className="space-y-8">
              {SUBJECT_DEFINITIONS.map((subj) => {
                // Eğer tek bir ders filtrelendiyse diğerlerini atla
                if (selectedSubjectFilter !== 'all' && selectedSubjectFilter !== subj.key) {
                  return null;
                }

                // Bu derse ait modüller
                const subjectModules = fullyFilteredModules.filter(m => getModuleSubjectKey(m) === subj.key);
                if (subjectModules.length === 0) return null;

                return (
                  <div key={subj.key} className="space-y-4">
                    {/* Ders Kategorisi Başlık Kartı */}
                    <div className={`p-4 rounded-2xl border ${subj.colorBorder} ${subj.colorBg} flex items-center justify-between gap-3 shadow-xs`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl shrink-0">{subj.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-foreground">
                              {subj.name}
                            </h2>
                            <Badge variant={subj.badgeVariant} size="xs" className="font-mono">
                              {subjectModules.length} Modül
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            {subj.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Modül Kartları Izgarası */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {subjectModules.map((mod) => renderModuleCard(mod))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ======================================================================= */
            /* GÖRÜNÜM 2: ÖĞRETMEN İÇİN SINIFLARA GÖRE KATEGORİZE GÖRÜNÜM               */
            /* ======================================================================= */
            <div className="space-y-8">
              {teacherClasses.map((cls) => {
                // Eğer tek bir sınıf filtrelendiyse diğerlerini atla
                if (selectedClassFilter !== 'all' && selectedClassFilter !== cls._id) {
                  return null;
                }

                // Bu sınıfta açık olan modüller
                const classModules = fullyFilteredModules.filter(m => (cls.enabledModules || []).includes(m.key));

                return (
                  <div key={cls._id} className="space-y-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
                    {/* Sınıf Başlığı */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                          🏫
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-foreground">
                              {cls.name} ({cls.grade}. Sınıf)
                            </h2>
                            <Badge variant="primary" size="xs">
                              {classModules.length} Modül Aktif
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cls.schoolName} • {cls.academicYear} • {cls.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedClassFilter(cls._id)}
                        className="text-xs text-primary hover:underline font-bold self-start sm:self-auto cursor-pointer flex items-center gap-1"
                      >
                        <span>Sadece Bu Sınıfı Odakla</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Sınıf İçinde Ders Bazında Modüller */}
                    {classModules.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-xs rounded-xl bg-muted/20 border border-dashed border-border">
                        Bu sınıf için seçili ders kategorisinde aktif modül bulunmuyor. "Ata" butonunu kullanarak modül yetkisi tanımlayabilirsiniz.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                        {classModules.map((mod) => renderModuleCard(mod))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* E. MODÜL DETAY & VİDEO TANITIM MODALI                                     */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedModule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-foreground my-8"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 bg-muted/20 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Blocks className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                        {selectedModule.title}
                      </h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>{SUBJECT_DEFINITIONS.find(s => s.key === getModuleSubjectKey(selectedModule))?.name || 'Ders Modülü'}</span>
                        <span>•</span>
                        <span>{selectedModule.category}</span>
                        {selectedModule.badgeText && (
                          <>
                            <span>•</span>
                            <span className="text-amber-500 font-bold">{selectedModule.badgeText}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="p-1.5 rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
                  {/* 16:9 Video & Images Interactive Slider */}
                  <div>
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border shadow-xl">
                      <ModuleMediaSlider
                        module={selectedModule}
                        inModal={true}
                      />
                    </div>
                  </div>

                  {/* Summary & Badges */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Modül Özeti
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                      {selectedModule.shortDescription}
                    </p>
                  </div>

                  {/* Detailed Description */}
                  <div className="space-y-3 text-xs sm:text-sm text-foreground/80 leading-relaxed whitespace-pre-line border-t border-border/60 pt-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-primary" />
                      Detaylı Tanıtım & Pedagojik Kullanım Rehberi
                    </h4>
                    <div className="p-4 rounded-xl bg-background/60 border border-border/50 text-xs sm:text-sm leading-relaxed space-y-2">
                      {selectedModule.longDescription}
                    </div>
                  </div>

                  {/* Features List */}
                  {selectedModule.features && selectedModule.features.length > 0 && (
                    <div className="space-y-2.5 border-t border-border/60 pt-4">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Modül Fonksiyonları & Araç Özellikleri
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedModule.features.map((feat, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-foreground"
                          >
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sınıf Atama Alanı (Öğretmenler İçin Modal İçinde de Erişilebilir) */}
                  {userRole !== 'student' && teacherClasses.length > 0 && (
                    <div className="border-t border-border/60 pt-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <School className="w-4 h-4 text-primary" />
                          Bu Modülü Hangi Sınıflara Açmak İstiyorsunuz?
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllClasses}
                            className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Tümünü Seç
                          </button>
                          <span className="text-muted-foreground text-xs">•</span>
                          <button
                            type="button"
                            onClick={handleClearAllClasses}
                            className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {teacherClasses.map((cls) => {
                          const isChecked = selectedClassIds.includes(cls._id);
                          return (
                            <label
                              key={cls._id}
                              className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-primary/10 border-primary/50 text-foreground font-semibold shadow-xs'
                                  : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleClass(cls._id)}
                                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                />
                                <div className="truncate">
                                  <p className="text-foreground font-bold">{cls.name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{cls.schoolName}</p>
                                </div>
                              </div>
                              <Badge variant={isChecked ? 'primary' : 'outline'} size="xs">
                                {cls.grade}. Sınıf
                              </Badge>
                            </label>
                          );
                        })}
                      </div>

                      {assignmentFeedback && (
                        <div
                          className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                            assignmentFeedback.type === 'success'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-destructive/10 border-destructive/30 text-destructive'
                          }`}
                        >
                          {assignmentFeedback.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                          )}
                          <span>{assignmentFeedback.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:px-6 sm:py-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    {userRole !== 'student' && (
                      <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
                        {selectedClassIds.length} sınıf seçili
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedModule(null)}
                      className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
                    >
                      Kapat
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const mod = selectedModule;
                        setSelectedModule(null);
                        handleLaunchModule(mod);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current shrink-0" />
                      <span>Modülü Başlat</span>
                    </button>

                    {userRole !== 'student' && (
                      <button
                        type="button"
                        disabled={savingAssignment}
                        onClick={() => handleSaveAssignment(selectedModule.key)}
                        className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 active:scale-95"
                      >
                        {savingAssignment ? 'Kaydediliyor...' : 'Sınıf Yetkilerini Kaydet'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* F. HIZLI SINIF ATAMA MODALI (SETTINGS BUTONU)                              */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {assigningModule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden text-foreground"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      Sınıf Modül Yetkilendirmesi
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      "{assigningModule.title}" hangi sınıflarınızda çalışsın?
                    </p>
                  </div>
                  <button
                    onClick={() => setAssigningModule(null)}
                    className="p-1 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Sınıflarınız:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllClasses}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Tümünü Seç
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={handleClearAllClasses}
                        className="text-muted-foreground hover:underline cursor-pointer"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {teacherClasses.map((cls) => {
                      const isChecked = selectedClassIds.includes(cls._id);
                      return (
                        <label
                          key={cls._id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-primary/10 border-primary/50 text-foreground font-semibold shadow-xs'
                              : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleClass(cls._id)}
                              className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                            />
                            <div>
                              <p className="font-bold text-foreground">{cls.name}</p>
                              <p className="text-[11px] text-muted-foreground">{cls.schoolName}</p>
                            </div>
                          </div>
                          <Badge variant={isChecked ? 'primary' : 'outline'} size="xs">
                            {cls.grade}. Sınıf
                          </Badge>
                        </label>
                      );
                    })}
                  </div>

                  {assignmentFeedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                        assignmentFeedback.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-destructive/10 border-destructive/30 text-destructive'
                      }`}
                    >
                      {assignmentFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{assignmentFeedback.message}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedClassIds.length} sınıf seçili
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssigningModule(null)}
                    >
                      İptal
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={savingAssignment}
                      onClick={() => handleSaveAssignment(assigningModule.key)}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* G. BAĞIMSIZ MODÜL ÇALIŞTIRICILARI (HARF ÇİZGİ & 1 DK OKUMA)               */}
        {/* ========================================================================= */}
        {activeRunningModule === 'harf-cizgi-atolyesi' && (
          <LetterWritingScreen
            isOpen={true}
            onClose={() => setActiveRunningModule(null)}
          />
        )}

        {activeRunningModule === '1-dk-okuma' && (
          <ReadingScreen
            isOpen={true}
            onClose={() => setActiveRunningModule(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ModulesPage;
