import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX,
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft,
  X, Maximize2, Minimize2, PenTool, Eraser, Trash2,
  Trophy, Star, Award, Zap, HelpCircle, Eye, EyeOff,
  Compass, Globe, Sun, Moon, Info, Download, Minus,
  RefreshCw, Rocket, Flame, Radio
} from 'lucide-react';
import { useModuleDock } from '../context/ModuleDockContext';

// Sentezleyici Ses Fonksiyonları (Uzay atmosferi & bildirim sesleri)
function playSpaceBeep(freq = 440, duration = 0.15) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function playSuccessChime() {
  playSpaceBeep(523.25, 0.1);
  setTimeout(() => playSpaceBeep(659.25, 0.1), 90);
  setTimeout(() => playSpaceBeep(783.99, 0.2), 180);
}

// MEB Müfredatına Uygun 8 Gezegen + Güneş Verileri
const PLANETS = [
  {
    id: 'merkur',
    name: 'Merkür',
    tagline: 'Güneş\'e En Yakın Gezegen',
    type: 'Karasal Gezegen',
    color: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.4)',
    size: 14,
    orbitRadius: 65,
    orbitSpeed: 0.045,
    distanceFromSun: '57.9 Milyon km',
    diameter: '4.879 km',
    dayLength: '59 Dünya günü',
    yearLength: '88 Dünya günü',
    temperature: '-180°C ile +430°C',
    moons: 0,
    funFact: 'Merkür\'ün atmosferi yok denecek kadar incedir. Bu yüzden gündüzleri aşırı sıcak, geceleri dondurucu soğuktur.',
    imageEmoji: '🪨',
    gradient: 'from-slate-400 to-zinc-600'
  },
  {
    id: 'venus',
    name: 'Venüs',
    tagline: 'Güneş Sistemi\'nin En Sıcak Gezegeni',
    type: 'Karasal Gezegen',
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    size: 20,
    orbitRadius: 100,
    orbitSpeed: 0.035,
    distanceFromSun: '108.2 Milyon km',
    diameter: '12.104 km',
    dayLength: '243 Dünya günü',
    yearLength: '225 Dünya günü',
    temperature: '+465°C',
    moons: 0,
    funFact: 'Venüs gökyüzünde çok parlak parladığı için "Çoban Yıldızı" veya "Sabah Yıldızı" olarak da anılır. Diğer gezegenlerin tersi yönde döner.',
    imageEmoji: '🟡',
    gradient: 'from-amber-400 to-yellow-600'
  },
  {
    id: 'dunya',
    name: 'Dünya',
    tagline: 'Mavi Gezegenimiz & Yaşam Yuvası',
    type: 'Karasal Gezegen',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    size: 22,
    orbitRadius: 140,
    orbitSpeed: 0.028,
    distanceFromSun: '149.6 Milyon km (1 AB)',
    diameter: '12.742 km',
    dayLength: '24 saat',
    yearLength: '365 gün 6 saat',
    temperature: '+15°C (ortalama)',
    moons: 1, // Ay
    funFact: 'Yüzeyinin yaklaşık %71\'i suyla kaplı olan Güneş Sistemi\'nde üzerinde sıvı su ve bilinen yaşam bulunan tek gezegendir.',
    imageEmoji: '🌍',
    gradient: 'from-blue-400 to-emerald-500'
  },
  {
    id: 'mars',
    name: 'Mars',
    tagline: 'Kızıl Gezegen',
    type: 'Karasal Gezegen',
    color: '#f87171',
    glowColor: 'rgba(248, 113, 113, 0.4)',
    size: 16,
    orbitRadius: 180,
    orbitSpeed: 0.022,
    distanceFromSun: '227.9 Milyon km',
    diameter: '6.779 km',
    dayLength: '24 saat 37 dakika',
    yearLength: '687 Dünya günü',
    temperature: '-63°C (ortalama)',
    moons: 2, // Phobos, Deimos
    funFact: 'Toprağındaki demir oksit (pas) nedeniyle kırmızı görünür. Güneş Sistemi\'nin en yüksek volkanı olan "Olympus Mons" Mars\'tadır.',
    imageEmoji: '🔴',
    gradient: 'from-rose-500 to-orange-700'
  },
  {
    id: 'jupiter',
    name: 'Jüpiter',
    tagline: 'Gezegenlerin Devi',
    type: 'Gaz Devi',
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    size: 38,
    orbitRadius: 235,
    orbitSpeed: 0.015,
    distanceFromSun: '778.5 Milyon km',
    diameter: '139.820 km',
    dayLength: '9 saat 55 dakika',
    yearLength: '12 Dünya yılı',
    temperature: '-110°C (bulut tepesi)',
    moons: 95,
    funFact: 'Güneş Sistemi\'ndeki diğer tüm gezegenlerin toplamından 2.5 kat daha ağırdır. Yüzeyindeki "Büyük Kırmızı Leke" devasa bir fırtınadır.',
    imageEmoji: '🟠',
    gradient: 'from-amber-600 to-orange-800'
  },
  {
    id: 'saturn',
    name: 'Satürn',
    tagline: 'Halkaların Efendisi',
    type: 'Gaz Devi',
    color: '#fde047',
    glowColor: 'rgba(253, 224, 71, 0.4)',
    size: 32,
    orbitRadius: 290,
    orbitSpeed: 0.011,
    hasRings: true,
    distanceFromSun: '1.43 Milyar km',
    diameter: '116.460 km',
    dayLength: '10 saat 33 dakika',
    yearLength: '29.5 Dünya yılı',
    temperature: '-140°C',
    moons: 146,
    funFact: 'Göz alıcı buz ve kaya halkalarıyla meşhurdur. Yoğunluğu sudan az olan tek gezegendir (yeterince büyük bir okyanus olsaydı yüzerdi!).',
    imageEmoji: '🪐',
    gradient: 'from-yellow-500 to-amber-700'
  },
  {
    id: 'uranus',
    name: 'Uranüs',
    tagline: 'Yan Yatan Buz Devi',
    type: 'Buz Devi',
    color: '#22d3ee',
    glowColor: 'rgba(34, 211, 238, 0.4)',
    size: 24,
    orbitRadius: 345,
    orbitSpeed: 0.008,
    distanceFromSun: '2.87 Milyar km',
    diameter: '50.724 km',
    dayLength: '17 saat 14 dakika',
    yearLength: '84 Dünya yılı',
    temperature: '-195°C',
    moons: 28,
    funFact: 'Dönme ekseni 98 derece eğiktir; adeta bir fıçı gibi yan yatarak yuvarlanır. Atmosferindeki metan gazı ona açık mavi rengini verir.',
    imageEmoji: '🌐',
    gradient: 'from-cyan-400 to-teal-600'
  },
  {
    id: 'neptun',
    name: 'Neptün',
    tagline: 'En Uzak ve En Fırtınalı Gezegen',
    type: 'Buz Devi',
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    size: 23,
    orbitRadius: 395,
    orbitSpeed: 0.006,
    distanceFromSun: '4.5 Milyar km',
    diameter: '49.244 km',
    dayLength: '16 saat 6 dakika',
    yearLength: '165 Dünya yılı',
    temperature: '-200°C',
    moons: 16,
    funFact: 'Güneş Sistemi\'nin en güçlü rüzgarlarına sahiptir (saatte 2.000 km\'ye varan fırtınalar!). Güneş etrafındaki 1 turunu 165 yılda tamamlar.',
    imageEmoji: '🔵',
    gradient: 'from-blue-600 to-indigo-800'
  }
];

