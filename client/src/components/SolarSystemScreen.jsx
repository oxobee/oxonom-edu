import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX,
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft,
  X, Maximize2, Minimize2, PenTool, Eraser, Trash2,
  Trophy, Star, Award, Zap, HelpCircle, Eye, EyeOff,
  Compass, Globe, Sun, Moon, Info, Download, Minus,
  RefreshCw, Rocket, Flame, Radio, Move3d, Compass as CompassIcon,
  Layers, Search, ArrowLeft, Mic, ChevronUp, ChevronDown
} from 'lucide-react';
import { useModuleDock } from '../context/ModuleDockContext';

// Sentezleyici Ses Efektleri
function playSpaceBeep(freq = 440, duration = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
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

// Türkçe Sesli Anlatım Motoru (Web Speech API)
function speakPlanetVoice(body, onEndCallback) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // Mevcut seslendirmeyi durdur

    const speechText = `${body.name}. ${body.tagline}. ${body.funFact}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.92; // Çocuklar için sakin ve net tempo
    utterance.pitch = 1.05; // Samimi ve canlı tonlama

    if (onEndCallback) {
      utterance.onend = onEndCallback;
      utterance.onerror = onEndCallback;
    }

    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

function stopVoice() {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
}

// ==========================================
// 3D KÜRESEL DOKU ÜRETİCİLERİ (Canvas 2D)
// ==========================================
function generatePlanetCanvasTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (type === 'sun') {
    const grad = ctx.createRadialGradient(256, 128, 10, 256, 128, 256);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#fef08a');
    grad.addColorStop(0.55, '#f59e0b');
    grad.addColorStop(0.85, '#ea580c');
    grad.addColorStop(1, '#9a3412');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = Math.random() > 0.4 ? 'rgba(255, 240, 150, 0.4)' : 'rgba(154, 52, 18, 0.35)';
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = 2 + Math.random() * 12;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'merkur') {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = 2 + Math.random() * 9;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (type === 'venus') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.7, '#d97706');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(254, 243, 199, 0.25)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, Math.random() * 256, 60 + Math.random() * 100, 10 + Math.random() * 20, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'dunya') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1e40af');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(220, 110, 55, 65, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.ellipse(320, 95, 75, 50, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(100, 80, 45, 45, 0.2, 0, Math.PI * 2);
    ctx.ellipse(120, 165, 35, 55, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 24);
    ctx.fillRect(0, 235, 512, 21);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, 40 + Math.random() * 170, 40 + Math.random() * 60, 8 + Math.random() * 14, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'ay') {
    // Gerçekçi Ay Yüzeyi (Kraterler ve Koyu Ay Denizleri / Maria)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(71, 85, 105, 0.65)';
    // Ay Denizleri
    ctx.beginPath();
    ctx.ellipse(180, 100, 50, 40, 0.2, 0, Math.PI * 2);
    ctx.ellipse(280, 130, 60, 45, -0.1, 0, Math.PI * 2);
    ctx.ellipse(340, 85, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // Kraterler
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = 2 + Math.random() * 8;
      ctx.fillStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (type === 'mars') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#c2410c');
    grad.addColorStop(0.5, '#ea580c');
    grad.addColorStop(1, '#9a3412');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = 'rgba(67, 20, 7, 0.5)';
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, Math.random() * 256, 30 + Math.random() * 45, 12 + Math.random() * 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 242, 512, 14);
  } else if (type === 'jupiter') {
    const bands = ['#fed7aa', '#ea580c', '#fef3c7', '#c2410c', '#ffedd5', '#9a3412', '#fed7aa', '#ea580c'];
    bands.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, idx * 32, 512, 32);
    });

    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.ellipse(320, 165, 38, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (type === 'saturn') {
    const bands = ['#fef08a', '#fde047', '#eab308', '#ca8a04', '#fef9c3', '#d97706'];
    bands.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, idx * 43, 512, 43);
    });
  } else if (type === 'uranus') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#a5f3fc');
    grad.addColorStop(0.5, '#67e8f9');
    grad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(0, 20 + i * 30, 512, 8);
    }
  } else if (type === 'neptun') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1d4ed8');
    grad.addColorStop(0.5, '#2563eb');
    grad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.ellipse(260, 120, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(0, 40 + i * 22, 512, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function generateSaturnRingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.1, 'rgba(234, 179, 8, 0.4)');
  grad.addColorStop(0.3, 'rgba(254, 240, 138, 0.9)');
  grad.addColorStop(0.55, 'rgba(202, 138, 4, 0.8)');
  grad.addColorStop(0.68, 'rgba(0, 0, 0, 0.05)'); // Cassini Bölümü (Boşluk)
  grad.addColorStop(0.72, 'rgba(234, 179, 8, 0.7)');
  grad.addColorStop(0.92, 'rgba(254, 240, 138, 0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 64);

  return new THREE.CanvasTexture(canvas);
}

// ==========================================
// TÜM GÖK CİSİMLERİ (GÜNEŞ + 8 GEZEGEN + AY)
// ==========================================
const CELESTIAL_BODIES = [
  {
    id: 'gunes',
    name: 'Güneş',
    tagline: 'Sistemimizin Parlayan Yıldızı',
    type: 'Yıldız',
    radius3D: 12,
    orbitDist: 0,
    orbitSpeed: 0,
    rotationSpeed: 0.002,
    distanceFromSun: '0 km (Merkez)',
    diameter: '1.392.700 km (Dünya\'nın 109 katı)',
    dayLength: '27 Dünya günü (ekvator)',
    yearLength: '230 Milyon yıl (Galaksi turu)',
    temperature: '+5.500°C (Yüzey), 15 Milyon°C (Çekirdek)',
    moons: 8, // 8 ana gezegen
    funFact: 'Güneş o kadar büyüktür ki içerisine tam 1.300.000 adet Dünya sığabilir! Güneş Sistemi\'nin toplam kütlesinin %99.8\'ini tek başına oluşturur.',
    imageEmoji: '☀️',
    badgeColor: 'bg-amber-500 text-slate-950 font-bold'
  },
  {
    id: 'merkur',
    name: 'Merkür',
    tagline: 'Güneş\'e En Yakın Gezegen',
    type: 'Karasal Gezegen',
    radius3D: 2.2,
    orbitDist: 34,
    orbitSpeed: 0.009, // Sakin, pedagojik hız
    rotationSpeed: 0.004,
    distanceFromSun: '57.9 Milyon km',
    diameter: '4.879 km',
    dayLength: '59 Dünya günü',
    yearLength: '88 Dünya günü',
    temperature: '-180°C ile +430°C',
    moons: 0,
    funFact: 'Merkür\'ün atmosferi neredeyse yoktur. Güneş\'i gören tarafı fırın gibi kavrulurken, arkası uzayın dondurucu soğuğundadır.',
    imageEmoji: '🪨',
    badgeColor: 'bg-slate-700 text-slate-200'
  },
  {
    id: 'venus',
    name: 'Venüs',
    tagline: 'Güneş Sistemi\'nin En Sıcak Gezegeni',
    type: 'Karasal Gezegen',
    radius3D: 3.4,
    orbitDist: 48,
    orbitSpeed: 0.007,
    rotationSpeed: -0.002, // Ters dönüş!
    distanceFromSun: '108.2 Milyon km',
    diameter: '12.104 km',
    dayLength: '243 Dünya günü',
    yearLength: '225 Dünya günü',
    temperature: '+465°C',
    moons: 0,
    funFact: 'Venüs diğer gezegenlerin tersi yönde döner. Gökyüzünde çok parlak parıldadığı için halk arasında "Çoban Yıldızı" olarak bilinir.',
    imageEmoji: '🟡',
    badgeColor: 'bg-amber-600 text-amber-100'
  },
  {
    id: 'dunya',
    name: 'Dünya',
    tagline: 'Mavi Gezegenimiz & Yaşam Yuvası',
    type: 'Karasal Gezegen',
    radius3D: 3.8,
    orbitDist: 66,
    orbitSpeed: 0.0055,
    rotationSpeed: 0.012,
    axialTilt: 23.5 * (Math.PI / 180),
    distanceFromSun: '149.6 Milyon km (1 AB)',
    diameter: '12.742 km',
    dayLength: '24 saat (1 Gün)',
    yearLength: '365 gün 6 saat (1 Yıl)',
    temperature: '+15°C (ortalama)',
    moons: 1, // Ay
    funFact: 'Üzerinde sıvı su ve bildiğimiz canlı yaşamı olan tek gezegendir. Yüzeyinin %71\'i okyanuslarla kaplıdır.',
    imageEmoji: '🌍',
    badgeColor: 'bg-blue-600 text-blue-100'
  },
  {
    id: 'ay',
    name: 'Ay',
    tagline: 'Dünya\'mızın Tek Doğal Uydusu',
    type: 'Doğal Uydu',
    radius3D: 1.4,
    orbitDist: 66, // Dünya ile birlikte hareket eder
    orbitSpeed: 0.0055,
    rotationSpeed: 0.01,
    distanceFromSun: '149.6 Milyon km (Dünya\'ya: 384.400 km)',
    diameter: '3.474 km',
    dayLength: '27.3 Dünya günü',
    yearLength: '29.5 gün (Evre döngüsü)',
    temperature: '-130°C ile +120°C',
    moons: 0,
    funFact: 'Ay kendi ışığını üretmez, Güneş\'ten aldığı ışığı yansıtır. Dünya etrafındaki turunu yaklaşık 29 günde tamamlayarak 4 ana evresini oluşturur.',
    imageEmoji: '🌕',
    badgeColor: 'bg-slate-500 text-white'
  },
  {
    id: 'mars',
    name: 'Mars',
    tagline: 'Kızıl Gezegen',
    type: 'Karasal Gezegen',
    radius3D: 2.7,
    orbitDist: 86,
    orbitSpeed: 0.0042,
    rotationSpeed: 0.011,
    axialTilt: 25.2 * (Math.PI / 180),
    distanceFromSun: '227.9 Milyon km',
    diameter: '6.779 km',
    dayLength: '24 saat 37 dakika',
    yearLength: '687 Dünya günü',
    temperature: '-63°C (ortalama)',
    moons: 2, // Phobos & Deimos
    funFact: 'Toprağındaki pas (demir oksit) nedeniyle kızıl renkte görünür. Güneş Sistemi\'nin en yüksek yanardağı Olympus Mons buradadır.',
    imageEmoji: '🔴',
    badgeColor: 'bg-rose-700 text-rose-100'
  },
  {
    id: 'jupiter',
    name: 'Jüpiter',
    tagline: 'Gezegenlerin Devi',
    type: 'Gaz Devi',
    radius3D: 8.6,
    orbitDist: 140,
    orbitSpeed: 0.0028,
    rotationSpeed: 0.02,
    distanceFromSun: '778.5 Milyon km',
    diameter: '139.820 km',
    dayLength: '9 saat 55 dakika',
    yearLength: '12 Dünya yılı',
    temperature: '-110°C',
    moons: 95,
    funFact: 'Güneş Sistemi\'ndeki diğer tüm gezegenlerin toplamından daha büyüktür! Üzerindeki "Büyük Kırmızı Leke" asırlardır süren dev bir fırtınadır.',
    imageEmoji: '🟠',
    badgeColor: 'bg-orange-600 text-orange-100'
  },
  {
    id: 'saturn',
    name: 'Satürn',
    tagline: 'Halkaların Efendisi',
    type: 'Gaz Devi',
    radius3D: 7.2,
    orbitDist: 185,
    orbitSpeed: 0.002,
    rotationSpeed: 0.018,
    axialTilt: 26.7 * (Math.PI / 180),
    hasRings: true,
    distanceFromSun: '1.43 Milyar km',
    diameter: '116.460 km',
    dayLength: '10 saat 33 dakika',
    yearLength: '29.5 Dünya yılı',
    temperature: '-140°C',
    moons: 146,
    funFact: 'Muazzam buz ve kaya halkaları vardır. Yoğunluğu sudan hafif olan tek gezegendir (devasa bir havuza konsa yüzerdi!).',
    imageEmoji: '🪐',
    badgeColor: 'bg-yellow-600 text-yellow-100'
  },
  {
    id: 'uranus',
    name: 'Uranüs',
    tagline: 'Yan Yatan Buz Devi',
    type: 'Buz Devi',
    radius3D: 5.2,
    orbitDist: 230,
    orbitSpeed: 0.0015,
    rotationSpeed: 0.012,
    axialTilt: 97.8 * (Math.PI / 180),
    distanceFromSun: '2.87 Milyar km',
    diameter: '50.724 km',
    dayLength: '17 saat 14 dakika',
    yearLength: '84 Dünya yılı',
    temperature: '-195°C',
    moons: 28,
    funFact: 'Dönme ekseni 98° eğiktir; adeta yan yatmış bir fıçı gibi yuvarlanarak Güneş etrafında dolanır.',
    imageEmoji: '🌐',
    badgeColor: 'bg-cyan-600 text-cyan-100'
  },
  {
    id: 'neptun',
    name: 'Neptün',
    tagline: 'En Uzak ve En Fırtınalı Gezegen',
    type: 'Buz Devi',
    radius3D: 5.0,
    orbitDist: 275,
    orbitSpeed: 0.0011,
    rotationSpeed: 0.012,
    distanceFromSun: '4.5 Milyar km',
    diameter: '49.244 km',
    dayLength: '16 saat 6 dakika',
    yearLength: '165 Dünya yılı',
    temperature: '-200°C',
    moons: 16,
    funFact: 'Güneş Sistemi\'nin en güçlü fırtınalarına sahiptir (saatte 2.000 km hız!). Güneş etrafında 1 turu tam 165 yıl sürer.',
    imageEmoji: '🔵',
    badgeColor: 'bg-blue-700 text-blue-100'
  }
];

// Ayın Evreleri Verisi (Tab 2)
const MOON_PHASES = [
  { id: 'yeni-ay', name: 'Yeni Ay', desc: 'Ay, Dünya ile Güneş arasındadır. Karanlık yüzü Dünya\'ya bakar, gökyüzünde görünmez.', icon: '🌑' },
  { id: 'ilk-dordun', name: 'İlk Dördün', desc: 'Yeni Ay\'dan 1 hafta sonra oluşur. Ay\'ın sağ yarısı "D" harfi şeklinde aydınlıktır.', icon: '🌓' },
  { id: 'dolunay', name: 'Dolunay', desc: 'Ay\'ın Dünya\'ya bakan tüm yüzü Güneş ışığıyla parlar. Tam daire şeklindedir.', icon: '🌕' },
  { id: 'son-dordun', name: 'Son Dördün', desc: 'Dolunay\'dan 1 hafta sonra oluşur. Ay\'ın sol yarısı ters "D" harfi şeklinde aydınlıktır.', icon: '🌗' }
];

// 4 Mevsim Verisi (Tab 2)
const SEASONS = [
  { id: 'ilkbahar', date: '21 Mart (Ekinoks)', name: 'İlkbahar', icon: '🌸', desc: 'Gece ve gündüz süreleri eşittir (12 saat). Havalar ısınmaya başlar, doğa uyanır.' },
  { id: 'yaz', date: '21 Haziran (Gündönümü)', name: 'Yaz', icon: '☀️', desc: 'Kuzey Yarımküre\'de en uzun gündüz yaşanır. Güneş ışınları dik açıyla gelir, en sıcak mevsimdir.' },
  { id: 'sonbahar', date: '23 Eylül (Ekinoks)', name: 'Sonbahar', icon: '🍂', desc: 'Gece ve gündüz yine eşittir. Güneş ışınlarının eğimi artar, yapraklar dökülür.' },
  { id: 'kis', date: '21 Aralık (Gündönümü)', name: 'Kış', icon: '❄️', desc: 'Kuzey Yarımküre\'de en uzun gece yaşanır. Güneş ışınları en eğik açıyla gelir, en soğuk mevsimdir.' }
];

export default function SolarSystemScreen({ isOpen = true, onClose, onAddToCanvas }) {
  // Aktif Sekme: 'orbits' (3D Yörünge & Gezegenler) | 'seasons' (Mevsimler & Ay) | 'quiz' (Uzay Bilgi Oyunu)
  const [activeTab, setActiveTab] = useState('orbits');

  // Pencere Durumu
  const [windowState, setWindowState] = useState('normal');

  // Simülasyon Durumları
  const [isPlaying, setIsPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1); // 0.5x, 1x, 2x, 4x
  const [selectedBodyId, setSelectedBodyId] = useState('dunya');
  const [openedLabelId, setOpenedLabelId] = useState('dunya');
  const [cameraMode, setCameraMode] = useState('system'); // 'system' | 'top' | 'focus'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  // Ay Evresi & Mevsim Seçimi (Tab 2)
  const [activeSeasonId, setActiveSeasonId] = useState('yaz');
  const [activeMoonPhaseId, setActiveMoonPhaseId] = useState('dolunay');

  // Quiz / Yarışma Modu (Tab 3)
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
  const drawingCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  // 3D Three.js Sahne Referansları
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const bodyMeshesRef = useRef({});
  const orbitRingsRef = useRef({});
  const moonMeshRef = useRef(null);
  const sunMeshRef = useRef(null);
  const sunCoronaRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // DOM Etiket Referansları (60fps senkronizasyon için)
  const labelDomsRef = useRef({});
  const lastClickTimeRef = useRef(0);
  const lastClickedBodyIdRef = useRef(null);

  // Seçili Gök Cismi
  const selectedBody = useMemo(() => {
    return CELESTIAL_BODIES.find(b => b.id === selectedBodyId) || CELESTIAL_BODIES[3];
  }, [selectedBodyId]);

  // ==========================================
  // MODÜL DOCK ENTEGRASYONU
  // ==========================================
  const { registerModule, unregisterModule } = useModuleDock();

  const dockBadgeText = useMemo(() => {
    if (activeTab === 'orbits') {
      return `3D Keşif: ${selectedBody.name} • ${selectedBody.temperature}`;
    }
    if (activeTab === 'seasons') {
      return `Mevsim: ${SEASONS.find(s => s.id === activeSeasonId)?.name || 'Dünya'}`;
    }
    return `Uzay Kâşifi • ${quizScore} Puan`;
  }, [activeTab, selectedBody, activeSeasonId, quizScore]);

  useEffect(() => {
    if (!isOpen) {
      unregisterModule('gunes-sistemi-atolyesi');
      stopVoice();
      return;
    }

    registerModule({
      id: 'gunes-sistemi-atolyesi',
      title: 'Güneş Sistemi & Gezegenler Keşif Atölyesi (3D)',
      shortTitle: 'Güneş Sistemi (3D)',
      icon: '🪐',
      gradient: 'bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-700 text-white',
      badge: dockBadgeText,
      isMinimized: windowState === 'minimized',
      onRestore: () => setWindowState('normal'),
      onClose: () => {
        stopVoice();
        if (onClose) onClose();
      }
    });
  }, [isOpen, windowState, dockBadgeText, onClose, registerModule, unregisterModule]);

  useEffect(() => {
    return () => {
      unregisterModule('gunes-sistemi-atolyesi');
      stopVoice();
    };
  }, [unregisterModule]);

  // ==========================================
  // 3D THREE.JS WEBGL SAHNE KURULUMU
  // ==========================================
  useEffect(() => {
    if (!mountRef.current || activeTab !== 'orbits') return;

    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Sahne (Scene)
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Kamera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 3500);
    camera.position.set(0, 150, 230);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Kontrolleri
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 650;
    controls.maxPolarAngle = Math.PI * 0.88;
    controlsRef.current = controls;

    // 5. Işıklar
    const ambientLight = new THREE.AmbientLight(0x384152, 0.45);
    scene.add(ambientLight);

    const sunPointLight = new THREE.PointLight(0xfffaed, 4.8, 1400, 0.3);
    sunPointLight.position.set(0, 0, 0);
    scene.add(sunPointLight);

    // 6. 3D Yıldız Alanı
    const starsCount = 1500;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const r = 550 + Math.random() * 850;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const colRand = Math.random();
      if (colRand > 0.7) {
        starColors[i * 3] = 0.75; starColors[i * 3 + 1] = 0.88; starColors[i * 3 + 2] = 1.0;
      } else if (colRand > 0.4) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 0.75;
      } else {
        starColors[i * 3] = 0.95; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 0.98;
      }
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, opacity: 0.85 });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // 7. GÜNEŞ (Merkez)
    const sunTex = generatePlanetCanvasTexture('sun');
    const sunGeom = new THREE.SphereGeometry(12, 36, 36);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.userData = { bodyId: 'gunes' };
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    const coronaGeom = new THREE.SphereGeometry(15, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const sunCorona = new THREE.Mesh(coronaGeom, coronaMat);
    scene.add(sunCorona);
    sunCoronaRef.current = sunCorona;

    // 8. ASTEROİT KUŞAĞI
    const asteroidCount = 450;
    const asteroidGeom = new THREE.BufferGeometry();
    const asteroidPos = new Float32Array(asteroidCount * 3);
    for (let i = 0; i < asteroidCount; i++) {
      const dist = 105 + Math.random() * 22;
      const ang = Math.random() * Math.PI * 2;
      asteroidPos[i * 3] = Math.cos(ang) * dist;
      asteroidPos[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      asteroidPos[i * 3 + 2] = Math.sin(ang) * dist;
    }
    asteroidGeom.setAttribute('position', new THREE.BufferAttribute(asteroidPos, 3));
    const asteroidMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.4, transparent: true, opacity: 0.65 });
    const asteroidMesh = new THREE.Points(asteroidGeom, asteroidMat);
    scene.add(asteroidMesh);

    // 9. GEZEGENLER VE AY
    const meshes = { gunes: sunMesh };
    const rings = {};

    CELESTIAL_BODIES.forEach((body) => {
      if (body.id === 'gunes' || body.id === 'ay') return;

      // Yörünge Çizgisi
      const orbitPoints = [];
      const segments = 120;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(Math.cos(theta) * body.orbitDist, 0, Math.sin(theta) * body.orbitDist));
      }
      const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({
        color: body.id === selectedBodyId ? 0x06b6d4 : 0x334155,
        transparent: true,
        opacity: body.id === selectedBodyId ? 0.9 : 0.35
      });
      const orbitLine = new THREE.Line(orbitGeom, orbitMat);
      scene.add(orbitLine);
      rings[body.id] = orbitLine;

      // Gezegen Küresi
      const tex = generatePlanetCanvasTexture(body.id);
      const geom = new THREE.SphereGeometry(body.radius3D, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.7,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geom, mat);

      if (body.axialTilt) {
        mesh.rotation.z = body.axialTilt;
      }

      const initialAngle = Math.random() * Math.PI * 2;
      mesh.position.set(
        Math.cos(initialAngle) * body.orbitDist,
        0,
        Math.sin(initialAngle) * body.orbitDist
      );
      mesh.userData = {
        bodyId: body.id,
        currentAngle: initialAngle,
        orbitDist: body.orbitDist,
        orbitSpeed: body.orbitSpeed,
        rotationSpeed: body.rotationSpeed
      };

      scene.add(mesh);
      meshes[body.id] = mesh;

      // SATÜRN HALKASI
      if (body.hasRings) {
        const ringGeom = new THREE.RingGeometry(8.5, 15.5, 64);
        const ringTex = generateSaturnRingTexture();
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
          roughness: 0.5
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        mesh.add(ringMesh);
      }
    });

    // DÜNYA'NIN AY'I (MOON) - Ayrı tıklanabilir 3D varlık
    const moonTex = generatePlanetCanvasTexture('ay');
    const moonGeom = new THREE.SphereGeometry(1.4, 24, 24);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.85 });
    const moonMesh = new THREE.Mesh(moonGeom, moonMat);
    moonMesh.userData = {
      bodyId: 'ay',
      angle: 0
    };
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;
    meshes['ay'] = moonMesh;

    // Ay Yörünge İzi Çemberi (Dünya etrafındaki mini yörünge)
    const moonOrbitPts = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      moonOrbitPts.push(new THREE.Vector3(Math.cos(theta) * 7.5, 0, Math.sin(theta) * 7.5));
    }
    const moonOrbitGeom = new THREE.BufferGeometry().setFromPoints(moonOrbitPts);
    const moonOrbitMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35 });
    const moonOrbitLine = new THREE.Line(moonOrbitGeom, moonOrbitMat);
    if (meshes['dunya']) {
      meshes['dunya'].add(moonOrbitLine);
    }

    bodyMeshesRef.current = meshes;
    orbitRingsRef.current = rings;

    // 10. TIKLAMA / ÇİFT TIKLAMA İŞLEYİCİSİ (1 Tık: İsim Aç, 2 Tık: Yaklaş & Sesli Anlat)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerAction = (e) => {
      if (isDrawingMode) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const clickableList = Object.values(meshes);
      const intersects = raycaster.intersectObjects(clickableList, true);

      if (intersects.length > 0) {
        let hitMesh = intersects[0].object;
        while (hitMesh && !hitMesh.userData?.bodyId && hitMesh.parent) {
          hitMesh = hitMesh.parent;
        }

        const bodyId = hitMesh?.userData?.bodyId;
        if (!bodyId) return;

        const now = Date.now();
        const timeDiff = now - lastClickTimeRef.current;
        const isDouble = timeDiff < 350 && lastClickedBodyIdRef.current === bodyId;

        lastClickTimeRef.current = now;
        lastClickedBodyIdRef.current = bodyId;

        if (isDouble) {
          // ÇİFT TIK: Gezegene Uç ve Özelliğini Sesli Söyle!
          handleDoubleClickBody(bodyId);
        } else {
          // TEK TIK: İsmini Aç ve Seç
          handleSingleClickBody(bodyId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerup', handlePointerAction);

    // 11. YENİDEN BOYUTLANDIRMA
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('pointerup', handlePointerAction);
        container.innerHTML = '';
      }
      renderer.dispose();
      stopVoice();
    };
  }, [activeTab]);

  // ==========================================
  // YÖRÜNGE RENGİ GÜNCELLEMESİ
  // ==========================================
  useEffect(() => {
    Object.entries(orbitRingsRef.current).forEach(([pid, ring]) => {
      if (ring && ring.material) {
        const isSel = pid === selectedBodyId;
        ring.material.color.setHex(isSel ? 0x06b6d4 : 0x334155);
        ring.material.opacity = isSel ? 0.95 : 0.35;
      }
    });
  }, [selectedBodyId]);

  // ==========================================
  // 60FPS THREE.JS ANİMASYON DÖNGÜSÜ & DOM SENKRONİZASYONU
  // ==========================================
  useEffect(() => {
    if (activeTab !== 'orbits') return;

    let clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Güneş Korona Halesi Titreşimi
      if (sunMeshRef.current) {
        sunMeshRef.current.rotation.y += 0.001;
      }
      if (sunCoronaRef.current) {
        const s = 1 + Math.sin(elapsedTime * 1.8) * 0.025;
        sunCoronaRef.current.scale.set(s, s, s);
      }

      // Gezegen Yörünge Hareketi & Dönüşü
      Object.entries(bodyMeshesRef.current).forEach(([id, mesh]) => {
        if (!mesh || id === 'gunes' || id === 'ay') return;

        if (isPlaying && mesh.userData) {
          // Sakin ve anlaşılır yörünge hızı
          mesh.userData.currentAngle += mesh.userData.orbitSpeed * 0.45 * simSpeed * delta * 60;
          mesh.position.x = Math.cos(mesh.userData.currentAngle) * mesh.userData.orbitDist;
          mesh.position.z = Math.sin(mesh.userData.currentAngle) * mesh.userData.orbitDist;
        }
        mesh.rotation.y += (mesh.userData?.rotationSpeed || 0.01) * delta * 60;
      });

      // Dünya'nın Ay'ının 3D Hareketi
      const earthMesh = bodyMeshesRef.current['dunya'];
      const moonMesh = bodyMeshesRef.current['ay'];
      if (earthMesh && moonMesh) {
        if (isPlaying) {
          moonMesh.userData.angle += 0.015 * simSpeed * delta * 60;
        }
        const mAngle = moonMesh.userData.angle;
        moonMesh.position.x = earthMesh.position.x + Math.cos(mAngle) * 7.5;
        moonMesh.position.y = earthMesh.position.y + Math.sin(mAngle * 0.7) * 1.5;
        moonMesh.position.z = earthMesh.position.z + Math.sin(mAngle) * 7.5;
        moonMesh.rotation.y += 0.008 * delta * 60;
      }

      // Kamera Modları (Gezegene Yumuşak Odaklanma / Kuşbakışı / Sistem)
      const targetMesh = bodyMeshesRef.current[selectedBodyId];
      if (controlsRef.current && cameraRef.current) {
        if (cameraMode === 'focus' && targetMesh) {
          const targetPos = targetMesh.position.clone();
          controlsRef.current.target.lerp(targetPos, 0.06);

          const bodyRadius = targetMesh.geometry?.parameters?.radius || (selectedBodyId === 'ay' ? 1.5 : 4);
          const desiredCamPos = targetPos.clone().add(new THREE.Vector3(bodyRadius * 2.8, bodyRadius * 1.6, bodyRadius * 2.8));
          cameraRef.current.position.lerp(desiredCamPos, 0.045);
        } else if (cameraMode === 'top') {
          controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
          cameraRef.current.position.lerp(new THREE.Vector3(0, 380, 0.1), 0.05);
        } else {
          controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.04);
        }
        controlsRef.current.update();
      }

      // ========================================================
      // 60FPS DOM ETİKET SENKRONİZASYONU (Sıfır Gecikme & Kesin Takip)
      // ========================================================
      if (cameraRef.current && mountRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        const v = new THREE.Vector3();

        CELESTIAL_BODIES.forEach((body) => {
          const m = bodyMeshesRef.current[body.id];
          const dom = labelDomsRef.current[body.id];
          if (!m || !dom) return;

          m.getWorldPosition(v);
          v.project(cameraRef.current);

          if (v.z < 1) {
            const x = (v.x * 0.5 + 0.5) * width;
            const y = (-(v.y * 0.5) + 0.5) * height;

            // Direct transform - React re-render olmadan doğrudan GPU hızlandırmalı
            dom.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;

            // Seçili veya ismi açılmışsa görünür yap
            const isVisible = openedLabelId === body.id || selectedBodyId === body.id;
            dom.style.display = isVisible ? 'flex' : 'none';
          } else {
            dom.style.display = 'none';
          }
        });
      }

      // Sahneyi Çiz
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeTab, isPlaying, simSpeed, selectedBodyId, cameraMode, openedLabelId]);

  // Tek Tık: İsmi aç ve gezegeni seç
  const handleSingleClickBody = (id) => {
    setSelectedBodyId(id);
    setOpenedLabelId(id);
    if (soundEnabled) playSpaceBeep(380, 0.1);
  };

  // Çift Tık: Yakınlaş ve Sesli Olarak Özelliğini Söyle!
  const handleDoubleClickBody = (id) => {
    setSelectedBodyId(id);
    setOpenedLabelId(id);
    setCameraMode('focus');
    setIsSpeaking(true);

    const bodyObj = CELESTIAL_BODIES.find(b => b.id === id);
    if (bodyObj) {
      if (soundEnabled) playSuccessChime();
      speakPlanetVoice(bodyObj, () => {
        setIsSpeaking(false);
      });
    }
  };

  // Sesli Anlatımı Manuel Başlat / Durdur
  const toggleVoiceNarration = () => {
    if (isSpeaking) {
      stopVoice();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakPlanetVoice(selectedBody, () => {
        setIsSpeaking(false);
      });
    }
  };

  // Kamera Modunu Değiştir
  const handleSwitchCameraMode = (mode) => {
    setCameraMode(mode);
    if (soundEnabled) playSpaceBeep(480, 0.1);
  };

  // ==========================================
  // ÇİZİM KATMANI İŞLEVLERİ
  // ==========================================
  const handlePointerDown = (e) => {
    if (!isDrawingMode) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    lastPointRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerMove = (e) => {
    if (!isDrawingMode || !isDrawingRef.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = penSize * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.stroke();
    lastPointRef.current = currentPoint;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearDrawingCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        question: 'Dünya\'mızın tek doğal uydusu olan gök cismi hangisidir?',
        correct: 'Ay',
        options: ['Mars', 'Ay', 'Güneş', 'Venüs']
      },
      {
        question: 'Göz alıcı buz ve kaya halkalarıyla meşhur olan gezegen hangisidir?',
        correct: 'Satürn',
        options: ['Satürn', 'Uranüs', 'Neptün', 'Mars']
      },
      {
        question: 'Güneş\'e en yakın olan ilk gezegen hangisidir?',
        correct: 'Merkür',
        options: ['Venüs', 'Merkür', 'Dünya', 'Mars']
      },
      {
        question: 'Hangi gezegen "Kızıl Gezegen" olarak da adlandırılır?',
        correct: 'Mars',
        options: ['Mars', 'Venüs', 'Jüpiter', 'Merkür']
      },
      {
        question: 'Üzerinde sıvı su ve canlı yaşamı olduğu kanıtlanan tek gezegen hangisidir?',
        correct: 'Dünya',
        options: ['Mars', 'Ay', 'Dünya', 'Venüs']
      },
      {
        question: 'Dönme ekseni 98 derece eğik olup adeta yan yatarak yuvarlanan gezegen hangisidir?',
        correct: 'Uranüs',
        options: ['Uranüs', 'Neptün', 'Satürn', 'Venüs']
      },
      {
        question: 'Güneş Sistemi\'nin en sıcak ve Çoban Yıldızı olarak da bilinen gezegeni hangisidir?',
        correct: 'Venüs',
        options: ['Merkür', 'Venüs', 'Mars', 'Güneş']
      },
      {
        question: 'Ay gökyüzünde "D" harfi şeklinde göründüğünde hangi ana evresindedir?',
        correct: 'İlk Dördün',
        options: ['Yeni Ay', 'İlk Dördün', 'Dolunay', 'Son Dördün']
      }
    ];

    const randomIndex = Math.floor(Math.random() * questionsPool.length);
    setQuizQuestion(questionsPool[randomIndex]);
  };

  useEffect(() => {
    if (activeTab === 'quiz' && !quizQuestion) {
      generateQuizQuestion();
    }
  }, [activeTab]);

  const handleAnswerQuiz = (selectedOption) => {
    if (!quizQuestion || quizFeedback) return;

    if (selectedOption === quizQuestion.correct) {
      setQuizFeedback('correct');
      setQuizScore(s => s + 10);
      setQuizStreak(st => st + 1);
      if (soundEnabled) playSuccessChime();

      setTimeout(() => {
        generateQuizQuestion();
      }, 1600);
    } else {
      setQuizFeedback('wrong');
      setQuizStreak(0);
      if (soundEnabled) playSpaceBeep(220, 0.25);
    }
  };

  if (!isOpen) return null;
  const isMinimized = windowState === 'minimized';
  const isMax = windowState === 'maximized';

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center p-1 sm:p-3 transition-all duration-300 ${
        isMinimized ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'
      }`}
    >
      {/* Arka Plan Perdesi */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
        onClick={() => setWindowState('minimized')}
      />

      {/* Ana 3D Modül Penceresi */}
      <motion.div
        layout
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`relative z-10 w-full bg-slate-950 border border-cyan-500/30 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 ${
          isMax
            ? 'h-[98vh] max-w-[98vw]'
            : 'h-[94vh] max-h-[940px] max-w-6xl'
        }`}
      >
        {/* ========================================================= */}
        {/* ÜST BAŞLIK & ARAÇ ÇUBUĞU                                   */}
        {/* ========================================================= */}
        <header className="shrink-0 bg-slate-900/95 border-b border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 z-30">
          {/* Sol: Modül Başlığı & Sekmeler */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-base sm:text-lg shadow-md shrink-0 ring-2 ring-cyan-400/20">
              🪐
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-xs sm:text-base tracking-tight text-white truncate">
                  Güneş Sistemi & Gezegenler
                </h2>
                <span className="hidden xs:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  3D Canlı
                </span>
              </div>

              {/* Sekme Seçici */}
              <div className="flex items-center gap-1 mt-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('orbits')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'orbits'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 3D Keşif
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('seasons')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'seasons'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Sun className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" /> Mevsimler & Ay
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'quiz'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Rocket className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Yarışma
                </button>
              </div>
            </div>
          </div>

          {/* Sağ: Araçlar & Pencere Butonları */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Ses Aç / Kapat */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !soundEnabled;
                setSoundEnabled(nextVal);
                if (!nextVal) stopVoice();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
            </button>

            {/* Çizim Katmanı */}
            <button
              type="button"
              onClick={() => setIsDrawingMode(v => !v)}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition cursor-pointer active:scale-95 ${
                isDrawingMode
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
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
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title="Simge Durumuna Küçült"
            >
              <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                onClick={() => {
                  stopVoice();
                  onClose();
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/20 text-red-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 ml-0.5"
                title="Kapat"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* ÇİZİM ARAÇ ÇUBUĞU                                         */}
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
        {/* 1. SEKME: 3D YÖRÜNGE SİMÜLASYONU & GEZEGEN LABORATUVARI    */}
        {/* ========================================================= */}
        {activeTab === 'orbits' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Sol Masaüstü / Alt Mobil: Bilgi ve Kontrol Paneli */}
            <div
              className={`w-full lg:w-84 bg-slate-900/95 border-t lg:border-t-0 lg:border-r border-slate-800 p-3 sm:p-4 flex flex-col justify-between shrink-0 overflow-y-auto z-20 transition-all ${
                mobileInfoOpen ? 'max-h-[50vh]' : 'max-h-[60px] lg:max-h-full'
              }`}
            >
              {/* Mobil Genişletme / Daraltma Başlığı */}
              <div className="lg:hidden flex items-center justify-between pb-1 cursor-pointer" onClick={() => setMobileInfoOpen(v => !v)}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedBody.imageEmoji}</span>
                  <span className="font-bold text-xs text-white">{selectedBody.name}</span>
                  <span className="text-[10px] text-cyan-400">({selectedBody.temperature})</span>
                </div>
                <button type="button" className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
                  <span>{mobileInfoOpen ? 'Kapat' : 'Detayları Gör'}</span>
                  {mobileInfoOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>

              <div className={`space-y-3 ${mobileInfoOpen ? 'block' : 'hidden lg:block'}`}>
                {/* 3D Kamera Bakış Açısı Butonları */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block flex items-center justify-between">
                    <span>3D Kamera Modu</span>
                    <span className="text-[9px] text-cyan-400">Sürükle & Yakınlaştır</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchCameraMode('system')}
                      className={`p-1.5 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 ${
                        cameraMode === 'system'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Move3d className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Serbest 3D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchCameraMode('top')}
                      className={`p-1.5 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 ${
                        cameraMode === 'top'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <CompassIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Kuşbakışı</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchCameraMode('focus')}
                      className={`p-1.5 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 ${
                        cameraMode === 'focus'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Gezegene Uç</span>
                    </button>
                  </div>
                </div>

                {/* Hızlı Gök Cismi Listesi (Güneş, 8 Gezegen ve Ay) */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block flex items-center justify-between">
                    <span>Gök Cisimleri</span>
                    <span className="text-[9px] text-amber-400 font-semibold">2 Tık = Sesli Anlatım 🔊</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {CELESTIAL_BODIES.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSingleClickBody(b.id)}
                        onDoubleClick={() => handleDoubleClickBody(b.id)}
                        className={`p-1 rounded-xl flex flex-col items-center gap-0.5 text-center transition cursor-pointer active:scale-95 ${
                          selectedBodyId === b.id
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md ring-2 ring-cyan-300/40'
                            : 'bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white'
                        }`}
                        title={`${b.name} - Çift tıkla sesli anlatım dinle`}
                      >
                        <span className="text-sm">{b.imageEmoji}</span>
                        <span className="text-[9px] leading-tight truncate w-full">{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seçili Gök Cisminin Detay Kartı */}
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-2xl shrink-0">{selectedBody.imageEmoji}</div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
                          <span className="truncate">{selectedBody.name}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/20 shrink-0">
                            {selectedBody.type}
                          </span>
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-cyan-400 font-medium truncate">{selectedBody.tagline}</p>
                      </div>
                    </div>

                    {/* Sesli Anlat Butonu */}
                    <button
                      type="button"
                      onClick={toggleVoiceNarration}
                      className={`p-2 rounded-xl transition cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 ${
                        isSpeaking
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30'
                      }`}
                      title={isSpeaking ? "Sesli Anlatımı Durdur" : "Sesli Anlatımı Dinle"}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold hidden sm:inline">{isSpeaking ? 'Durdur' : 'Dinle'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-[11px] pt-1.5 border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Güneş'e Mesafe:</span>
                      <span className="font-semibold text-slate-200">{selectedBody.distanceFromSun}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Ortalama Sıcaklık:</span>
                      <span className="font-semibold text-amber-400">{selectedBody.temperature}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">1 Gün:</span>
                      <span className="font-semibold text-slate-200">{selectedBody.dayLength}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">1 Yıl:</span>
                      <span className="font-semibold text-slate-200">{selectedBody.yearLength}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Çap:</span>
                      <span className="font-semibold text-slate-200">{selectedBody.diameter}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Doğal Uydu:</span>
                      <span className="font-semibold text-slate-200">{selectedBody.moons} Uydu</span>
                    </div>
                  </div>

                  {/* Biliyor muydunuz? */}
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[10px] sm:text-[11px] text-cyan-200 leading-relaxed">
                    <span className="font-bold text-cyan-300 block mb-0.5">💡 Çocuklar İçin İlginç Bilgi:</span>
                    {selectedBody.funFact}
                  </div>
                </div>
              </div>

              {/* Alt Kontroller: Oynat / Hız / Tahtaya Aktar */}
              <div className={`space-y-1.5 pt-2 border-t border-slate-800 mt-2 ${mobileInfoOpen ? 'block' : 'hidden lg:block'}`}>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(v => !v)}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-cyan-500 text-slate-950'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlaying ? 'Dondur' : 'Yörüngeyi Oynat'}</span>
                  </button>

                  {/* Hız Butonları (0.5x Ağır Çekim, 1x Doğal, 2x, 4x) */}
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                    {[0.5, 1, 2, 4].map(sp => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setSimSpeed(sp)}
                        className={`px-1.5 py-1 rounded-lg text-[9px] font-bold transition ${
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
                        title: `Güneş Sistemi - ${selectedBody.name}`,
                        text: `${selectedBody.name} (${selectedBody.type})\n${selectedBody.tagline}\n\n• Güneş'e Mesafe: ${selectedBody.distanceFromSun}\n• Ortalama Sıcaklık: ${selectedBody.temperature}\n• 1 Gün: ${selectedBody.dayLength}\n• 1 Yıl: ${selectedBody.yearLength}\n• Çap: ${selectedBody.diameter}\n• Uydu: ${selectedBody.moons}\n\nÖğrenci Notu: ${selectedBody.funFact}`,
                        fontSize: 22
                      });
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-cyan-500/20 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Gezegen Notunu Tahtaya Aktar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sağ: 3D Three.js Sahnesi ve 60FPS DOM Etiketleri */}
            <div className="flex-1 relative overflow-hidden bg-slate-950 select-none touch-none">
              {/* Three.js Canvas Taşıyıcı */}
              <div
                ref={mountRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
              />

              {/* 60FPS Doğrudan DOM Etiketleri (Gezegenleri 100% Gecikmesiz Takip Eder) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {CELESTIAL_BODIES.map(b => (
                  <div
                    key={b.id}
                    ref={el => { labelDomsRef.current[b.id] = el; }}
                    className="absolute pointer-events-auto items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-lg backdrop-blur-md cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    style={{
                      display: 'none',
                      backgroundColor: b.id === selectedBodyId ? '#06b6d4' : 'rgba(15, 23, 42, 0.85)',
                      color: b.id === selectedBodyId ? '#020617' : '#f8fafc',
                      border: b.id === selectedBodyId ? '2px solid #ffffff' : '1px solid rgba(148, 163, 184, 0.3)',
                      zIndex: b.id === selectedBodyId ? 30 : 20
                    }}
                    onClick={() => handleSingleClickBody(b.id)}
                    onDoubleClick={() => handleDoubleClickBody(b.id)}
                  >
                    <span className="text-xs">{b.imageEmoji}</span>
                    <span>{b.name}</span>
                    {b.id === selectedBodyId && isSpeaking && (
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping ml-0.5" />
                    )}
                  </div>
                ))}
              </div>

              {/* Çizim Katmanı (Aktifse Üste Biner) */}
              {isDrawingMode && (
                <canvas
                  ref={drawingCanvasRef}
                  width={1200}
                  height={800}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="absolute inset-0 w-full h-full z-30 touch-none cursor-crosshair pointer-events-auto"
                />
              )}

              {/* Kamera Yakınlaşma Bildirim Kartı & Geri Dön Butonu */}
              {cameraMode === 'focus' && (
                <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-white flex items-center gap-2 shadow-lg backdrop-blur-md">
                    <span className="text-base">{selectedBody.imageEmoji}</span>
                    <span className="font-bold text-cyan-300">{selectedBody.name}</span>
                    <span className="text-slate-400 hidden sm:inline">• Yakın 3D İnceleme</span>
                  </div>

                  {isSpeaking && (
                    <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-bold flex items-center gap-2 shadow-lg backdrop-blur-md animate-pulse">
                      <Mic className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                      <span>Sesli Anlatılıyor...</span>
                      <button
                        type="button"
                        onClick={toggleVoiceNarration}
                        className="underline hover:text-white ml-1 cursor-pointer"
                      >
                        Durdur
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSwitchCameraMode('system')}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Tüm Sisteme Dön</span>
                  </button>
                </div>
              )}

              {/* Masaüstü & Mobil İpucu */}
              <div className="absolute bottom-2 right-2 z-10 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[9px] sm:text-[10px] text-slate-400 backdrop-blur-md flex items-center gap-1.5 pointer-events-none">
                <span>🖱️ 1 Tık = İsim Aç</span>
                <span>•</span>
                <span className="text-cyan-300 font-bold">2 Tık = Gezegene Uç & Dinle 🔊</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SEKME: MEVSİMLER & AY'IN EVRELERİ (MEB 4-5. SINIF)      */}
        {/* ========================================================= */}
        {activeTab === 'seasons' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto p-4 sm:p-6 gap-6">
            {/* Sol: 4 Mevsim ve Eksen Eğikliği */}
            <div className="flex-1 bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🌍</span>
                  <h3 className="font-bold text-base text-white">
                    Dünya'nın Dolanması ve 4 Mevsim
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dünya, Güneş etrafında dolanırken ekseni <strong>23.5 derece (23° 27')</strong> eğiktir. Bu eğiklik nedeniyle Güneş ışınları yıl boyunca yeryüzüne farklı açılarla düşer ve 4 mevsim oluşur!
                </p>
              </div>

              {/* 4 Mevsim Kartları */}
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
                ⭐ <strong>Önemli Kural:</strong> Türkiye Kuzey Yarımküre'dedir. 21 Haziran'da bizde Yaz başlarken, Güney Yarımküre'de (örneğin Avustralya'da) Kış başlar!
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
                🔭 <strong>Pratik İpucu:</strong> Ay gökyüzünde "D" harfine benziyorsa <strong>İlk Dördün</strong>, ters "D" harfine benziyorsa <strong>Son Dördün</strong> evresindedir!
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SEKME: UZAY KÂŞİFİ BİLGİ YARIŞMASI                      */}
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
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 mx-auto transition cursor-pointer"
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
