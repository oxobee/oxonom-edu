import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX,
  X, Maximize2, Minimize2, PenTool, Eraser, Trash2,
  Trophy, Zap, Eye, EyeOff,
  ArrowRight, ArrowLeft, RefreshCw, Minus, Download,
  Settings, Palette
} from 'lucide-react';
import { useModuleDock } from '../context/ModuleDockContext';

// Basit Web Audio API sentezleyici (Harici ses dosyasına ihtiyaç duymadan sevimli sesler üretir)
function playTone(freq, type = 'sine', duration = 0.15) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function playSuccessSound() {
  playTone(523.25, 'sine', 0.1); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.1), 100); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.2), 200); // G5
}

function playPopSound(step = 1) {
  const baseFreq = 300 + (step % 20) * 20;
  playTone(baseFreq, 'triangle', 0.08);
}

function playWrongSound() {
  playTone(220, 'sawtooth', 0.2);
}

// ==========================================
// GERÇEKÇİ TÜRKÇE SES İLE SAYILARI OKUMA (0-100)
// ==========================================
let currentNumberAudio = null;

const TURKISH_NUMBER_WORDS = {
  0: 'sıfır', 1: 'bir', 2: 'iki', 3: 'üç', 4: 'dört', 5: 'beş', 6: 'altı', 7: 'yedi', 8: 'sekiz', 9: 'dokuz',
  10: 'on', 20: 'yirmi', 30: 'otuz', 40: 'kırk', 50: 'elli', 60: 'altmış', 70: 'yetmiş', 80: 'seksen', 90: 'doksan', 100: 'yüz'
};

function getTurkishNumberName(n) {
  if (n <= 10) return TURKISH_NUMBER_WORDS[n] || String(n);
  if (n === 100) return 'yüz';
  const t = Math.floor(n / 10) * 10;
  const o = n % 10;
  if (o === 0) return TURKISH_NUMBER_WORDS[t] || String(n);
  return `${TURKISH_NUMBER_WORDS[t]} ${TURKISH_NUMBER_WORDS[o]}`;
}

function speakWithWebSpeechFallback(number, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const text = getTurkishNumberName(number);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';

    // En kaliteli Türkçe ses varsa seç
    const voices = window.speechSynthesis.getVoices();
    const trVoice = voices.find(v => 
      (v.lang === 'tr-TR' || v.lang === 'tr') && 
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Yelda') || v.name.includes('Cem') || v.name.includes('Ahmet'))
    ) || voices.find(v => v.lang === 'tr-TR' || v.lang === 'tr');

    if (trVoice) utterance.voice = trVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = () => { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utterance);
  } catch (_) {
    if (onEnd) onEnd();
  }
}

function playNumberVoice(number, onStart, onEnd) {
  if (number < 0 || number > 100) return;

  if (currentNumberAudio) {
    try {
      currentNumberAudio.pause();
      currentNumberAudio.currentTime = 0;
    } catch (_) {}
    currentNumberAudio = null;
  }
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }

  if (onStart) onStart();

  const localAudioUrl = `/audio/numbers/${number}.mp3`;
  try {
    const audio = new Audio(localAudioUrl);
    audio.volume = 1.0;
    currentNumberAudio = audio;

    audio.onended = () => {
      currentNumberAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      currentNumberAudio = null;
      speakWithWebSpeechFallback(number, onEnd);
    };

    const promise = audio.play();
    if (promise !== undefined) {
      promise.catch(() => {
        currentNumberAudio = null;
        speakWithWebSpeechFallback(number, onEnd);
      });
    }
  } catch (_) {
    speakWithWebSpeechFallback(number, onEnd);
  }
}

