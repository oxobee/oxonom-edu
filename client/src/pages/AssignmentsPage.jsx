import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Search,
  Users,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Button, Badge, EmptyState, Modal, Input, AnimatedItem, AnimatedNumber } from '../components/ui';

const AssignmentsPage = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState(todayStr);
  const [assignmentType, setAssignmentType] = useState('class');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Student statuses modal state
  const [statusModalAssignment, setStatusModalAssignment] = useState(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [updatingStudentId, setUpdatingStudentId] = useState(null);

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
      fetchAssignments();
      fetchClassStudents();
    }
  }, [selectedClassId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/assignments/class/${selectedClassId}`);
      setAssignments(res.data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
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

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleOpenStatusModal = async (assignment) => {
    setStatusModalAssignment(assignment);
    setRecipientsLoading(true);
    setRecipientFilter('all');
    setRecipientSearch('');
    try {
      const res = await api.get(`/api/assignments/${assignment._id}/recipients`);
      setRecipients(res.data.students || []);
    } catch (err) {
      console.error('Error fetching recipients:', err);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleUpdateStudentStatus = async (assignmentId, studentId, newStatus) => {
    setUpdatingStudentId(studentId);
    try {
      await api.patch(`/api/assignments/${assignmentId}/status`, {
        status: newStatus,
        studentId
      });
      setRecipients(prev => prev.map(s => s.studentId === studentId ? { ...s, status: newStatus } : s));
      fetchAssignments();
    } catch (err) {
      console.error('Error updating student assignment status:', err);
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !topic.trim() || !description.trim() || !dueAt) {
      setError('Tüm zorunlu alanları doldurunuz.');
      return;
    }

    if (assignmentType === 'individual' && selectedStudentIds.length === 0) {
      setError('En az bir öğrenci seçmelisiniz.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('classId', selectedClassId);
      formData.append('title', title.trim());
      formData.append('subject', subject.trim());
      formData.append('topic', topic.trim());
      formData.append('description', description.trim());
      formData.append('dueAt', dueAt);
      formData.append('assignmentType', assignmentType);

      if (assignmentType === 'individual') {
        formData.append('targetStudentIds', JSON.stringify(selectedStudentIds));
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('attachments', selectedFiles[i]);
      }

      await api.post('/api/assignments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setIsCreateOpen(false);
      setTitle('');
      setSubject('');
      setTopic('');
      setDescription('');
      setDueAt(todayStr);
      setAssignmentType('class');
      setSelectedStudentIds([]);
      setSelectedFiles([]);
      fetchAssignments();
    } catch (err) {
      console.error('Error creating assignment:', err);
      setError(err.response?.data?.message || 'Ödev oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu ödevi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/api/assignments/${id}`);
      setAssignments(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      console.error('Error deleting assignment:', err);
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
          title="Sınıf Ödevleri"
          description="Tüm sınıfa veya seçtiğiniz öğrencilere görsel ekli ödevler verin ve teslim durumlarını izleyin."
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
                Yeni Ödev Ver
              </Button>
            </div>
          }
        />

        {/* Assignments List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Ödevler yükleniyor...</p>
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Bu sınıfta kayıtlı ödev bulunmuyor"
            description="Yeni Ödev Ver butonuna basarak ilk ödevi tanımlayabilirsiniz."
            actionLabel="Yeni Ödev Ver"
            actionIcon={Plus}
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((ass, idx) => {
              const isIndividual = ass.assignmentType === 'individual';

              return (
                <AnimatedItem key={ass._id} index={idx}>
                  <div
                    className="p-5 sm:p-6 rounded-2xl bg-card hover:bg-card/90 border border-border hover:border-border/80 transition-all space-y-4 shadow-sm hover:shadow-md flex flex-col justify-between h-full chrome-pattern"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="success" size="sm">
                              {ass.subject}
                            </Badge>
                            {isIndividual && (
                              <Badge variant="primary" size="sm">
                                BİREYSEL
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-foreground leading-snug">{ass.title}</h3>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">Konu: {ass.topic}</p>
                        </div>

                        <button
                          onClick={() => handleDelete(ass._id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                          title="Ödevi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {ass.description}
                      </p>

                      {/* Attachments preview */}
                      {ass.attachments && ass.attachments.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                          {ass.attachments.map((att, aIdx) => (
                            <a
                              key={aIdx}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-[11px] text-primary flex items-center gap-1.5 border border-border transition-colors font-medium"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> Ek {aIdx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Info & Breakdown */}
                    <div className="pt-3 border-t border-border/60 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          {ass.stats?.completedCount || 0} Tamamlandı
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          {ass.stats?.partialCount || 0} Yarım Kaldı
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                          {ass.stats?.incompleteCount || 0} Tamamlanmadı
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Teslim: {new Date(ass.dueAt).toLocaleDateString('tr-TR')}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(ass)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Öğrenci Durumları</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </AnimatedItem>
              );
            })}
          </div>
        )}

        {/* Create Assignment Modal */}
        {isCreateOpen && (
          <Modal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            title="Yeni Ödev Oluştur"
            description="Öğrencileriniz için yeni ödev yönergesi ve teslim tarihi belirleyin."
            size="lg"
          >
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <Input
                label="Ödev Başlığı *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Kesirler Çalışma Kağıdı"
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
                  label="Konu *"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Örn: Basit Kesirler"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Son Teslim Tarihi *
                  </label>
                  <input
                    type="date"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full rounded-xl bg-background border border-input text-foreground text-sm py-2 px-3.5 focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Ödev Hedefi
                  </label>
                  <select
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="w-full rounded-xl bg-background border border-input text-foreground text-sm py-2 px-3.5 focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs"
                  >
                    <option value="class">Tüm Sınıf</option>
                    <option value="individual">Belirli Öğrenciler (Bireysel)</option>
                  </select>
                </div>
              </div>

              {/* Multi-select student picker */}
              {assignmentType === 'individual' && (
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
                  Açıklama *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ödev yönergesini buraya yazınız..."
                  className="w-full rounded-xl bg-background border border-input text-foreground text-sm py-2.5 px-3.5 focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed placeholder:text-muted-foreground resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Görsel Ekle (Opsiyonel: JPG, PNG, WebP)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <p className="text-[11px] text-emerald-500 font-medium mt-1">
                    {selectedFiles.length} görsel seçildi.
                  </p>
                )}
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
                  Ödevi Kaydet
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Student Statuses Modal */}
        {statusModalAssignment && (
          <Modal
            isOpen={Boolean(statusModalAssignment)}
            onClose={() => setStatusModalAssignment(null)}
            title={statusModalAssignment.title}
            description={`${statusModalAssignment.subject} • ${statusModalAssignment.topic} — Öğrenci Teslim Durumları`}
            size="lg"
          >
            <div className="space-y-4">
              {/* Summary Stats Badges */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                  <div className="text-[11px] text-muted-foreground">Toplam</div>
                  <div className="text-base font-bold text-foreground">{recipients.length}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[11px] text-emerald-400 font-medium">Tamamlandı</div>
                  <div className="text-base font-bold text-emerald-400">
                    {recipients.filter(r => r.status === 'completed').length}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[11px] text-amber-400 font-medium">Yarım Kaldı</div>
                  <div className="text-base font-bold text-amber-400">
                    {recipients.filter(r => r.status === 'partial').length}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-[11px] text-rose-400 font-medium">Tamamlanmadı</div>
                  <div className="text-base font-bold text-rose-400">
                    {recipients.filter(r => r.status === 'incomplete' || r.status === 'pending').length}
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1 p-1 bg-muted/60 border border-border/80 rounded-xl text-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setRecipientFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      recipientFilter === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Tümü ({recipients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientFilter('completed')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      recipientFilter === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Tamamlandı
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientFilter('partial')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      recipientFilter === 'partial' ? 'bg-amber-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Yarım Kaldı
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientFilter('incomplete')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      recipientFilter === 'incomplete' ? 'bg-rose-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Tamamlanmadı
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Öğrenci ara..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>

              {/* Student list */}
              {recipientsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-muted-foreground">Öğrenci durumları yükleniyor...</p>
                </div>
              ) : recipients.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Bu ödeve atanmış öğrenci bulunamadı.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-border/30">
                  {recipients
                    .filter(r => {
                      if (recipientFilter === 'completed') return r.status === 'completed';
                      if (recipientFilter === 'partial') return r.status === 'partial';
                      if (recipientFilter === 'incomplete') return r.status === 'incomplete' || r.status === 'pending';
                      return true;
                    })
                    .filter(r => {
                      if (!recipientSearch.trim()) return true;
                      const q = recipientSearch.toLowerCase();
                      return r.name.toLowerCase().includes(q) || (r.studentNumber && r.studentNumber.toLowerCase().includes(q));
                    })
                    .map(r => (
                      <div key={r.studentId} className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground">No: {r.studentNumber}</p>
                          </div>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            disabled={updatingStudentId === r.studentId}
                            onClick={() => handleUpdateStudentStatus(statusModalAssignment._id, r.studentId, 'completed')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              r.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-xs'
                                : 'bg-muted/30 text-muted-foreground hover:text-emerald-400 border-border/60 hover:border-emerald-500/30'
                            }`}
                            title="Tamamlandı olarak işaretle"
                          >
                            ✓ Tamamlandı
                          </button>
                          <button
                            type="button"
                            disabled={updatingStudentId === r.studentId}
                            onClick={() => handleUpdateStudentStatus(statusModalAssignment._id, r.studentId, 'partial')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              r.status === 'partial'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-xs'
                                : 'bg-muted/30 text-muted-foreground hover:text-amber-400 border-border/60 hover:border-amber-500/30'
                            }`}
                            title="Yarım kaldı olarak işaretle"
                          >
                            ⏱ Yarım Kaldı
                          </button>
                          <button
                            type="button"
                            disabled={updatingStudentId === r.studentId}
                            onClick={() => handleUpdateStudentStatus(statusModalAssignment._id, r.studentId, 'incomplete')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              r.status === 'incomplete' || r.status === 'pending'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-xs'
                                : 'bg-muted/30 text-muted-foreground hover:text-rose-400 border-border/60 hover:border-rose-500/30'
                            }`}
                            title="Tamamlanmadı olarak işaretle"
                          >
                            ✕ Tamamlanmadı
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="pt-3 border-t border-border flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setStatusModalAssignment(null)}>
                  Kapat
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AssignmentsPage;
