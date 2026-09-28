import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Trash2,
  Edit2,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Save,
  Users,
  ChevronDown,
  Clock
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Button, Badge, EmptyState, Modal, Input, AnimatedItem, AnimatedNumber } from '../components/ui';

const EXAM_TYPE_LABELS = {
  oral: 'Sözlü',
  midterm: 'Ara Sınav',
  final: 'Genel Sınav'
};

const ExamsPage = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [examType, setExamType] = useState('midterm');
  const [description, setDescription] = useState('');
  const [examDate, setExamDate] = useState(todayStr);
  const [maxScore, setMaxScore] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Grading Sheet Modal state
  const [gradingExam, setGradingExam] = useState(null);
  const [gradingStudents, setGradingStudents] = useState([]);
  const [activeStudentIndex, setActiveStudentIndex] = useState(0);
  const [currentScore, setCurrentScore] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradingSuccessMsg, setGradingSuccessMsg] = useState('');

  // Leaderboard Modal state
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  useEffect(() => {
    api.get('/api/classes')
      .then(res => {
        const list = res.data || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      })
      .catch(err => console.error('Error fetching classes:', err));
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchExams();
    }
  }, [selectedClassId]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/exams/class/${selectedClassId}`);
      setExams(res.data || []);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !examDate) {
      setError('Sınav adı, ders ve tarih zorunludur');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/exams', {
        classId: selectedClassId,
        name: name.trim(),
        subject: subject.trim(),
        topic: topic.trim(),
        examType,
        description: description.trim(),
        examDate,
        maxScore: Number(maxScore) || 100
      });

      setIsCreateOpen(false);
      setName('');
      setSubject('');
      setTopic('');
      setDescription('');
      setExamDate(todayStr);
      setMaxScore(100);
      fetchExams();
    } catch (err) {
      console.error('Error creating exam:', err);
      setError(err.response?.data?.message || 'Sınav oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu sınavı ve tüm notlarını silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/api/exams/${id}`);
      setExams(prev => prev.filter(e => e._id !== id));
    } catch (err) {
      console.error('Error deleting exam:', err);
    }
  };

  const openGradingSheet = async (exam) => {
    setGradingExam(exam);
    setGradingSuccessMsg('');
    try {
      const res = await api.get(`/api/exams/${exam._id}/sheet`);
      const studentList = res.data.students || [];
      setGradingStudents(studentList);
      setActiveStudentIndex(0);
      if (studentList.length > 0) {
        setCurrentScore(studentList[0].score !== null && studentList[0].score !== undefined ? String(studentList[0].score) : '');
        setCurrentNote(studentList[0].teacherNote || '');
      }
    } catch (err) {
      console.error('Error loading grading sheet:', err);
    }
  };

  const selectStudentForGrading = (idx) => {
    if (idx < 0 || idx >= gradingStudents.length) return;
    setActiveStudentIndex(idx);
    const target = gradingStudents[idx];
    setCurrentScore(target.score !== null && target.score !== undefined ? String(target.score) : '');
    setCurrentNote(target.teacherNote || '');
    setGradingSuccessMsg('');
  };

  const handleSaveAndNext = async (e) => {
    e.preventDefault();
    if (!gradingExam || gradingStudents.length === 0) return;

    const student = gradingStudents[activeStudentIndex];
    if (currentScore === '' || isNaN(currentScore)) {
      alert('Lütfen geçerli bir puan giriniz');
      return;
    }

    const numScore = Number(currentScore);
    if (numScore < 0 || numScore > gradingExam.maxScore) {
      alert(`Puan 0 ile ${gradingExam.maxScore} arasında olmalıdır.`);
      return;
    }

    setSavingGrade(true);
    try {
      await api.post(`/api/exams/${gradingExam._id}/grade`, {
        studentId: student.studentId,
        score: numScore,
        teacherNote: currentNote.trim()
      });

      setGradingStudents(prev => prev.map((s, idx) =>
        idx === activeStudentIndex ? { ...s, score: numScore, teacherNote: currentNote.trim(), isGraded: true } : s
      ));

      setGradingSuccessMsg(`${student.fullName} için ${numScore} puan kaydedildi.`);

      if (activeStudentIndex < gradingStudents.length - 1) {
        setTimeout(() => {
          selectStudentForGrading(activeStudentIndex + 1);
        }, 400);
      } else {
        fetchExams();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Puan kaydedilemedi');
    } finally {
      setSavingGrade(false);
    }
  };

  const openLeaderboard = async (examId) => {
    try {
      const res = await api.get(`/api/exams/${examId}/leaderboard`);
      setLeaderboardData(res.data);
      setIsLeaderboardOpen(true);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Sınavlar ve Sıralamalar"
          description="Sözlü, ara sınav veya genel sınav oluşturun; adım adım notlandırın ve sınıf sıralamalarını inceleyin."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3.5 py-2 pr-9 rounded-lg bg-background border border-input text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring appearance-none shadow-2xs cursor-pointer"
                >
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name || `${c.grade}/${c.section}`} {c.schoolName ? `(${c.schoolName})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={Plus}
                onClick={() => setIsCreateOpen(true)}
                className="shadow-xs font-semibold"
              >
                Yeni Sınav Oluştur
              </Button>
            </div>
          }
        />

        {/* Exams List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Sınavlar yükleniyor...</p>
          </div>
        ) : exams.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Bu sınıfta kayıtlı sınav bulunmuyor"
            description="Yeni Sınav Oluştur butonuna basarak ilk sınavınızı ekleyebilirsiniz."
            actionLabel="Yeni Sınav Oluştur"
            actionIcon={Plus}
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((ex, idx) => {
              const typeBadge = EXAM_TYPE_LABELS[ex.examType] || 'Sınav';
              const gradedCount = ex.stats?.gradedCount || 0;
              const total = ex.totalStudents || 0;
              const isFullyGraded = total > 0 && gradedCount >= total;

              return (
                <AnimatedItem key={ex._id} index={idx}>
                  <div
                    className="p-5 sm:p-6 rounded-2xl bg-card hover:bg-card/90 border border-border hover:border-border/80 transition-all space-y-4 shadow-sm hover:shadow-md flex flex-col justify-between h-full chrome-pattern"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="warning" size="sm">
                              {ex.subject}
                            </Badge>
                            <Badge variant="neutral" size="sm">
                              {typeBadge}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">Maks: {ex.maxScore} Puan</span>
                          </div>
                          <h3 className="text-base font-semibold text-foreground leading-snug">{ex.name}</h3>
                          {ex.topic && <p className="text-xs text-muted-foreground mt-0.5">Konu: {ex.topic}</p>}
                        </div>

                        <button
                          onClick={() => handleDelete(ex._id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                          title="Sınavı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Exam Statistics with AnimatedNumber */}
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/80 text-center">
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Ortalama</div>
                          <div className="text-sm font-bold text-primary mt-0.5">
                            {ex.stats?.avgScore !== undefined && ex.stats?.avgScore !== '—' ? (
                              <AnimatedNumber value={Number(ex.stats.avgScore)} />
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">En Yüksek</div>
                          <div className="text-sm font-bold text-emerald-500 mt-0.5">
                            {ex.stats?.highestScore !== undefined && ex.stats?.highestScore !== null && ex.stats?.highestScore !== '—' ? (
                              <AnimatedNumber value={Number(ex.stats.highestScore)} />
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Notlanan</div>
                          <div className="text-sm font-bold text-amber-500 mt-0.5">
                            <AnimatedNumber value={gradedCount} /> / <AnimatedNumber value={total} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={Trophy}
                        onClick={() => openLeaderboard(ex._id)}
                        className="shadow-2xs"
                      >
                        Sıralama Tablosu
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={Edit2}
                        onClick={() => openGradingSheet(ex)}
                        className="shadow-xs font-semibold"
                      >
                        {isFullyGraded ? 'Notları Düzenle' : 'Puan Girişi Yap'}
                      </Button>
                    </div>
                  </div>
                </AnimatedItem>
              );
            })}
          </div>
        )}

        {/* Create Exam Modal */}
        {isCreateOpen && (
          <Modal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            title="Yeni Sınav Oluştur"
            description="Sınıf için sınav, sözlü veya performans kaydı tanımlayın."
            size="md"
          >
            <form onSubmit={handleCreateExam} className="space-y-4">
              <Input
                label="Sınav Adı *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: 1. Dönem 1. Matematik Yazılısı"
                autoFocus
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Ders *"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Örn: Matematik"
                />
                <Input
                  label="Konu (Opsiyonel)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Örn: Doğal Sayılar"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Sınav Türü
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full rounded-xl bg-background border border-input text-foreground text-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs"
                  >
                    <option value="midterm">Ara Sınav</option>
                    <option value="final">Genel Sınav</option>
                    <option value="oral">Sözlü / Performans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Sınav Tarihi *
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-xl bg-background border border-input text-foreground text-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs"
                  />
                </div>

                <Input
                  label="Maksimum Puan *"
                  type="number"
                  min="10"
                  max="500"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Açıklama (Opsiyonel)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sınav kapsamı ve yönergeler..."
                  className="w-full rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm p-3 resize-none"
                />
              </div>

              {error && (
                <p className="text-destructive text-xs font-medium">{error}</p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                >
                  Sınavı Kaydet
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Step-by-Step Grading Modal */}
        {gradingExam && (
          <Modal
            isOpen={Boolean(gradingExam)}
            onClose={() => {
              setGradingExam(null);
              fetchExams();
            }}
            title={gradingExam.name}
            description={`${gradingExam.subject} • Maksimum: ${gradingExam.maxScore} Puan`}
            size="xl"
          >
            <div className="space-y-6">
              {gradingStudents.length > 0 && gradingStudents[activeStudentIndex] && (
                <form onSubmit={handleSaveAndNext} className="p-5 sm:p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm chrome-pattern">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-amber-500">
                      Öğrenci {activeStudentIndex + 1} / {gradingStudents.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={activeStudentIndex === 0}
                        onClick={() => selectStudentForGrading(activeStudentIndex - 1)}
                        className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={activeStudentIndex === gradingStudents.length - 1}
                        onClick={() => selectStudentForGrading(activeStudentIndex + 1)}
                        className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {gradingStudents[activeStudentIndex].fullName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Öğrenci No: {gradingStudents[activeStudentIndex].studentNumber || '—'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <Input
                        label={`Puan (0 - ${gradingExam.maxScore}) *`}
                        type="number"
                        min="0"
                        max={gradingExam.maxScore}
                        value={currentScore}
                        onChange={(e) => setCurrentScore(e.target.value)}
                        placeholder="Örn: 85"
                        autoFocus
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="Öğretmen Notu / Geri Bildirim"
                        type="text"
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        placeholder="Örn: Problem çözümü başarılı."
                      />
                    </div>
                  </div>

                  {gradingSuccessMsg && (
                    <p className="text-emerald-500 text-xs font-semibold">{gradingSuccessMsg}</p>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      leftIcon={Save}
                      isLoading={savingGrade}
                    >
                      Kaydet ve Sonraki Öğrenci
                    </Button>
                  </div>
                </form>
              )}

              {/* Class Grading Progress List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sınıf Not Listesi ({gradingStudents.filter(s => s.isGraded).length} / {gradingStudents.length} Girildi)
                </h4>

                <div className="max-h-56 overflow-y-auto divide-y divide-border/60 rounded-xl bg-card border border-border">
                  {gradingStudents.map((s, idx) => (
                    <div
                      key={s.studentId}
                      onClick={() => selectStudentForGrading(idx)}
                      className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        idx === activeStudentIndex
                          ? 'bg-primary/10 border-l-4 border-primary text-foreground font-semibold'
                          : 'hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="text-foreground">{s.fullName}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {s.isGraded ? (
                          <Badge variant="success" size="sm">
                            {s.score} ✓
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">— Bekliyor</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Leaderboard Modal */}
        {isLeaderboardOpen && leaderboardData && (
          <Modal
            isOpen={isLeaderboardOpen}
            onClose={() => setIsLeaderboardOpen(false)}
            title={leaderboardData.exam?.name}
            description={`Sınıf Ortalaması: ${leaderboardData.stats?.classAverage || '—'} • En Yüksek: ${leaderboardData.stats?.highestScore ?? '—'}`}
            size="lg"
          >
            <div className="space-y-6">
              {/* Top 3 Podium */}
              {leaderboardData.podium && leaderboardData.podium.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {/* 2nd Place */}
                  <AnimatedItem index={1} className="order-1">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border text-center flex flex-col justify-end h-full">
                      <div className="text-2xl mb-1">🥈</div>
                      <div className="text-xs font-semibold text-foreground truncate">{leaderboardData.podium[1]?.studentName || '—'}</div>
                      <div className="text-lg font-bold text-muted-foreground mt-1">
                        {leaderboardData.podium[1]?.score !== undefined ? (
                          <AnimatedNumber value={leaderboardData.podium[1].score} />
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-0.5">2. Sıra</div>
                    </div>
                  </AnimatedItem>

                  {/* 1st Place */}
                  <AnimatedItem index={0} className="order-2">
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center flex flex-col justify-end h-full shadow-sm">
                      <div className="text-3xl mb-1">🥇</div>
                      <div className="text-xs font-bold text-foreground truncate">{leaderboardData.podium[0]?.studentName || '—'}</div>
                      <div className="text-2xl font-black text-amber-500 mt-1">
                        {leaderboardData.podium[0]?.score !== undefined ? (
                          <AnimatedNumber value={leaderboardData.podium[0].score} />
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold mt-0.5">1. Sıra (Şampiyon)</div>
                    </div>
                  </AnimatedItem>

                  {/* 3rd Place */}
                  <AnimatedItem index={2} className="order-3">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border text-center flex flex-col justify-end h-full">
                      <div className="text-2xl mb-1">🥉</div>
                      <div className="text-xs font-semibold text-foreground truncate">{leaderboardData.podium[2]?.studentName || '—'}</div>
                      <div className="text-lg font-bold text-amber-600/90 mt-1">
                        {leaderboardData.podium[2]?.score !== undefined ? (
                          <AnimatedNumber value={leaderboardData.podium[2].score} />
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-0.5">3. Sıra</div>
                    </div>
                  </AnimatedItem>
                </div>
              )}

              {/* Full Class Ranking Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tüm Sınıf Sıralaması ({leaderboardData.leaderboard?.length || 0} Öğrenci)
                </h4>

                <div className="max-h-60 overflow-y-auto divide-y divide-border/60 rounded-xl bg-card border border-border">
                  {leaderboardData.leaderboard?.map((item, idx) => (
                    <AnimatedItem
                      key={item.studentId}
                      index={idx}
                      className="p-3 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-center font-bold ${item.rank <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          #{item.rank}
                        </span>
                        <span className="font-semibold text-foreground">{item.studentName}</span>
                      </div>

                      <span className="font-bold text-primary text-sm">
                        <AnimatedNumber value={item.score} /> Puan
                      </span>
                    </AnimatedItem>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExamsPage;
