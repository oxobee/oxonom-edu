import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, RotateCcw, Play, Pause,
  X, Maximize2, Minimize2, PenTool, Eraser, Trash2,
  Trophy, Zap, Star, Sparkles, CheckCircle2,
  ArrowRight, ArrowLeft, RefreshCw, Minus, Download,
  Layers, Shuffle, HelpCircle, Check, Search, Headphones
} from 'lucide-react';
import { useModuleDock } from '../context/ModuleDockContext';

// ==========================================
// SES VE KONUŞMA MOTORU (Web Speech & Web Audio API)
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

function playSuccessSound() {
  playTone(523.25, 'sine', 0.1); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.1), 90); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.18), 180); // G5
  setTimeout(() => playTone(1046.50, 'sine', 0.25), 280); // C6
}

function playWrongSound() {
  playTone(220, 'sawtooth', 0.2, 0.09);
}

function playPopSound() {
  playTone(450, 'triangle', 0.08, 0.08);
}

// İngilizce Doğal Seslendirme (Web Speech API - en-US / en-GB)
function speakEnglishWord(text, rate = 0.9, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    // En kaliteli doğal İngilizce ses seçimi (Google US English, Samantha, Daniel, Natural vs.)
    const engVoice = voices.find(v => 
      (v.lang === 'en-US' || v.lang === 'en-GB' || v.lang?.startsWith('en')) &&
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'))
    ) || voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB' || v.lang?.startsWith('en'));

    if (engVoice) utterance.voice = engVoice;
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = () => { if (onEnd) onEnd(); };

    window.speechSynthesis.speak(utterance);
  } catch (_) {
    if (onEnd) onEnd();
  }
}

