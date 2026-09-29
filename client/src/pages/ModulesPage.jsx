import React, { useState, useEffect } from 'react';
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
  ArrowUpRight
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

const ModulesPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [modules, setModules] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(user.role || 'teacher');
  const [studentClassInfo, setStudentClassInfo] = useState(null);

  // Standalone Running Module (Tahtaya ihtiyaç duymadan doğrudan çalıştırma)
  const [activeRunningModule, setActiveRunningModule] = useState(null); // 'harf-cizgi-atolyesi' | '1-dk-okuma'

  // Sınıf Filtresi State'i ('all' veya classId)
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

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
      const res = await api.post('/api/modules/assign-classes', {
        moduleKey: key,
        classIds: selectedClassIds
      });

      setAssignmentFeedback({
        type: 'success',
        message: 'Modül sınıf yetkileri başarıyla güncellendi!'
      });

      // Refresh modules to update assigned counts
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

  const targetClass = teacherClasses.find(c => c._id === selectedClassFilter);
  const displayedModules = modules.filter(m => {
    if (selectedClassFilter === 'all') return true;
    if (!targetClass) return true;
    const isKeyEnabled = (targetClass.enabledModules || []).includes(m.key);
    const isGradeMatch = !Array.isArray(m.targetGrades) || m.targetGrades.length === 0 || m.targetGrades.includes(targetClass.grade);
    return isKeyEnabled && isGradeMatch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <PageHeader
          breadcrumbs={[
            { label: 'Panelim', to: '/dashboard' },
            { label: 'Modüller' }
          ]}
          badge="✨ Eklentiler & Ek Modüller"
          badgeVariant="primary"
          title="Eğitim & Tahta Modülleri"
          description="Derslerinizi ve akıllı tahta deneyiminizi zenginleştiren özel ek araçlar. Modülleri dilediğiniz sınıflara atayabilir veya tahtaya gerek kalmadan doğrudan başlatabilirsiniz."
        />

        {/* Sınıf Filtresi (Öğretmenler İçin) veya Sınıf Bilgi Rozeti (Öğrenciler İçin) */}
        {userRole === 'student' && studentClassInfo ? (
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                🎓
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {studentClassInfo.name} ({studentClassInfo.grade}. Sınıf)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Öğretmeninizin sınıfınız için aktif ettiği ders ve etkinlik modülleri aşağıda listelenmiştir.
                </p>
              </div>
            </div>
            <Badge variant="primary" size="sm" className="shrink-0">
              {displayedModules.length} Aktif Modül
            </Badge>
          </div>
        ) : teacherClasses.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1.5 shrink-0">
              <School className="w-3.5 h-3.5 text-primary" />
              Sınıfa Göre Filtrele:
            </span>
            <button
              type="button"
              onClick={() => setSelectedClassFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedClassFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Tüm Modüller ({modules.length})
            </button>
            {teacherClasses.map((cls) => {
              const count = modules.filter(m => 
                (cls.enabledModules || []).includes(m.key) && 
                (!Array.isArray(m.targetGrades) || m.targetGrades.length === 0 || m.targetGrades.includes(cls.grade))
              ).length;

              return (
                <button
                  key={cls._id}
                  type="button"
                  onClick={() => setSelectedClassFilter(cls._id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedClassFilter === cls._id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{cls.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
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

        {loading ? (
          <div className="p-20 text-center text-muted-foreground text-sm space-y-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Modüller yükleniyor...</p>
          </div>
        ) : displayedModules.length === 0 ? (
          <Card className="chrome-pattern p-12">
            <EmptyState
              icon={Blocks}
              title="Bu Sınıf İçin Aktif Modül Bulunmuyor"
              description={userRole === 'student' ? 'Öğretmeniniz sınıfınız için henüz bir modül aktif etmedi.' : 'Seçili sınıf için henüz tanımlı bir modül bulunmuyor. "Tüm Modüller" sekmesinden istediğiniz modülleri bu sınıfa atayabilirsiniz.'}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedModules.map((mod) => {
              const isAssignedToAny = mod.assignedCount > 0;
              const assignedNames = (mod.assignedClasses || []).map(c => c.name).join(', ');

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

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white/90 border border-white/15 shadow-sm">
                          {mod.category || 'Tahta Eklentisi'}
                        </span>

                        {mod.badgeText && (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1">
                            {mod.badgeText}
                          </span>
                        )}
                      </div>

                      {/* Bottom Info on Image */}
                      {mod.targetGrades && mod.targetGrades.length > 0 && (
                        <div className="absolute bottom-3 left-3 text-xs text-white pointer-events-none z-10">
                          <span className="inline-flex items-center gap-1.5 text-[11px] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full font-medium text-slate-200 border border-white/15">
                            <GraduationCap className="w-3 h-3 text-amber-400" />
                            {mod.targetGrades.map(g => `${g}. Sınıf`).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
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

                        {/* Features Tags */}
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

                      {/* Card Footer: Sınıf Durumu ve Geniş, Ferah Butonlar */}
                      <div className="pt-3 border-t border-border/60 space-y-3">
                        {/* Sınıf Durumu Barı (Öğretmenler için) */}
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

                        {/* Action Buttons: Modülü Başlat, İncele, Ata */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRunningModule(mod.key);
                            }}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.98]"
                            title="Modülü Tahtaya İhtiyaç Duymadan Doğrudan Başlat"
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
                            title="Modül Bilgileri ve Tanıtım"
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
                              title="Sınıf Yetkilerini Ayarla"
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
            })}
          </div>
        )}

        {/* --- DETAIL & VIDEO PRESENTATION MODAL --- */}
        <AnimatePresence>
          {selectedModule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
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
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Blocks className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                        {selectedModule.title}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedModule.category} • {selectedModule.badgeText}
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

                  {/* Sınıf Atama Alanı (Modal İçinde de Erişilebilir) */}
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
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {selectedClassIds.length} sınıf seçili
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer"
                      onClick={() => {
                        const key = selectedModule.key;
                        setSelectedModule(null);
                        setActiveRunningModule(key);
                      }}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Modülü Başlat</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModule(null)}
                    >
                      Kapat
                    </Button>
                    {userRole !== 'student' && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={savingAssignment}
                        onClick={() => handleSaveAssignment(selectedModule.key)}
                      >
                        Sınıf Yetkilerini Kaydet
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- DEDICATED QUICK ASSIGN CLASSES MODAL --- */}
        <AnimatePresence>
          {assigningModule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
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

        {/* Harf Çizgi & Yazılış Yönü Atölyesi Bağımsız Çalıştırıcı */}
        {activeRunningModule === 'harf-cizgi-atolyesi' && (
          <LetterWritingScreen
            isOpen={true}
            onClose={() => setActiveRunningModule(null)}
          />
        )}

        {/* 1 Dakika Okuma Alanı Bağımsız Çalıştırıcı */}
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
