import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle,
  X,
  Image as ImageIcon,
  Calendar,
  User,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, StatCard, Badge, Button, EmptyState, Modal, AnimatedItem, AnimatedNumber } from '../components/ui';

const StudentAssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentAssignments();
  }, []);

  const fetchStudentAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/assignments/student');
      setAssignments(res.data || []);
    } catch (err) {
      console.error('Error fetching student assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetStatus = async (assignmentId, newStatus) => {
    try {
      const res = await api.patch(`/api/assignments/${assignmentId}/status`, { status: newStatus });
      const updatedStatus = res.data.status || newStatus;
      setAssignments(prev => prev.map(a => {
        if (a._id === assignmentId) {
          return {
            ...a,
            studentStatus: updatedStatus,
            timingCategory: updatedStatus === 'completed' ? 'completed' : a.daysRemaining < 0 ? 'overdue' : a.daysRemaining <= 2 ? 'upcoming' : 'active'
          };
        }
        return a;
      }));

      if (selectedAssignment && selectedAssignment._id === assignmentId) {
        setSelectedAssignment(prev => ({
          ...prev,
          studentStatus: updatedStatus
        }));
      }
    } catch (err) {
      console.error('Error setting assignment status:', err);
    }
  };

  // Summary calculations
  const activeCount = assignments.filter(a => a.studentStatus !== 'completed' && a.daysRemaining >= 0).length;
  const upcomingCount = assignments.filter(a => a.studentStatus !== 'completed' && a.daysRemaining >= 0 && a.daysRemaining <= 2).length;
  const completedCount = assignments.filter(a => a.studentStatus === 'completed').length;
  const overdueCount = assignments.filter(a => a.studentStatus !== 'completed' && a.daysRemaining < 0).length;

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'active') return a.studentStatus !== 'completed';
    if (filter === 'upcoming') return a.timingCategory === 'upcoming';
    if (filter === 'overdue') return a.timingCategory === 'overdue';
    if (filter === 'completed') return a.studentStatus === 'completed';
    if (filter === 'individual') return a.isIndividual;
    return true;
  });

  const filterTabs = [
    { id: 'all', label: 'Tümü' },
    { id: 'active', label: 'Aktif' },
    { id: 'upcoming', label: 'Yaklaşan' },
    { id: 'overdue', label: 'Geciken' },
    { id: 'completed', label: 'Tamamlanan' },
    { id: 'individual', label: 'Bireysel' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Ödevlerim"
          description="Ders ödevlerinizi takip edin, son teslim tarihlerini kaçırmayın ve tamamladıklarınızı işaretleyin."
        />

        {/* Summary Cards with AnimatedNumber & Chrome Pattern */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <AnimatedItem index={0}>
            <StatCard
              title="Aktif Ödev"
              value={activeCount}
              icon={BookOpen}
              iconColor="indigo"
              description="Teslim bekleyen"
            />
          </AnimatedItem>
          <AnimatedItem index={1}>
            <StatCard
              title="Yaklaşan Teslim"
              value={upcomingCount}
              icon={Clock}
              iconColor="amber"
              description="Son 2 gün içinde"
            />
          </AnimatedItem>
          <AnimatedItem index={2}>
            <StatCard
              title="Tamamlanan"
              value={completedCount}
              icon={CheckCircle}
              iconColor="emerald"
              description="Bitirilen ödevler"
            />
          </AnimatedItem>
          <AnimatedItem index={3}>
            <StatCard
              title="Geciken"
              value={overdueCount}
              icon={X}
              iconColor="rose"
              description="Süresi geçmiş"
            />
          </AnimatedItem>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/80 w-fit text-xs font-medium">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assignments Cards Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Ödevler yükleniyor...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Görüntülenecek ödev bulunamadı"
            description="Seçtiğiniz filtreye uygun ödev bulunmuyor veya yeni ödev verilmemiş."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignments.map((ass, idx) => {
              const isDone = ass.studentStatus === 'completed';
              const isOverdue = !isDone && ass.daysRemaining < 0;
              const isUpcoming = !isDone && ass.daysRemaining >= 0 && ass.daysRemaining <= 2;

              return (
                <AnimatedItem key={ass._id} index={idx}>
                  <div
                    onClick={() => setSelectedAssignment(ass)}
                    className={`p-5 sm:p-6 rounded-2xl bg-card hover:bg-card/90 border transition-all cursor-pointer group space-y-4 shadow-sm hover:shadow-md flex flex-col justify-between h-full chrome-pattern ${
                      isDone
                        ? 'border-emerald-500/30 opacity-80'
                        : isOverdue
                        ? 'border-destructive/40 hover:border-destructive'
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="primary" size="sm">
                            {ass.subject}
                          </Badge>
                          {ass.isIndividual && (
                            <Badge variant="secondary" size="sm">
                              BİREYSEL
                            </Badge>
                          )}
                        </div>

                        {/* Status Badge */}
                        {ass.studentStatus === 'completed' ? (
                          <Badge variant="success" size="sm">
                            ✓ Tamamlandı
                          </Badge>
                        ) : ass.studentStatus === 'partial' ? (
                          <Badge variant="warning" size="sm">
                            ⏳ Yarım Kaldı
                          </Badge>
                        ) : ass.studentStatus === 'incomplete' ? (
                          <Badge variant="danger" size="sm">
                            ✗ Tamamlanmadı
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="danger" size="sm">
                            Süresi Geçti
                          </Badge>
                        ) : isUpcoming ? (
                          <Badge variant="warning" size="sm">
                            {ass.daysRemaining === 0 ? 'Bugün Son!' : `${ass.daysRemaining} Gün Kaldı`}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {ass.daysRemaining} gün var
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                          {ass.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Konu: {ass.topic}</p>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {ass.description}
                      </p>

                      {/* 3 Status Selector Buttons on card */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(ass._id, 'completed')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            ass.studentStatus === 'completed' ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          Tamamlandı
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(ass._id, 'partial')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            ass.studentStatus === 'partial' ? 'bg-amber-600 text-white border-amber-500 shadow-xs' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          Yarım Kaldı
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(ass._id, 'incomplete')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            ass.studentStatus === 'incomplete' ? 'bg-rose-600 text-white border-rose-500 shadow-xs' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          Tamamlanmadı
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        Son Teslim: {new Date(ass.dueAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                      </span>

                      <span className="text-primary font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Detaylar <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </AnimatedItem>
              );
            })}
          </div>
        )}

        {/* Assignment Detail Modal */}
        {selectedAssignment && (
          <Modal
            isOpen={Boolean(selectedAssignment)}
            onClose={() => setSelectedAssignment(null)}
            title={selectedAssignment.title}
            description={`${selectedAssignment.subject} • ${selectedAssignment.topic}`}
            size="md"
          >
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Son Teslim Tarihi:</span>
                  <span className="text-foreground font-bold">
                    {new Date(selectedAssignment.dueAt).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Durum:</span>
                  <span>
                    {selectedAssignment.studentStatus === 'completed' && (
                      <Badge variant="success" size="sm">Tamamlandı</Badge>
                    )}
                    {selectedAssignment.studentStatus === 'partial' && (
                      <Badge variant="warning" size="sm">Yarım Kaldı</Badge>
                    )}
                    {(selectedAssignment.studentStatus === 'incomplete' || (!selectedAssignment.studentStatus && selectedAssignment.daysRemaining < 0)) && (
                      <Badge variant="danger" size="sm">Tamamlanmadı</Badge>
                    )}
                    {(!selectedAssignment.studentStatus || selectedAssignment.studentStatus === 'pending') && selectedAssignment.daysRemaining >= 0 && (
                      <Badge variant="secondary" size="sm">Teslim Bekliyor</Badge>
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ödev Yönergesi</h4>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap p-3.5 rounded-xl bg-card border border-border">
                  {selectedAssignment.description}
                </p>
              </div>

              {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ek Dosyalar / Görseller</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedAssignment.attachments.map((att, aIdx) => (
                      <a
                        key={aIdx}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-xs text-foreground flex items-center justify-between group transition-colors"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">Ek Belge {aIdx + 1}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ödev Durumunuzu İşaretleyin
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetStatus(selectedAssignment._id, 'completed')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selectedAssignment.studentStatus === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-muted/40 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 border-border'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Tamamlandı</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(selectedAssignment._id, 'partial')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selectedAssignment.studentStatus === 'partial'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-muted/40 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 border-border'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Yarım Kaldı</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(selectedAssignment._id, 'incomplete')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selectedAssignment.studentStatus === 'incomplete'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                        : 'bg-muted/40 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 border-border'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tamamlanmadı</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAssignment(null)}
                  >
                    Kapat
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentAssignmentsPage;
