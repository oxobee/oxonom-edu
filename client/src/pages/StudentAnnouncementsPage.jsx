import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  CheckCircle,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Badge, EmptyState, AnimatedNumber } from '../components/ui';

const StudentAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentAnnouncements();
  }, []);

  const fetchStudentAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/announcements/student');
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error('Error fetching student announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/api/announcements/${id}/read`);
      setAnnouncements(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const filtered = announcements.filter(a => {
    if (filter === 'unread') return !a.isRead;
    return true;
  });

  const unreadCount = announcements.filter(a => !a.isRead).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Duyurular & Bildirimler"
          description="Öğretmeniniz tarafından sınıfınıza veya şahsınıza gönderilen tüm duyurular."
          actions={
            <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/80 text-xs font-medium">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tümü (<AnimatedNumber value={announcements.length} />)
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'unread' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Okunmamış (<AnimatedNumber value={unreadCount} />)
              </button>
            </div>
          }
        />

        {/* List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Duyurular yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Duyuru bulunamadı"
            description={filter === 'unread' ? 'Okunmamış duyurunuz bulunmuyor.' : 'Öğretmeniniz duyuru paylaştığında burada listelenecektir.'}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map(ann => {
              const isUrgent = ann.priority === 'urgent';
              const isImportant = ann.priority === 'important';

              return (
                <div
                  key={ann._id}
                  onClick={() => !ann.isRead && handleMarkAsRead(ann._id)}
                  className={`p-5 sm:p-6 rounded-2xl bg-card hover:bg-card/90 border transition-all space-y-3 cursor-pointer shadow-sm hover:shadow-md chrome-pattern ${
                    !ann.isRead
                      ? 'border-primary/50 shadow-primary/5 ring-1 ring-primary/20'
                      : isUrgent
                      ? 'border-destructive/30'
                      : isImportant
                      ? 'border-amber-500/30'
                      : 'border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={isUrgent ? 'danger' : isImportant ? 'warning' : 'primary'}
                        size="sm"
                      >
                        {isUrgent ? 'ACİL' : isImportant ? 'ÖNEMLİ' : 'NORMAL'}
                      </Badge>

                      <h3 className="text-base font-semibold text-foreground">{ann.title}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {new Date(ann.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {ann.isRead ? (
                        <span className="flex items-center gap-1 text-emerald-500 text-[11px] font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Okundu
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{ann.teacherId?.username || 'Öğretmen'}</span>
                    </span>
                    {!ann.isRead && (
                      <span className="text-[11px] text-primary font-medium">
                        Okundu olarak işaretlemek için tıklayın
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentAnnouncementsPage;
