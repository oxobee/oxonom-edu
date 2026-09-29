import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX,
  X, Maximize2, Minimize2, PenTool, Eraser, Trash2,
  Trophy, Zap, Plus, Minus, Download, RefreshCw,
  Users, Clock, Sparkles, Award, Shuffle, Check,
  ChevronRight, Volume1, Bell, ArrowRight, Share2, Copy
} from 'lucide-react';
import { useModuleDock } from '../context/ModuleDockContext';
import api from '../lib/api';

// ==========================================
// SES EFEKTLERİ SENTEZLEYİCİSİ (Web Audio API)
// ==========================================
function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function playTickSound() {
  playTone(850, 'triangle', 0.04, 0.08);
}

function playFanfareSound() {
  playTone(523.25, 'sine', 0.12, 0.15); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.12, 0.15), 100); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.15, 0.18), 200); // G5
  setTimeout(() => playTone(1046.50, 'sine', 0.35, 0.22), 320); // C6
}

function playBellSound() {
  playTone(587.33, 'sine', 0.4, 0.2); // D5
  setTimeout(() => playTone(880, 'sine', 0.6, 0.25), 150); // A5
  setTimeout(() => playTone(1174.66, 'sine', 0.8, 0.2), 300); // D6
}

function playScoreUpSound() {
  playTone(600, 'sine', 0.08, 0.1);
  setTimeout(() => playTone(900, 'sine', 0.12, 0.12), 60);
}

function playScoreDownSound() {
  playTone(400, 'sawtooth', 0.1, 0.08);
}

// Renk Havuzu (Çark ve Takımlar için canlı pastel MEB renkleri)
const WHEEL_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6',
  '#6366f1', '#e11d48', '#84cc16', '#a855f7'
];

// Takım İsim Temaları
const TEAM_THEMES = [
  {
    id: 'animals',
    name: '🦁 Hayvanlar',
    names: ['Aslanlar', 'Kaplanlar', 'Kartallar', 'Yunuslar', 'Pandalar', 'Kurtlar']
  },
  {
    id: 'nature',
    name: '⚡ Doğa Güçleri',
    names: ['Şimşekler', 'Kasırgalar', 'Volkanlar', 'Dalgalar', 'Rüzgarlar', 'Göktaşları']
  },
  {
    id: 'space',
    name: '🚀 Uzay Kaşifleri',
    names: ['Kutup Yıldızları', 'Süpernovalar', 'Kuyrukluyıldızlar', 'Gezegenler', 'Astronotlar', 'Galaksiler']
  },
  {
    id: 'colors',
    name: '🎨 Renkli Takımlar',
    names: ['Kırmızı Takım', 'Mavi Takım', 'Yeşil Takım', 'Sarı Takım', 'Mor Takım', 'Turuncu Takım']
  }
];

// Varsayılan Örnek Öğrenci Listesi
const DEFAULT_STUDENTS = [
  'Ali Yılmaz', 'Zeynep Kaya', 'Mehmet Demir', 'Elif Şahin',
  'Can Yıldırım', 'Defne Çelik', 'Burak Öztürk', 'Ayşe Aydın',
  'Emir Arslan', 'Fatma Koç', 'Kerem Polat', 'Ece Güler'
];