// Renk Paleti (Hücreleri boyamak için)
const HIGHLIGHT_COLORS = [
  { id: 'amber', name: 'Sarı', bg: 'bg-amber-400', border: 'border-amber-300', text: 'text-slate-950', ring: 'ring-amber-400' },
  { id: 'emerald', name: 'Yeşil', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', ring: 'ring-emerald-500' },
  { id: 'sky', name: 'Mavi', bg: 'bg-sky-500', border: 'border-sky-400', text: 'text-white', ring: 'ring-sky-500' },
  { id: 'rose', name: 'Pembe', bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-white', ring: 'ring-rose-500' },
  { id: 'purple', name: 'Mor', bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', ring: 'ring-purple-500' },
  { id: 'orange', name: 'Turuncu', bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', ring: 'ring-orange-500' }
];

// Ritmik Sayma Adım Seçenekleri
const RHYTHMIC_STEPS = [
  { step: 1, label: "1'er" },
  { step: 2, label: "2'şer" },
  { step: 3, label: "3'er" },
  { step: 4, label: "4'er" },
  { step: 5, label: "5'er" },
  { step: 6, label: "6'şar" },
  { step: 7, label: "7'şer" },
  { step: 8, label: "8'er" },
  { step: 9, label: "9'ar" },
  { step: 10, label: "10'ar" }
];

// Sayı Doğrusu Maskotları
const MASCOTS = [
  { id: 'frog', icon: '🐸', name: 'Kurbağa Zıpzıp' },
  { id: 'rabbit', icon: '🐰', name: 'Tavşan Pamuk' },
  { id: 'kangaroo', icon: '🦘', name: 'Kanguru Hop' },
  { id: 'rocket', icon: '🚀', name: 'Uzay Roketi' }
];

export default function RhythmicCountingScreen({ isOpen = true, onClose, onAddToCanvas }) {
  // Aktif Sekme: 'chart' (100'lük Tablo) | 'line' (Sayı Doğrusu) | 'practice' (Örüntü Pratiği)
  const [activeTab, setActiveTab] = useState('chart');

  // Pencere Durumu: 'normal', 'minimized', 'maximized'
  const [windowState, setWindowState] = useState('normal');

  // ==========================================
  // 1. YÜZLÜK TABLO STATE'LERİ
  // ==========================================
  const [chartStep, setChartStep] = useState(2); // 2'şer sayma varsayılan
  const [highlightedCells, setHighlightedCells] = useState({}); // { [number]: colorId }
  const [selectedPaintColor, setSelectedPaintColor] = useState('amber');
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [autoCurrentNumber, setAutoCurrentNumber] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(600); // ms (doğal sesli okuma için ideal)
  const [hideNumbersMode, setHideNumbersMode] = useState(false);
  const [revealedNumbers, setRevealedNumbers] = useState({});
  const autoPlayTimerRef = useRef(null);

  // Mobil kontroller için ek state'ler
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  // ==========================================
  // 2. SAYI DOĞRUSU STATE'LERİ
  // ==========================================
  const [lineRange, setLineRange] = useState(20); // 20, 50, 100
  const [lineStep, setLineStep] = useState(2);
  const [mascotPos, setMascotPos] = useState(0);
  const [jumpHistory, setJumpHistory] = useState([0]);
  const [selectedMascot, setSelectedMascot] = useState(MASCOTS[0].id);
  const [isJumping, setIsJumping] = useState(false);

  // ==========================================
  // 3. PRATİK / SORU OYUNU STATE'LERİ
  // ==========================================
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [practiceScore, setPracticeScore] = useState(0);
  const [practiceStreak, setPracticeStreak] = useState(0);
  const [practiceFeedback, setPracticeFeedback] = useState(null); // 'correct' | 'wrong'

  // ==========================================
  // 4. ÇİZİM TUVALİ (Canvas Overlay)
  // ==========================================
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#facc15');
  const [penSize, setPenSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  // Ses Durumu
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sayıları Sesli Okuma Durumu (Gerçekçi Türkçe Ses ile 0-100)
  const [speakNumbers, setSpeakNumbers] = useState(true);

  // ==========================================
  // MODÜL DOCK ENTEGRASYONU
  // ==========================================
  const { registerModule, unregisterModule } = useModuleDock();

  const dockBadgeText = useMemo(() => {
    if (activeTab === 'chart') {
      return `${chartStep}'şer Sayma • ${autoCurrentNumber > 0 ? autoCurrentNumber : Object.keys(highlightedCells).length + ' Boyalı'}`;
    }
    if (activeTab === 'line') {
      return `Sayı Doğrusu • Konum: ${mascotPos}`;
    }
    return `Pratik Modu • ${practiceScore} Puan`;
  }, [activeTab, chartStep, autoCurrentNumber, highlightedCells, mascotPos, practiceScore]);

  useEffect(() => {
    if (!isOpen) {
      unregisterModule('ritmik-sayma-atolyesi');
      return;
    }

    registerModule({
      id: 'ritmik-sayma-atolyesi',
      title: 'Ritmik Sayma & Sayı Doğrusu Atölyesi',
      shortTitle: 'Ritmik Sayma',
      icon: '🔢',
      gradient: 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white',
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
      unregisterModule('ritmik-sayma-atolyesi');
    };
  }, [unregisterModule]);

  // ==========================================
  // YÜZLÜK TABLO RİTMİK SAYMA İŞLEMLERİ
  // ==========================================
  const applyRhythmicHighlight = (step) => {
    setChartStep(step);
    setAutoCurrentNumber(0);
    setIsPlayingAuto(false);
    clearInterval(autoPlayTimerRef.current);

    const newHighlights = {};
    for (let i = step; i <= 100; i += step) {
      newHighlights[i] = selectedPaintColor;
    }
    setHighlightedCells(newHighlights);

    if (speakNumbers) {
      playNumberVoice(step);
    } else if (soundEnabled) {
      playSuccessSound();
    }
  };

  // Otomatik Oynatma Döngüsü
  useEffect(() => {
    if (isPlayingAuto) {
      autoPlayTimerRef.current = setInterval(() => {
        setAutoCurrentNumber(prev => {
          const next = prev + chartStep;
          if (next > 100) {
            setIsPlayingAuto(false);
            clearInterval(autoPlayTimerRef.current);
            if (soundEnabled) playSuccessSound();
            return 100;
          }
          if (speakNumbers) {
            playNumberVoice(next);
          } else if (soundEnabled) {
            playPopSound(next / chartStep);
          }
          setHighlightedCells(h => ({ ...h, [next]: selectedPaintColor }));
          return next;
        });
      }, playbackSpeed);
    } else {
      clearInterval(autoPlayTimerRef.current);
    }
    return () => clearInterval(autoPlayTimerRef.current);
  }, [isPlayingAuto, chartStep, playbackSpeed, selectedPaintColor, soundEnabled, speakNumbers]);

  const handleToggleAutoPlay = () => {
    if (isPlayingAuto) {
      setIsPlayingAuto(false);
      return;
    }
    if (autoCurrentNumber >= 100 || autoCurrentNumber === 0) {
      setAutoCurrentNumber(0);
      setHighlightedCells({});
    }
    setIsPlayingAuto(true);
  };

  const handleResetChart = () => {
    setIsPlayingAuto(false);
    clearInterval(autoPlayTimerRef.current);
    setAutoCurrentNumber(0);
    setHighlightedCells({});
    setRevealedNumbers({});
  };

  const handleCellClick = (num) => {
    if (hideNumbersMode && !revealedNumbers[num]) {
      setRevealedNumbers(prev => ({ ...prev, [num]: true }));
      if (speakNumbers) {
        playNumberVoice(num);
      } else if (soundEnabled) {
        playTone(440, 'triangle', 0.1);
      }
      return;
    }

    setHighlightedCells(prev => {
      const copy = { ...prev };
      if (copy[num]) {
        delete copy[num];
      } else {
        copy[num] = selectedPaintColor;
      }
      return copy;
    });

    if (speakNumbers) {
      playNumberVoice(num);
    } else if (soundEnabled) {
      playTone(300 + (num % 20) * 15, 'sine', 0.08);
    }
  };

  // ==========================================
  // SAYI DOĞRUSU İŞLEMLERİ
  // ==========================================
  const handleJumpForward = () => {
    if (mascotPos + lineStep > lineRange) return;
    setIsJumping(true);
    const nextPos = mascotPos + lineStep;
    setMascotPos(nextPos);
    setJumpHistory(prev => [...prev, nextPos]);
    if (speakNumbers) {
      playNumberVoice(nextPos);
    } else if (soundEnabled) {
      playTone(350 + (nextPos % 30) * 15, 'sine', 0.15);
    }
    setTimeout(() => setIsJumping(false), 260);
  };

  const handleJumpBackward = () => {
    if (mascotPos - lineStep < 0) return;
    setIsJumping(true);
    const nextPos = mascotPos - lineStep;
    setMascotPos(nextPos);
    setJumpHistory(prev => [...prev, nextPos]);
    if (speakNumbers) {
      playNumberVoice(nextPos);
    } else if (soundEnabled) {
      playTone(280 + (nextPos % 30) * 15, 'triangle', 0.15);
    }
    setTimeout(() => setIsJumping(false), 260);
  };

  const handleResetLine = () => {
    setMascotPos(0);
    setJumpHistory([0]);
    setIsJumping(false);
    if (speakNumbers) {
      playNumberVoice(0);
    }
  };

  // ==========================================
  // PRATİK / OYUN MODU İŞLEMLERİ
  // ==========================================
  const generateNewPracticeQuestion = () => {
    setPracticeFeedback(null);
    const steps = [2, 3, 4, 5, 10];
    const step = steps[Math.floor(Math.random() * steps.length)];
    const start = Math.floor(Math.random() * 5 + 1) * step;
    const length = 5;
    const sequence = [];
    for (let i = 0; i < length; i++) {
      sequence.push(start + i * step);
    }
    const blankIndex = Math.floor(Math.random() * (length - 1)) + 1;
    const correctAnswer = sequence[blankIndex];

    const options = new Set([correctAnswer]);
    while (options.size < 4) {
      const offset = (Math.floor(Math.random() * 5) - 2) * step;
      const fake = correctAnswer + offset;
      if (fake > 0 && fake !== correctAnswer) {
        options.add(fake);
      } else {
        options.add(correctAnswer + (options.size * step));
      }
    }

    setPracticeQuestion({
      step,
      sequence,
      blankIndex,
      correctAnswer,
      options: Array.from(options).sort(() => Math.random() - 0.5)
    });
  };

  useEffect(() => {
    if (activeTab === 'practice' && !practiceQuestion) {
      generateNewPracticeQuestion();
    }
  }, [activeTab]);

  const handleAnswerPractice = (opt) => {
    if (!practiceQuestion || practiceFeedback) return;
    if (opt === practiceQuestion.correctAnswer) {
      setPracticeFeedback('correct');
      setPracticeScore(s => s + 10);
      setPracticeStreak(st => st + 1);
      if (speakNumbers) {
        playNumberVoice(opt, null, () => {
          if (soundEnabled) playSuccessSound();
        });
      } else if (soundEnabled) {
        playSuccessSound();
      }
      setTimeout(() => {
        generateNewPracticeQuestion();
      }, 1300);
    } else {
      setPracticeFeedback('wrong');
      setPracticeStreak(0);
      if (speakNumbers) {
        playNumberVoice(opt);
        setTimeout(() => {
          if (soundEnabled) playWrongSound();
        }, 400);
      } else if (soundEnabled) {
        playWrongSound();
      }
      setTimeout(() => {
        setPracticeFeedback(null);
      }, 1000);
    }
  };

  // ==========================================
  // CANVAS ÇİZİM İŞLEMLERİ (Responsive Scale Destekli)
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

    const canvas = canvasRef.current;
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
          {/* Sol: İkon & Başlık / Sekmeler */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 text-base sm:text-lg shrink-0">
              🔢
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-base font-bold text-white tracking-tight flex items-center gap-1 truncate">
                  <span className="hidden xs:inline">Ritmik Sayma & Sayı Doğrusu</span>
                  <span className="xs:hidden">Ritmik Sayma</span>
                </h2>
                <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 shrink-0">
                  MEB 1-3. Sınıf
                </span>
              </div>

              {/* Sekme Değiştirici */}
              <div className="flex items-center gap-1 mt-0.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('chart')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeTab === 'chart'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  📊 <span className="hidden xs:inline">100'lük </span>Tablo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('line')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'line'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🐸 <span className="hidden xs:inline">Sayı </span>Doğrusu
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('practice')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'practice'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  ⭐ Örüntü<span className="hidden xs:inline"> Oyunu</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sağ: Araçlar & Pencere Butonları */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Sayıları Sesli Oku Aç / Kapat Butonu */}
            <button
              type="button"
              onClick={() => setSpeakNumbers(v => !v)}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg sm:rounded-xl flex items-center gap-1 sm:gap-1.5 transition cursor-pointer active:scale-95 ${
                speakNumbers
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-transparent'
              }`}
              title={speakNumbers ? "Sayıları Sesli Okuma Açık (Kapatmak için tıkla)" : "Sayıları Sesli Okuma Kapalı (Açmak için tıkla)"}
            >
              <span className="text-xs sm:text-sm">🗣️</span>
              <span className="hidden md:inline text-[11px] font-bold">
                {speakNumbers ? 'Sesli Oku' : 'Sessiz'}
              </span>
            </button>

            {/* Genel Ses Aç / Kapat */}
            <button
              type="button"
              onClick={() => setSoundEnabled(v => !v)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title={soundEnabled ? "Efekt Seslerini Kapat" : "Efekt Seslerini Aç"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
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
        {/* 2. SEKME 1: İNTERAKTİF 100'LÜK TABLO                      */}
        {/* ========================================================= */}
        {activeTab === 'chart' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* MOBİL: HIZLI ADIM SEÇİCİ ÜST BAR (md:hidden) */}
            <div className="md:hidden shrink-0 bg-slate-900/95 border-b border-slate-800 px-2.5 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Adım:</span>
              {RHYTHMIC_STEPS.map(item => (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => applyRhythmicHighlight(item.step)}
                  className={`py-1 px-2 rounded-lg text-[11px] font-bold shrink-0 transition active:scale-95 ${
                    chartStep === item.step
                      ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold ring-1 ring-emerald-300'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* MASAÜSTÜ: SOL KONTROL PANELİ (hidden md:flex) */}
            <div className="hidden md:flex w-72 bg-slate-900 border-r border-slate-800 p-4 flex-col gap-3 shrink-0 overflow-y-auto">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Ritmik Sayma Adımı
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {RHYTHMIC_STEPS.map(item => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => applyRhythmicHighlight(item.step)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                        chartStep === item.step
                          ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400/40'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sesli Okuma Özelliği Kartı */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🗣️</span>
                    <span className="text-xs font-bold text-slate-200">Sayıları Sesli Oku</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpeakNumbers(v => !v)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      speakNumbers ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform ${
                      speakNumbers ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {speakNumbers ? '✅ Gerçekçi Türkçe telaffuz aktif (0-100)' : '❌ Sessiz sayma'}
                </p>
              </div>

              {/* Otomatik Oynatma ve Kontroller */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Otomatik Sayım:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {autoCurrentNumber > 0 ? `${autoCurrentNumber} / 100` : 'Hazır'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAutoPlay}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer ${
                      isPlayingAuto
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    }`}
                  >
                    {isPlayingAuto ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPlayingAuto ? 'Duraklat' : 'Oynat'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetChart}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                    title="Tabloyu Sıfırla"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Hız Seçimi */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                  <span>Hız:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Yavaş', ms: 900 },
                      { label: 'Normal', ms: 600 },
                      { label: 'Hızlı', ms: 380 }
                    ].map(s => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setPlaybackSpeed(s.ms)}
                        className={`px-2 py-0.5 rounded-md font-semibold transition ${
                          playbackSpeed === s.ms ? 'bg-slate-700 text-emerald-300' : 'hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Boyama Rengi Seçimi */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Vurgu & Kalem Rengi
                </label>
                <div className="flex items-center gap-2">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedPaintColor(c.id)}
                      className={`w-7 h-7 rounded-xl ${c.bg} transition transform active:scale-90 flex items-center justify-center ${
                        selectedPaintColor === c.id ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    >
                      {selectedPaintColor === c.id && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gizle / Keşfet Modu */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setHideNumbersMode(v => !v);
                    setRevealedNumbers({});
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
                    hideNumbersMode
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {hideNumbersMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>{hideNumbersMode ? 'Sayıları Göster' : 'Sayıları Gizle (Bulmaca)'}</span>
                </button>
              </div>

              {/* Tahtaya Aktar Butonu */}
              {onAddToCanvas && (
                <button
                  type="button"
                  onClick={() => {
                    const marked = Object.keys(highlightedCells).sort((a,b) => a - b).join(', ');
                    onAddToCanvas({
                      title: `100'lük Tablo (${chartStep}'şer Ritmik Sayma)`,
                      text: `Ritmik Sayma Adımı: ${chartStep}'şer\nVurgulanan Sayılar: ${marked || '1-100'}`,
                      fontSize: 24
                    });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition border border-emerald-500/20 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Akıllı Tahtaya Aktar</span>
                </button>
              )}
            </div>

            {/* MERKEZ: 10x10 YÜZLÜK TABLO IZGARASI */}
            <div className="flex-1 p-1.5 xs:p-2 sm:p-4 md:p-6 overflow-hidden flex items-center justify-center relative">
              {/* Çizim Katmanı */}
              {isDrawingMode && (
                <canvas
                  ref={canvasRef}
                  width={720}
                  height={720}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="absolute inset-0 w-full h-full z-20 touch-none cursor-crosshair"
                />
              )}

              <div className="w-full max-w-[min(94vw,560px)] aspect-square grid grid-cols-10 gap-0.5 xs:gap-1 sm:gap-1.5 p-1.5 xs:p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl">
                {Array.from({ length: 100 }, (_, idx) => {
                  const num = idx + 1;
                  const colorKey = highlightedCells[num];
                  const colorInfo = HIGHLIGHT_COLORS.find(c => c.id === colorKey);
                  const isCurrentAuto = autoCurrentNumber === num;
                  const isHidden = hideNumbersMode && !revealedNumbers[num];

                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleCellClick(num)}
                      className={`relative aspect-square rounded xs:rounded-lg sm:rounded-xl font-mono font-bold text-[10px] xs:text-xs sm:text-sm md:text-base flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-90 ${
                        colorInfo
                          ? `${colorInfo.bg} ${colorInfo.text} shadow-md font-extrabold ${colorInfo.ring}`
                          : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                      } ${
                        isCurrentAuto ? 'ring-2 sm:ring-4 ring-white scale-105 z-10 animate-bounce' : ''
                      }`}
                    >
                      {isHidden ? (
                        <span className="text-slate-600 text-[10px] sm:text-xs">?</span>
                      ) : (
                        <span>{num}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MOBİL: ALT HIZLI ARAÇ ÇUBUĞU (md:hidden) */}
            <div className="md:hidden shrink-0 bg-slate-900 border-t border-slate-800 p-2 flex items-center justify-between gap-1.5 z-30">
              {/* Otomatik Oynat / Duraklat Butonu */}
              <button
                type="button"
                onClick={handleToggleAutoPlay}
                className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                  isPlayingAuto
                    ? 'bg-amber-500 text-slate-950 animate-pulse'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {isPlayingAuto ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span className="truncate">{isPlayingAuto ? 'Durdur' : 'Otomatik Say'}</span>
                {autoCurrentNumber > 0 && <span className="font-mono text-[10px] opacity-80">({autoCurrentNumber})</span>}
              </button>

              {/* Tabloyu Sıfırla */}
              <button
                type="button"
                onClick={handleResetChart}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition active:scale-95 shrink-0"
                title="Sıfırla"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Sesli Okuma Hızlı Toggle */}
              <button
                type="button"
                onClick={() => setSpeakNumbers(v => !v)}
                className={`p-2 rounded-xl flex items-center justify-center transition active:scale-95 shrink-0 ${
                  speakNumbers ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
                }`}
                title={speakNumbers ? "Sayıları Sesli Oku: Açık" : "Sayıları Sesli Oku: Kapalı"}
              >
                <span className="text-sm">🗣️</span>
              </button>

              {/* Renk Seçici Popover Tetikleyici */}
              <button
                type="button"
                onClick={() => {
                  setShowMobilePalette(v => !v);
                  setShowMobileSettings(false);
                }}
                className={`p-2 rounded-xl flex items-center gap-1 transition active:scale-95 shrink-0 ${
                  showMobilePalette ? 'bg-slate-700 ring-1 ring-emerald-400' : 'bg-slate-800 text-slate-300'
                }`}
                title="Renk Paleti"
              >
                <div className={`w-3.5 h-3.5 rounded-full ${HIGHLIGHT_COLORS.find(c => c.id === selectedPaintColor)?.bg || 'bg-amber-400'}`} />
                <Palette className="w-3.5 h-3.5" />
              </button>

              {/* Ek Ayarlar & Bulmaca Menüsü Tetikleyici */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileSettings(v => !v);
                  setShowMobilePalette(false);
                }}
                className={`p-2 rounded-xl transition active:scale-95 shrink-0 ${
                  showMobileSettings || hideNumbersMode ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300'
                }`}
                title="Ayarlar & Bulmaca"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* MOBİL: RENK SEÇİCİ BALONU */}
            <AnimatePresence>
              {showMobilePalette && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="md:hidden absolute bottom-14 left-2 right-2 bg-slate-950/95 border border-slate-800 rounded-2xl p-2.5 z-40 shadow-2xl flex items-center justify-around gap-2 backdrop-blur-md"
                >
                  <span className="text-[11px] font-bold text-slate-400">Renk:</span>
                  {HIGHLIGHT_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedPaintColor(c.id);
                        setShowMobilePalette(false);
                      }}
                      className={`w-7 h-7 rounded-xl ${c.bg} transition transform active:scale-90 flex items-center justify-center ${
                        selectedPaintColor === c.id ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    >
                      {selectedPaintColor === c.id && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* MOBİL: AYARLAR VE BULMACA ÇEKMECESİ */}
            <AnimatePresence>
              {showMobileSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="md:hidden absolute bottom-14 left-2 right-2 bg-slate-950/98 border border-slate-800 rounded-2xl p-3 z-40 shadow-2xl space-y-3 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-emerald-400" /> Tablo Ayarları
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMobileSettings(false)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sayıları Sesli Oku */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span>🗣️</span> Sayıları Sesli Oku:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSpeakNumbers(v => !v)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                        speakNumbers ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {speakNumbers ? 'Açık' : 'Kapalı'}
                    </button>
                  </div>

                  {/* Hız */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Oynatma Hızı:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Yavaş', ms: 900 },
                        { label: 'Normal', ms: 600 },
                        { label: 'Hızlı', ms: 380 }
                      ].map(s => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => setPlaybackSpeed(s.ms)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                            playbackSpeed === s.ms ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bulmaca Modu */}
                  <button
                    type="button"
                    onClick={() => {
                      setHideNumbersMode(v => !v);
                      setRevealedNumbers({});
                      setShowMobileSettings(false);
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 ${
                      hideNumbersMode
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {hideNumbersMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>{hideNumbersMode ? 'Sayıları Görünür Yap' : 'Sayıları Gizle (Bulmaca Modu)'}</span>
                  </button>

                  {/* Tahtaya Aktar */}
                  {onAddToCanvas && (
                    <button
                      type="button"
                      onClick={() => {
                        const marked = Object.keys(highlightedCells).sort((a,b) => a - b).join(', ');
                        onAddToCanvas({
                          title: `100'lük Tablo (${chartStep}'şer Ritmik Sayma)`,
                          text: `Ritmik Sayma Adımı: ${chartStep}'şer\nVurgulanan Sayılar: ${marked || '1-100'}`,
                          fontSize: 24
                        });
                        setShowMobileSettings(false);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition border border-emerald-500/20 active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Akıllı Tahtaya Aktar</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SEKME 2: DİNAMİK ZIPLAYAN SAYI DOĞRUSU                  */}
        {/* ========================================================= */}
        {activeTab === 'line' && (
          <div className="flex-1 flex flex-col p-2.5 sm:p-6 overflow-hidden justify-between">
            {/* Üst Ayar Çubuğu */}
            <div className="bg-slate-850 p-2.5 sm:p-3 rounded-2xl border border-slate-800 shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                {/* Sayı Aralığı */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-400">Aralık:</span>
                  {[20, 50, 100].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setLineRange(r); handleResetLine(); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                        lineRange === r ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      0-{r}
                    </button>
                  ))}
                </div>

                {/* Sağ Taraf: Sesli Okuma Durumu & Maskot Seçici */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSpeakNumbers(v => !v)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition active:scale-95 ${
                      speakNumbers ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}
                    title={speakNumbers ? "Sayıları Sesli Okuma Açık" : "Sayıları Sesli Okuma Kapalı"}
                  >
                    <span>🗣️</span>
                    <span className="hidden xs:inline">{speakNumbers ? 'Sesli' : 'Sessiz'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {MASCOTS.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMascot(m.id)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-sm sm:text-base flex items-center justify-center transition active:scale-95 ${
                          selectedMascot === m.id ? 'bg-emerald-500/20 border border-emerald-400 scale-105' : 'opacity-60 hover:opacity-100'
                        }`}
                        title={m.name}
                      >
                        {m.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Zıplama Adımı */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 border-t border-slate-800/80">
                <span className="text-[11px] sm:text-xs font-bold text-slate-400 shrink-0">Zıplama:</span>
                {[1, 2, 3, 4, 5, 10].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setLineStep(s)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold shrink-0 transition active:scale-95 ${
                      lineStep === s ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300/40' : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    +{s}
                  </button>
                ))}
              </div>
            </div>

            {/* Orta: Sayı Doğrusu Tuvali ve Zıplayan Maskot */}
            <div className="flex-1 my-3 sm:my-6 flex flex-col justify-center items-center relative overflow-x-auto px-2 sm:px-4 scrollbar-none">
              <div className={`w-full ${lineRange === 20 ? 'min-w-0 max-w-3xl' : 'min-w-[540px] max-w-4xl'} relative py-10 sm:py-12`}>
                {/* Zıplayan Maskot */}
                <motion.div
                  animate={{
                    left: `${(mascotPos / lineRange) * 100}%`,
                    y: isJumping ? -35 : 0
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  className="absolute -top-3 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
                >
                  <div className="text-3xl sm:text-4xl filter drop-shadow-lg">
                    {MASCOTS.find(m => m.id === selectedMascot)?.icon || '🐸'}
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold font-mono text-[10px] sm:text-xs shadow-md mt-0.5">
                    {mascotPos}
                  </div>
                </motion.div>

                {/* Ana Doğru Çizgisi */}
                <div className="h-2 w-full bg-slate-700 rounded-full relative overflow-visible">
                  {/* Kat edilen yol parlaması */}
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${(mascotPos / lineRange) * 100}%` }}
                  />

                  {/* Çentikler ve Sayılar */}
                  {Array.from({ length: lineRange + 1 }, (_, i) => {
                    const shouldShowLabel = lineRange <= 20 || (lineRange === 50 ? i % 5 === 0 : i % 10 === 0);
                    const isMajor = shouldShowLabel;
                    const isPassed = i <= mascotPos;

                    return (
                      <div
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${(i / lineRange) * 100}%` }}
                      >
                        <div
                          className={`w-0.5 transition-all ${
                            isMajor ? 'h-5 sm:h-6 -top-2.5 sm:-top-3' : 'h-2.5 sm:h-3 -top-1.5'
                          } ${isPassed ? 'bg-emerald-400' : 'bg-slate-600'}`}
                        />
                        {shouldShowLabel && (
                          <span
                            className={`mt-3 sm:mt-4 font-mono font-bold text-[10px] sm:text-xs select-none ${
                              i === mascotPos
                                ? 'text-emerald-400 scale-125'
                                : isPassed
                                ? 'text-slate-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {i}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zıplama Geçmişi İpuçları */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1.5 no-scrollbar">
                <span className="text-[10px] sm:text-xs text-slate-400 font-semibold shrink-0">Adımlar:</span>
                {jumpHistory.map((stepVal, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (speakNumbers) playNumberVoice(stepVal);
                    }}
                    className="px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-mono text-[10px] sm:text-xs font-bold shrink-0 hover:bg-slate-700 transition"
                  >
                    {stepVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Alt Kontrol Butonları */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 shrink-0 pt-1">
              <button
                type="button"
                onClick={handleJumpBackward}
                disabled={mascotPos - lineStep < 0}
                className="flex-1 max-w-[170px] py-2.5 sm:py-3 px-3 sm:px-6 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Geri (-{lineStep})</span>
              </button>

              <button
                type="button"
                onClick={handleResetLine}
                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer shrink-0"
                title="Sıfırla"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={handleJumpForward}
                disabled={mascotPos + lineStep > lineRange}
                className="flex-1 max-w-[200px] py-2.5 sm:py-3 px-3 sm:px-8 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span className="truncate">İleri (+{lineStep})</span>
                <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. SEKME 3: ÖRÜNTÜYÜ TAMAMLA PRATİK OYUNU                 */}
        {/* ========================================================= */}
        {activeTab === 'practice' && (
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-8 overflow-y-auto">
            {practiceQuestion && (
              <div className="w-full max-w-xl bg-slate-850 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl text-center space-y-4 sm:space-y-6">
                {/* Skor & Seri Rozeti */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Puan: {practiceScore}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSpeakNumbers(v => !v)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                      speakNumbers ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span>🗣️</span>
                    <span>{speakNumbers ? 'Sesli' : 'Sessiz'}</span>
                  </button>

                  <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{practiceStreak}x Seri</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-lg font-bold text-white tracking-tight">
                    Soru İşareti Yerine Hangi Sayı Gelmelidir?
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                    Örüntü kuralını keşfet ve doğru sayıyı seç!
                  </p>
                </div>

                {/* Örüntü Dizisi (Sayıya tıklanınca sesli telaffuz eder) */}
                <div className="flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-3 flex-nowrap overflow-x-auto max-w-full py-1">
                  {practiceQuestion.sequence.map((num, idx) => {
                    const isBlank = idx === practiceQuestion.blankIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!isBlank && speakNumbers) playNumberVoice(num);
                        }}
                        className={`w-11 h-11 xs:w-13 xs:h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center font-mono font-extrabold text-sm xs:text-base sm:text-xl shadow-lg transition-all shrink-0 cursor-pointer ${
                          isBlank
                            ? 'bg-amber-400 text-slate-950 ring-2 sm:ring-4 ring-amber-300/40 animate-pulse text-base xs:text-lg sm:text-2xl cursor-default'
                            : 'bg-slate-900 border border-slate-700 text-white hover:border-emerald-400 active:scale-95'
                        }`}
                      >
                        {isBlank ? '?' : num}
                      </button>
                    );
                  })}
                </div>

                {/* Geri Bildirim Mesajı */}
                {practiceFeedback && (
                  <div
                    className={`py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 ${
                      practiceFeedback === 'correct'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {practiceFeedback === 'correct' ? '🎉 Harika! Doğru cevap!' : '❌ Tekrar dene, kuralı hatırla!'}
                  </div>
                )}

                {/* Şıklar */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                  {practiceQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!!practiceFeedback}
                      onClick={() => handleAnswerPractice(opt)}
                      className="py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 font-mono font-extrabold text-base sm:text-xl text-white transition-all shadow-md active:scale-95 cursor-pointer border border-slate-700 hover:border-emerald-400"
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={generateNewPracticeQuestion}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 mx-auto transition active:scale-95 cursor-pointer"
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
