import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Presentation,
  CalendarCheck,
  Megaphone,
  BookOpen,
  Award,
  MessageSquare,
  BarChart3,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Blocks
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import DemoBanner from './DemoBanner';
import { cn } from '../lib/utils';

const DashboardLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('eduboard_sidebar_collapsed') === 'true';
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user?.role || 'student';
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  // Toggle sidebar collapse
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('eduboard_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Close menus on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  // Click outside user menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const teacherNavGroups = [
    {
      group: 'Genel',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Akademik Yönetim',
      items: [
        { name: 'Sınıflarım', path: '/classes', icon: Users },
        { name: 'Yoklama', path: '/attendance', icon: CalendarCheck },
        { name: 'Ödevler', path: '/assignments', icon: BookOpen },
        { name: 'Sınavlar', path: '/exams', icon: Award },
        { name: 'Modüller', path: '/modules', icon: Blocks },
      ],
    },
    {
      group: 'İletişim & Analiz',
      items: [
        { name: 'Duyurular', path: '/announcements', icon: Megaphone },
        { name: 'Görüşme Talepleri', path: '/meetings', icon: MessageSquare },
        { name: 'Raporlar', path: '/reports', icon: BarChart3 },
      ],
    },
  ];

  const studentNavGroups = [
    {
      group: 'Genel',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Derslerim & Görevler',
      items: [
        { name: 'Mevcut Tahtalar', path: '/my-boards', icon: Presentation },
        { name: 'Ödevlerim', path: '/my-assignments', icon: BookOpen },
        { name: 'Sınavlarım', path: '/my-exams', icon: Award },
        { name: 'Devamsızlık', path: '/my-attendance', icon: CalendarCheck },
      ],
    },
    {
      group: 'İletişim & Profil',
      items: [
        { name: 'Duyurular', path: '/my-announcements', icon: Megaphone },
        { name: 'Görüşme Talepleri', path: '/my-meetings', icon: MessageSquare },
        { name: 'Profilim', path: '/profile', icon: User },
      ],
    },
  ];

  const adminNavGroups = [
    {
      group: 'Yönetim',
      items: [
        { name: 'Admin Panel', path: '/admin', icon: Shield },
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
  ];

  const navGroups = isAdmin ? adminNavGroups : isTeacher ? teacherNavGroups : studentNavGroups;

  // Derive current page title for breadcrumb
  const allNavItems = navGroups.flatMap(g => g.items);
  const activeItem = allNavItems.find(item => item.path === location.pathname) || {
    name: location.pathname.startsWith('/classes/') ? 'Sınıf Detayı' : 'EduBoard'
  };

  const isDemoUser = !!(user?.isDemo || user?.username === 'demo_ogretmen' || user?.username === 'demo_ogrenci' || user?.email === 'demo@oxonomet.com' || user?.email === 'demo_ogrenci@oxonomet.com');

  return (
    <div className="h-screen bg-background text-foreground flex flex-col antialiased overflow-hidden">
      {/* Top Demo Banner */}
      {isDemoUser && <DemoBanner />}

      {/* Top Application Header */}
      <header className="shrink-0 z-40 h-14 bg-background/95 backdrop-blur-xs border-b border-border px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button + Logo / Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
            aria-label="Menüyü Aç"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* EduBoard Horizontal Logo (Mobile & Desktop) */}
          <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-foreground tracking-tight">EduBoard</span>
                <span className="sm:hidden text-[9px] font-medium px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/25">
                  {isAdmin ? 'Admin' : isTeacher ? 'Öğretmen' : 'Öğrenci'}
                </span>
              </div>
              <span className="hidden sm:block text-[10px] font-medium text-muted-foreground -mt-0.5">
                {isAdmin ? 'Yönetici' : isTeacher ? 'Öğretmen Paneli' : 'Öğrenci Portalı'}
              </span>
            </div>
          </Link>

          {/* Breadcrumb separator on desktop */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground pl-3 border-l border-border">
            <span>Portal</span>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {activeItem.name}
            </span>
          </div>
        </div>

        {/* Right Side: Tools & Notifications Only (ThemeToggle hidden as requested: night mode only) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <NotificationBell />
        </div>
      </header>

      {/* Main Body Layout: Sidebar + Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={cn(
            'hidden md:flex flex-col justify-between shrink-0 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 select-none',
            isCollapsed ? 'w-16' : 'w-60'
          )}
        >
          {/* Nav Items Scrollable Container with min-h-0 */}
          <div className="p-2.5 space-y-5 overflow-y-auto flex-1 min-h-0">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {group.group}
                  </p>
                )}

                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      title={isCollapsed ? item.name : undefined}
                      className={cn(
                        'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors select-none',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-2xs font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                        isCollapsed && 'justify-center px-0'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />

                      {!isCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}

                      {/* Tooltip on collapsed mode */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md border border-border whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                          {item.name}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer with User Profile Dropdown & Collapse Toggle */}
          <div className="p-2.5 border-t border-sidebar-border bg-sidebar shrink-0 relative z-20" ref={userMenuRef}>
            {/* User Profile Trigger Button */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className={cn(
                  'flex-1 flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/70 transition-all text-left cursor-pointer border border-transparent hover:border-border min-w-0',
                  isCollapsed && 'justify-center p-2'
                )}
                title={isCollapsed ? (user?.username || 'Hesabım') : undefined}
              >
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate leading-tight">
                      {user?.username || 'Kullanıcı'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">
                      {isAdmin ? 'Yönetici' : isTeacher ? 'Öğretmen' : 'Öğrenci'}
                    </p>
                  </div>
                )}
                {!isCollapsed && (
                  <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0", isUserMenuOpen && "rotate-180")} />
                )}
              </button>

              {/* Collapse Toggle */}
              {!isCollapsed && (
                <button
                  onClick={toggleCollapse}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                  title="Kenar Çubuğunu Daralt"
                  aria-label="Kenar Çubuğunu Daralt"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="mt-1.5 w-full flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Genişlet"
                aria-label="Genişlet"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Dropdown Menu (pops up above the footer) */}
            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute bottom-full mb-2 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl py-1.5 z-50 overflow-hidden",
                    isCollapsed ? "left-full ml-2 w-52" : "left-2 right-2 w-auto"
                  )}
                >
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">{user?.username}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'Kullanıcı Hesabı'}</p>
                  </div>

                  {!isAdmin && (
                    <NavLink
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profilim</span>
                    </NavLink>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Çıkış Yap</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileOpen(false)}
                className="fixed inset-0 bg-background/80 backdrop-blur-xs"
              />

              {/* Drawer Sheet */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 240 }}
                className="relative w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between h-full shadow-2xl z-10"
              >
                <div>
                  {/* Drawer Header */}
                  <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-foreground text-sm">EduBoard</span>
                    </div>

                    <button
                      onClick={() => setIsMobileOpen(false)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drawer Navigation */}
                  <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
                    {navGroups.map((group, gIdx) => (
                      <div key={gIdx} className="space-y-1">
                        <p className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {group.group}
                        </p>
                        {group.items.map((item, iIdx) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;

                          return (
                            <NavLink
                              key={iIdx}
                              to={item.path}
                              onClick={() => setIsMobileOpen(false)}
                              className={cn(
                                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground shadow-2xs font-medium'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                              )}
                            >
                              <Icon className={cn('w-4 h-4', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                              <span>{item.name}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-3 border-t border-sidebar-border bg-sidebar/50">
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center shrink-0">
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{user?.username}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {isAdmin ? 'Yönetici' : isTeacher ? 'Öğretmen' : 'Öğrenci'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!isAdmin && (
                    <NavLink
                      to="/profile"
                      onClick={() => setIsMobileOpen(false)}
                      className="mb-2 w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted border border-border text-xs font-medium transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profilim</span>
                    </NavLink>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-destructive/10 hover:text-destructive border border-border text-xs font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto bg-background">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