// ==========================================
// MEB 2-5. SINIF İNGİLİZCE KELİME VERİTABANI
// ==========================================
const VOCABULARY_THEMES = [
  {
    id: 'animals',
    name: 'Animals',
    turkishName: 'Hayvanlar',
    icon: '🐾',
    color: 'from-amber-500 to-orange-500',
    words: [
      { id: 'cat', word: 'Cat', meaning: 'Kedi', emoji: '🐱', sentence: 'The cat is sleeping.', trSentence: 'Kedi uyuyor.' },
      { id: 'dog', word: 'Dog', meaning: 'Köpek', emoji: '🐶', sentence: 'The dog is playing ball.', trSentence: 'Köpek topla oynuyor.' },
      { id: 'bird', word: 'Bird', meaning: 'Kuş', emoji: '🐦', sentence: 'The bird can fly high.', trSentence: 'Kuş yükseğe uçabilir.' },
      { id: 'lion', word: 'Lion', meaning: 'Aslan', emoji: '🦁', sentence: 'The lion is the king.', trSentence: 'Aslan ormanın kralıdır.' },
      { id: 'elephant', word: 'Elephant', meaning: 'Fil', emoji: '🐘', sentence: 'The elephant is very big.', trSentence: 'Fil çok büyüktür.' },
      { id: 'monkey', word: 'Monkey', meaning: 'Maymun', emoji: '🐵', sentence: 'The monkey likes bananas.', trSentence: 'Maymun muz sever.' },
      { id: 'rabbit', word: 'Rabbit', meaning: 'Tavşan', emoji: '🐰', sentence: 'The rabbit can jump fast.', trSentence: 'Tavşan hızlı zıplayabilir.' },
      { id: 'fish', word: 'Fish', meaning: 'Balık', emoji: '🐟', sentence: 'The fish swims in the sea.', trSentence: 'Balık denizde yüzer.' },
      { id: 'duck', word: 'Duck', meaning: 'Ördek', emoji: '🦆', sentence: 'The duck swims in the pond.', trSentence: 'Ördek gölette yüzer.' },
      { id: 'horse', word: 'Horse', meaning: 'At', emoji: '🐴', sentence: 'The horse runs in the field.', trSentence: 'At tarlada koşar.' }
    ]
  },
  {
    id: 'food',
    name: 'Food & Drinks',
    turkishName: 'Yiyecekler & İçecekler',
    icon: '🍎',
    color: 'from-rose-500 to-red-500',
    words: [
      { id: 'apple', word: 'Apple', meaning: 'Elma', emoji: '🍎', sentence: 'I like red apples.', trSentence: 'Kırmızı elmaları severim.' },
      { id: 'banana', word: 'Banana', meaning: 'Muz', emoji: '🍌', sentence: 'Bananas are yellow.', trSentence: 'Muzlar sarıdır.' },
      { id: 'orange', word: 'Orange', meaning: 'Portakal', emoji: '🍊', sentence: 'Orange is sweet and juicy.', trSentence: 'Portakal tatlı ve suludur.' },
      { id: 'milk', word: 'Milk', meaning: 'Süt', emoji: '🥛', sentence: 'I drink milk every morning.', trSentence: 'Her sabah süt içerim.' },
      { id: 'bread', word: 'Bread', meaning: 'Ekmek', emoji: '🍞', sentence: 'We eat fresh bread.', trSentence: 'Taze ekmek yeriz.' },
      { id: 'cheese', word: 'Cheese', meaning: 'Peynir', emoji: '🧀', sentence: 'Mice love yellow cheese.', trSentence: 'Fareler sarı peyniri sever.' },
      { id: 'water', word: 'Water', meaning: 'Su', emoji: '💧', sentence: 'Drink water every day.', trSentence: 'Her gün su için.' },
      { id: 'egg', word: 'Egg', meaning: 'Yumurta', emoji: '🥚', sentence: 'I eat an egg for breakfast.', trSentence: 'Kahvaltıda yumurta yerim.' },
      { id: 'pizza', word: 'Pizza', meaning: 'Pizza', emoji: '🍕', sentence: 'Pizza is my favorite food.', trSentence: 'Pizza benim en sevdiğim yemektir.' }
    ]
  },
  {
    id: 'colors',
    name: 'Colors & Shapes',
    turkishName: 'Renkler & Şekiller',
    icon: '🎨',
    color: 'from-purple-500 to-indigo-500',
    words: [
      { id: 'red', word: 'Red', meaning: 'Kırmızı', emoji: '🔴', sentence: 'Strawberries are red.', trSentence: 'Çilekler kırmızıdır.' },
      { id: 'blue', word: 'Blue', meaning: 'Mavi', emoji: '🔵', sentence: 'The sky is blue today.', trSentence: 'Bugün gökyüzü mavidir.' },
      { id: 'green', word: 'Green', meaning: 'Yeşil', emoji: '🟢', sentence: 'The grass is green.', trSentence: 'Çimenler yeşildir.' },
      { id: 'yellow', word: 'Yellow', meaning: 'Sarı', emoji: '🟡', sentence: 'The sun is bright yellow.', trSentence: 'Güneş parlak sarıdır.' },
      { id: 'purple', word: 'Purple', meaning: 'Mor', emoji: '🟣', sentence: 'Grapes are purple.', trSentence: 'Üzümler mordur.' },
      { id: 'star', word: 'Star', meaning: 'Yıldız', emoji: '⭐', sentence: 'Look at the shiny star.', trSentence: 'Parlayan yıldıza bak.' },
      { id: 'circle', word: 'Circle', meaning: 'Daire', emoji: '⭕', sentence: 'A clock is a circle.', trSentence: 'Saat bir dairedir.' },
      { id: 'heart', word: 'Heart', meaning: 'Kalp', emoji: '❤️', sentence: 'A warm red heart.', trSentence: 'Sıcak kırmızı bir kalp.' }
    ]
  },
  {
    id: 'school',
    name: 'Classroom',
    turkishName: 'Sınıf & Okul',
    icon: '🏫',
    color: 'from-emerald-500 to-teal-500',
    words: [
      { id: 'pencil', word: 'Pencil', meaning: 'Kalem', emoji: '✏️', sentence: 'Write with your pencil.', trSentence: 'Kaleminle yaz.' },
      { id: 'book', word: 'Book', meaning: 'Kitap', emoji: '📚', sentence: 'Read an English book.', trSentence: 'İngilizce bir kitap oku.' },
      { id: 'bag', word: 'School Bag', meaning: 'Okul Çantası', emoji: '🎒', sentence: 'My bag is blue.', trSentence: 'Çantam mavidir.' },
      { id: 'ruler', word: 'Ruler', meaning: 'Cetvel', emoji: '📏', sentence: 'Draw lines with a ruler.', trSentence: 'Cetvelle çizgiler çiz.' },
      { id: 'desk', word: 'Desk', meaning: 'Sıra / Çalışma Masası', emoji: '🪑', sentence: 'Sit at your desk.', trSentence: 'Sırana otur.' },
      { id: 'scissors', word: 'Scissors', meaning: 'Makas', emoji: '✂️', sentence: 'Cut the paper with scissors.', trSentence: 'Kağıdı makasla kes.' }
    ]
  },
  {
    id: 'weather',
    name: 'Weather & Mood',
    turkishName: 'Hava & Duygular',
    icon: '🌦️',
    color: 'from-sky-500 to-cyan-500',
    words: [
      { id: 'sunny', word: 'Sunny', meaning: 'Güneşli', emoji: '☀️', sentence: 'It is a sunny day.', trSentence: 'Güneşli bir gün.' },
      { id: 'rainy', word: 'Rainy', meaning: 'Yağmurlu', emoji: '🌧️', sentence: 'Take your umbrella, it is rainy.', trSentence: 'Şemsiyeni al, hava yağmurlu.' },
      { id: 'snowy', word: 'Snowy', meaning: 'Karlı', emoji: '❄️', sentence: 'Let us make a snowman.', trSentence: 'Hadi kardan adam yapalım.' },
      { id: 'happy', word: 'Happy', meaning: 'Mutlu', emoji: '😊', sentence: 'I am very happy today.', trSentence: 'Bugün çok mutluyum.' },
      { id: 'tired', word: 'Tired', meaning: 'Yorgun', emoji: '😴', sentence: 'He is tired after playing.', trSentence: 'Oyun oynadıktan sonra yorgun.' }
    ]
  }
];