export default function ClassroomToolsScreen({ isOpen = true, onClose, onAddToCanvas }) {
  // Aktif Sekme: 'wheel' (Şans Çarkı) | 'teams' (Takım Oluşturucu) | 'timer' (Geri Sayım & Sayaç) | 'scoreboard' (Skor Tablosu)
  const [activeTab, setActiveTab] = useState('wheel');

  // Pencere Durumu
  const [windowState, setWindowState] = useState('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Öğretmen Sınıfları & Seçili Sınıf
  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('custom'); // 'custom' veya classId
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Ortak Öğrenci İsim Listesi
  const [studentNames, setStudentNames] = useState(DEFAULT_STUDENTS);
  const [customInputText, setCustomInputText] = useState(DEFAULT_STUDENTS.join(', '));
  const [showEditListModal, setShowEditListModal] = useState(false);

  // ==========================================
  // 1. ŞANS ÇARKI (LUCKY WHEEL) STATE'LERİ
  // ==========================================
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerStudent, setWinnerStudent] = useState(null);
  const [removeWinnerAfterPick, setRemoveWinnerAfterPick] = useState(false);
  const [wheelHistory, setWheelHistory] = useState([]);
  const canvasWheelRef = useRef(null);
  const spinIntervalRef = useRef(null);

  // ==========================================
  // 2. TAKIM OLUŞTURUCU (TEAM GENERATOR) STATE'LERİ
  // ==========================================
  const [teamCount, setTeamCount] = useState(3);
  const [teamThemeId, setTeamThemeId] = useState('animals');
  const [generatedTeams, setGeneratedTeams] = useState([]);
  const [isShufflingTeams, setIsShufflingTeams] = useState(false);

  // ==========================================
  // 3. GERİ SAYIM SAYACI & KRONOMETRE STATE'LERİ
  // ==========================================
  const [timerMode, setTimerMode] = useState('countdown'); // 'countdown' | 'stopwatch'
  const [totalSeconds, setTotalSeconds] = useState(180); // 3 dakika varsayılan
  const [remainingSeconds, setRemainingSeconds] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const timerIntervalRef = useRef(null);

  // ==========================================
  // 4. SKOR & YARIŞMA TABLOSU STATE'LERİ
  // ==========================================
  const [scoreboardItems, setScoreboardItems] = useState([
    { id: '1', name: 'Aslanlar', score: 0, color: '#3b82f6' },
    { id: '2', name: 'Kaplanlar', score: 0, color: '#10b981' },
    { id: '3', name: 'Kartallar', score: 0, color: '#f59e0b' }
  ]);
  const [newParticipantName, setNewParticipantName] = useState('');

  // ==========================================
  // 5. ÇİZİM TUVALİ (Canvas Overlay)
  // ==========================================
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#facc15');
  const [penSize, setPenSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const canvasDrawRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  // ==========================================
  // MODÜL DOCK ENTEGRASYONU
  // ==========================================
  const { registerModule, unregisterModule } = useModuleDock();

  const dockBadgeText = useMemo(() => {
    if (activeTab === 'wheel') {
      return `Şans Çarkı • ${studentNames.length} İsim`;
    }
    if (activeTab === 'teams') {
      return `Takım Oluşturucu • ${teamCount} Grup`;
    }
    if (activeTab === 'timer') {
      const mins = Math.floor((timerMode === 'countdown' ? remainingSeconds : stopwatchSeconds) / 60);
      const secs = (timerMode === 'countdown' ? remainingSeconds : stopwatchSeconds) % 60;
      return `${timerMode === 'countdown' ? 'Geri Sayım' : 'Kronometre'} • ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `Skor Tablosu • ${scoreboardItems.length} Katılımcı`;
  }, [activeTab, studentNames.length, teamCount, timerMode, remainingSeconds, stopwatchSeconds, scoreboardItems.length]);

  useEffect(() => {
    if (!isOpen) {
      unregisterModule('sinif-carki-zamanlayici');
      return;
    }

    registerModule({
      id: 'sinif-carki-zamanlayici',
      title: 'Sınıf Çarkı & Geri Sayım Araçları',
      shortTitle: 'Sınıf Çarkı',
      icon: '🎡',
      gradient: 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white',
      badge: dockBadgeText,
      isMinimized: windowState === 'minimized',
      onRestore: () => setWindowState('normal'),
      onClose: () => {
        if (onClose) onClose();
      }
    });
  }, [isOpen, windowState, dockBadgeText, onClose, registerModule, unregisterModule]);

  useEffect(() => {
    return () => {
      unregisterModule('sinif-carki-zamanlayici');
      clearInterval(timerIntervalRef.current);
    };
  }, [unregisterModule]);

  // Öğretmenin sınıflarını yükle
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/api/classes');
        if (res.data && Array.isArray(res.data.classes)) {
          setClassesList(res.data.classes);
        } else if (Array.isArray(res.data)) {
          setClassesList(res.data);
        }
      } catch (_) {}
    };
    fetchClasses();
  }, []);

  // Sınıf seçildiğinde öğrencileri yükle
  const handleSelectClass = async (classId) => {
    setSelectedClassId(classId);
    if (classId === 'custom') return;

    setLoadingStudents(true);
    try {
      const res = await api.get(`/api/classes/${classId}/students`);
      const students = res.data?.students || res.data || [];
      if (Array.isArray(students) && students.length > 0) {
        const names = students.map(s => `${s.firstName || s.first || ''} ${s.lastName || s.last || ''}`.trim()).filter(Boolean);
        if (names.length > 0) {
          setStudentNames(names);
          setCustomInputText(names.join(', '));
        }
      }
    } catch (e) {
      console.error('Öğrenciler getirilemedi:', e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleApplyCustomNames = () => {
    const parsed = customInputText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (parsed.length > 0) {
      setStudentNames(parsed);
      setShowEditListModal(false);
    }
  };

  // ==========================================
  // ŞANS ÇARKI MANTIĞI & ANİMASYONU
  // ==========================================
  const handleSpinWheel = () => {
    if (isSpinning || studentNames.length === 0) return;

    setIsSpinning(true);
    setWinnerStudent(null);

    // Rastgele kazanan belirle
    const count = studentNames.length;
    const winnerIndex = Math.floor(Math.random() * count);
    const segmentAngle = 360 / count;

    // Hedef açı: İbrenin (en üst tepe: 270 derece veya 0 derece yukarı) kazanan dilimin tam ortasına gelmesi
    // Çark dönüşü saat yönündedir
    const targetSegmentCenter = winnerIndex * segmentAngle + segmentAngle / 2;
    const extraFullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 tam tur
    const totalRotationToAdd = extraFullSpins * 360 + (360 - targetSegmentCenter);

    const finalAngle = wheelRotation + totalRotationToAdd;
    setWheelRotation(finalAngle);

    // Çevrilirken tık sesleri
    if (soundEnabled) {
      let tickInterval = 60;
      let ticksFired = 0;
      const playPeriodicTicks = () => {
        if (ticksFired < 35) {
          playTickSound();
          ticksFired++;
          tickInterval += 14;
          setTimeout(playPeriodicTicks, tickInterval);
        }
      };
      playPeriodicTicks();
    }

    // 4.5 saniye sonra duruş ve kazanan kutlaması
    setTimeout(() => {
      setIsSpinning(false);
      const winner = studentNames[winnerIndex];
      setWinnerStudent(winner);
      setWheelHistory(prev => [winner, ...prev.slice(0, 9)]);

      if (soundEnabled) playFanfareSound();

      if (removeWinnerAfterPick) {
        setStudentNames(prev => prev.filter((_, idx) => idx !== winnerIndex));
      }
    }, 4500);
  };

  // ==========================================
  // TAKIM OLUŞTURUCU MANTIĞI
  // ==========================================
  const handleGenerateTeams = () => {
    if (studentNames.length === 0) return;
    setIsShufflingTeams(true);

    const theme = TEAM_THEMES.find(t => t.id === teamThemeId) || TEAM_THEMES[0];
    const shuffled = [...studentNames].sort(() => Math.random() - 0.5);

    const teams = Array.from({ length: teamCount }, (_, i) => ({
      name: theme.names[i] || `${i + 1}. Takım`,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length],
      members: []
    }));

    shuffled.forEach((student, idx) => {
      teams[idx % teamCount].members.push(student);
    });

    if (soundEnabled) playTone(440, 'triangle', 0.15);

    setTimeout(() => {
      setGeneratedTeams(teams);
      setIsShufflingTeams(false);
      if (soundEnabled) playFanfareSound();
    }, 500);
  };

  useEffect(() => {
    if (activeTab === 'teams' && generatedTeams.length === 0) {
      handleGenerateTeams();
    }
  }, [activeTab]);

  // Takımları Skor Tablosuna Aktar
  const handleExportTeamsToScoreboard = () => {
    if (generatedTeams.length === 0) return;
    const items = generatedTeams.map((t, idx) => ({
      id: String(idx + 1),
      name: t.name,
      score: 0,
      color: t.color
    }));
    setScoreboardItems(items);
    setActiveTab('scoreboard');
    if (soundEnabled) playFanfareSound();
  };

  // ==========================================
  // GERİ SAYIM SAYACI MANTIĞI
  // ==========================================
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        if (timerMode === 'countdown') {
          setRemainingSeconds(prev => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              setIsTimerRunning(false);
              if (soundEnabled) playBellSound();
              return 0;
            }
            if (prev <= 6 && soundEnabled) {
              playTickSound();
            }
            return prev - 1;
          });
        } else {
          setStopwatchSeconds(prev => prev + 1);
        }
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, timerMode, soundEnabled]);

  const handleToggleTimer = () => {
    if (!isTimerRunning && timerMode === 'countdown' && remainingSeconds === 0) {
      setRemainingSeconds(totalSeconds);
    }
    setIsTimerRunning(v => !v);
    if (soundEnabled) playTone(500, 'sine', 0.08);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    clearInterval(timerIntervalRef.current);
    if (timerMode === 'countdown') {
      setRemainingSeconds(totalSeconds);
    } else {
      setStopwatchSeconds(0);
    }
    if (soundEnabled) playTone(350, 'triangle', 0.08);
  };

  const handleSetPresetCountdown = (seconds) => {
    setIsTimerRunning(false);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    if (soundEnabled) playTone(450, 'sine', 0.08);
  };

  // ==========================================
  // SKOR TABLOSU MANTIĞI
  // ==========================================
  const handleScoreChange = (id, delta) => {
    setScoreboardItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextScore = Math.max(0, item.score + delta);
        if (delta > 0 && soundEnabled) playScoreUpSound();
        if (delta < 0 && soundEnabled) playScoreDownSound();
        return { ...item, score: nextScore };
      }
      return item;
    }));
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    const newId = String(Date.now());
    const color = WHEEL_COLORS[scoreboardItems.length % WHEEL_COLORS.length];
    setScoreboardItems(prev => [...prev, { id: newId, name: newParticipantName.trim(), score: 0, color }]);
    setNewParticipantName('');
    if (soundEnabled) playTone(550, 'sine', 0.1);
  };

  const highestScore = useMemo(() => {
    if (scoreboardItems.length === 0) return 0;
    return Math.max(...scoreboardItems.map(i => i.score));
  }, [scoreboardItems]);

  // ==========================================
  // ÇİZİM TUVALİ (Canvas Overlay)
  // ==========================================
  const getCanvasCoords = (e) => {
    const canvas = canvasDrawRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    if (!isDrawingMode) return;
    if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasCoords(e);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingMode || !isDrawingRef.current) return;
    if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    const pt = getCanvasCoords(e);
    const last = lastPointRef.current;
    if (!last) return;

    const canvas = canvasDrawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = isEraser ? '#090d16' : penColor;
    ctx.lineWidth = isEraser ? penSize * 3 : penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPointRef.current = pt;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearDrawingCanvas = () => {
    const canvas = canvasDrawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  if (!isOpen) return null;

  const isMax = windowState === 'maximized';
  const isMinimized = windowState === 'minimized';

  return (
    <div
      style={{ display: isMinimized ? 'none' : 'flex' }}
      className="fixed inset-0 z-50 pointer-events-none items-center justify-center p-0 sm:p-3 md:p-5 overflow-hidden"
    >
      {/* Arka Plan Karartması */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto transition-opacity" 
        onClick={() => {}}
      />

      {/* Ana Pencere Paneli */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{
          scale: 1,
          opacity: 1,
          y: 0,
          width: isMax ? '100vw' : '100%',
          maxWidth: isMax ? '100%' : '1120px',
          height: isMax ? '100dvh' : '100%',
          maxHeight: isMax ? '100%' : '890px'
        }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="pointer-events-auto relative w-full h-[100dvh] sm:h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-800 bg-slate-900 text-slate-100 flex flex-col overflow-hidden select-none"
      >
        {/* ========================================================= */}
        {/* 1. ÜST BAŞLIK & SEKME YÖNETİMİ                             */}
        {/* ========================================================= */}
        <header className="flex items-center justify-between px-2.5 sm:px-5 py-2 sm:py-2.5 bg-slate-850 border-b border-slate-800 gap-2 shrink-0">
          {/* Sol: İkon & Sekmeler */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20 text-base sm:text-lg shrink-0">
              🎡
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-base font-bold text-white tracking-tight flex items-center gap-1 truncate">
                  <span className="hidden xs:inline">Sınıf Çarkı & Geri Sayım Araçları</span>
                  <span className="xs:hidden">Sınıf Araçları</span>
                </h2>
                <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 shrink-0">
                  Akıllı Tahta & Yönetim
                </span>
              </div>

              {/* Sekme Değiştirici */}
              <div className="flex items-center gap-1 mt-0.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('wheel')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeTab === 'wheel'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🎡 <span className="hidden xs:inline">Şans </span>Çarkı
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('teams')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'teams'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  👥 Takım<span className="hidden xs:inline"> Oluşturucu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('timer')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'timer'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  ⏱️ Sayaç<span className="hidden xs:inline"> & Süre</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('scoreboard')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'scoreboard'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🏆 Skor<span className="hidden xs:inline"> Tablosu</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sağ: Araçlar & Pencere Butonları */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Ses Aç / Kapat */}
            <button
              type="button"
              onClick={() => setSoundEnabled(v => !v)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
            </button>

            {/* Çizim Katmanı Aç / Kapat */}
            <button
              type="button"
              onClick={() => setIsDrawingMode(v => !v)}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition cursor-pointer active:scale-95 ${
                isDrawingMode
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Tuval Üzerine Çizim Modu"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>

            {/* Simge Durumuna Küçült */}
            <button
              type="button"
              onClick={() => setWindowState('minimized')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title="Simge Durumuna Küçült"
            >
              <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Büyüt / Normal Boyut (Mobilde gizli) */}
            <button
              type="button"
              onClick={() => setWindowState(prev => prev === 'maximized' ? 'normal' : 'maximized')}
              className="hidden sm:flex w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white items-center justify-center transition cursor-pointer active:scale-95"
              title={isMax ? "Normal Boyut" : "Tam Ekran"}
            >
              {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Kapat */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-500/20 text-red-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 ml-0.5"
                title="Kapat"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* ÇİZİM ARAÇ ÇUBUĞU (Aktifse görünür)                       */}
        {/* ========================================================= */}
        {isDrawingMode && (
          <div className="shrink-0 bg-slate-950/95 border-b border-slate-800 px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between text-xs gap-1.5 z-30">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-400">✏️ Çizim:</span>
              {['#facc15', '#38bdf8', '#10b981', '#f43f5e', '#ffffff'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setPenColor(c); setIsEraser(false); }}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition ${
                    penColor === c && !isEraser ? 'scale-110 border-white ring-2 ring-amber-400' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                type="button"
                onClick={() => setIsEraser(v => !v)}
                className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-1 transition ${
                  isEraser ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Eraser className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Silgi
              </button>
            </div>
            <button
              type="button"
              onClick={clearDrawingCanvas}
              className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition flex items-center gap-1 text-[10px] sm:text-xs"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Temizle
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* ÇİZİM KATMANI TUVALİ (Ekran üzerine not alma)              */}
        {/* ========================================================= */}
        {isDrawingMode && (
          <canvas
            ref={canvasDrawRef}
            width={1200}
            height={850}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 w-full h-full z-20 touch-none cursor-crosshair"
          />
        )}

        {/* ========================================================= */}
        {/* 2. SEKME 1: DİNAMİK ŞANS ÇARKI (LUCKY WHEEL)              */}
        {/* ========================================================= */}
        {activeTab === 'wheel' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Sol / Üst Kontrol Paneli */}
            <div className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-3 sm:p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
              {/* Sınıf Seçimi */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Sınıf veya Liste Seçimi
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleSelectClass(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="custom">📋 Özel İsim Listesi ({studentNames.length} Kişi)</option>
                  {classesList.map(c => (
                    <option key={c._id} value={c._id}>
                      🏫 {c.name} {c.section ? `(${c.section})` : ''} - {c.grade}. Sınıf
                    </option>
                  ))}
                </select>
              </div>

              {/* Liste Düzenleme Butonu */}
              <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
                <div className="text-xs">
                  <span className="font-semibold text-slate-300">Öğrenci Sayısı:</span>{' '}
                  <span className="font-bold text-amber-400 font-mono">{studentNames.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditListModal(true)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  Listeyi Düzenle ✍️
                </button>
              </div>

              {/* Çark Seçenekleri */}
              <div className="space-y-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={removeWinnerAfterPick}
                    onChange={(e) => setRemoveWinnerAfterPick(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-300 font-medium">Seçilen öğrenciyi çarktan çıkar</span>
                </label>
              </div>

              {/* Büyük Çevir Butonu */}
              <button
                type="button"
                disabled={isSpinning || studentNames.length === 0}
                onClick={handleSpinWheel}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-5 h-5 text-slate-950 fill-current animate-spin" />
                <span>{isSpinning ? 'Çark Dönüyor...' : 'ÇARKI ÇEVİR! 🎯'}</span>
              </button>

              {/* Geçmiş Kazananlar */}
              {wheelHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Son Seçilenler:</span>
                  <div className="flex flex-wrap gap-1">
                    {wheelHistory.map((name, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-800 text-amber-300 font-mono text-[10px] font-bold">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Merkez: Fiziksel Dönen Çark */}
            <div className="flex-1 p-3 sm:p-6 overflow-hidden flex flex-col items-center justify-center relative">
              {/* Çark Üst Gösterge İbresi (Pointer Arrow) */}
              <div className="relative z-20 -mb-5 flex flex-col items-center pointer-events-none drop-shadow-xl">
                <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-amber-400 filter drop-shadow" />
                <div className="w-4 h-4 rounded-full bg-white -mt-7 ring-2 ring-amber-500" />
              </div>

              {/* Dönen Çark Gövdesi */}
              <div className="relative w-full max-w-[min(88vw,480px)] aspect-square flex items-center justify-center">
                <div
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning ? 'transform 4.5s cubic-bezier(0.12, 0.95, 0.22, 1.0)' : 'none'
                  }}
                  className="w-full h-full rounded-full shadow-2xl relative overflow-hidden border-8 border-slate-800 ring-4 ring-amber-400/40"
                >
                  {/* SVG Dilimler */}
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {studentNames.map((name, idx) => {
                      const count = studentNames.length;
                      const segmentAngle = 360 / count;
                      const startAngle = idx * segmentAngle;
                      const endAngle = startAngle + segmentAngle;

                      // Dilim yay koordinatları (polar to cartesian)
                      const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                      const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                      const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                      const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
                      const largeArc = segmentAngle > 180 ? 1 : 0;
                      const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

                      const color = WHEEL_COLORS[idx % WHEEL_COLORS.length];
                      const textAngle = startAngle + segmentAngle / 2;

                      return (
                        <g key={idx}>
                          <path d={pathData} fill={color} stroke="#1e293b" strokeWidth="0.5" />
                          <g transform={`rotate(${textAngle} 50 50)`}>
                            <text
                              x="82"
                              y="51"
                              fill="#ffffff"
                              fontSize={count > 20 ? '2.5' : count > 12 ? '3.2' : '3.8'}
                              fontWeight="bold"
                              textAnchor="end"
                              alignmentBaseline="middle"
                              className="font-sans select-none"
                            >
                              {name.length > 14 ? name.substring(0, 12) + '..' : name}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Merkez Göbek / Buton */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-950 border-4 border-amber-400 text-white flex flex-col items-center justify-center shadow-2xl z-10">
                      <span className="text-xl sm:text-2xl">🎯</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kazanan Kartı & Konfeti Kutlaması Popover */}
              <AnimatePresence>
                {winnerStudent && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 30 }}
                    className="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-slate-950/95 border-2 border-amber-400 p-6 rounded-3xl shadow-2xl z-30 text-center space-y-4 backdrop-blur-md"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto text-3xl ring-4 ring-amber-400/40 animate-bounce">
                      👑
                    </div>

                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Şanslı Öğrenci Seçildi!</span>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                        {winnerStudent}
                      </h3>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setWinnerStudent(null)}
                        className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition active:scale-95 cursor-pointer shadow-md"
                      >
                        🎉 Harika!
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWinnerStudent(null);
                          handleSpinWheel();
                        }}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
                      >
                        🔄 Tekrar Çevir
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SEKME 2: TAKIM OLUŞTURUCU (TEAM GENERATOR)             */}
        {/* ========================================================= */}
        {activeTab === 'teams' && (
          <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-hidden">
            {/* Üst Ayar Çubuğu */}
            <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Takım Sayısı */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Takım Sayısı:</span>
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setTeamCount(num);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                      teamCount === num
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {num} Takım
                  </button>
                ))}
              </div>

              {/* Tema Seçici */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">İsim Teması:</span>
                <select
                  value={teamThemeId}
                  onChange={(e) => setTeamThemeId(e.target.value)}
                  className="py-1 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none"
                >
                  {TEAM_THEMES.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Eylemler */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateTeams}
                  disabled={isShufflingTeams}
                  className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{isShufflingTeams ? 'Karıştırılıyor...' : 'Rastgele Dağıt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportTeamsToScoreboard}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-amber-500/20 active:scale-95 transition cursor-pointer"
                  title="Bu takımları Skor Yarışmasına Aktar"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Skor Tablosuna Aktar</span>
                </button>
              </div>
            </div>

            {/* Takım Kartları Izgarası */}
            <div className="flex-1 my-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {generatedTeams.map((team, idx) => (
                <div
                  key={idx}
                  className="bg-slate-850/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full ring-2 ring-white/30"
                          style={{ backgroundColor: team.color }}
                        />
                        <h4 className="font-extrabold text-white text-sm tracking-tight">{team.name}</h4>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                        {team.members.length} Kişi
                      </span>
                    </div>

                    {/* Öğrenci İsimleri */}
                    <div className="space-y-1">
                      {team.members.map((member, mIdx) => (
                        <div
                          key={mIdx}
                          className="px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800/60 text-xs font-semibold text-slate-200 flex items-center justify-between"
                        >
                          <span>{member}</span>
                          <span className="text-[10px] text-slate-500 font-mono">#{mIdx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(`${team.name}:\n` + team.members.join('\n'));
                        if (soundEnabled) playTone(800, 'sine', 0.08);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition"
                    >
                      <Copy className="w-3 h-3" /> Listeyi Kopyala
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. SEKME 3: GERİ SAYIM SAYACI & KRONOMETRE                */}
        {/* ========================================================= */}
        {activeTab === 'timer' && (
          <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto items-center justify-between">
            {/* Üst Mod Seçimi: Geri Sayım vs Kronometre */}
            <div className="flex items-center gap-1 p-1 bg-slate-850 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerMode('countdown');
                }}
                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
                  timerMode === 'countdown' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⏳ Geri Sayım Sayacı
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerMode('stopwatch');
                }}
                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
                  timerMode === 'stopwatch' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⏱️ Kronometre
              </button>
            </div>

            {/* Dev Akıllı Tahta Dijital Ekranı */}
            <div className="my-6 relative flex flex-col items-center justify-center">
              {/* Dairesel İlerleme Çemberi (Geri Sayım Modunda) */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="44%"
                    stroke="#1e293b"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {timerMode === 'countdown' && (
                    <circle
                      cx="50%"
                      cy="50%"
                      r="44%"
                      stroke={remainingSeconds <= 10 ? '#ef4444' : '#f59e0b'}
                      strokeWidth="10"
                      strokeDasharray="276"
                      strokeDashoffset={276 - (276 * remainingSeconds) / (totalSeconds || 1)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-300"
                    />
                  )}
                </svg>

                {/* Dijital Sayılar */}
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  {timerMode === 'countdown' ? (
                    <>
                      <span className={`font-mono font-extrabold text-5xl sm:text-7xl tracking-tighter ${
                        remainingSeconds <= 10 ? 'text-rose-500 animate-pulse' : 'text-white'
                      }`}>
                        {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:
                        {String(remainingSeconds % 60).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-slate-400 mt-2">
                        {isTimerRunning ? 'Süre Akıyor...' : remainingSeconds === 0 ? '🔔 SÜRE DOLDU!' : 'Hazır'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-extrabold text-5xl sm:text-7xl tracking-tighter text-emerald-400">
                        {String(Math.floor(stopwatchSeconds / 60)).padStart(2, '0')}:
                        {String(stopwatchSeconds % 60).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-slate-400 mt-2">
                        {isTimerRunning ? 'Kronometre İşliyor' : 'Durduruldu'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Hızlı Süre Butonları (Geri Sayım Modunda) */}
              {timerMode === 'countdown' && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 max-w-lg">
                  {[
                    { label: '30 Sn', sec: 30 },
                    { label: '1 Dk', sec: 60 },
                    { label: '2 Dk', sec: 120 },
                    { label: '3 Dk', sec: 180 },
                    { label: '5 Dk', sec: 300 },
                    { label: '10 Dk', sec: 600 },
                    { label: '15 Dk', sec: 900 }
                  ].map(preset => (
                    <button
                      key={preset.sec}
                      type="button"
                      onClick={() => handleSetPresetCountdown(preset.sec)}
                      className={`py-1 px-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                        totalSeconds === preset.sec && !isTimerRunning
                          ? 'bg-amber-500 text-slate-950 font-extrabold'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Alt Kontrol Butonları */}
            <div className="flex items-center justify-center gap-3 w-full max-w-xs shrink-0">
              <button
                type="button"
                onClick={handleResetTimer}
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer shadow-md"
                title="Sıfırla"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleToggleTimer}
                className={`flex-1 py-3.5 px-6 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xl ${
                  isTimerRunning
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                <span>{isTimerRunning ? 'Duraklat' : 'BAŞLAT'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. SEKME 4: SKOR & CANLI YARIŞMA TABLOSU                  */}
        {/* ========================================================= */}
        {activeTab === 'scoreboard' && (
          <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-hidden justify-between">
            {/* Üst Çubuk: Yeni Katılımcı Ekleme */}
            <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Yeni Takım / Öğrenci Adı..."
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddParticipant();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Ekle
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScoreboardItems(prev => prev.map(i => ({ ...i, score: 0 })));
                    if (soundEnabled) playTone(300, 'triangle', 0.1);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Skorları Sıfırla 🔄
                </button>
              </div>
            </div>

            {/* Skor Kartları */}
            <div className="flex-1 my-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {scoreboardItems.map((item) => {
                const isLeader = item.score > 0 && item.score === highestScore;

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-850 border rounded-2xl p-4 flex flex-col justify-between transition-all shadow-lg ${
                      isLeader
                        ? 'border-amber-400 ring-2 ring-amber-400/30'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <h4 className="font-extrabold text-white text-base truncate">{item.name}</h4>
                      </div>
                      {isLeader && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                          👑 Lider
                        </span>
                      )}
                    </div>

                    {/* Skor Sayısı */}
                    <div className="my-4 text-center">
                      <span className="font-mono font-extrabold text-5xl sm:text-6xl text-white">
                        {item.score}
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-400 mt-1">Puan</span>
                    </div>

                    {/* Puan Artır / Azalt Butonları */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleScoreChange(item.id, -1)}
                        className="py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScoreChange(item.id, 1)}
                        className="py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScoreChange(item.id, 5)}
                        className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* LİSTE DÜZENLEME MODALI                                    */}
        {/* ========================================================= */}
        <AnimatePresence>
          {showEditListModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    ✍️ Öğrenci Listesini Düzenle
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowEditListModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  İsimleri virgül veya yeni satır ile ayırarak yapıştırabilirsiniz:
                </p>

                <textarea
                  rows={8}
                  value={customInputText}
                  onChange={(e) => setCustomInputText(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditListModal(false)}
                    className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustomNames}
                    className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition active:scale-95 cursor-pointer shadow-md"
                  >
                    Listeyi Kaydet & Uygula
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
