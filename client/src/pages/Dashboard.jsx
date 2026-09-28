import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Presentation,
  BookOpen,
  Award,
  CalendarCheck,
  Megaphone,
  MessageSquare,
  ArrowRight,
  School,
  User,
  Clock,
  Lock,
  Sparkles
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import {
  StatCard,
  Card,
  CardContent,
  Badge,
  EmptyState,
  Button,
  AnimatedItem,
  AnimatedGreeting
} from '../components/ui';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [studentProfile, setStudentProfile] = useState(null);
  const [classBoards, setClassBoards] = useState([]);
  const [assignmentsSummary, setAssignmentsSummary] = useState({ total: 0, active: 0, individual: 0 });
  const [recentExams, setRecentExams] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ absent: 0, late: 0, rate: 100 });
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [pendingMeetingCount, setPendingMeetingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pairing state for unpaired students
  const [pairingInput, setPairingInput] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingMessage, setPairingMessage] = useState(null);

  useEffect(() => {
    fetchStudentDashboard();
  }, []);

  const fetchStudentDashboard = async () => {
    setLoading(true);
    try {
      const profileRes = await api.get('/api/students/me');
      const prof = profileRes.data;
      setStudentProfile(prof);

      if (prof && prof.classId) {
        const classId = typeof prof.classId === 'object' ? prof.classId?._id : prof.classId;

        // Boards
        try {
          const boardsRes = await api.get('/api/boards/student/my-boards');
          if (boardsRes.data && boardsRes.data.length > 0) {
            setClassBoards(boardsRes.data);
          } else if (classId) {
            const fallbackRes = await api.get(`/api/boards/class/${classId}`);
            setClassBoards(fallbackRes.data || []);
          }
        } catch (e) {
          if (classId) {
            const fallbackRes = await api.get(`/api/boards/class/${classId}`).catch(() => ({ data: [] }));
            setClassBoards(fallbackRes.data || []);
          }
        }

        // Assignments
        try {
          const assRes = await api.get('/api/assignments/student');
          const assList = assRes.data || [];
          const activeCount = assList.filter(a => a.studentStatus !== 'completed').length;
          const indCount = assList.filter(a => a.isIndividual).length;
          setAssignmentsSummary({
            total: assList.length,
            active: activeCount,
            individual: indCount
          });
        } catch (e) {}

        // Exams
        try {
          const exRes = await api.get('/api/exams/student');
          setRecentExams(exRes.data || []);
        } catch (e) {}

        // Attendance
        try {
          const attRes = await api.get(`/api/attendance/student/${prof._id}`);
          setAttendanceStats({
            absent: attRes.data.absent || 0,
            late: attRes.data.late || 0,
            rate: attRes.data.attendanceRate ?? 100
          });
        } catch (e) {}

        // Announcements
        try {
          const annRes = await api.get('/api/announcements/student');
          const unread = (annRes.data || []).filter(a => !a.isRead).length;
          setUnreadAnnouncementsCount(unread);
        } catch (e) {}

        // Meetings
        try {
          const meetRes = await api.get('/api/meetings/student');
          const waiting = (meetRes.data || []).filter(m => m.status === 'waiting_teacher').length;
          setPendingMeetingCount(waiting);
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePairClass = async (e) => {
    e.preventDefault();
    if (!pairingInput.trim()) return;

    setPairingLoading(true);
    setPairingMessage(null);
    try {
      const res = await api.post('/api/students/pair', {
        matchingCode: pairingInput.trim().toUpperCase()
      });
      setPairingMessage({
        type: res.data.pending ? 'pending' : 'success',
        text: res.data.message || (res.data.pending ? 'Eşleşme talebi öğretmene iletildi. Onaylandıktan sonra sınıfa dahil edileceksiniz' : 'Sınıf eşleşmesi başarıyla yapıldı!')
      });
      fetchStudentDashboard();
      setPairingInput('');
    } catch (err) {
      setPairingMessage({ type: 'error', text: err.response?.data?.message || 'Eşleşme kodu geçersiz' });
    } finally {
      setPairingLoading(false);
    }
  };

  const lastExam = recentExams.length > 0 ? recentExams[0] : null;
  const classObj = studentProfile?.classId && typeof studentProfile.classId === 'object' ? studentProfile.classId : null;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-8"
      >
        {/* Welcome & Sınıfım Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground p-7 sm:p-9 shadow-sm chrome-pattern">
          {/* Decorative Ambient Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="primary" size="sm" dot>
                  Öğrenci Portalı
                </Badge>
                <span className="text-xs text-muted-foreground/80 font-medium px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/60">
                  {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <AnimatedGreeting
                prefix="Merhaba,"
                name={studentProfile?.firstName ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim() : (user?.username || 'Öğrenci')}
              />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ders tahtalarınıza, ödevlerinize ve sınav sıralamalarınıza buradan anında ulaşabilirsiniz.
              </p>
            </div>

          {/* Sınıfım Info Box or Pending / Unassigned Box */}
          {studentProfile?.status === 'pending' || studentProfile?.pendingClassId ? (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-foreground text-xs space-y-2 max-w-sm">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Clock className="w-3.5 h-3.5 animate-spin-slow shrink-0" />
                <span>Eşleşme Talebi Beklemede</span>
              </div>
              <p className="text-[11px] text-foreground font-medium leading-relaxed">
                Eşleşme talebi öğretmene iletildi. Onaylandıktan sonra sınıfa dahil edileceksiniz.
              </p>
              {studentProfile?.pendingClassId && (
                <div className="text-[10px] text-muted-foreground bg-background/60 border border-border/60 rounded-md p-1.5 flex items-center justify-between">
                  <span>Talep Edilen Sınıf:</span>
                  <span className="font-semibold text-foreground">
                    {studentProfile.pendingClassId.name || `${studentProfile.pendingClassId.grade}/${studentProfile.pendingClassId.section}`}
                  </span>
                </div>
              )}
            </div>
          ) : classObj ? (
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-1.5 min-w-[240px]">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" /> Sınıfım
              </div>
              <h3 className="font-semibold text-foreground text-base">
                {classObj.name || (classObj.grade ? `${classObj.grade}/${classObj.section}` : 'Sınıfım')}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {classObj.schoolName || 'Okul'}
              </p>
              <div className="text-xs text-muted-foreground pt-1.5 border-t border-border/60 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate">{classObj.teacherName || studentProfile?.teacherId?.username || 'Öğretmen'}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-foreground text-xs space-y-2.5 max-w-sm">
              <div className="flex items-center gap-1.5 font-semibold text-amber-500">
                <School className="w-3.5 h-3.5" />
                <span>Henüz bir sınıfa eşleşmediniz</span>
              </div>
              <form onSubmit={handlePairClass} className="flex gap-2">
                <input
                  type="text"
                  value={pairingInput}
                  onChange={(e) => setPairingInput(e.target.value.toUpperCase())}
                  placeholder="Sınıf Kodu (EDU-2C-A7K9)"
                  className="px-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring flex-1"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="xs"
                  loading={pairingLoading}
                  disabled={!pairingInput.trim()}
                >
                  Eşleş
                </Button>
              </form>
              <p className="text-[11px] font-medium text-amber-500/90 flex items-center gap-1">
                <span>⚠️</span> Öğretmeninizden sınıf eşleştirme kodunuzu talep ediniz.
              </p>
              {pairingMessage && (
                <div className={`p-2 rounded-lg border text-[11px] font-medium ${
                  pairingMessage.type === 'pending'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : pairingMessage.type === 'success'
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-destructive bg-destructive/10 border-destructive/20'
                }`}>
                  {pairingMessage.text}
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Dashboard Summary Cards with Staggered Entrance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnimatedItem index={0} stagger={0.05}>
            <StatCard
              title="Aktif Ödevler"
              value={`${assignmentsSummary.active}`}
              icon={BookOpen}
              color="emerald"
              description={`Toplam: ${assignmentsSummary.total}${assignmentsSummary.individual > 0 ? ` • ${assignmentsSummary.individual} Bireysel` : ''}`}
              onClick={() => navigate('/my-assignments')}
            />
          </AnimatedItem>

          <AnimatedItem index={1} stagger={0.05}>
            <StatCard
              title="Son Sınav Sonucu"
              value={lastExam && lastExam.myScore !== null ? `${lastExam.myScore} / ${lastExam.maxScore}` : '—'}
              icon={Award}
              color="amber"
              description={lastExam ? `${lastExam.subject}${lastExam.rank ? ` • ${lastExam.rank}. Sıra` : ''}` : 'Sınav sonucu yok'}
              onClick={() => navigate('/my-exams')}
            />
          </AnimatedItem>

          <AnimatedItem index={2} stagger={0.05}>
            <StatCard
              title="Devamsızlık"
              value={`${attendanceStats.absent} Gün`}
              icon={CalendarCheck}
              color="sky"
              description={`Geç: ${attendanceStats.late} • Katılım: %${attendanceStats.rate}`}
              onClick={() => navigate('/my-attendance')}
            />
          </AnimatedItem>

          <AnimatedItem index={3} stagger={0.05}>
            <StatCard
              title="Duyurular"
              value={`${unreadAnnouncementsCount}`}
              icon={Megaphone}
              color="indigo"
              description={pendingMeetingCount > 0 ? `${pendingMeetingCount} görüşme yanıtı bekleniyor` : 'Görüşme talepleri güncel'}
              onClick={() => navigate('/my-announcements')}
            />
          </AnimatedItem>
        </div>

        {/* MEVCUT TAHTALAR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Presentation className="w-4 h-4 text-muted-foreground" /> Mevcut Tahtalar ({classBoards.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Öğretmeninizin sınıfınız için oluşturduğu aktif ders tahtaları.
              </p>
            </div>

            <Link to="/my-boards" className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 group transition-colors">
              <span>Tümünü Gör</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-xs">Tahtalar yükleniyor...</div>
          ) : classBoards.length === 0 ? (
            <Card className="border-dashed border-border bg-muted/20">
              <CardContent className="py-12 text-center space-y-2">
                <p className="text-foreground text-sm font-semibold">Henüz aktif bir sınıf tahtası bulunmuyor.</p>
                <p className="text-muted-foreground text-xs">Öğretmeniniz yeni bir tahta başlattığında burada görünecektir.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classBoards.slice(0, 6).map((board, idx) => (
                <AnimatedItem key={board.roomId} index={idx} stagger={0.05}>
                  <motion.div
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/board/${board.roomId}`)}
                    className="p-5 rounded-xl bg-card hover:bg-muted/40 border border-border transition-colors cursor-pointer group space-y-3 shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
                          {board.name}
                        </h3>
                        {board.isPasswordProtected && (
                          <Badge variant="warning" size="sm" icon={Lock}>
                            Şifreli
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {new Date(board.boardDate || board.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{board.createdBy?.username || 'Öğretmen'}</span>
                      <span className="text-foreground font-medium text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Tahtaya Gir <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </motion.div>
                </AnimatedItem>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Dashboard;
