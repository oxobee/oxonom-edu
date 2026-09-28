import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  X,
  XCircle,
  Clock,
  CheckCircle2,
  Send,
  Lock,
  User,
  Search,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import {
  PageHeader,
  Button,
  Badge,
  Modal,
  Input,
  AnimatedNumber
} from '../components/ui';

const URGENCY_CONFIG = {
  low: { label: 'Düşük', variant: 'neutral' },
  normal: { label: 'Normal', variant: 'primary' },
  high: { label: 'Yüksek', variant: 'warning' },
  urgent: { label: 'Acil', variant: 'danger' }
};

const StudentMeetingsPage = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'waiting_teacher', 'waiting_student', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Modal state for creating new ticket
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [initialMessage, setInitialMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Chat reply state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Close ticket modal state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [closeLoading, setCloseLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchStudentRequests();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchStudentRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/meetings/student');
      const list = res.data || [];
      setRequests(list);
      if (list.length > 0 && !selectedRequest && window.innerWidth >= 768) {
        openTicket(list[0]);
      }
    } catch (err) {
      console.error('Error fetching student meeting requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (reqItem) => {
    setSelectedRequest(reqItem);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/meetings/${reqItem._id}`);
      setSelectedRequest(res.data.request);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Error loading ticket details:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) {
      setError('Konu başlığı ve mesaj metni zorunludur.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/api/meetings', {
        subject: subject.trim(),
        urgency,
        message: initialMessage.trim()
      });

      setIsCreateOpen(false);
      setSubject('');
      setUrgency('normal');
      setInitialMessage('');
      await fetchStudentRequests();
      if (res.data.request) {
        openTicket(res.data.request);
      }
    } catch (err) {
      console.error('Error creating meeting request:', err);
      setError(err.response?.data?.message || 'Talep oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedRequest) return;

    if (selectedRequest.status === 'waiting_teacher') {
      alert('Öğretmeninizin yanıtı bekleniyor.');
      return;
    }

    setSendingReply(true);
    try {
      const res = await api.post(`/api/meetings/${selectedRequest._id}/message`, {
        message: replyText.trim()
      });

      setMessages(prev => [...prev, res.data.message]);
      setSelectedRequest(prev => ({
        ...prev,
        status: 'waiting_teacher'
      }));
      setReplyText('');
      setRequests(prev => prev.map(r => r._id === selectedRequest._id ? { ...r, status: 'waiting_teacher' } : r));
    } catch (err) {
      alert(err.response?.data?.message || 'Mesaj gönderilemedi');
    } finally {
      setSendingReply(false);
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
      fetchStudentRequests();
      const det = await api.get(`/api/meetings/${selectedRequest._id}`);
      setMessages(det.data.messages || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Talebi kapatma işlemi başarısız');
    } finally {
      setCloseLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'waiting_teacher') return r.status === 'waiting_teacher';
    if (filter === 'waiting_student') return r.status === 'waiting_student';
    if (filter === 'resolved') return r.status === 'resolved' || r.status === 'closed';

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const subj = (r.subject || '').toLowerCase();
      const teacher = (r.teacherId?.username || '').toLowerCase();
      return subj.includes(q) || teacher.includes(q);
    }
    return true;
  });

  const getStatusBadge = (status) => {
    if (status === 'resolved') {
      return <Badge variant="success" size="xs">Çözüldü</Badge>;
    }
    if (status === 'closed') {
      return <Badge variant="neutral" size="xs">Kapatıldı</Badge>;
    }
    if (status === 'waiting_teacher') {
      return <Badge variant="warning" size="xs">Öğretmen Bekleniyor</Badge>;
    }
    return <Badge variant="primary" size="xs" dot>Sıra Sizde</Badge>;
  };

  const isWaitingTeacher = selectedRequest?.status === 'waiting_teacher';
  const isResolved = selectedRequest?.status === 'resolved';
  const isClosed = selectedRequest?.status === 'closed';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Görüşme Taleplerim"
          description="Dersler, ödevler veya özel durumlarınız hakkında öğretmeninizle birebir görüşme talebi açın."
          actions={
            <Button
              variant="primary"
              size="md"
              leftIcon={Plus}
              onClick={() => setIsCreateOpen(true)}
              className="shadow-xs"
            >
              Yeni Görüşme Talebi
            </Button>
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
                  placeholder="Görüşme veya konu ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center p-1 rounded-lg bg-muted/60 text-xs font-medium overflow-x-auto">
                {[
                  { id: 'all', label: 'Tümü' },
                  { id: 'waiting_teacher', label: 'Öğretmen' },
                  { id: 'waiting_student', label: 'Sıra Sizde' },
                  { id: 'resolved', label: 'Çözülen' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`flex-1 py-1 px-2 rounded-md transition-all text-center whitespace-nowrap cursor-pointer ${
                      filter === tab.id
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
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
                  <p className="font-medium text-foreground">Talep bulunmuyor</p>
                  <p className="text-[11px]">Yeni bir talep açarak öğretmeninizle görüşebilirsiniz.</p>
                </div>
              ) : (
                filteredRequests.map(item => {
                  const isSelected = selectedRequest?._id === item._id;
                  const urgencyCfg = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.normal;

                  return (
                    <div
                      key={item._id}
                      onClick={() => openTicket(item)}
                      className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 text-left ${
                        isSelected
                          ? 'bg-muted border-l-4 border-l-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {item.subject}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate">
                          Öğretmen: {item.teacherId?.username || 'Sınıf Öğretmeni'}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          {getStatusBadge(item.status)}
                          <Badge variant={urgencyCfg.variant} size="xs">
                            {urgencyCfg.label}
                          </Badge>
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
                      <User className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground truncate">
                          {selectedRequest.subject}
                        </h2>
                        <Badge variant={URGENCY_CONFIG[selectedRequest.urgency]?.variant || 'neutral'} size="xs">
                          {URGENCY_CONFIG[selectedRequest.urgency]?.label}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Öğretmen: <span className="text-foreground/90 font-medium">{selectedRequest.teacherId?.username || 'Sınıf Öğretmeni'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isResolved && !isClosed && (
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={XCircle}
                        onClick={() => { setCloseReason(''); setIsCloseModalOpen(true); }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Talebi Kapat
                      </Button>
                    )}
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>

                {/* Banner if Closed */}
                {isClosed && (
                  <div className="px-6 py-2.5 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive flex items-center justify-between gap-2">
                    <span className="font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Bu görüşme talebi sonlandırılmıştır.
                    </span>
                    {selectedRequest.closeReason && (
                      <span className="italic text-foreground/80">
                        Gerekçe: "{selectedRequest.closeReason}"
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
                      const isStudent = msg.senderRole === 'student';

                      return (
                        <div
                          key={msg._id}
                          className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[10px] text-muted-foreground mb-1 px-1">
                            {isStudent ? 'Siz (Öğrenci)' : 'Öğretmen'} • {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div
                            className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                              isStudent
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
                {isResolved ? (
                  <div className="p-4 border-t border-border bg-card/40 text-center text-xs text-emerald-500 font-medium">
                    ✅ Bu görüşme talebi çözüldü olarak işaretlenmiştir.
                  </div>
                ) : isClosed ? (
                  <div className="p-4 border-t border-border bg-card/40 text-center text-xs text-destructive font-medium">
                    🔒 Bu görüşme talebi kapatılmıştır. Yeni mesaj gönderilemez.
                  </div>
                ) : isWaitingTeacher ? (
                  <div className="p-3.5 border-t border-border bg-muted/40 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Öğretmeninizin yanıtı bekleniyor. Öğretmeniniz cevap verdikten sonra tekrar yazabilirsiniz.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="p-3 sm:p-4 border-t border-border bg-card/80 flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Öğretmeninize mesajınızı yazın..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      leftIcon={Send}
                      disabled={sendingReply || !replyText.trim()}
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
                <h3 className="text-base font-semibold text-foreground">Görüşme Talebi Seçin</h3>
                <p className="text-xs max-w-sm text-muted-foreground">
                  Sol taraftaki listeden bir talep seçin veya yeni bir talep açarak öğretmeninizle iletişime geçin.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2"
                >
                  Yeni Görüşme Talebi
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Create Ticket Modal */}
        {isCreateOpen && (
          <Modal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            title="Yeni Görüşme Talebi"
            description="Öğretmeninize iletmek istediğiniz soru veya konuyu belirtin."
            size="md"
          >
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <Input
                  label="Konu Başlığı *"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Örn: Kesirler Konusu Hakkında Soru"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Aciliyet Seviyesi
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'low', label: 'Düşük' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'high', label: 'Yüksek' },
                    { id: 'urgent', label: 'Acil' }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setUrgency(lvl.id)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        urgency === lvl.id
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-card text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Mesajınız *
                </label>
                <textarea
                  rows={4}
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Öğretmeninize iletmek istediğiniz detayı açıklayınız..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
                />
              </div>

              {error && (
                <p className="text-destructive text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
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
                  Talebi Gönder
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Close Modal */}
        {isCloseModalOpen && (
          <Modal
            isOpen={isCloseModalOpen}
            onClose={() => setIsCloseModalOpen(false)}
            title="Görüşme Talebini Kapat"
            size="sm"
          >
            <form onSubmit={handleCloseRequest} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Talebi kapatmak istediğinize emin misiniz? Öğretmeninize dilerseniz kısa bir açıklama iletebilirsiniz.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Kapatma Gerekçesi (İsteğe bağlı)
                </label>
                <textarea
                  rows={3}
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Örn: Sorunu anladım, teşekkür ederim..."
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

export default StudentMeetingsPage;
