import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Presentation,
  Plus,
  CalendarCheck,
  Megaphone,
  BookOpen,
  Award,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Clock,
  Sparkles,
  FolderOpen
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  EmptyState,
  AnimatedItem,
  AnimatedGreeting
} from '../components/ui';
import CreateBoardModal from '../components/CreateBoardModal';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalBoards: 0,
    activeAssignments: 0,
    upcomingExams: 0,
    pendingMeetings: 0,
    recentAnnouncements: 0
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [pendingMeetings, setPendingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const classesRes = await api.get('/api/classes');
      const classList = classesRes.data || [];
      setClasses(classList);

      const totalStudents = classList.reduce((acc, c) => acc + (c.studentCount || 0), 0);
      const totalBoards = classList.reduce((acc, c) => acc + (c.boardCount || 0), 0);

      let pendingMeetingList = [];
      try {
        const meetingsRes = await api.get('/api/meetings/teacher');
        pendingMeetingList = (meetingsRes.data || []).filter(m => m.status === 'waiting_teacher');
        setPendingMeetings(pendingMeetingList.slice(0, 4));
      } catch (e) {}

      let activeAssignmentsCount = 0;
      let upcomingExamsCount = 0;
      let announcementsList = [];

      if (classList.length > 0) {
        const firstClassId = classList[0]._id;
        try {
          const [assRes, exRes, annRes] = await Promise.all([
            api.get(`/api/assignments/class/${firstClassId}`),
            api.get(`/api/exams/class/${firstClassId}`),
            api.get(`/api/announcements/class/${firstClassId}`)
          ]);
          activeAssignmentsCount = (assRes.data || []).length;
          upcomingExamsCount = (exRes.data || []).length;
          announcementsList = annRes.data || [];
          setRecentAnnouncements(announcementsList.slice(0, 3));
        } catch (e) {}
      }

      setStats({
        totalClasses: classList.length,
        totalStudents,
        totalBoards,
        activeAssignments: activeAssignmentsCount,
        upcomingExams: upcomingExamsCount,
        pendingMeetings: pendingMeetingList.length,
        recentAnnouncements: announcementsList.length
      });
    } catch (err) {
      console.error('Dashboard verileri yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (boardData) => {
    try {
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const roomId = `EDU-${randomCode}`;
      await api.post('/api/boards/create', {
        name: boardData.name,
        roomId,
        classId: boardData.classId || null,
        boardDate: boardData.boardDate || new Date(),
        isPasswordProtected: !!boardData.isPasswordProtected,
        password: boardData.password || null
      });
      setIsCreateBoardOpen(false);
      navigate(`/board/${roomId}`);
    } catch (err) {
      console.error('Error creating board:', err);
    }
  };

  const quickActions = [
    {
      title: 'Duyuru Gönder',
      subtitle: 'Sınıfa veya öğrenciye',
      icon: Megaphone,
      color: 'indigo',
      path: '/announcements',
    },
    {
      title: 'Ödev Ver',
      subtitle: 'Görselli & Bireysel',
      icon: BookOpen,
      color: 'emerald',
      path: '/assignments',
    },
    {
      title: 'Sınav Oluştur',
      subtitle: 'Not girişi & Sıralama',
      icon: Award,
      color: 'amber',
      path: '/exams',
    },
    {
      title: 'Hızlı Yoklama',
      subtitle: 'Tek tıkla kaydet',
      icon: CalendarCheck,
      color: 'sky',
      path: '/attendance',
    },
    {
      title: 'Görüşme Talepleri',
      subtitle: stats.pendingMeetings > 0 ? `${stats.pendingMeetings} bekleyen` : 'Tümü yanıtlandı',
      icon: MessageSquare,
      color: 'rose',
      path: '/meetings',
    },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-8"
      >
        {/* Welcome SaaS Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground p-7 sm:p-9 shadow-sm chrome-pattern">
          {/* Subtle Ambient Decorative Light */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 -mb-24 w-60 h-60 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="primary" size="sm" dot>
                  Öğretmen Yönetim Merkezi
                </Badge>
                <span className="text-xs text-muted-foreground/80 font-medium px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/60">
                  {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <AnimatedGreeting
                prefix="Hoş Geldiniz,"
                name={user?.username || 'Öğretmenim'}
              />

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Sınıflarınızı, ödevleri, sınavları ve öğrenci görüşme taleplerini tek ekrandan modern ve kesintisiz şekilde yönetin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0">
              <Button
                variant="outline"
                size="md"
                leftIcon={CalendarCheck}
                onClick={() => navigate('/attendance')}
                className="shadow-2xs hover:border-primary/50 transition-all whitespace-nowrap"
              >
                Hızlı Yoklama
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={Presentation}
                onClick={() => setIsCreateBoardOpen(true)}
                className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all font-semibold"
              >
                Yeni Tahta Başlat
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Action Cards Grid with Staggered Entrance */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <AnimatedItem key={idx} index={idx} stagger={0.05}>
                <motion.button
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(action.path)}
                  className="w-full p-4 rounded-xl bg-card hover:bg-muted/50 border border-border text-left transition-colors duration-150 group cursor-pointer shadow-xs"
                >
                  <div className="w-9 h-9 rounded-lg border border-border bg-muted/50 text-foreground flex items-center justify-center mb-3 transition-colors group-hover:bg-muted">
                    <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-105" />
                  </div>
                  <div className="text-xs font-semibold text-foreground tracking-tight">{action.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{action.subtitle}</div>
                </motion.button>
              </AnimatedItem>
            );
          })}
        </div>

        {/* Summary Stat Cards with Staggered Entrance */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <AnimatedItem index={0} stagger={0.04}>
            <StatCard
              title="Sınıflarım"
              value={stats.totalClasses}
              icon={Users}
              color="indigo"
              description="Aktif şubeler"
              onClick={() => navigate('/classes')}
            />
          </AnimatedItem>
          <AnimatedItem index={1} stagger={0.04}>
            <StatCard
              title="Öğrenci Sayısı"
              value={stats.totalStudents}
              icon={Users}
              color="sky"
              description="Kayıtlı öğrenciler"
              onClick={() => navigate('/classes')}
            />
          </AnimatedItem>
          <AnimatedItem index={2} stagger={0.04}>
            <StatCard
              title="Aktif Ödevler"
              value={stats.activeAssignments}
              icon={BookOpen}
              color="emerald"
              description="Teslim bekleyen"
              onClick={() => navigate('/assignments')}
            />
          </AnimatedItem>
          <AnimatedItem index={3} stagger={0.04}>
            <StatCard
              title="Sınavlar"
              value={stats.upcomingExams}
              icon={Award}
              color="amber"
              description="Kayıtlı sınavlar"
              onClick={() => navigate('/exams')}
            />
          </AnimatedItem>
          <AnimatedItem index={4} stagger={0.04}>
            <StatCard
              title="Görüşmeler"
              value={stats.pendingMeetings}
              icon={MessageSquare}
              color="rose"
              description="Yanıt bekleyen"
              onClick={() => navigate('/meetings')}
            />
          </AnimatedItem>
          <AnimatedItem index={5} stagger={0.04}>
            <StatCard
              title="Tahtalar"
              value={stats.totalBoards}
              icon={Presentation}
              color="purple"
              description="Kayıtlı tahtalar"
            />
          </AnimatedItem>
        </div>

        {/* Classes & Pending Meetings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Classes Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> Sınıflarım ({classes.length})
              </h2>
              <Link to="/classes" className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 group transition-colors">
                <span>Tümünü Gör</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {classes.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Henüz kayıtlı sınıfınız bulunmuyor"
                description="Sınıflarınızı, ders tahtalarınızı ve öğrencilerinizi organize etmek için Sınıflarım sayfasını ziyaret edin."
                actionLabel="Sınıfları Görüntüle"
                actionIcon={ArrowRight}
                onAction={() => navigate('/classes')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {classes.map((c, idx) => (
                  <AnimatedItem key={c._id} index={idx} stagger={0.05}>
                    <motion.div
                      whileHover={{ y: -2, transition: { duration: 0.15 } }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/classes/${c._id}`)}
                      className="p-5 rounded-xl bg-card hover:bg-muted/40 border border-border transition-colors cursor-pointer group space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {c.name || `${c.grade}/${c.section}`}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.schoolName || 'Okul Belirtilmemiş'}</p>
                        </div>
                        <Badge variant="secondary" size="sm">
                          {c.matchingCode}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/50">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{c.studentCount || 0} Öğrenci</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Presentation className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{c.boardCount || 0} Tahta</span>
                        </span>
                      </div>
                    </motion.div>
                  </AnimatedItem>
                ))}
              </div>
            )}
          </div>

          {/* Pending Meeting Requests & Recent Announcements */}
          <div className="space-y-6">
            {/* Meetings Box */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" /> Görüşme Talepleri
                </h2>
                <Link to="/meetings" className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 group transition-colors">
                  <span>Tümü</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {pendingMeetings.length === 0 ? (
                <Card className="border-dashed border-border bg-muted/20">
                  <CardContent className="py-8 text-center space-y-1">
                    <p className="text-xs font-semibold text-foreground">Bekleyen görüşme talebi yok</p>
                    <p className="text-[11px] text-muted-foreground">Öğrencilerinizden yeni talep geldiğinde burada gösterilecektir.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {pendingMeetings.map((req, idx) => (
                    <AnimatedItem key={req._id} index={idx} stagger={0.05}>
                      <motion.div
                        whileHover={{ y: -2, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/meetings')}
                        className="p-4 rounded-xl bg-card hover:bg-muted/40 border border-border transition-colors cursor-pointer space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                            {req.subject}
                          </h4>
                          <Badge
                            variant={
                              req.urgency === 'urgent'
                                ? 'danger'
                                : req.urgency === 'high'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="xs"
                          >
                            {req.urgency === 'urgent' ? 'Acil' : req.urgency === 'high' ? 'Yüksek' : 'Normal'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                          <span className="font-medium text-foreground">
                            {req.studentId?.username || 'Öğrenci'}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(req.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </motion.div>
                    </AnimatedItem>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Announcements Shortcut */}
            <Card className="border border-border bg-card shadow-xs">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg border border-border bg-muted/50 flex items-center justify-center text-foreground">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <Badge variant="secondary" size="xs">
                    Hızlı Duyuru
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">Sınıfınıza Hemen Seslenin</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Önemli sınav tarihleri veya ders hatırlatmalarını tüm öğrencilerinize anında iletin.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => navigate('/announcements')}
                >
                  Duyuru Oluştur
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create Board Modal */}
        <CreateBoardModal
          isOpen={isCreateBoardOpen}
          onClose={() => setIsCreateBoardOpen(false)}
          onCreateBoard={handleCreateBoard}
          classes={classes}
        />
      </motion.div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
