import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Eye,
  Users,
  Search,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Button, Badge, EmptyState, Modal, Input, AnimatedNumber } from '../components/ui';

const AnnouncementsPage = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [announcements, setAnnouncements] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal'); // 'normal', 'important', 'urgent'
  const [targetType, setTargetType] = useState('class'); // 'class', 'students'
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/classes')
      .then(res => {
        const list = res.data || [];
        setClasses(list);
      })
      .catch(err => console.error('Error fetching classes:', err));
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchAnnouncements();
      if (selectedClassId !== 'all') {
        fetchClassStudents();
      } else {
        setClassStudents([]);
      }
    }
  }, [selectedClassId]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/announcements/class/${selectedClassId}`);
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    try {
      const res = await api.get(`/api/classes/${selectedClassId}/students`);
      setClassStudents(res.data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Başlık ve duyuru içeriği zorunludur');
      return;
    }

    const isAll = selectedClassId === 'all';

    if (!isAll && targetType === 'students' && selectedStudentIds.length === 0) {
      setError('En az bir öğrenci seçmelisiniz');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/announcements', {
        classId: selectedClassId,
        title: title.trim(),
        content: content.trim(),
        priority,
        targetType: isAll ? 'class' : targetType,
        targetStudentIds: (!isAll && targetType === 'students') ? selectedStudentIds : []
      });

      setIsCreateOpen(false);
      setTitle('');
      setContent('');
      setPriority('normal');
      setTargetType('class');
      setSelectedStudentIds([]);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error creating announcement:', err);
      setError(err.response?.data?.message || 'Duyuru yayınlanamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/api/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      console.error('Error deleting announcement:', err);
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const filteredStudents = classStudents.filter(s =>
    `${s.firstName} ${s.lastName} ${s.studentNumber || ''}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Sınıf Duyuruları"
          description="Tüm sınıfa veya seçtiğiniz öğrencilere acil veya önemli duyurular iletin."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3.5 py-2 pr-9 rounded-lg bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring appearance-none shadow-2xs cursor-pointer"
                >
                  <option value="all">🌟 Bütün Sınıflar (Toplu Bildirim)</option>
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
                Yeni Duyuru Gönder
              </Button>
            </div>
          }
        />

        {/* Announcements List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Duyurular yükleniyor...</p>
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={selectedClassId === 'all' ? 'Henüz hiçbir sınıfta duyuru bulunmuyor' : 'Bu sınıfta henüz bir duyuru bulunmuyor'}
            description="Yeni Duyuru Gönder butonuna tıklayarak ilk duyurunuzu oluşturabilirsiniz."
            actionLabel="Yeni Duyuru Gönder"
            actionIcon={Plus}
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => {
              const isUrgent = ann.priority === 'urgent';
              const isImportant = ann.priority === 'important';

              return (
                <div
                  key={ann._id}
                  className={`p-5 sm:p-6 rounded-2xl bg-card hover:bg-card/90 border transition-all space-y-3 shadow-sm hover:shadow-md chrome-pattern ${
                    isUrgent
                      ? 'border-destructive/40 shadow-destructive/5'
                      : isImportant
                      ? 'border-amber-500/40 shadow-amber-500/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Badge
                        variant={isUrgent ? 'danger' : isImportant ? 'warning' : 'primary'}
                        size="sm"
                      >
                        {isUrgent ? 'ACİL' : isImportant ? 'ÖNEMLİ' : 'NORMAL'}
                      </Badge>

                      {ann.isAllClasses ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                          <span>🌟</span>
                          <span>Bütün Sınıflar ({ann.classCount || classes.length} Sınıf)</span>
                        </span>
                      ) : (
                        selectedClassId === 'all' && ann.classId && (
                          <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px] font-medium border border-border">
                            {ann.classId.name || `${ann.classId.grade}/${ann.classId.section}`}
                          </span>
                        )
                      )}

                      <h3 className="text-base font-semibold text-foreground">{ann.title}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(ann.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        onClick={() => handleDelete(ann._id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                        title="Duyuruyu Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>

                  {/* Stats & Target Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Hedef:</span>
                      {ann.isAllClasses ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] font-medium">
                          Tüm Sınıflardaki Öğrenciler
                        </span>
                      ) : ann.targetType === 'class' ? (
                        <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                          Tüm Sınıf
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                          {ann.targetStudentIds?.length || 0} Özel Öğrenci
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>
                        <AnimatedNumber value={ann.stats?.readCount || 0} /> / <AnimatedNumber value={ann.stats?.total || 0} /> Okundu
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Announcement Modal */}
        {isCreateOpen && (
          <Modal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            title={selectedClassId === 'all' ? "Tüm Sınıflara Toplu Duyuru Gönder" : "Yeni Duyuru Paylaş"}
            description={selectedClassId === 'all' 
              ? "Profilinizdeki tüm sınıflara aynı anda anlık toplu bildirim iletin." 
              : "Sınıfınız veya seçili öğrencileriniz için duyuru oluşturun."
            }
            size="md"
          >
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              {/* Bütün Sınıflar Bildirim Bilgisi */}
              {selectedClassId === 'all' && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 text-lg shadow-xs">
                    🌟
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <span>Tüm Sınıflara Toplu Bildirim Yayını</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/30">
                        {classes.length} Sınıf
                      </span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Bu duyuru profilinizdeki kayıtlı <strong>{classes.length} sınıfın tümüne</strong> aynı anda atanacak ve bu sınıflardaki tüm kayıtlı öğrencilere anlık bildirim iletilecektir.
                    </p>
                  </div>
                </div>
              )}

              <Input
                label="Duyuru Başlığı *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedClassId === 'all' ? "Örn: Genel Okul Duyurusu / Ortak Etkinlik" : "Örn: Yarınki Matematik Dersi Hakkında"}
                autoFocus
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Öncelik Seviyesi
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-xl bg-background border border-input text-foreground text-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Önemli</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Hedef Kitle
                  </label>
                  {selectedClassId === 'all' ? (
                    <div className="w-full rounded-xl bg-muted/60 border border-border text-foreground text-xs py-2 px-3 font-semibold flex items-center justify-between">
                      <span>Bütün Sınıflar (Toplu)</span>
                      <span className="text-[10px] text-amber-500 font-bold">{classes.length} Sınıf</span>
                    </div>
                  ) : (
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value)}
                      className="w-full rounded-xl bg-background border border-input text-foreground text-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs"
                    >
                      <option value="class">Tüm Sınıf</option>
                      <option value="students">Özel Öğrenciler</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Student Picker if targetType === 'students' AND not all classes */}
              {selectedClassId !== 'all' && targetType === 'students' && (
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Öğrenci Seçimi ({selectedStudentIds.length} seçili)</span>
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Öğrenci ara..."
                      className="px-2.5 py-1 text-xs rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-border/60">
                    {filteredStudents.map(s => {
                      const isSelected = selectedStudentIds.includes(s._id);
                      return (
                        <div
                          key={s._id}
                          onClick={() => toggleStudent(s._id)}
                          className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer ${
                            isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                          }`}
                        >
                          <span>{s.firstName} {s.lastName} (No: {s.studentNumber || '—'})</span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-input text-primary focus:ring-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Duyuru İçeriği *
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Duyuru detayını buraya yazınız..."
                  className="w-full rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm p-3 resize-none leading-relaxed"
                />
              </div>

              {error && (
                <p className="text-destructive text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
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
                  {selectedClassId === 'all' ? "Tüm Sınıflara Yayınla" : "Duyuruyu Yayınla"}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AnnouncementsPage;
