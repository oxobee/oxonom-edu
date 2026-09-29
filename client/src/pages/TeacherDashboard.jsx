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

const ACTION_THEMES = {
  indigo: {
    bg: 'bg-indigo-500/[0.07] hover:bg-indigo-500/[0.13]',
    border: 'border-indigo-500/25 hover:border-indigo-500/50',
    iconBg: 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
    iconShadow: 'group-hover:shadow-lg group-hover:shadow-indigo-500/30',
    glow: 'from-indigo-500/10 via-transparent to-transparent',
    arrow: 'text-indigo-400 group-hover:translate-x-0.5'
  },
  emerald: {
    bg: 'bg-emerald-500/[0.07] hover:bg-emerald-500/[0.13]',
    border: 'border-emerald-500/25 hover:border-emerald-500/50',
    iconBg: 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
    iconShadow: 'group-hover:shadow-lg group-hover:shadow-emerald-500/30',
    glow: 'from-emerald-500/10 via-transparent to-transparent',
    arrow: 'text-emerald-400 group-hover:translate-x-0.5'
  },
  amber: {
    bg: 'bg-amber-500/[0.07] hover:bg-amber-500/[0.13]',
    border: 'border-amber-500/25 hover:border-amber-500/50',
    iconBg: 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
    iconShadow: 'group-hover:shadow-lg group-hover:shadow-amber-500/30',
    glow: 'from-amber-500/10 via-transparent to-transparent',
    arrow: 'text-amber-400 group-hover:translate-x-0.5'
  },
  sky: {
    bg: 'bg-sky-500/[0.07] hover:bg-sky-500/[0.13]',
    border: 'border-sky-500/25 hover:border-sky-500/50',
    iconBg: 'bg-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-white',
    iconShadow: 'group-hover:shadow-lg group-hover:shadow-sky-500/30',
    glow: 'from-sky-500/10 via-transparent to-transparent',
    arrow: 'text-sky-400 group-hover:translate-x-0.5'
  },
  rose: {
    bg: 'bg-rose-500/[0.07] hover:bg-rose-500/[0.13]',
    border: 'border-rose-500/25 hover:border-rose-500/50',
    iconBg: 'bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white',
    iconShadow: 'group-hover:shadow-lg group-hover:shadow-rose-500/30',
    glow: 'from-rose-500/10 via-transparent to-transparent',
    arrow: 'text-rose-400 group-hover:translate-x-0.5'
  }
};

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

        {/* Hızlı İşlemler & Kısayollar (Mobilde Yatay Slider, Masaüstünde 5'li Grid) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                Hızlı Eylemler & Kısayollar
              </h3>
            </div>
            {/* Mobilde kaydırma ipucu rozeti */}
            <span className="text-[10px] font-semibold text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full sm:hidden flex items-center gap-1">
              Kaydır ➔
            </span>
            <span className="text-[11px] text-muted-foreground/80 font-medium hidden sm:inline">
              Öğretmen eylem merkezi
            </span>
          </div>

          {/* Mobilde Yatay Slider (Scroll / Snap), Tabletten itibaren Grid */}
          <div className="flex overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3 scrollbar-none snap-x snap-mandatory">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              const theme = ACTION_THEMES[action.color] || ACTION_THEMES.indigo;
              const isPending = action.color === 'rose' && stats.pendingMeetings > 0;

              return (
                <div key={idx} className="shrink-0 snap-start w-[240px] xs:w-[260px] sm:w-auto">
                  <AnimatedItem index={idx} stagger={0.04}>
                    <motion.button
                      whileHover={{ y: -3, scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(action.path)}
                      className={`w-full h-full group relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md bg-gradient-to-br ${theme.glow} ${theme.bg} ${theme.border} backdrop-blur-xs flex items-center gap-3.5`}
                    >
                      {/* Canlı İkon Kutusu */}
                      <div className={`w-11 h-11 rounded-xl border border-white/10 flex items-center justify-center shrink-0 transition-all duration-200 ${theme.iconBg} ${theme.iconShadow}`}>
                        <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                      </div>

                      {/* Başlık & Açıklama */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-white transition-colors truncate">
                            {action.title}
                          </span>
                          {isPending && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse shrink-0 shadow-xs">
                              {stats.pendingMeetings}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground group-hover:text-muted-foreground/90 transition-colors truncate mt-0.5 font-medium">
                          {action.subtitle}
                        </p>
                      </div>

                      {/* Sağ Eylem Oku */}
                      <div className={`shrink-0 opacity-40 group-hover:opacity-100 transition-all duration-200 ${theme.arrow}`}>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </motion.button>
                  </AnimatedItem>
                </div>
              );
            })}
          </div>
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
            {/* 1. Görüşme Talepleri Konsolu (Özel Randevu Paneli) */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 shadow-xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      Görüşme Talepleri
                    </h2>
                    <span className="text-[11px] text-muted-foreground">
                      Öğrenci & veli randevuları
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {pendingMeetings.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse shadow-xs">
                      {pendingMeetings.length} bekleyen
                    </span>
                  )}
                  <Link to="/meetings" className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 group transition-colors">
                    <span>Tümü</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              {pendingMeetings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-center space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Bekleyen görüşme talebi yok</p>
                  <p className="text-[11px] text-muted-foreground">Öğrencilerinizden yeni talep geldiğinde burada listelenecektir.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingMeetings.map((req, idx) => {
                    const isUrgent = req.urgency === 'urgent';
                    const isHigh = req.urgency === 'high';

                    const borderAccent = isUrgent
                      ? 'border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-500/[0.08] to-card border-rose-500/30'
                      : isHigh
                      ? 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/[0.08] to-card border-amber-500/30'
                      : 'border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-500/[0.08] to-card border-sky-500/30';

                    const studentInitial = req.studentId?.username?.[0]?.toUpperCase() || 'Ö';

                    return (
                      <AnimatedItem key={req._id} index={idx} stagger={0.04}>
                        <motion.div
                          whileHover={{ y: -2, transition: { duration: 0.15 } }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate('/meetings')}
                          className={`p-3.5 sm:p-4 rounded-xl border ${borderAccent} transition-all cursor-pointer shadow-xs hover:shadow-md group flex items-center gap-3`}
                        >
                          {/* Öğrenci Baş Harf Rozeti */}
                          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center font-bold text-xs text-rose-300 shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {studentInitial}
                          </div>

                          {/* Talep Başlığı & Öğrenci */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-rose-300 transition-colors truncate">
                                {req.subject}
                              </h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isUrgent
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : isHigh
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                              }`}>
                                {isUrgent ? 'Acil' : isHigh ? 'Yüksek' : 'Normal'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                              <span className="font-medium text-slate-300">
                                {req.studentId?.username || 'Öğrenci'}
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(req.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          </div>

                          {/* Sağ Ok */}
                          <div className="shrink-0 text-muted-foreground/40 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </motion.div>
                      </AnimatedItem>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Sınıfa Seslen / Duyuru Yayın Stüdyosu Kartı */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/50 p-5 sm:p-6 shadow-md shadow-indigo-950/40 group space-y-4">
              {/* Arka plan ışık efektleri */}
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-32 h-32 rounded-full bg-purple-500/15 blur-xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  📢 Hızlı Bildiri
                </span>
              </div>

              <div className="relative z-10 space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Sınıfınıza Hemen Seslenin
                </h4>
                <p className="text-xs text-slate-300/80 leading-relaxed">
                  Önemli sınav tarihleri, ödev teslimleri veya sınıf duyurularını tüm öğrencilerinize anında iletin.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/announcements')}
                className="relative z-10 w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:shadow-lg group-hover:shadow-indigo-500/35"
              >
                <Megaphone className="w-4 h-4" />
                <span>Duyuru Oluştur & Paylaş</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="relative z-10 flex items-center justify-between text-[11px] text-indigo-300/70 pt-1 border-t border-indigo-500/20 font-medium">
                <span>🎯 Tek tıkla tüm şubelere</span>
                <span>⚡ Anlık bildirim zili</span>
              </div>
            </div>
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
