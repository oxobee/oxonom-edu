import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Lock,
  Send,
  User,
  Search,
  ChevronLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, Button, Badge, Modal, AnimatedNumber } from '../components/ui';

const URGENCY_CONFIG = {
  urgent: { label: 'ACİL', variant: 'danger' },
  high: { label: 'YÜKSEK', variant: 'warning' },
  normal: { label: 'NORMAL', variant: 'primary' },
  low: { label: 'DÜŞÜK', variant: 'neutral' }
};

const TeacherMeetingsPage = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('open'); // 'open', 'resolved', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [closeLoading, setCloseLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/meetings/teacher');
      const list = res.data || [];
      setRequests(list);
      // Auto-select first request if desktop and none selected
      if (list.length > 0 && !selectedRequest && window.innerWidth >= 768) {
        openChat(list[0]);
      }
    } catch (err) {
      console.error('Error fetching teacher meeting requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (reqItem) => {
    setSelectedRequest(reqItem);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/meetings/${reqItem._id}`);
      setSelectedRequest(res.data.request);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedRequest) return;

    setSubmittingReply(true);
    try {
      const res = await api.post(`/api/meetings/${selectedRequest._id}/message`, {
        message: replyMessage.trim()
      });

      setMessages(prev => [...prev, res.data.message]);
      setSelectedRequest(prev => ({
        ...prev,
        status: 'waiting_student'
      }));
      setReplyMessage('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Mesaj gönderilemedi');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedRequest) return;
    try {
      await api.patch(`/api/meetings/${selectedRequest._id}/resolve`);
      setSelectedRequest(prev => ({ ...prev, status: 'resolved' }));
      fetchRequests();
    } catch (err) {
      alert('İşlem başarısız');
    }
  };

  const handleCloseRequest = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setCloseLoading(true);
    try {
      await api.patch(`/api/meetings/${selectedRequest._id}/close`, {
        closeReason: closeReason.trim()
      });
      setSelectedRequest(prev => ({
        ...prev,
        status: 'closed',
        closeReason: closeReason.trim(),
        closedAt: new Date()
      }));
      setIsCloseModalOpen(false);
      setCloseReason('');
      fetchRequests();
      const det = await api.get(`/api/meetings/${selectedRequest._id}`);
      setMessages(det.data.messages || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Talebi kapatma işlemi başarısız');
    } finally {
      setCloseLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'open') {
      if (r.status === 'resolved' || r.status === 'closed') return false;
    } else if (filter === 'resolved') {
      if (r.status !== 'resolved' && r.status !== 'closed') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const studentName = r.studentId ? `${r.studentId.firstName} ${r.studentId.lastName}`.toLowerCase() : '';
      const subject = (r.subject || '').toLowerCase();
      const className = (r.classId?.name || '').toLowerCase();
      return studentName.includes(q) || subject.includes(q) || className.includes(q);
    }
    return true;
  });

  const getStudentInitial = (reqItem) => {
    if (reqItem?.studentId?.firstName) {
      return reqItem.studentId.firstName.charAt(0).toUpperCase();
    }
    return 'Ö';
  };

  const pendingCount = requests.filter(r => r.status !== 'resolved' && r.status !== 'closed').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Görüşme Talepleri"
          description="Öğrencilerinizden gelen bireysel soruları ve yardım taleplerini mesajlaşma arayüzü ile yönetin."
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Bekleyen Talep:</span>
              <Badge variant="primary" size="md">
                <AnimatedNumber value={pendingCount} />
              </Badge>
            </div>
          }
        />

        {/* Main Two-Pane Chat Container */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px] max-h-[calc(100vh-210px)] chrome-pattern">
          {/* Left Pane: Conversations List */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card/60 shrink-0 ${
            selectedRequest ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Search & Filter Header */}
            <div className="p-3.5 border-b border-border space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Öğrenci veya konu ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center p-1 rounded-lg bg-muted/60 text-xs font-medium">
                <button
                  onClick={() => setFilter('open')}
                  className={`flex-1 py-1 rounded-md transition-all text-center cursor-pointer ${
                    filter === 'open'
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Bekleyen ({requests.filter(r => r.status !== 'resolved' && r.status !== 'closed').length})
                </button>
                <button
                  onClick={() => setFilter('resolved')}
                  className={`flex-1 py-1 rounded-md transition-all text-center cursor-pointer ${
                    filter === 'resolved'
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Çözülen
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 py-1 rounded-md transition-all text-center cursor-pointer ${
                    filter === 'all'
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tümü
                </button>
              </div>
            </div>

            {/* List Items Scroll Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {loading ? (
                <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Talepler yükleniyor...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-16 px-4 text-center text-muted-foreground text-xs space-y-2">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                  <p className="font-medium text-foreground">Talep bulunamadı</p>
                  <p className="text-[11px]">Seçili filtreye uygun görüşme talebi yok.</p>
                </div>
              ) : (
                filteredRequests.map(item => {
                  const isSelected = selectedRequest?._id === item._id;
                  const urgencyCfg = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.normal;
                  const studentName = item.studentId ? `${item.studentId.firstName} ${item.studentId.lastName}` : 'Öğrenci';

                  return (
                    <div
                      key={item._id}
                      onClick={() => openChat(item)}
                      className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 text-left relative ${
                        isSelected
                          ? 'bg-muted border-l-4 border-l-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Student Avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm shrink-0 mt-0.5">
                        {getStudentInitial(item)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {studentName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-foreground/90 truncate">
                          {item.subject}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {item.classId?.name || 'Sınıf'}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant={urgencyCfg.variant} size="xs">
                              {urgencyCfg.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Chat Thread */}
          <div className={`flex-1 flex flex-col bg-background/50 ${
            !selectedRequest ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedRequest ? (
              <>
                {/* Chat Top Header */}
                <div className="px-4 py-3 sm:px-6 border-b border-border bg-card/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="md:hidden p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                      {getStudentInitial(selectedRequest)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground truncate">
                          {selectedRequest.studentId ? `${selectedRequest.studentId.firstName} ${selectedRequest.studentId.lastName}` : 'Öğrenci'}
                        </h2>
                        <Badge variant={URGENCY_CONFIG[selectedRequest.urgency]?.variant || 'neutral'} size="xs">
                          {URGENCY_CONFIG[selectedRequest.urgency]?.label || 'NORMAL'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {selectedRequest.classId?.name || 'Sınıf'} • <span className="text-foreground/80 font-medium">{selectedRequest.subject}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions (Resolve / Close) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedRequest.status !== 'resolved' && selectedRequest.status !== 'closed' ? (
                      <>
                        <Button
                          variant="outline"
                          size="xs"
                          leftIcon={CheckCircle}
                          onClick={handleResolve}
                          className="text-emerald-500 hover:text-emerald-600 border-emerald-500/30"
                        >
                          Çözüldü
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon={XCircle}
                          onClick={() => { setCloseReason(''); setIsCloseModalOpen(true); }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Kapat
                        </Button>
                      </>
                    ) : (
                      <Badge variant={selectedRequest.status === 'resolved' ? 'success' : 'neutral'} size="sm">
                        {selectedRequest.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Banner if Closed */}
                {selectedRequest.status === 'closed' && (
                  <div className="px-6 py-2.5 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive flex items-center justify-between gap-2">
                    <span className="font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Bu görüşme talebi sonlandırılmıştır.
                    </span>
                    {selectedRequest.closeReason && (
                      <span className="italic text-foreground/80">
                        "{selectedRequest.closeReason}"
                      </span>
                    )}
                  </div>
                )}

                {/* Chat Messages Body */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                  {loadingMessages ? (
                    <div className="py-20 text-center text-muted-foreground text-xs space-y-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p>Mesajlar yükleniyor...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs">
                      Mesaj geçmişi bulunamadı.
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isTeacher = msg.senderRole === 'teacher';

                      return (
                        <div
                          key={msg._id}
                          className={`flex flex-col ${isTeacher ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[10px] text-muted-foreground mb-1 px-1">
                            {isTeacher ? 'Siz (Öğretmen)' : 'Öğrenci'} • {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div
                            className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                              isTeacher
                                ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-xs'
                                : 'bg-muted text-foreground border border-border/60 rounded-tl-xs'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Composer Footer */}
                {selectedRequest.status === 'resolved' ? (
                  <div className="p-4 border-t border-border bg-card/40 text-center text-xs text-emerald-500 font-medium">
                    ✅ Bu görüşme talebi çözüldü olarak işaretlenmiştir.
                  </div>
                ) : selectedRequest.status === 'closed' ? (
                  <div className="p-4 border-t border-border bg-card/40 text-center text-xs text-destructive font-medium">
                    🔒 Bu görüşme talebi kapatılmıştır. Yeni mesaj gönderilemez.
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="p-3 sm:p-4 border-t border-border bg-card/80 flex items-center gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Öğrenciye mesajınızı yazın..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      leftIcon={Send}
                      disabled={submittingReply || !replyMessage.trim()}
                      className="shadow-xs shrink-0"
                    >
                      Gönder
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/80 border border-border flex items-center justify-center text-muted-foreground">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Bir Görüşme Talebi Seçin</h3>
                <p className="text-xs max-w-sm text-muted-foreground">
                  Sol taraftaki listeden bir talep seçerek öğrenciyle birebir yazışmaya başlayabilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Close Modal with shadcn theme tokens */}
        {isCloseModalOpen && (
          <Modal
            isOpen={isCloseModalOpen}
            onClose={() => setIsCloseModalOpen(false)}
            title="Görüşme Talebini Kapat"
            size="sm"
          >
            <form onSubmit={handleCloseRequest} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Bu görüşme talebini kapatmak üzeresiniz. Dilerseniz öğrenci için bir kapatma gerekçesi belirtebilirsiniz.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Kapatma Sebebi (İsteğe bağlı)
                </label>
                <textarea
                  rows={3}
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Örn: Konu derste yüz yüze görüşülerek tamamlandı..."
                  className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCloseModalOpen(false)}
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  isLoading={closeLoading}
                >
                  Talebi Kapat
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherMeetingsPage;
