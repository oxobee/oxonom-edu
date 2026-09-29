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
  Layers, Search, ArrowLeft
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

// ==========================================
// USULİ (PROCEDURAL) 3D DOKU ÜRETİCİLERİ
// ==========================================
function generatePlanetCanvasTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (type === 'sun') {
    const grad = ctx.createRadialGradient(256, 128, 10, 256, 128, 256);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#fef08a');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(0.85, '#ea580c');
    grad.addColorStop(1, '#9a3412');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Güneş lekeleri ve manyetik fırtına granülleri
    for (let i = 0; i < 60; i++) {
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
    // Koyu ve açık krater lekeleri
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = 2 + Math.random() * 9;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
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
    // Yoğun sülfürik asit ve sera bulut girdapları
    ctx.fillStyle = 'rgba(254, 243, 199, 0.25)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, Math.random() * 256, 60 + Math.random() * 100, 10 + Math.random() * 20, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'dunya') {
    // Derin mavi okyanuslar
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1e40af');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Kıtalar (Yeşil ve toprak tonları)
    ctx.fillStyle = '#15803d';
    // Afrika / Avrupa benzeri kıta kütlesi
    ctx.beginPath();
    ctx.ellipse(220, 110, 55, 65, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Asya kütlesi
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.ellipse(320, 95, 75, 50, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Amerika kıtaları
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(100, 80, 45, 45, 0.2, 0, Math.PI * 2);
    ctx.ellipse(120, 165, 35, 55, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Kutup buzulları (Kuzey & Güney)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 24);
    ctx.fillRect(0, 235, 512, 21);

    // Beyaz bulut helezonları
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, 40 + Math.random() * 170, 40 + Math.random() * 60, 8 + Math.random() * 14, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'moon') {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#475569';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, 3 + Math.random() * 15, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'mars') {
    // Kızıl gezegen pas tonları
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#c2410c');
    grad.addColorStop(0.5, '#ea580c');
    grad.addColorStop(1, '#9a3412');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Kanyon ve krater koyu bölgeleri (Syrtis Major vb.)
    ctx.fillStyle = 'rgba(67, 20, 7, 0.5)';
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, Math.random() * 256, 30 + Math.random() * 45, 12 + Math.random() * 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Beyaz kutup buzulları (CO2 buzu)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 242, 512, 14);
  } else if (type === 'jupiter') {
    // Alternatif gaz bantları (Krem, karamel, kahve)
    const bands = ['#fed7aa', '#ea580c', '#fef3c7', '#c2410c', '#ffedd5', '#9a3412', '#fed7aa', '#ea580c'];
    bands.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, idx * 32, 512, 32);
    });

    // Büyük Kırmızı Leke (Great Red Spot)
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.ellipse(320, 165, 38, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (type === 'saturn') {
    // Altın sarısı, kehribar bantlar
    const bands = ['#fef08a', '#fde047', '#eab308', '#ca8a04', '#fef9c3', '#d97706'];
    bands.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, idx * 43, 512, 43);
    });
  } else if (type === 'uranus') {
    // Açık turkuaz, nane mavisi buz devi
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#a5f3fc');
    grad.addColorStop(0.5, '#67e8f9');
    grad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    // İnce pastel bulut hatları
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(0, 20 + i * 30, 512, 8);
    }
  } else if (type === 'neptun') {
    // Derin kobalt mavisi
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1d4ed8');
    grad.addColorStop(0.5, '#2563eb');
    grad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Koyu fırtına lekesi (Great Dark Spot)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.ellipse(260, 120, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beyaz metan sirüs bulutları
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

// Satürn'ün Halkası İçin Şeffaf ve Bölmeli Doku
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

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ==========================================
// MEB MÜFREDATINA UYGUN 8 GEZEGEN VERİSİ
// ==========================================
const PLANETS = [
  {
    id: 'merkur',
    name: 'Merkür',
    tagline: 'Güneş\'e En Yakın Gezegen',
    type: 'Karasal Gezegen',
    colorHex: 0x94a3b8,
    radius3D: 2.2,
    orbitDist: 34,
    orbitSpeed: 0.038,
    rotationSpeed: 0.005,
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
    colorHex: 0xfbbf24,
    radius3D: 3.4,
    orbitDist: 48,
    orbitSpeed: 0.028,
    rotationSpeed: -0.003, // Ters dönüş!
    distanceFromSun: '108.2 Milyon km',
    diameter: '12.104 km',
    dayLength: '243 Dünya günü',
    yearLength: '225 Dünya günü',
    temperature: '+465°C',
    moons: 0,
    funFact: 'Venüs diğer gezegenlerin tersi yönde döner. Gökyüzünde parıldadığı için halk arasında "Çoban Yıldızı" olarak bilinir.',
    imageEmoji: '🟡',
    badgeColor: 'bg-amber-600 text-amber-100'
  },
  {
    id: 'dunya',
    name: 'Dünya',
    tagline: 'Mavi Gezegenimiz & Yaşam Yuvası',
    type: 'Karasal Gezegen',
    colorHex: 0x38bdf8,
    radius3D: 3.8,
    orbitDist: 66,
    orbitSpeed: 0.022,
    rotationSpeed: 0.02,
    axialTilt: 23.5 * (Math.PI / 180),
    distanceFromSun: '149.6 Milyon km (1 AB)',
    diameter: '12.742 km',
    dayLength: '24 saat (1 Gün)',
    yearLength: '365 gün 6 saat (1 Yıl)',
    temperature: '+15°C (ortalama)',
    moons: 1, // Ay
    funFact: 'Üzerinde sıvı su ve bildiğimiz canlı yaşamı olan tek gezegendir. Yüzeyinin %71\'i sularla kaplıdır.',
    imageEmoji: '🌍',
    badgeColor: 'bg-blue-600 text-blue-100'
  },
  {
    id: 'mars',
    name: 'Mars',
    tagline: 'Kızıl Gezegen',
    type: 'Karasal Gezegen',
    colorHex: 0xf87171,
    radius3D: 2.7,
    orbitDist: 85,
    orbitSpeed: 0.017,
    rotationSpeed: 0.018,
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
    colorHex: 0xf97316,
    radius3D: 8.6,
    orbitDist: 140,
    orbitSpeed: 0.011,
    rotationSpeed: 0.035, // Çok hızlı döner
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
    colorHex: 0xfde047,
    radius3D: 7.2,
    orbitDist: 185,
    orbitSpeed: 0.008,
    rotationSpeed: 0.03,
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
    colorHex: 0x22d3ee,
    radius3D: 5.2,
    orbitDist: 230,
    orbitSpeed: 0.006,
    rotationSpeed: 0.015,
    axialTilt: 97.8 * (Math.PI / 180), // Neredeyse yatay yuvarlanır!
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
    colorHex: 0x3b82f6,
    radius3D: 5.0,
    orbitDist: 275,
    orbitSpeed: 0.0045,
    rotationSpeed: 0.016,
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
  // Aktif Sekme: 'orbits' (3D Yörünge Simülasyonu) | 'seasons' (Mevsimler & Ay) | 'quiz' (Uzay Bilgi Oyunu)
  const [activeTab, setActiveTab] = useState('orbits');

  // Pencere Durumu
  const [windowState, setWindowState] = useState('normal');

  // Simülasyon Durumları
  const [isPlaying, setIsPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 4x, 8x
  const [selectedPlanetId, setSelectedPlanetId] = useState('dunya');
  const [cameraMode, setCameraMode] = useState('system'); // 'system' | 'top' | 'focus'

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
  const planetMeshesRef = useRef({});
  const orbitRingsRef = useRef({});
  const moonMeshRef = useRef(null);
  const sunMeshRef = useRef(null);
  const sunCoronaRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // 3D Ekran Etiketleri (Screen Projections)
  const [labels, setLabels] = useState([]);

  // Seçili Gezegen Nesnesi
  const selectedPlanet = useMemo(() => {
    return PLANETS.find(p => p.id === selectedPlanetId) || PLANETS[2];
  }, [selectedPlanetId]);

  // ==========================================
  // MODÜL DOCK ENTEGRASYONU
  // ==========================================
  const { registerModule, unregisterModule } = useModuleDock();

  const dockBadgeText = useMemo(() => {
    if (activeTab === 'orbits') {
      return `3D Keşif: ${selectedPlanet.name} • ${selectedPlanet.temperature}`;
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
      title: 'Güneş Sistemi & Gezegenler Keşif Atölyesi (3D)',
      shortTitle: 'Güneş Sistemi (3D)',
      icon: '🪐',
      gradient: 'bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-700 text-white',
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
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 3000);
    camera.position.set(0, 140, 220);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Kontrolleri (Kullanıcının 360° döndürebilmesi için)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI * 0.85; // Tam ters çevirmeyi yumuşatır
    controlsRef.current = controls;

    // 5. Işıklar (Güneş'ten Gelen Gerçekçi Gece-Gündüz Aydınlatması)
    // Ortam ışığı (Uzay dolgu ışığı - karanlık yüzeyi görebilmek için)
    const ambientLight = new THREE.AmbientLight(0x384152, 0.4);
    scene.add(ambientLight);

    // Güneş Işığı (Merkezden yayılan sıcak parlak nokta ışık)
    const sunPointLight = new THREE.PointLight(0xfffaed, 4.5, 1200, 0.3);
    sunPointLight.position.set(0, 0, 0);
    scene.add(sunPointLight);

    // 6. 3D Yıldız Alanı (Cosmic Starfield)
    const starsCount = 1400;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const r = 500 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      // Yıldız renkleri (Hafif mavi, sarı ve beyaz)
      const colRand = Math.random();
      if (colRand > 0.7) {
        starColors[i * 3] = 0.7; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 1.0;
      } else if (colRand > 0.4) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 0.7;
      } else {
        starColors[i * 3] = 0.9; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 0.95;
      }
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, opacity: 0.85 });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // 7. GÜNEŞ (Merkezi Parlayan Küre + Korona Halesi)
    const sunTex = generatePlanetCanvasTexture('sun');
    const sunGeom = new THREE.SphereGeometry(12, 36, 36);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // Güneş Korona Halesi (Glow atmosfer katmanı)
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

    // 8. ASTEROİT KUŞAĞI (Mars ile Jüpiter Arası Küçük Gezegenler Kuşağı)
    const asteroidCount = 450;
    const asteroidGeom = new THREE.BufferGeometry();
    const asteroidPos = new Float32Array(asteroidCount * 3);
    for (let i = 0; i < asteroidCount; i++) {
      const dist = 105 + Math.random() * 22; // Mars(85) ile Jüpiter(140) arası
      const ang = Math.random() * Math.PI * 2;
      asteroidPos[i * 3] = Math.cos(ang) * dist;
      asteroidPos[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      asteroidPos[i * 3 + 2] = Math.sin(ang) * dist;
    }
    asteroidGeom.setAttribute('position', new THREE.BufferAttribute(asteroidPos, 3));
    const asteroidMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.4, transparent: true, opacity: 0.65 });
    const asteroidMesh = new THREE.Points(asteroidGeom, asteroidMat);
    scene.add(asteroidMesh);

    // 9. 8 GEZEGEN VE YÖRÜNGELERİN OLUŞTURULMASI
    const meshes = {};
    const rings = {};

    PLANETS.forEach((planet) => {
      // Yörünge Çizgisi (3D Eliptik/Çembersel Yol)
      const orbitPoints = [];
      const segments = 120;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(Math.cos(theta) * planet.orbitDist, 0, Math.sin(theta) * planet.orbitDist));
      }
      const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({
        color: planet.id === selectedPlanetId ? 0x06b6d4 : 0x334155,
        transparent: true,
        opacity: planet.id === selectedPlanetId ? 0.9 : 0.4
      });
      const orbitLine = new THREE.Line(orbitGeom, orbitMat);
      scene.add(orbitLine);
      rings[planet.id] = orbitLine;

      // Gezegen Küresi
      const tex = generatePlanetCanvasTexture(planet.id);
      const geom = new THREE.SphereGeometry(planet.radius3D, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.7,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geom, mat);

      // Eksen Eğikliği (Axial Tilt)
      if (planet.axialTilt) {
        mesh.rotation.z = planet.axialTilt;
      }

      // Başlangıç pozisyonu
      const initialAngle = Math.random() * Math.PI * 2;
      mesh.position.set(
        Math.cos(initialAngle) * planet.orbitDist,
        0,
        Math.sin(initialAngle) * planet.orbitDist
      );
      mesh.userData = {
        planetId: planet.id,
        currentAngle: initialAngle,
        orbitDist: planet.orbitDist,
        orbitSpeed: planet.orbitSpeed,
        rotationSpeed: planet.rotationSpeed
      };

      scene.add(mesh);
      meshes[planet.id] = mesh;

      // DÜNYA İÇİN AY (MOON) EKLEME
      if (planet.id === 'dunya') {
        const moonTex = generatePlanetCanvasTexture('moon');
        const moonGeom = new THREE.SphereGeometry(1.0, 16, 16);
        const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.9 });
        const moonMesh = new THREE.Mesh(moonGeom, moonMat);
        moonMesh.userData = { angle: 0 };
        scene.add(moonMesh);
        moonMeshRef.current = moonMesh;
      }

      // SATÜRN İÇİN 3D HALKA SİSTEMİ EKLEME
      if (planet.hasRings) {
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
        ringMesh.rotation.x = Math.PI / 2; // Gezegen düzlemine yatır
        mesh.add(ringMesh);
      }
    });

    planetMeshesRef.current = meshes;
    orbitRingsRef.current = rings;

    // 10. TIKLAMA / DOKUNMA RAYCASTER (3D Gezegen Seçimi)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerClick = (e) => {
      // Çizim modu açıksa 3D tıklamayı pas geç
      if (isDrawingMode) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const planetList = Object.values(meshes);
      const intersects = raycaster.intersectObjects(planetList);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData && hit.userData.planetId) {
          handleSelectPlanet(hit.userData.planetId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerup', handlePointerClick);

    // 11. YENİDEN BOYUTLANDIRMA (Responsive ResizeObserver)
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    // Temizleme (Cleanup)
    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('pointerup', handlePointerClick);
        container.innerHTML = '';
      }
      renderer.dispose();
    };
  }, [activeTab]);

  // ==========================================
  // SEÇİLİ GEZEGENİN YÖRÜNGE RENGİ GÜNCELLEMESİ
  // ==========================================
  useEffect(() => {
    Object.entries(orbitRingsRef.current).forEach(([pid, ring]) => {
      if (ring && ring.material) {
        const isSel = pid === selectedPlanetId;
        ring.material.color.setHex(isSel ? 0x06b6d4 : 0x334155);
        ring.material.opacity = isSel ? 0.95 : 0.35;
      }
    });
  }, [selectedPlanetId]);

  // ==========================================
  // ANİMASYON DÖNGÜSÜ & KAMERA TAKİBİ (LOD & LERP)
  // ==========================================
  useEffect(() => {
    if (activeTab !== 'orbits') return;

    let clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Güneş ve Korona Dönüşü
      if (sunMeshRef.current) {
        sunMeshRef.current.rotation.y += 0.002;
      }
      if (sunCoronaRef.current) {
        const s = 1 + Math.sin(elapsedTime * 2) * 0.03;
        sunCoronaRef.current.scale.set(s, s, s);
      }

      // Gezegen Yörünge Hareketi & Kendi Ekseni Dönüşü
      Object.values(planetMeshesRef.current).forEach((mesh) => {
        if (!mesh) return;
        if (isPlaying) {
          mesh.userData.currentAngle += mesh.userData.orbitSpeed * 0.5 * simSpeed * delta * 60;
          mesh.position.x = Math.cos(mesh.userData.currentAngle) * mesh.userData.orbitDist;
          mesh.position.z = Math.sin(mesh.userData.currentAngle) * mesh.userData.orbitDist;
        }
        mesh.rotation.y += mesh.userData.rotationSpeed * delta * 60;
      });

      // Dünya'nın Ay'ının Yörüngesi
      const earthMesh = planetMeshesRef.current['dunya'];
      if (earthMesh && moonMeshRef.current) {
        if (isPlaying) {
          moonMeshRef.current.userData.angle += 0.05 * simSpeed * delta * 60;
        }
        const mAngle = moonMeshRef.current.userData.angle;
        moonMeshRef.current.position.x = earthMesh.position.x + Math.cos(mAngle) * 6.5;
        moonMeshRef.current.position.y = earthMesh.position.y + Math.sin(mAngle * 0.8) * 1.5;
        moonMeshRef.current.position.z = earthMesh.position.z + Math.sin(mAngle) * 6.5;
      }

      // Kamera Modları: Yakın Gezegen İnceleme (Focus) veya Genel Sistem
      const targetMesh = planetMeshesRef.current[selectedPlanetId];
      if (controlsRef.current && cameraRef.current) {
        if (cameraMode === 'focus' && targetMesh) {
          // Gezegene yumuşakça odaklan (LERP)
          const targetPos = targetMesh.position.clone();
          controlsRef.current.target.lerp(targetPos, 0.05);

          // Gezegen boyutuna göre kamera mesafesi
          const planetRadius = targetMesh.geometry?.parameters?.radius || 4;
          const desiredCamPos = targetPos.clone().add(new THREE.Vector3(planetRadius * 2.8, planetRadius * 1.8, planetRadius * 2.8));
          cameraRef.current.position.lerp(desiredCamPos, 0.04);
        } else if (cameraMode === 'top') {
          controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
          cameraRef.current.position.lerp(new THREE.Vector3(0, 380, 0.1), 0.05);
        } else {
          // 'system' modu
          controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.04);
        }
        controlsRef.current.update();
      }

      // 3D Dünya Koordinatlarını 2D Ekrana İzdüşürme (Etiketler için)
      if (cameraRef.current && mountRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        const projected = [];

        PLANETS.forEach(p => {
          const m = planetMeshesRef.current[p.id];
          if (m) {
            const v = new THREE.Vector3();
            m.getWorldPosition(v);
            v.project(cameraRef.current);
            // Ekranın önündeyse (z < 1)
            if (v.z < 1) {
              const x = (v.x * 0.5 + 0.5) * width;
              const y = (-(v.y * 0.5) + 0.5) * height;
              projected.push({
                id: p.id,
                name: p.name,
                emoji: p.imageEmoji,
                x,
                y,
                isSelected: p.id === selectedPlanetId
              });
            }
          }
        });
        setLabels(projected);
      }

      // Sahneyi Render Et
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeTab, isPlaying, simSpeed, selectedPlanetId, cameraMode]);

  // Gezegen Seçildiğinde
  const handleSelectPlanet = (id) => {
    setSelectedPlanetId(id);
    setCameraMode('focus');
    if (soundEnabled) playSpaceBeep(360, 0.12);
  };

  // Kamera Modunu Değiştir
  const handleSwitchCameraMode = (mode) => {
    setCameraMode(mode);
    if (soundEnabled) playSpaceBeep(480, 0.1);
  };

  // ==========================================
  // ÇİZİM KATMANI İŞLEVLERİ (Canvas Annotations)
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
      className={`fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 transition-all duration-300 ${
        isMinimized ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'
      }`}
    >
      {/* Koyu Uzay Arka Plan Perdesi */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
        onClick={() => setWindowState('minimized')}
      />

      {/* Ana 3D Modül Penceresi */}
      <motion.div
        layout
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className={`relative z-10 w-full bg-slate-950 border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 ${
          isMax
            ? 'h-[98vh] max-w-[98vw]'
            : 'h-[92vh] max-h-[920px] max-w-6xl'
        }`}
      >
        {/* ========================================================= */}
        {/* ÜST BAŞLIK & ARAÇ ÇUBUĞU                                   */}
        {/* ========================================================= */}
        <header className="shrink-0 bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-2 z-30">
          {/* Sol: Modül Başlığı & Sekmeler */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-lg shadow-md shrink-0 ring-2 ring-cyan-400/20">
              🪐
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                  Güneş Sistemi & Gezegenler
                </h2>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Move3d className="w-2.5 h-2.5" /> 3D WebGL
                </span>
              </div>

              {/* Sekme Seçici */}
              <div className="flex items-center gap-1 mt-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('orbits')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'orbits'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-3 h-3" /> 3D Gezegen Keşfi
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
                  <Sun className="w-3 h-3 text-amber-400" /> Mevsimler & Ay
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
                  <Rocket className="w-3 h-3" /> Uzay Kâşifi
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

            {/* Simge Durumuna Küçült */}
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
        {/* 1. SEKME: 3D YÖRÜNGE SİMÜLASYONU & GEZEGEN LABORATUVARI    */}
        {/* ========================================================= */}
        {activeTab === 'orbits' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Sol: Gezegen Seçici & Detay Kartı */}
            <div className="w-full lg:w-84 bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-slate-800 p-3 sm:p-4 flex flex-col justify-between shrink-0 overflow-y-auto z-20">
              <div className="space-y-3">
                {/* 3D Kamera Mod Butonları */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block flex items-center justify-between">
                    <span>3D Kamera Bakış Açısı</span>
                    <span className="text-[9px] text-cyan-400 font-normal">Sürükle & Yakınlaştır</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSwitchCameraMode('system')}
                      className={`p-1.5 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                        cameraMode === 'system'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Move3d className="w-4 h-4" />
                      <span className="text-[10px]">Serbest 3D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchCameraMode('top')}
                      className={`p-1.5 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                        cameraMode === 'top'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <CompassIcon className="w-4 h-4" />
                      <span className="text-[10px]">Kuşbakışı</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchCameraMode('focus')}
                      className={`p-1.5 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                        cameraMode === 'focus'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                      <span className="text-[10px]">Gezegene Uç</span>
                    </button>
                  </div>
                </div>

                {/* Hızlı Gezegen Listesi */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Gezegenler (Güneş'ten Dışarıya)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PLANETS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPlanet(p.id)}
                        className={`p-1.5 rounded-xl flex flex-col items-center gap-0.5 text-center transition cursor-pointer active:scale-95 ${
                          selectedPlanetId === p.id
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md ring-2 ring-cyan-300/40'
                            : 'bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white'
                        }`}
                      >
                        <span className="text-base">{p.imageEmoji}</span>
                        <span className="text-[10px] leading-tight truncate w-full">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seçili Gezegenin 3D Detay Kartı */}
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl shrink-0">{selectedPlanet.imageEmoji}</div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-1.5">
                        <span className="truncate">{selectedPlanet.name}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/20 shrink-0">
                          {selectedPlanet.type}
                        </span>
                      </h3>
                      <p className="text-[11px] text-cyan-400 font-medium truncate">{selectedPlanet.tagline}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Güneş'e Mesafe:</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.distanceFromSun}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Ortalama Sıcaklık:</span>
                      <span className="font-semibold text-amber-400">{selectedPlanet.temperature}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">1 Gün (Kendi Ekseni):</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.dayLength}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">1 Yıl (Güneş Turu):</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.yearLength}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Çap:</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.diameter}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Doğal Uydu:</span>
                      <span className="font-semibold text-slate-200">{selectedPlanet.moons} Uydu</span>
                    </div>
                  </div>

                  {/* Biliyor muydunuz? Kutusu */}
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-200 leading-relaxed">
                    <span className="font-bold text-cyan-300 block mb-0.5">💡 Çocuklar İçin İlginç Bilgi:</span>
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

                  {/* Hız Butonları */}
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
                        text: `${selectedPlanet.name} (${selectedPlanet.type})\n${selectedPlanet.tagline}\n\n• Güneş'e Mesafe: ${selectedPlanet.distanceFromSun}\n• Ortalama Sıcaklık: ${selectedPlanet.temperature}\n• 1 Gün (Kendi Çevresi): ${selectedPlanet.dayLength}\n• 1 Yıl (Güneş Çevresi): ${selectedPlanet.yearLength}\n• Çap: ${selectedPlanet.diameter}\n• Uydu Sayısı: ${selectedPlanet.moons}\n\nİlginç Bilgi: ${selectedPlanet.funFact}`,
                        fontSize: 22
                      });
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 font-bold text-xs flex items-center justify-center gap-2 transition border border-cyan-500/20 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Gezegen Notunu Tahtaya Aktar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sağ: 3D Three.js Sahnesi */}
            <div className="flex-1 relative overflow-hidden bg-slate-950 select-none">
              {/* Three.js Canvas Taşıyıcı */}
              <div
                ref={mountRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
              />

              {/* 3D Gezegen İsim Etiketleri (Screen Space Projections) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {labels.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelectPlanet(l.id)}
                    className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-8 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer backdrop-blur-md shadow-md ${
                      l.isSelected
                        ? 'bg-cyan-400 text-slate-950 ring-2 ring-white scale-110 z-20'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:scale-105 z-10'
                    }`}
                    style={{
                      left: `${l.x}px`,
                      top: `${l.y}px`
                    }}
                  >
                    <span>{l.emoji}</span>
                    <span>{l.name}</span>
                  </button>
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
                  className="absolute inset-0 w-full h-full z-20 touch-none cursor-crosshair pointer-events-auto"
                />
              )}

              {/* Kamera Yakınlaşma Bildirim Kartı & Geri Dön Butonu */}
              {cameraMode === 'focus' && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-white flex items-center gap-2 shadow-lg backdrop-blur-md">
                    <span className="text-base">{selectedPlanet.imageEmoji}</span>
                    <span className="font-bold text-cyan-300">{selectedPlanet.name}</span>
                    <span className="text-slate-400 hidden sm:inline">• Yakın 3D İnceleme</span>
                  </div>
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

              {/* 3D Yardımcı İpucu Çubuğu */}
              <div className="absolute bottom-3 right-3 z-10 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 backdrop-blur-md flex items-center gap-2 pointer-events-none">
                <span>🖱️ Döndür: Sol Tık / Parmağını Sürükle</span>
                <span>•</span>
                <span>🔍 Yakınlaştır: Fare Tekerleği / İki Parmak</span>
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