export default function EnglishAdventureScreen({ isOpen = true, onClose, onAddToCanvas }) {
  // Aktif Sekme: 'flashcards' | 'match' | 'listening' | 'spelling'
  const [activeTab, setActiveTab] = useState('flashcards');

  // Pencere Durumu: 'normal', 'minimized', 'maximized'
  const [windowState, setWindowState] = useState('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Seçili Tema
  const [selectedThemeId, setSelectedThemeId] = useState('animals');
  const currentTheme = useMemo(() => {
    return VOCABULARY_THEMES.find(t => t.id === selectedThemeId) || VOCABULARY_THEMES[0];
  }, [selectedThemeId]);

  // ==========================================
  // 1. FLASHCARD STATE'LERİ
  // ==========================================
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayTimerRef = useRef(null);

  const currentWord = currentTheme.words[cardIndex] || currentTheme.words[0];

  // Tema değiştiğinde ilk karta dön
  useEffect(() => {
    setCardIndex(0);
    setIsFlipped(false);
  }, [selectedThemeId]);

  // Kart değiştiğinde seslendir (eğer ses açıksa)
  const handleSpeakCurrentWord = () => {
    if (!currentWord || !soundEnabled) return;
    speakEnglishWord(currentWord.word);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setCardIndex(prev => (prev + 1) % currentTheme.words.length);
    if (soundEnabled) playPopSound();
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCardIndex(prev => (prev - 1 + currentTheme.words.length) % currentTheme.words.length);
    if (soundEnabled) playPopSound();
  };

  // Otomatik Oynatma
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayTimerRef.current = setInterval(() => {
        setCardIndex(prev => {
          const next = (prev + 1) % currentTheme.words.length;
          const word = currentTheme.words[next];
          if (soundEnabled && word) {
            speakEnglishWord(word.word);
          }
          return next;
        });
      }, 3000);
    } else {
      clearInterval(autoPlayTimerRef.current);
    }
    return () => clearInterval(autoPlayTimerRef.current);
  }, [isAutoPlaying, currentTheme, soundEnabled]);

  // ==========================================
  // 2. MATCH PAIRS (EŞLEŞTİRME OYUNU) STATE'LERİ
  // ==========================================
  const [matchCards, setMatchCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]); // indices
  const [matchedPairs, setMatchedPairs] = useState(new Set()); // item ids
  const [matchScore, setMatchScore] = useState(0);

  const initMatchGame = () => {
    // Temadaki ilk 4-6 kelimeyi al
    const sampleWords = currentTheme.words.slice(0, 6);
    const cards = [];
    sampleWords.forEach(w => {
      // 1 Kart Görsel/Emoji, 1 Kart Kelime Yazısı
      cards.push({ id: w.id, type: 'emoji', content: w.emoji, label: w.meaning, originalWord: w.word });
      cards.push({ id: w.id, type: 'word', content: w.word, label: w.word, originalWord: w.word });
    });
    // Karıştır
    setMatchCards(cards.sort(() => Math.random() - 0.5));
    setSelectedCards([]);
    setMatchedPairs(new Set());
    setMatchScore(0);
  };

  useEffect(() => {
    if (activeTab === 'match') {
      initMatchGame();
    }
  }, [activeTab, selectedThemeId]);

  const handleCardClick = (index) => {
    if (selectedCards.length === 2 || selectedCards.includes(index)) return;
    const card = matchCards[index];
    if (matchedPairs.has(card.id)) return;

    if (soundEnabled) {
      playTone(500, 'sine', 0.08);
      if (card.type === 'word') speakEnglishWord(card.originalWord);
    }

    const nextSelected = [...selectedCards, index];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      const card1 = matchCards[nextSelected[0]];
      const card2 = matchCards[nextSelected[1]];

      if (card1.id === card2.id && card1.type !== card2.type) {
        // Doğru Eşleşme!
        if (soundEnabled) playSuccessSound();
        setMatchedPairs(prev => new Set([...prev, card1.id]));
        setMatchScore(s => s + 20);
        setSelectedCards([]);
      } else {
        // Yanlış
        if (soundEnabled) playWrongSound();
        setTimeout(() => {
          setSelectedCards([]);
        }, 900);
      }
    }
  };

  // ==========================================
  // 3. LISTEN & PICK (DİNLE VE BUL) STATE'LERİ
  // ==========================================
  const [listenQuestion, setListenQuestion] = useState(null);
  const [listenScore, setListenScore] = useState(0);
  const [listenFeedback, setListenFeedback] = useState(null); // 'correct' | 'wrong'

  const generateListenQuestion = () => {
    setListenFeedback(null);
    const pool = currentTheme.words;
    if (pool.length < 3) return;

    const target = pool[Math.floor(Math.random() * pool.length)];

    // 3 Çeldirici + 1 Doğru
    const options = new Set([target]);
    while (options.size < Math.min(4, pool.length)) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      options.add(random);
    }

    const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);
    setListenQuestion({
      target,
      options: shuffledOptions
    });

    if (soundEnabled) {
      setTimeout(() => {
        speakEnglishWord(target.word);
      }, 350);
    }
  };

  useEffect(() => {
    if (activeTab === 'listening') {
      generateListenQuestion();
    }
  }, [activeTab, selectedThemeId]);

  const handleAnswerListen = (option) => {
    if (!listenQuestion || listenFeedback) return;

    if (option.id === listenQuestion.target.id) {
      setListenFeedback('correct');
      setListenScore(s => s + 10);
      if (soundEnabled) playSuccessSound();
      setTimeout(() => {
        generateListenQuestion();
      }, 1300);
    } else {
      setListenFeedback('wrong');
      if (soundEnabled) playWrongSound();
      setTimeout(() => {
        setListenFeedback(null);
      }, 900);
    }
  };

  // ==========================================
  // 4. WORD BUILDER (HARF DİZME & SPELLER) STATE'LERİ
  // ==========================================
  const [spellerIndex, setSpellerIndex] = useState(0);
  const [scrambledLetters, setScrambledLetters] = useState([]);
  const [spelledLetters, setSpelledLetters] = useState([]);
  const [spellerFeedback, setSpellerFeedback] = useState(null);

  const spellerWord = currentTheme.words[spellerIndex] || currentTheme.words[0];

  const initSpellerForWord = (wordObj) => {
    if (!wordObj) return;
    const clean = wordObj.word.toUpperCase().replace(/[^A-Z]/g, '');
    const letters = clean.split('').map((char, idx) => ({ id: `${char}-${idx}`, char }));
    // Karıştır
    setScrambledLetters([...letters].sort(() => Math.random() - 0.5));
    setSpelledLetters([]);
    setSpellerFeedback(null);
  };

  useEffect(() => {
    if (activeTab === 'spelling') {
      initSpellerForWord(spellerWord);
    }
  }, [activeTab, spellerIndex, selectedThemeId]);

  const handlePickLetter = (letterObj) => {
    if (spellerFeedback) return;
    setScrambledLetters(prev => prev.filter(l => l.id !== letterObj.id));
    const nextSpelled = [...spelledLetters, letterObj];
    setSpelledLetters(nextSpelled);
    if (soundEnabled) playTone(480 + nextSpelled.length * 30, 'sine', 0.08);

    const targetUpper = spellerWord.word.toUpperCase().replace(/[^A-Z]/g, '');
    if (nextSpelled.length === targetUpper.length) {
      const resultString = nextSpelled.map(l => l.char).join('');
      if (resultString === targetUpper) {
        setSpellerFeedback('correct');
        if (soundEnabled) {
          playSuccessSound();
          setTimeout(() => speakEnglishWord(spellerWord.word), 350);
        }
        setTimeout(() => {
          setSpellerIndex(prev => (prev + 1) % currentTheme.words.length);
        }, 1500);
      } else {
        setSpellerFeedback('wrong');
        if (soundEnabled) playWrongSound();
        setTimeout(() => {
          initSpellerForWord(spellerWord);
        }, 900);
      }
    }
  };

  const handleResetSpellerWord = () => {
    initSpellerForWord(spellerWord);
  };

  // ==========================================
  // 5. ÇİZİM TUVALİ (Canvas Overlay)
  // ==========================================
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#facc15');
  const [penSize, setPenSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

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

  // ==========================================
  // MODÜL DOCK ENTEGRASYONU
  // ==========================================
  const { registerModule, unregisterModule } = useModuleDock();

  const dockBadgeText = useMemo(() => {
    if (activeTab === 'flashcards') {
      return `${currentTheme.name} • ${cardIndex + 1}/${currentTheme.words.length}`;
    }
    if (activeTab === 'match') {
      return `Matching Game • ${matchScore} Puan`;
    }
    if (activeTab === 'listening') {
      return `Listening • ${listenScore} Puan`;
    }
    return `Spelling • ${spellerWord?.word}`;
  }, [activeTab, currentTheme, cardIndex, matchScore, listenScore, spellerWord]);

  useEffect(() => {
    if (!isOpen) {
      unregisterModule('ingilizce-kelime-atolyesi');
      return;
    }

    registerModule({
      id: 'ingilizce-kelime-atolyesi',
      title: 'İngilizce Kelime & Görsel Macera Atölyesi',
      shortTitle: 'İngilizce Macera',
      icon: '🇬🇧',
      gradient: 'bg-gradient-to-tr from-rose-500 to-indigo-600 text-white',
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
      unregisterModule('ingilizce-kelime-atolyesi');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      clearInterval(autoPlayTimerRef.current);
    };
  }, [unregisterModule]);

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
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20 text-base sm:text-lg shrink-0">
              🇬🇧
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-base font-bold text-white tracking-tight flex items-center gap-1 truncate">
                  <span className="hidden xs:inline">İngilizce Görsel Macera Atölyesi</span>
                  <span className="xs:hidden">İngilizce Atölyesi</span>
                </h2>
                <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 shrink-0">
                  MEB 2-5. Sınıf
                </span>
              </div>

              {/* Sekme Değiştirici */}
              <div className="flex items-center gap-1 mt-0.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('flashcards')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeTab === 'flashcards'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🗂️ <span className="hidden xs:inline">Kelime </span>Kartları
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('match')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'match'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🧩 Eşleştirme<span className="hidden xs:inline"> Oyunu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('listening')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'listening'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🎧 Dinle<span className="hidden xs:inline"> & Bul</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('spelling')}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'spelling'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🔤 Harf<span className="hidden xs:inline"> Dizme</span>
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
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
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

        {/* Çizim Tuvali */}
        {isDrawingMode && (
          <canvas
            ref={canvasRef}
            width={1200}
            height={850}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 w-full h-full z-20 touch-none cursor-crosshair"
          />
        )}

        {/* ========================================================= */}
        {/* TEMA SEÇİCİ ŞERİDİ (Tüm Sekmeler İçin Üst Çubuk)          */}
        {/* ========================================================= */}
        <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar z-10">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Tema:</span>
          {VOCABULARY_THEMES.map(theme => (
            <button
              key={theme.id}
              type="button"
              onClick={() => setSelectedThemeId(theme.id)}
              className={`py-1 px-2.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                selectedThemeId === theme.id
                  ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-400/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <span>{theme.icon}</span>
              <span>{theme.name}</span>
              <span className="text-[10px] opacity-75">({theme.turkishName})</span>
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* 2. SEKME 1: İNTERAKTİF KELİME KARTLARI (FLASHCARDS)       */}
        {/* ========================================================= */}
        {activeTab === 'flashcards' && (
          <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-hidden justify-between items-center">
            {/* Üst Bilgi & Otomatik Oynatma Kontrolü */}
            <div className="w-full max-w-xl flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span className="font-semibold">
                Kart: <span className="font-bold text-rose-400 font-mono">{cardIndex + 1} / {currentTheme.words.length}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(v => !v)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                    isAutoPlaying
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isAutoPlaying ? 'Durdur' : 'Otomatik Oynat'}</span>
                </button>

                {onAddToCanvas && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCanvas({
                        title: `İngilizce: ${currentTheme.name} (${currentTheme.turkishName})`,
                        text: currentTheme.words.map(w => `• ${w.word}: ${w.meaning} (${w.sentence})`).join('\n'),
                        fontSize: 22
                      });
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 transition"
                    title="Akıllı Tahtaya Aktar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Merkez: Çevrilebilir 3D Flashcard */}
            <div className="w-full max-w-md my-auto perspective-1000">
              <motion.div
                key={currentWord.id + (isFlipped ? '-back' : '-front')}
                initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setIsFlipped(v => !v)}
                className={`w-full aspect-[4/3] rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between border-2 cursor-pointer transition-all duration-300 relative overflow-hidden select-none ${
                  isFlipped
                    ? 'bg-gradient-to-br from-indigo-900/90 to-slate-900 border-indigo-500/50 text-white'
                    : 'bg-gradient-to-br from-slate-850 to-slate-900 border-slate-700 hover:border-rose-400/50 text-white'
                }`}
              >
                {/* Kart İpucu Rozeti */}
                <div className="w-full flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 text-rose-300 font-bold border border-rose-500/20">
                    {isFlipped ? '🇹🇷 Türkçe Karşılık' : '🇬🇧 English'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Çevirmek için dokun 🔄)
                  </span>
                </div>

                {/* Kart İçeriği */}
                {!isFlipped ? (
                  /* ÖN YÜZ: İNGİLİZCE */
                  <div className="flex flex-col items-center my-auto">
                    <span className="text-6xl sm:text-7xl filter drop-shadow-lg mb-2">
                      {currentWord.emoji}
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
                      <span>{currentWord.word}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeakCurrentWord();
                        }}
                        className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center shadow-md active:scale-95 transition"
                        title="İngilizce Telaffuz Dinle"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </h3>
                  </div>
                ) : (
                  /* ARKA YÜZ: TÜRKÇE VE ÖRNEK CÜMLE */
                  <div className="flex flex-col items-center my-auto text-center space-y-2">
                    <span className="text-4xl filter drop-shadow">
                      {currentWord.emoji}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                      {currentWord.meaning}
                    </h3>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 max-w-xs">
                      <p className="font-semibold text-rose-300">"{currentWord.sentence}"</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">({currentWord.trSentence})</p>
                    </div>
                  </div>
                )}

                {/* Alt Telaffuz Butonu */}
                <div className="w-full flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeakCurrentWord();
                    }}
                    className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-bold"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Sesli Dinle</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {currentWord.word.toLowerCase()}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Alt Navigasyon Kontrolleri */}
            <div className="flex items-center justify-center gap-3 shrink-0 pt-2">
              <button
                type="button"
                onClick={handlePrevCard}
                className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
              >
                <ArrowLeft className="w-4 h-4 text-rose-400" />
                <span>Önceki</span>
              </button>

              <button
                type="button"
                onClick={handleSpeakCurrentWord}
                className="p-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white transition active:scale-95 cursor-pointer shadow-lg shadow-rose-500/20"
                title="Kelimeyi Dinle"
              >
                <Volume2 className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleNextCard}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-lg shadow-rose-500/20"
              >
                <span>Sonraki</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SEKME 2: EŞLEŞTİRME OYUNU (MATCH PAIRS)                */}
        {/* ========================================================= */}
        {activeTab === 'match' && (
          <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-y-auto items-center justify-between">
            {/* Üst Skor & Yeniden Başlat */}
            <div className="w-full max-w-xl flex items-center justify-between bg-slate-850 p-3 rounded-2xl border border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Puan:</span>
                <span className="px-2.5 py-0.5 rounded-xl bg-amber-500/20 text-amber-300 font-mono font-extrabold text-sm border border-amber-500/30">
                  {matchScore} ⭐
                </span>
              </div>

              <div className="text-xs text-slate-300 font-semibold">
                Eşleşen: {matchedPairs.size} / {matchCards.length / 2}
              </div>

              <button
                type="button"
                onClick={initMatchGame}
                className="py-1 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Yenile
              </button>
            </div>

            {/* Kart Izgarası */}
            <div className="my-auto w-full max-w-2xl grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3.5 p-2">
              {matchCards.map((card, idx) => {
                const isSelected = selectedCards.includes(idx);
                const isMatched = matchedPairs.has(card.id);

                return (
                  <motion.button
                    key={idx}
                    type="button"
                    whileHover={{ scale: isMatched ? 1 : 1.03 }}
                    whileTap={{ scale: isMatched ? 1 : 0.95 }}
                    disabled={isMatched}
                    onClick={() => handleCardClick(idx)}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all duration-200 cursor-pointer shadow-md select-none border-2 ${
                      isMatched
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 opacity-60 cursor-default'
                        : isSelected
                        ? 'bg-rose-500 border-rose-400 text-white shadow-rose-500/30 ring-4 ring-rose-400/40'
                        : 'bg-slate-800/90 border-slate-700 hover:border-slate-500 text-white'
                    }`}
                  >
                    {card.type === 'emoji' ? (
                      <span className="text-4xl sm:text-5xl filter drop-shadow">
                        {card.content}
                      </span>
                    ) : (
                      <span className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">
                        {card.content}
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 mt-1 font-medium truncate max-w-full">
                      {isMatched ? '✓ Eşleşti' : isSelected ? card.label : '?'}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Oyun Bittiğinde Tebrik */}
            {matchedPairs.size > 0 && matchedPairs.size === matchCards.length / 2 && (
              <div className="py-2 px-4 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-bold flex items-center gap-2 animate-bounce">
                🎉 Harika! Tüm kelimeleri başarıyla eşleştirdin!
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. SEKME 3: DİNLE VE DOĞRU RESMİ SEÇ (LISTEN & PICK)       */}
        {/* ========================================================= */}
        {activeTab === 'listening' && (
          <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto items-center justify-center">
            {listenQuestion && (
              <div className="w-full max-w-xl bg-slate-850 p-5 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-6">
                {/* Skor Rozeti */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
                    <Trophy className="w-4 h-4" />
                    <span>Puan: {listenScore}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakEnglishWord(listenQuestion.target.word)}
                    className="py-1.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
                  >
                    <Volume2 className="w-4 h-4" /> Tekrar Dinle
                  </button>
                </div>

                <div>
                  <h3 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                    <Headphones className="w-5 h-5 text-rose-400" />
                    <span>Söylenen kelime hangisidir?</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Dinle ve doğru görsele dokun!
                  </p>
                </div>

                {/* Dinleme Butonu (Büyük Ses Dalgalı İkon) */}
                <div className="py-2">
                  <button
                    type="button"
                    onClick={() => speakEnglishWord(listenQuestion.target.word)}
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl ring-8 ring-rose-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
                  >
                    <Volume2 className="w-10 h-10" />
                  </button>
                </div>

                {/* Geri Bildirim Mesajı */}
                {listenFeedback && (
                  <div
                    className={`py-2 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                      listenFeedback === 'correct'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {listenFeedback === 'correct' ? '🎉 Great job! Correct answer!' : '❌ Try again! Listen carefully!'}
                  </div>
                )}

                {/* 4 Seçenek Kartı */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {listenQuestion.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!!listenFeedback}
                      onClick={() => handleAnswerListen(opt)}
                      className="py-4 px-3 rounded-2xl bg-slate-850 hover:bg-slate-750 border border-slate-700 hover:border-rose-400 transition-all flex flex-col items-center justify-center shadow-lg active:scale-95 cursor-pointer group"
                    >
                      <span className="text-5xl group-hover:scale-110 transition-transform filter drop-shadow">
                        {opt.emoji}
                      </span>
                      <span className="mt-2 text-xs font-bold text-slate-300">
                        {opt.meaning}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. SEKME 4: HARF DİZME & SPELLER (WORD BUILDER)           */}
        {/* ========================================================= */}
        {activeTab === 'spelling' && (
          <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto items-center justify-center">
            {spellerWord && (
              <div className="w-full max-w-xl bg-slate-850 p-5 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Sözcük: <span className="text-rose-400 font-mono">{spellerIndex + 1} / {currentTheme.words.length}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => speakEnglishWord(spellerWord.word)}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Volume2 className="w-4 h-4" /> Kelimeyi Dinle
                  </button>
                </div>

                {/* Görsel & Türkçe Anlam */}
                <div className="space-y-1">
                  <span className="text-6xl filter drop-shadow">
                    {spellerWord.emoji}
                  </span>
                  <h4 className="text-lg font-bold text-emerald-400">
                    {spellerWord.meaning}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Harfleri doğru sırayla seçerek İngilizce kelimeyi oluştur!
                  </p>
                </div>

                {/* Dizilen Harfler (Boşluklar & Yerleşen Harfler) */}
                <div className="flex items-center justify-center gap-2 flex-wrap min-h-[56px] p-2 bg-slate-950/70 rounded-2xl border border-slate-800">
                  {spelledLetters.map((l, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-12 h-12 rounded-xl bg-rose-500 text-white font-mono font-extrabold text-xl flex items-center justify-center shadow-md ring-2 ring-rose-300/40"
                    >
                      {l.char}
                    </motion.div>
                  ))}
                  {Array.from({ length: Math.max(0, spellerWord.word.length - spelledLetters.length) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-xs font-mono"
                    >
                      _
                    </div>
                  ))}
                </div>

                {/* Geri Bildirim */}
                {spellerFeedback && (
                  <div
                    className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 ${
                      spellerFeedback === 'correct'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {spellerFeedback === 'correct' ? '🎉 Well Done! Harika yazdın!' : '❌ Tekrar dene! Sıralamayı hatırla!'}
                  </div>
                )}

                {/* Seçilebilir Karışık Harfler */}
                <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                  {scrambledLetters.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      disabled={!!spellerFeedback}
                      onClick={() => handlePickLetter(l)}
                      className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-mono font-extrabold text-xl flex items-center justify-center shadow-md active:scale-90 transition cursor-pointer border border-slate-700 hover:border-indigo-400"
                    >
                      {l.char}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResetSpellerWord}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Baştan Diz
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpellerIndex(prev => (prev + 1) % currentTheme.words.length)}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Sonraki Kelimeye Geç
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
