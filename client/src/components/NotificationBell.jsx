import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  Volume2,
  VolumeX,
  MessageSquare,
  Megaphone,
  BookOpen,
  Award,
  Sparkles,
  Inbox,
  UserPlus,
  X
} from 'lucide-react';
import api from '../lib/api';
import { Badge } from './ui';
import {
  playNotificationSound,
  isNotificationSoundMuted,
  setNotificationSoundMuted
} from '../utils/notificationSound';

const TYPE_CONFIG = {
  announcement: {
    icon: Megaphone,
    iconColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  },
  assignment: {
    icon: BookOpen,
    iconColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  },
  exam: {
    icon: Award,
    iconColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
  },
  meeting_request: {
    icon: MessageSquare,
    iconColor: 'text-primary bg-primary/10 border-primary/20'
  },
  meeting_reply: {
    icon: MessageSquare,
    iconColor: 'text-primary bg-primary/10 border-primary/20'
  },
  class_join_request: {
    icon: UserPlus,
    iconColor: 'text-primary bg-primary/10 border-primary/20'
  }
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [isMuted, setIsMuted] = useState(() => isNotificationSoundMuted());

  // Track known notification IDs to detect brand new incoming ones
  const previousIdsRef = useRef(new Set());
  const isInitialMountRef = useRef(true);

  const toggleSoundMuted = (e) => {
    e?.stopPropagation();
    const next = !isMuted;
    setIsMuted(next);
    setNotificationSoundMuted(next);
    if (!next) {
      playNotificationSound(true);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000); // 6s responsive poll for alert
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await api.get('/api/notifications');
      const list = res.data.notifications || [];
      const newUnread = res.data.unreadCount || 0;

      // Check if there are newly arrived unread notifications
      if (!isInitialMountRef.current) {
        const hasNewIncoming = list.some(
          n => !n.isRead && !previousIdsRef.current.has(n._id)
        );

        if (hasNewIncoming) {
          // Play notification chime for newly arrived notifications
          playNotificationSound();
        }
      } else {
        isInitialMountRef.current = false;
        // Only play ONCE when user first opens the page in their session, NOT on every page refresh!
        const hasSessionPlayed = sessionStorage.getItem('oxonom_initial_sound_played') === 'true';
        if (!hasSessionPlayed && newUnread > 0) {
          playNotificationSound();
          sessionStorage.setItem('oxonom_initial_sound_played', 'true');
        }
      }

      // Update known IDs
      previousIdsRef.current = new Set(list.map(n => n._id));

      setNotifications(list);
      setUnreadCount(newUnread);
    } catch (err) {
      // Silently ignore if not authorized
    }
  };

  const handleItemClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await api.patch(`/api/notifications/${notif._id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      }
      setIsOpen(false);

      // Navigate based on type and role
      const isTeacher = user.role === 'teacher';
      if (notif.type === 'announcement') {
        navigate(isTeacher ? '/announcements' : '/my-announcements');
      } else if (notif.type === 'assignment') {
        navigate(isTeacher ? '/assignments' : '/my-assignments');
      } else if (notif.type === 'exam') {
        navigate(isTeacher ? '/exams' : '/my-exams');
      } else if (notif.type === 'meeting_request' || notif.type === 'meeting_reply') {
        navigate(isTeacher ? '/meetings' : '/my-meetings');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const handleMarkSingleRead = async (e, id) => {
    e.stopPropagation();
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking single notification read:', err);
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/notifications/${id}`);
      const target = notifications.find(n => n._id === id);
      if (target && !target.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n._id !== id));
      previousIdsRef.current.delete(id);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handlePairAction = async (e, notifId, action) => {
    e.stopPropagation();
    setActionLoadingId(notifId);
    try {
      const res = await api.post(`/api/notifications/${notifId}/pair-action`, { action });
      setNotifications(prev =>
        prev.map(n =>
          n._id === notifId ? { ...n, actionStatus: res.data.actionStatus || action, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Pair action error:', err);
      alert(err.response?.data?.message || 'İşlem gerçekleştirilemedi');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatRelativeTime = (d) => {
    const now = new Date();
    const diffMs = Math.max(0, now - new Date(d));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} gün önce`;
    if (diffHours > 0) return `${diffHours} sa önce`;
    if (diffMins > 0) return `${diffMins} dk önce`;
    return 'Az önce';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Bildirimler"
      >
        <Bell className="w-4 h-4 transition-transform duration-200 group-hover:scale-105" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl bg-popover text-popover-foreground border border-border shadow-2xl z-50 overflow-hidden divide-y divide-border/60 chrome-pattern"
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Bildirimler</span>
                {unreadCount > 0 ? (
                  <Badge variant="primary" size="xs">
                    {unreadCount} yeni
                  </Badge>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Güncel</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Sesi Kıs / Aç Button */}
                <button
                  type="button"
                  onClick={toggleSoundMuted}
                  title={isMuted ? 'Bildirim sesini aç' : 'Bildirim sesini kapat (Sesi Kıs)'}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isMuted
                      ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
                      : 'bg-muted/80 text-foreground hover:bg-muted border-border/60'
                  }`}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <span className="text-[11px] font-semibold">Sesi Aç</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-[11px] font-medium">Sesi Kıs</span>
                    </>
                  )}
                </button>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tümünü Oku</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification Items List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
              {notifications.length === 0 ? (
                <div className="py-12 px-4 text-center text-muted-foreground text-xs space-y-2">
                  <Inbox className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="font-medium text-foreground">Bildiriminiz bulunmuyor</p>
                  <p className="text-[11px]">Yeni bir bildirim geldiğinde sesli uyarı ile burada görünecektir.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const cfg = TYPE_CONFIG[notif.type] || {
                    icon: Bell,
                    iconColor: 'text-muted-foreground bg-muted border-border'
                  };
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleItemClick(notif)}
                      className={`px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-start gap-3 text-left group relative ${
                        !notif.isRead ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${cfg.iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs truncate ${!notif.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Class Join Request Action Buttons (Kabul Et | Reddet) */}
                        {notif.type === 'class_join_request' && (
                          <div className="mt-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                            {(!notif.actionStatus || notif.actionStatus === 'pending') ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={actionLoadingId === notif._id}
                                  onClick={(e) => handlePairAction(e, notif._id, 'accept')}
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Kabul Et</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === notif._id}
                                  onClick={(e) => handlePairAction(e, notif._id, 'reject')}
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reddet</span>
                                </button>
                              </div>
                            ) : notif.actionStatus === 'accepted' ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                <Check className="w-3.5 h-3.5" />
                                <span>Kabul Edildi</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-lg">
                                <X className="w-3.5 h-3.5" />
                                <span>Reddetildi</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Action Icons (Mark as read & Delete) */}
                      <div className="flex items-center gap-1 shrink-0 self-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkSingleRead(e, notif._id)}
                            title="Okundu olarak işaretle"
                            className="p-1 rounded-md text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(e, notif._id)}
                          title="Bildirimi sil"
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Unread indicator dot */}
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse group-hover:hidden" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