// Ayın Evreleri Verisi
const MOON_PHASES = [
  { id: 'yeni-ay', name: 'Yeni Ay', desc: 'Ay, Dünya ile Güneş arasındadır. Karanlık yüzü Dünya\'ya bakar, gökyüzünde görünmez.', icon: '🌑' },
  { id: 'ilk-dordun', name: 'İlk Dördün', desc: 'Yeni Ay\'dan 1 hafta sonra oluşur. Ay\'ın sağ yarısı "D" harfi şeklinde aydınlıktır.', icon: '🌓' },
  { id: 'dolunay', name: 'Dolunay', desc: 'Ay\'ın Dünya\'ya bakan tüm yüzü Güneş ışığıyla parlar. Tam daire şeklindedir.', icon: '🌕' },
  { id: 'son-dordun', name: 'Son Dördün', desc: 'Dolunay\'dan 1 hafta sonra oluşur. Ay\'ın sol yarısı ters "D" harfi şeklinde aydınlıktır.', icon: '🌗' }
];

// 4 Mevsim Verisi
const SEASONS = [
  { id: 'ilkbahar', date: '21 Mart (Ekinoks)', name: 'İlkbahar', icon: '🌸', desc: 'Gece ve gündüz süreleri eşittir (12 saat). Havalar ısınmaya başlar, doğa uyanır.' },
  { id: 'yaz', date: '21 Haziran (Gündönümü)', name: 'Yaz', icon: '☀️', desc: 'Kuzey Yarımküre\'de en uzun gündüz yaşanır. Güneş ışınları dik açıyla gelir, en sıcak mevsimdir.' },
  { id: 'sonbahar', date: '23 Eylül (Ekinoks)', name: 'Sonbahar', icon: '🍂', desc: 'Gece ve gündüz yine eşittir. Güneş ışınlarının eğimi artar, yapraklar dökülür.' },
  { id: 'kis', date: '21 Aralık (Gündönümü)', name: 'Kış', icon: '❄️', desc: 'Kuzey Yarımküre\'de en uzun gece yaşanır. Güneş ışınları en eğik açıyla gelir, en soğuk mevsimdir.' }
];

export default function SolarSystemScreen({ isOpen = true, onClose, onAddToCanvas }) {
  // Aktif Sekme: 'orbits' (Yörünge Simülasyonu) | 'seasons' (Mevsimler & Ay) | 'quiz' (Uzay Bilgi Oyunu)
  const [activeTab, setActiveTab] = useState('orbits');

  // Pencere Durumu
  const [windowState, setWindowState] = useState('normal');

  // Simülasyon Kontrolleri
  const [isPlaying, setIsPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 4x
  const [selectedPlanetId, setSelectedPlanetId] = useState('dunya');
  const [angles, setAngles] = useState({
    merkur: 0.2, venus: 1.1, dunya: 2.3, mars: 3.5,
    jupiter: 4.2, saturn: 5.1, uranus: 0.8, neptun: 1.9
  });

  // Ay Evresi & Mevsim Seçimi
  const [activeSeasonId, setActiveSeasonId] = useState('yaz');
  const [activeMoonPhaseId, setActiveMoonPhaseId] = useState('dolunay');

  // Quiz / Yarışma Modu
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);

  // Ses Durumu
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Çizim Katmanı
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#facc15');
  const [penSize, setPenSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  // Animasyon Frame Referansı
  const animFrameRef = useRef(null);

  // Seçili Gezegen
  const selectedPlanet = useMemo(() => {
    return PLANETS.find(p => p.id === selectedPlanetId) || PLANETS[2];
  }, [selectedPlanetId]);

  // ==========================================
  // MODÜL DOCK ENTEGRASYONU
  // ==========================================
  const { registerModule, unregisterModule } = useModuleDock();

  const dockBadgeText = useMemo(() => {
    if (activeTab === 'orbits') {
      return `Keşif: ${selectedPlanet.name} • ${selectedPlanet.temperature}`;
    }
    if (activeTab === 'seasons') {
      return `Mevsim: ${SEASONS.find(s => s.id === activeSeasonId)?.name || 'Dünya'}`;
    }
    return `Uzay Kâşifi • ${quizScore} Puan`;
  }, [activeTab, selectedPlanet, activeSeasonId, quizScore]);

  useEffect(() => {
    if (!isOpen) {
      unregisterModule('gunes-sistemi-atolyesi');
      return;
    }

    registerModule({
      id: 'gunes-sistemi-atolyesi',
      title: 'Güneş Sistemi & Gezegenler Keşif Atölyesi',
      shortTitle: 'Güneş Sistemi',
      icon: '🪐',
      gradient: 'bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white',
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
      unregisterModule('gunes-sistemi-atolyesi');
    };
  }, [unregisterModule]);

  // ==========================================
  // YÖRÜNGE ANİMASYON DÖNGÜSÜ
  // ==========================================
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const loop = () => {
      setAngles(prev => {
        const next = { ...prev };
        PLANETS.forEach(p => {
          next[p.id] = (next[p.id] + p.orbitSpeed * 0.25 * simSpeed) % (Math.PI * 2);
        });
        return next;
      });
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, simSpeed]);

  const handleSelectPlanet = (id) => {
    setSelectedPlanetId(id);
    if (soundEnabled) playSpaceBeep(320, 0.1);
  };

  // ==========================================
  // UZAY BİLGİ TESTİ / OYUN MODU
  // ==========================================
  const generateQuizQuestion = () => {
    setQuizFeedback(null);
    const questionsPool = [
      {
        question: 'Güneş Sistemi\'ndeki en büyük gezegen hangisidir?',
        correct: 'Jüpiter',
        options: ['Dünya', 'Mars', 'Jüpiter', 'Satürn']
      },
      {
        question: 'Göz alıcı buz ve kaya halkalarıyla meşhur olan gezegen hangisidir?',
        correct: 'Satürn',
        options: ['Satürn', 'Uranüs', 'Neptün', 'Mars']
      },
      {
        question: 'Toprağındaki demir mineralinden dolayı "Kızıl Gezegen" olarak adlandırılan gezegen hangisidir?',
        correct: 'Mars',
        options: ['Venüs', 'Mars', 'Merkür', 'Neptün']
      },
      {
        question: 'Güneş\'e en yakın olan gezegen hangisidir?',
        correct: 'Merkür',
        options: ['Merkür', 'Venüs', 'Dünya', 'Mars']
      },
      {
        question: 'Güneş Sistemi\'nin en sıcak gezegeni hangisidir?',
        correct: 'Venüs',
        options: ['Merkür', 'Venüs', 'Mars', 'Jüpiter']
      },
      {
        question: 'Yan yatarak yuvarlanan ve dönme ekseni yaklaşık 98° eğik olan buz devi hangisidir?',
        correct: 'Uranüs',
        options: ['Neptün', 'Satürn', 'Uranüs', 'Merkür']
      },
      {
        question: 'Dünya\'nın tek doğal uydusu nedir?',
        correct: 'Ay',
        options: ['Ay', 'Titan', 'Phobos', 'Europa']
      }
    ];

    const pick = questionsPool[Math.floor(Math.random() * questionsPool.length)];
    setQuizQuestion({
      ...pick,
      options: [...pick.options].sort(() => Math.random() - 0.5)
    });
  };

  useEffect(() => {
    if (activeTab === 'quiz' && !quizQuestion) {
      generateQuizQuestion();
    }
  }, [activeTab]);

  const handleAnswerQuiz = (opt) => {
    if (!quizQuestion || quizFeedback) return;
    if (opt === quizQuestion.correct) {
      setQuizFeedback('correct');
      setQuizScore(s => s + 10);
      setQuizStreak(st => st + 1);
      if (soundEnabled) playSuccessChime();
      setTimeout(() => {
        generateQuizQuestion();
      }, 1200);
    } else {
      setQuizFeedback('wrong');
      setQuizStreak(0);
      if (soundEnabled) playSpaceBeep(180, 0.25);
      setTimeout(() => {
        setQuizFeedback(null);
      }, 900);
    }
  };

  // ==========================================
  // ÇİZİM TUVALİ
  // ==========================================
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
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

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = isEraser ? '#020617' : penColor;
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
    const canvas = canvasRef.current;
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
        className="absolute inset-0 bg-black/75 backdrop-blur-xs pointer-events-auto transition-opacity"
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
          maxWidth: isMax ? '100%' : '1140px',
          height: isMax ? '100dvh' : '100%',
          maxHeight: isMax ? '100%' : '900px'
        }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="pointer-events-auto relative w-full h-[100dvh] sm:h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-indigo-900/60 bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none"
      >
        {/* ========================================================= */}
        {/* 1. ÜST BAŞLIK VE SEKME YÖNETİMİ                             */}
        {/* ========================================================= */}
        <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 gap-2 shrink-0">
          {/* Sol: İkon & Sekmeler */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 text-lg shrink-0">
              🪐
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1 truncate">
                  <span>Güneş Sistemi & Gezegenler</span>
                </h2>
                <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 shrink-0">
                  MEB 3-5. Sınıf
                </span>
              </div>

              {/* Sekmeler */}
              <div className="flex items-center gap-1 mt-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('orbits')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                    activeTab === 'orbits'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🌌 Yörüngeler & Gezegenler
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('seasons')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'seasons'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🌍 Mevsimler & Ay
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'quiz'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🚀 Uzay Kâşifi
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
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Çizim Katmanı */}
            <button
              type="button"
              onClick={() => setIsDrawingMode(v => !v)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer active:scale-95 ${
                isDrawingMode
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Tuval Üzerine Çizim Modu"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>

            {/* Simge Durumuna Küçült (Eksiksiz & Net Eksi İkonu) */}
            <button
              type="button"
              onClick={() => setWindowState('minimized')}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title="Simge Durumuna Küçült"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Büyüt / Normal Boyut */}
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
                className="w-8 h-8 rounded-xl bg-rose-500/20 text-red-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 ml-0.5"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* ÇİZİM ARAÇ ÇUBUĞU (Aktifse görünür)                       */}
        {/* ========================================================= */}
        {isDrawingMode && (
          <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs gap-2 z-30">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-400">✏️ Çizim:</span>
              {['#facc15', '#38bdf8', '#10b981', '#f43f5e', '#ffffff'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setPenColor(c); setIsEraser(false); }}
                  className={`w-5 h-5 rounded-full border-2 transition ${
                    penColor === c && !isEraser ? 'scale-110 border-white ring-2 ring-amber-400' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                type="button"
                onClick={() => setIsEraser(v => !v)}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  isEraser ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" /> Silgi
              </button>
            </div>
            <button
              type="button"
              onClick={clearDrawingCanvas}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Temizle
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SEKME 1: İNTERAKTİF YÖRÜNGE SİMÜLASYONU VE GEZEGEN KARTI */}
        {/* ========================================================= */}
        {activeTab === 'orbits' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Sol / Üst: Gezegen Seçim & Detay Kartı */}
            <div className="w-full lg:w-80 bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-slate-800 p-3 sm:p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div className="space-y-3">
                {/* Hızlı Gezegen Listesi Butonları */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Gezegen Seçin
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
                    {PLANETS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPlanet(p.id)}
                        className={`p-1.5 rounded-xl flex flex-col items-center gap-0.5 text-center transition cursor-pointer active:scale-95 ${
                          selectedPlanetId === p.id
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md ring-2 ring-cyan-300/40'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                        }`}
                      >
                        <span className="text-base">{p.imageEmoji}</span>
                        <span className="text-[10px] leading-tight truncate w-full">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seçili Gezegenin Bilgi Kartı */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{selectedPlanet.imageEmoji}</div>
                    <div>
                      <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-1.5">
                        <span>{selectedPlanet.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/20">
                          {selectedPlanet.type}
                        </span>
                      </h3>
                      <p className="text-[11px] text-cyan-400 font-medium">{selectedPlanet.tagline}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Güneş'e Mesafe:</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.distanceFromSun}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sıcaklık:</span>
                      <span className="font-semibold text-amber-400">{selectedPlanet.temperature}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">1 Gün (Dönüş):</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.dayLength}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">1 Yıl (Dolanma):</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.yearLength}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Çap:</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.diameter}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Uydu Sayısı:</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.moons} Uydu</span>
                    </div>
                  </div>

                  {/* Biliyor muydunuz? Kutusu */}
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-200 leading-relaxed">
                    <span className="font-bold text-cyan-300 block mb-0.5">💡 Biliyor muydun?</span>
                    {selectedPlanet.funFact}
                  </div>
                </div>
              </div>

              {/* Alt Kontroller: Oynat / Hız / Tahtaya Aktar */}
              <div className="space-y-2 pt-3 border-t border-slate-800 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(v => !v)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-cyan-500 text-slate-950'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPlaying ? 'Dondur' : 'Yörüngeyi Oynat'}</span>
                  </button>

                  {/* Simülasyon Hızı */}
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                    {[1, 2, 4].map(sp => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setSimSpeed(sp)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          simSpeed === sp ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {sp}x
                      </button>
                    ))}
                  </div>
                </div>

                {onAddToCanvas && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCanvas({
                        title: `Güneş Sistemi - ${selectedPlanet.name}`,
                        text: `${selectedPlanet.name} (${selectedPlanet.type})\n${selectedPlanet.tagline}\n\n• Güneş'e Mesafe: ${selectedPlanet.distanceFromSun}\n• Ortalama Sıcaklık: ${selectedPlanet.temperature}\n• 1 Gün: ${selectedPlanet.dayLength}\n• 1 Yıl: ${selectedPlanet.yearLength}\n• Uydu Sayısı: ${selectedPlanet.moons}\n\nİlginç Bilgi: ${selectedPlanet.funFact}`,
                        fontSize: 22
                      });
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 font-bold text-xs flex items-center justify-center gap-2 transition border border-cyan-500/20 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Gezegen Bilgisini Tahtaya Aktar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sağ: 2D Orrery Yörünge Tuvali */}
            <div className="flex-1 p-4 flex items-center justify-center relative overflow-hidden bg-radial from-slate-900 to-slate-950">
              {/* Çizim Katmanı */}
              {isDrawingMode && (
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={800}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="absolute inset-0 w-full h-full z-20 touch-none cursor-crosshair"
                />
              )}

              {/* Uzay Arka Plan Yıldızları */}
              <div className="absolute inset-0 opacity-40 pointer-events-none">
                <div className="w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
              </div>

              {/* Yörünge Simülasyon Sahnesi (SVG) */}
              <div className="relative w-full max-w-[620px] aspect-square flex items-center justify-center">
                {/* Güneş (Merkez) */}
                <div
                  className="absolute z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-300 shadow-[0_0_45px_rgba(251,191,36,0.85)] flex items-center justify-center text-2xl animate-pulse cursor-pointer"
                  title="Güneş - Merkezdeki Yıldızımız"
                >
                  ☀️
                </div>

                {/* Gezegen Yörüngeleri & Gezegenler */}
                {PLANETS.map((p, idx) => {
                  const orbitSize = (idx + 1) * 60 + 20; // 80px - 500px
                  const angle = angles[p.id] || 0;
                  const isSelected = selectedPlanetId === p.id;
                  const r = orbitSize / 2;
                  const x = Math.cos(angle) * r;
                  const y = Math.sin(angle) * r;

                  return (
                    <React.Fragment key={p.id}>
                      {/* Yörünge Çemberi */}
                      <div
                        className={`absolute rounded-full border pointer-events-none transition-colors ${
                          isSelected ? 'border-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'border-slate-800'
                        }`}
                        style={{
                          width: `${orbitSize}px`,
                          height: `${orbitSize}px`
                        }}
                      />

                      {/* Gezegen Gövdesi */}
                      <div
                        onClick={() => handleSelectPlanet(p.id)}
                        className="absolute cursor-pointer flex flex-col items-center justify-center group z-10 transition-transform active:scale-95"
                        style={{
                          transform: `translate(${x}px, ${y}px)`
                        }}
                      >
                        <div
                          className={`rounded-full flex items-center justify-center transition-all ${
                            isSelected ? 'ring-4 ring-cyan-400 scale-125' : 'hover:scale-120'
                          }`}
                          style={{
                            width: `${p.size + 4}px`,
                            height: `${p.size + 4}px`,
                            backgroundColor: p.color,
                            boxShadow: `0 0 16px ${p.glowColor}`
                          }}
                        >
                          {p.hasRings && (
                            <div className="absolute w-12 h-3 border border-amber-300/80 rounded-full rotate-25 pointer-events-none" />
                          )}
                        </div>

                        {/* Gezegen İsmi Etiketi */}
                        <span
                          className={`mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded-md font-mono select-none ${
                            isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900/80 text-slate-300'
                          }`}
                        >
                          {p.name}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SEKME 2: MEVSİMLER & AYIN EVRELERİ (MEB 4-5. SINIF)      */}
        {/* ========================================================= */}
        {activeTab === 'seasons' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto p-4 sm:p-6 gap-6">
            {/* Sol: 4 Mevsim ve Eksen Eğikliği Simülatörü */}
            <div className="flex-1 bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🌍</span>
                  <h3 className="font-bold text-base text-white">
                    Dünya'nın Dönüşü ve 4 Mevsim
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dünya, Güneş etrafında dolanırken ekseni <strong>23° 27' (yaklaşık 23.5 derece)</strong> eğiktir. Bu eğiklik nedeniyle Güneş ışınları yıl boyunca yeryüzüne farklı açılarla düşer ve 4 mevsim oluşur.
                </p>
              </div>

              {/* 4 Mevsim Seçim Kartları */}
              <div className="grid grid-cols-2 gap-2.5">
                {SEASONS.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSeasonId(s.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                      activeSeasonId === s.id
                        ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{s.date}</span>
                    </div>
                    <div className="font-bold text-sm">{s.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-snug">{s.desc}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                ⭐ <strong>Önemli Kural:</strong> Türkiye Kuzey Yarımküre'dedir. Bu yüzden 21 Haziran'da yaz mevsimi başlarken, Güney Yarımküre'de kış mevsimi başlar!
              </div>
            </div>

            {/* Sağ: Ay'ın Ana Evreleri Simülatörü */}
            <div className="flex-1 bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🌙</span>
                  <h3 className="font-bold text-base text-white">
                    Ay'ın Ana Evreleri (Yaklaşık 29.5 Günlük Döngü)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ay kendi ışığını üretmez; Güneş'ten aldığı ışığı yansıtır. Dünya etrafında dolanırken gördüğümüz aydınlık kısımlar değişir ve evreler oluşur.
                </p>
              </div>

              {/* 4 Ana Evre Kartları */}
              <div className="grid grid-cols-2 gap-2.5">
                {MOON_PHASES.map(mp => (
                  <div
                    key={mp.id}
                    onClick={() => setActiveMoonPhaseId(mp.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                      activeMoonPhaseId === mp.id
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-3xl mb-1">{mp.icon}</div>
                    <div className="font-bold text-sm">{mp.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-snug">{mp.desc}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200">
                🔭 <strong>Pratik İpucu:</strong> Ay "D" harfine benziyorsa <strong>İlk Dördün</strong>, ters "D" harfine benziyorsa <strong>Son Dördün</strong> evresindedir!
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. SEKME 3: UZAY KÂŞİFİ BİLGİ YARIŞMASI                    */}
        {/* ========================================================= */}
        {activeTab === 'quiz' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
            {quizQuestion && (
              <div className="w-full max-w-xl bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-6">
                {/* Skor Rozetleri */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
                    <Trophy className="w-4 h-4" />
                    <span>Puan: {quizScore}</span>
                  </div>

                  <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs">
                    <Rocket className="w-4 h-4" />
                    <span>{quizStreak}x Seri</span>
                  </div>
                </div>

                <div>
                  <div className="text-4xl mb-2">🧑‍🚀</div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {quizQuestion.question}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Güneş Sistemi bilgilerini hatırla ve doğru şıkkı seç!
                  </p>
                </div>

                {/* Geri Bildirim */}
                {quizFeedback && (
                  <div
                    className={`py-2 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                      quizFeedback === 'correct'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {quizFeedback === 'correct' ? '🎉 Harika Uzay Kâşifi! Doğru cevap!' : '❌ Tekrar dene! İpuçlarını hatırla.'}
                  </div>
                )}

                {/* Seçenekler */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {quizQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!!quizFeedback}
                      onClick={() => handleAnswerQuiz(opt)}
                      className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 font-extrabold text-sm sm:text-base text-white transition-all shadow-md active:scale-95 cursor-pointer border border-slate-700 hover:border-cyan-400"
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={generateQuizQuestion}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 mx-auto transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Farklı Soruya Geç
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
