import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, RotateCcw, Clock, BookOpen, 
    Sparkles, CheckCircle2, ChevronDown, Plus, Minus,
    X, Maximize2, Minimize2, MoveRight, Award,
    Type, PenTool, Check, Trophy, Star, Zap, Target,
    Flag, RefreshCw, Eye, Flame, AlertCircle
} from 'lucide-react';
import AutoScrollText from './ui/AutoScrollText';
import { useModuleDock } from '../context/ModuleDockContext';

// İlkokul 1-4. sınıf seviyesine uygun zengin pedagojik okuma metinleri
const SAMPLE_TEXTS = [
    {
        id: 'metin-1',
        title: 'Güneşli Bir Orman Gezisi',
        grade: '1. Sınıf',
        category: 'Doğa & Hayvanlar',
        content: `Güneş pırıl pırıl parlıyordu. Ali ile Ayşe sabah erkenden uyandılar. Çantalarına taze meyveler ve su koydular. Anneleriyle birlikte yeşil ormana gittiler. Ağaçların dallarında neşeli kuşlar cıvıl cıvıl ötüyordu. Çimenlerin üzerinde minik bir tavşan hopluyordu. Tavşanın bembeyaz yumuşak tüyleri vardı. Ali tavşana sessizce yaklaştı ve küçük bir havuç uzattı. Sevimli tavşan havucu afiyetle yedi. Doğayı ve hayvanları sevmek onları çok mutlu etti.`
    },
    {
        id: 'metin-2',
        title: 'Sevimli Köpek Karabaş',
        grade: '1. Sınıf',
        category: 'Dostluk',
        content: `Köyümüzün en neşeli köpeği Karabaş idi. Kulakları dik, kuyruğu hep kıpır kıpırdı. Çocuklar okuldan dönerken onları kapıda karşılardı. Mehmet çantasını yere bırakır, Karabaş ile top oynardı. Karabaş topu havada yakalar ve Mehmet'in ayaklarının ucuna getirirdi. Akşam olunca kulübesine çekilir, köyü güvenle beklerdi. Sadık bir dost olmak ne güzel bir duyguydu.`
    },
    {
        id: 'metin-3',
        title: 'Kırmızı Uçurtmanın Yolculuğu',
        grade: '1. Sınıf',
        category: 'Oyun & Eğlence',
        content: `Rüzgarlı bir bahar günüydü. Emre dedesiyle birlikte kırmızı bir uçurtma yaptı. Uçurtmanın uzun ve renkli bir kuyruğu vardı. Geniş tepeye çıktılar. Emre ipi tuttu, dedesi uçurtmayı havaya bıraktı. Rüzgar estikçe uçurtma gökyüzünde süzüldü. Kuşlar gibi bulutlara doğru yükseldi. Emre mutlulukla el salladı.`
    },
    {
        id: 'metin-4',
        title: 'Çiftlikteki Neşeli Ördekler',
        grade: '2. Sınıf',
        category: 'Çiftlik Yaşamı',
        content: `Mavi gölün kenarında minik bir çiftlik vardı. Bu çiftlikte sarı tüylü, sevimli ördek yavruları yaşardı. Anne ördek önde, yavrular arkada sırayla paytak paytak yürürlerdi. Vak vak sesleri tüm çiftliği neşelendirirdi. Göle girdiklerinde minik ayaklarıyla su sıçratır, küçük balıklarla oyun oynarlardı. Güneş batarken hepsi saman yataklarına dönüp tatlı bir uykuya dalardı.`
    },
    {
        id: 'metin-5',
        title: 'Kütüphanedeki Gizemli Kitap',
        grade: '2. Sınıf',
        category: 'Bilim & Keşif',
        content: `Zeynep kitap okumayı her şeyden çok severdi. Okulun kütüphanesinde büyük meşe ağacından yapılmış bir masa vardı. Masanın üzerinde mavi ciltli, parıltılı bir kitap duruyordu. Zeynep sayfaları yavaşça araladı. Kitap uzaydaki parlak yıldızları ve deniz altındaki gizemli canlıları anlatıyordu. Her yeni cümle ona yepyeni dünyaların kapılarını aralıyordu. Okumak, hayal gücünün en büyük kanadıydı.`
    },
    {
        id: 'metin-6',
        title: 'Küçük Tohumun Büyük Rüyası',
        grade: '2-3. Sınıf',
        category: 'Çevre & Yaşam',
        content: `Toprağın derinliklerinde uyuyan minik bir elma tohumu vardı. İlkbahar gelip yağmur damlaları toprağa dokunduğunda küçük tohum uyandı. Güneşin sıcaklığını hissetti ve yukarıya doğru filizlendi. Günler geçtikçe gövdesi kalınlaştı, yemyeşil yapraklar açtı. Yıllar sonra gölgesinde çocukların oyun oynadığı kocaman bir elma ağacı oldu. Sabır ve sevgi her tohumu bir ormana dönüştürürdü.`
    },
    {
        id: 'metin-7',
        title: 'Uzaya Yolculuk Yapan Sincap',
        grade: '3. Sınıf',
        category: 'Uzay & Macera',
        content: `Fındık adlı meraklı sincap, geceleri meşe ağacının en yüksek dalına tırmanıp parlayan yıldızları izlerdi. Acaba Ay neden bazen hilal, bazen dolunay oluyordu? Bir gece rüyasında ceviz kabuğundan yaptığı uzay roketiyle Samanyolu'na uçtu. Parlayan takımyıldızlarının arasından geçti. Uyandığında ilk işi kütüphaneye gidip astronomi kitaplarını incelemek oldu. Merak, bilimin ilk adımıydı.`
    },
    {
        id: 'metin-8',
        title: 'Denizin Altındaki Renkli Resifler',
        grade: '3-4. Sınıf',
        category: 'Denizler & Doğa',
        content: `Masmavi okyanusun derinliklerinde mercan resifleri rengarenk bir su altı şehri gibiydi. Palyaço balıkları anemonların arasında saklambaç oynuyor, deniz kaplumbağaları sakin kanat vuruşlarıyla akıntıda süzülüyordu. Deniz yıldızları kayaların üzerine tutunmuş güneş ışıklarının suda dans edişini izliyordu. Denizlerimiz dünyamızın akciğerleriydi ve onları temiz tutmak tüm çocukların göreviydi.`
    }
];

// MEB İlkokul Harf Grupları ve Çalışma Kartları
const LETTER_GROUPS = [
    { name: '1. Grup (E - L - A - K - İ - N)', letters: ['E', 'e', 'L', 'l', 'A', 'a', 'K', 'k', 'İ', 'i', 'N', 'n'], samples: ['El', 'Ela', 'Lale', 'Kale', 'İlke', 'Anne', 'Nil', 'Kek'] },
    { name: '2. Grup (O - M - U - T - Ü - Y)', letters: ['O', 'o', 'M', 'm', 'U', 'u', 'T', 't', 'Ü', 'ü', 'Y', 'y'], samples: ['Oya', 'Oto', 'Mutlu', 'Toka', 'Ütü', 'Kutu', 'Yelken', 'Yumurta'] },
    { name: '3. Grup (Ö - R - I - D - S - B)', letters: ['Ö', 'ö', 'R', 'r', 'I', 'ı', 'D', 'd', 'S', 's', 'B', 'b'], samples: ['Ördek', 'Resim', 'Işık', 'Dede', 'Sarı', 'Balık', 'Bebek', 'Orman'] },
    { name: '4. Grup (Z - Ç - G - Ş - C - P)', letters: ['Z', 'z', 'Ç', 'ç', 'G', 'g', 'Ş', 'ş', 'C', 'c', 'P', 'p'], samples: ['Zebra', 'Çiçek', 'Gemi', 'Şeker', 'Ceviz', 'Papatya', 'Gözlük'] },
    { name: '5. Grup (H - V - Ğ - F - J)', letters: ['H', 'h', 'V', 'v', 'Ğ', 'ğ', 'F', 'f', 'J', 'j'], samples: ['Havuç', 'Vapur', 'Ağaç', 'Fidan', 'Jale', 'Yağmur', 'Fener'] }
];

// Sevimli Rozet & Analiz Hesaplayıcı
function getReadingBadge(wpm) {
    if (wpm >= 80) {
        return {
            title: 'Şimşek Çita',
            subtitle: 'Süper Hızlı Okuyucu!',
            emoji: '🐆',
            stars: 3,
            color: 'from-amber-400 to-orange-500',
            textColor: 'text-amber-500',
            bgSoft: 'bg-amber-500/10 border-amber-500/30',
            note: 'İnanılmaz bir hız! Gözlerin metinde adeta bir çita gibi kayıyor, harikasın!'
        };
    }
    if (wpm >= 50) {
        return {
            title: 'Akıllı Tilki',
            subtitle: 'Harika ve Akıcı Okuma!',
            emoji: '🦊',
            stars: 3,
            color: 'from-orange-400 to-rose-500',
            textColor: 'text-orange-500',
            bgSoft: 'bg-orange-500/10 border-orange-500/30',
            note: 'Çok dengeli ve akıcı okudun! Kelimeleri ritimli ve pürüzsüz yakaladın.'
        };
    }
    if (wpm >= 30) {
        return {
            title: 'Neşeli Tavşan',
            subtitle: 'Çok Güzel İlerliyorsun!',
            emoji: '🐰',
            stars: 2,
            color: 'from-emerald-400 to-teal-500',
            textColor: 'text-emerald-500',
            bgSoft: 'bg-emerald-500/10 border-emerald-500/30',
            note: 'Kelimeleri tane tane ve güvenle okudun! Pratik yaptıkça daha da hızlanacaksın.'
        };
    }
    return {
        title: 'Bilge Kaplumbağa',
        subtitle: 'Adım Adım Zirveye!',
        emoji: '🐢',
        stars: 1,
        color: 'from-blue-400 to-indigo-500',
        textColor: 'text-blue-500',
        bgSoft: 'bg-blue-500/10 border-blue-500/30',
        note: 'Harika bir başlangıç! Tane tane okumak anlamanın ilk anahtarıdır. Düzenli okumayla hızın katlanacak!'
    };
}

function getPedagogicalTip(wpm, completionPct) {
    if (completionPct >= 100) {
        return 'Tebrikler! Metnin tamamını bitirdin. Şimdi hikayedeki ana fikri ve sevimli karakterleri kendi cümlelerinle anlatmayı deneyebilirsin.';
    }
    if (wpm >= 60) {
        return 'İpucu: Okurken dudaklarını kıpırdatmadan yalnızca gözlerinle satırları takip etmen okuma hızını daha da artıracaktır.';
    }
    return 'İpucu: Her gün bu ekranda 5 dakika pratik yaparak göz kaslarını eğitebilir ve kelimeleri tek bakışta tanıyabilirsin.';
}

export default function ReadingScreen({ isOpen = true, onClose }) {
    // Aktif Ana Sekme: 'reading' (Hızlı Okuma İstasyonu) veya 'letters' (Harf/Kelime Çalışma Atölyesi)
    const [activeTab, setActiveTab] = useState('reading');

    // Pencere Durumu: 'normal', 'minimized', 'maximized'
    const [windowState, setWindowState] = useState('normal');

    // Metin Seçenekleri
    const [selectedTextId, setSelectedTextId] = useState('metin-1');
    const [customText, setCustomText] = useState('');
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [fontSizeLevel, setFontSizeLevel] = useState(2); // 0: 24px, 1: 30px, 2: 36px, 3: 44px
    const [showReadingRuler, setShowReadingRuler] = useState(false);
    const [rulerY, setRulerY] = useState(0);

    // Sayaç & Okuma Takip Durumları
    const [durationSeconds, setDurationSeconds] = useState(60);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isRunning, setIsRunning] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(60);

    // İşaretleme & Analiz Karnesi Durumları
    const [isWaitingForMarking, setIsWaitingForMarking] = useState(false);
    const [lastReadWordIndex, setLastReadWordIndex] = useState(null);
    const [readWordsCount, setReadWordsCount] = useState(0);
    const [showReportModal, setShowReportModal] = useState(false);

    // Harf Atölyesi State'leri
    const [fontMode, setFontMode] = useState('kilavuzlu'); 
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
    const [activePracticeText, setActivePracticeText] = useState('Ela lale el ele.');
    const [practiceFontSize, setPracticeFontSize] = useState('text-6xl');

    const timerRef = useRef(null);
    const contentRef = useRef(null);

    // Aktif Metin & Kelimeler
    const activeText = useMemo(() => {
        if (isCustomMode) {
            return {
                title: 'Özel Okuma Metnim',
                content: customText.trim() || 'Lütfen buraya kendi okuma metninizi yazın...'
            };
        }
        return SAMPLE_TEXTS.find(t => t.id === selectedTextId) || SAMPLE_TEXTS[0];
    }, [isCustomMode, customText, selectedTextId]);

    const words = useMemo(() => {
        return activeText.content.trim().split(/\s+/).filter(Boolean);
    }, [activeText.content]);

    // Sayaç Mekanizması
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setIsRunning(false);
                        setIsFinished(true);
                        setElapsedSeconds(durationSeconds);
                        setIsWaitingForMarking(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning, timeLeft, durationSeconds]);

    // Modül Dock Entegrasyonu (Simge Durumu ve Çoklu Modül Yönetimi)
    const { registerModule, unregisterModule } = useModuleDock();

    useEffect(() => {
        if (!isOpen) {
            unregisterModule('1-dk-okuma');
            return;
        }

        const badgeText = isRunning
            ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} • Devam`
            : isFinished
            ? 'Okuma Bitti'
            : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

        registerModule({
            id: '1-dk-okuma',
            title: 'Hızlı Okuma İstasyonu',
            shortTitle: '1 Dk Okuma',
            icon: '⏱️',
            gradient: 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white',
            badge: badgeText,
            isMinimized: windowState === 'minimized',
            onRestore: () => setWindowState('normal'),
            onClose: () => {
                if (onClose) onClose();
            }
        });
    }, [isOpen, windowState, timeLeft, isRunning, isFinished, onClose, registerModule, unregisterModule]);

    useEffect(() => {
        return () => {
            unregisterModule('1-dk-okuma');
        };
    }, [unregisterModule]);

    // Başlat / Duraklat
    const handleStartPause = () => {
        if (isFinished || timeLeft === 0) {
            handleReset();
            setTimeout(() => setIsRunning(true), 50);
            return;
        }
        setIsRunning(prev => !prev);
    };

    // Erken Bitirdim Butonu
    const handleFinishEarly = () => {
        const spent = Math.max(1, durationSeconds - timeLeft);
        clearInterval(timerRef.current);
        setIsRunning(false);
        setIsFinished(true);
        setElapsedSeconds(spent);
        setIsWaitingForMarking(true);
    };

    // Sıfırla
    const handleReset = () => {
        setIsRunning(false);
        setIsFinished(false);
        setIsWaitingForMarking(false);
        setShowReportModal(false);
        setTimeLeft(durationSeconds);
        setElapsedSeconds(durationSeconds);
        setLastReadWordIndex(null);
        setReadWordsCount(0);
        clearInterval(timerRef.current);
    };

    // Süre Seçimi (30s, 60s, 120s)
    const handleSelectDuration = (seconds) => {
        setDurationSeconds(seconds);
        setTimeLeft(seconds);
        setElapsedSeconds(seconds);
        setIsRunning(false);
        setIsFinished(false);
        setIsWaitingForMarking(false);
        setShowReportModal(false);
        setLastReadWordIndex(null);
        setReadWordsCount(0);
    };

    // Kelimeye Dokunma / İşaretleme
    const handleWordClick = (index) => {
        setLastReadWordIndex(index);
        const count = index + 1;
        setReadWordsCount(count);

        // Eğer süre bitmiş veya öğrenci bitirdiğinde işaretliyorsa doğrudan raporu aç
        if (isWaitingForMarking || isFinished || !isRunning) {
            setIsWaitingForMarking(false);
            setShowReportModal(true);
        }
    };

    // Cetvel Hareketi
    const handleMouseMove = (e) => {
        if (!showReadingRuler || !contentRef.current) return;
        const rect = contentRef.current.getBoundingClientRect();
        setRulerY(e.clientY - rect.top);
    };

    // Analiz İstatistikleri
    const effectiveSeconds = Math.max(1, elapsedSeconds || (durationSeconds - timeLeft) || durationSeconds);
    const wpm = readWordsCount > 0 ? Math.round((readWordsCount / effectiveSeconds) * 60) : 0;
    const completionPct = words.length > 0 ? Math.min(100, Math.round((readWordsCount / words.length) * 100)) : 0;
    const badge = getReadingBadge(wpm);
    const pedagogicalTip = getPedagogicalTip(wpm, completionPct);

    // SVG Dairesel Sayaç Hesaplaması (viewBox 0 0 80 80, merkez 40 40)
    const radius = 33;
    const circumference = 2 * Math.PI * radius; // 207.345
    const progress = durationSeconds > 0 ? Math.max(0, Math.min(1, timeLeft / durationSeconds)) : 1;
    const strokeDashoffset = circumference * (1 - progress);

    const isUrgent = isRunning && timeLeft <= 10 && timeLeft > 0;

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

            {/* Ana Pencere Kartı (Mobil: 100dvh, Masaüstü: Şık Köşeli Panel) */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    y: 0,
                    width: isMax ? '100vw' : '100%',
                    maxWidth: isMax ? '100%' : '1100px',
                    height: isMax ? '100dvh' : '100%',
                    maxHeight: isMax ? '100%' : '880px'
                }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="pointer-events-auto relative w-full h-[100dvh] sm:h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-800 bg-slate-900 text-slate-100 flex flex-col overflow-hidden select-none"
            >
                {/* --- 1. ÜST BAŞLIK VE SEKME YÖNETİMİ --- */}
                <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-slate-850 border-b border-slate-800/90 gap-2 shrink-0">
                    {/* Sol: Logo & Sekmeler */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 text-lg">
                            ⏱️
                        </div>

                        <div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1">
                                    <span>Hızlı Okuma İstasyonu</span>
                                </h2>
                                <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                                    İlkokul
                                </span>
                            </div>

                            {/* Sekme Değiştirici */}
                            <div className="flex items-center gap-1 mt-0.5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('reading')}
                                    className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                                        activeTab === 'reading'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    📖 Süreli Okuma
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('letters')}
                                    className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                        activeTab === 'letters'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    ✍️ Harf & Kelime
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Pencere Boyutu & Kapat Butonu */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                            type="button"
                            onClick={() => setWindowState('minimized')}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
                            title="Simge Durumuna Küçült"
                        >
                            <Minus className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setWindowState(prev => prev === 'maximized' ? 'normal' : 'maximized')}
                            className="hidden sm:flex w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white items-center justify-center transition cursor-pointer active:scale-95"
                            title={isMax ? "Normal Boyut" : "Tam Ekran"}
                        >
                            {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>

                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition cursor-pointer ml-1 active:scale-95"
                                title="Kapat"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </header>

                {/* --- 2. SEKME 1: SÜRELİ HIZLI OKUMA İSTASYONU --- */}
                {activeTab === 'reading' && (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* ========================================================= */}
                        {/* BELİRGİN VE ANİMASYONLU SAYAÇ HERO BÖLÜMÜ                */}
                        {/* ========================================================= */}
                        <div className="bg-gradient-to-b from-slate-850 to-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 shrink-0 shadow-inner">
                            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
                                
                                {/* Sol & Orta: Animasyonlu Sayaç Göstergesi + Durum Mesajı */}
                                <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto justify-between md:justify-start">
                                    {/* Dairesel Hassas SVG Sayaç */}
                                    <div className="relative flex items-center justify-center shrink-0 w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-slate-950 border-2 border-slate-800 shadow-xl shadow-black/50">
                                        <svg 
                                            className="w-full h-full -rotate-90 origin-center p-1" 
                                            viewBox="0 0 80 80"
                                        >
                                            {/* Arka plan ray halkası */}
                                            <circle
                                                cx="40"
                                                cy="40"
                                                r={radius}
                                                className="stroke-slate-800/90"
                                                strokeWidth="6"
                                                fill="transparent"
                                            />
                                            {/* Animasyonlu ilerleme halkası */}
                                            <motion.circle
                                                cx="40"
                                                cy="40"
                                                r={radius}
                                                className={`transition-all duration-300 ${
                                                    isUrgent 
                                                        ? 'stroke-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]' 
                                                        : isRunning 
                                                            ? 'stroke-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                                                            : timeLeft === 0
                                                                ? 'stroke-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                                                : 'stroke-amber-500/80'
                                                }`}
                                                strokeWidth="6.5"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                fill="transparent"
                                            />
                                        </svg>

                                        {/* Sayaç İçi Rakam ve Birim: Kusursuz Merkezlenmiş */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
                                            <motion.span 
                                                key={timeLeft}
                                                initial={isUrgent ? { scale: 1.15 } : { scale: 1 }}
                                                animate={{ scale: 1 }}
                                                className={`font-mono text-2xl sm:text-3xl font-black tracking-tight leading-none ${
                                                    isUrgent 
                                                        ? 'text-rose-400 animate-pulse' 
                                                        : isRunning 
                                                            ? 'text-amber-300' 
                                                            : 'text-white'
                                                }`}
                                            >
                                                {String(timeLeft).padStart(2, '0')}
                                            </motion.span>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                                                SN
                                            </span>
                                        </div>
                                    </div>

                                    {/* Dinamik Sevimli Maskot Durum Mesajı */}
                                    <div className="flex-1 md:flex-initial">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base sm:text-lg">
                                                {isWaitingForMarking ? '🎯' : isRunning ? (isUrgent ? '⚡' : '🚀') : isFinished ? '🏆' : '✨'}
                                            </span>
                                            <span className="text-xs sm:text-sm font-bold text-white">
                                                {isWaitingForMarking 
                                                    ? 'Süre bitti! Kaldığın yeri seç' 
                                                    : isRunning 
                                                        ? (isUrgent ? 'Son saniyeler! Devam et!' : 'Okuma başladı! Sakince oku') 
                                                        : isFinished 
                                                            ? 'Harika bir okuma oldu!' 
                                                            : 'Okumaya hazır mısın?'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1">
                                            {isWaitingForMarking
                                                ? 'Metinde en son okuduğun kelimeye tıkla 👇'
                                                : isRunning
                                                    ? 'Dudaklarını kıpırdatmadan gözlerinle takip etmeyi dene.'
                                                    : 'Süreyi seç ve "Başla" butonuna basarak oku.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Sağ: Süre Seçimi Hapları & Ana Kontrol Butonları */}
                                <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
                                    {/* Süre Seçenekleri */}
                                    <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80">
                                        <button
                                            onClick={() => handleSelectDuration(30)}
                                            disabled={isRunning}
                                            className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                                                durationSeconds === 30 
                                                    ? 'bg-amber-500 text-white shadow-xs' 
                                                    : 'text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            30 sn
                                        </button>
                                        <button
                                            onClick={() => handleSelectDuration(60)}
                                            disabled={isRunning}
                                            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                                                durationSeconds === 60 
                                                    ? 'bg-amber-500 text-white shadow-xs' 
                                                    : 'text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            1 Dk
                                        </button>
                                        <button
                                            onClick={() => handleSelectDuration(120)}
                                            disabled={isRunning}
                                            className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                                                durationSeconds === 120 
                                                    ? 'bg-amber-500 text-white shadow-xs' 
                                                    : 'text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            2 Dk
                                        </button>
                                    </div>

                                    {/* Başlat / Duraklat Butonu */}
                                    <button
                                        onClick={handleStartPause}
                                        className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-lg transition active:scale-95 cursor-pointer text-xs sm:text-sm ${
                                            isRunning 
                                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-300/40' 
                                                : isFinished || timeLeft === 0
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white shadow-emerald-500/20'
                                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/25'
                                        }`}
                                    >
                                        {isRunning ? (
                                            <>
                                                <Pause className="w-4 h-4 fill-current" />
                                                <span>Duraklat</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 fill-current" />
                                                <span>{isFinished || timeLeft === 0 ? 'Tekrar Başlat' : 'Okumaya Başla'}</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Erken Bitirdim Butonu (Çocuk süreden önce okumayı bitirirse) */}
                                    {isRunning && (
                                        <button
                                            onClick={handleFinishEarly}
                                            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1 shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer animate-bounce"
                                            title="Metni süreden önce bitirdim!"
                                        >
                                            <Flag className="w-3.5 h-3.5" />
                                            <span>Bitirdim! 🏁</span>
                                        </button>
                                    )}

                                    {/* Sıfırla Butonu */}
                                    <button
                                        onClick={handleReset}
                                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer border border-slate-700/80"
                                        title="Baştan Al"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- HİKAYE VE TİPOGRAFİ SEÇİCİ TOOLBAR --- */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2 bg-slate-850/80 border-b border-slate-800 text-xs shrink-0">
                            {/* Hikaye Listesi Seçici */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-slate-400 font-semibold">📚 Metin:</span>
                                <select
                                    value={isCustomMode ? 'custom' : selectedTextId}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setIsCustomMode(true);
                                        } else {
                                            setIsCustomMode(false);
                                            setSelectedTextId(e.target.value);
                                        }
                                        handleReset();
                                    }}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 sm:px-3 py-1 text-slate-200 font-medium outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer max-w-[190px] sm:max-w-xs truncate"
                                >
                                    {SAMPLE_TEXTS.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.title} ({t.grade})
                                        </option>
                                    ))}
                                    <option value="custom">✏️ Kendi Metnini Yaz</option>
                                </select>
                            </div>

                            {/* Tipografi ve Cetvel Araçları */}
                            <div className="flex items-center gap-2">
                                {/* Yazı Boyutu */}
                                <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                                    <button
                                        onClick={() => setFontSizeLevel(prev => Math.max(0, prev - 1))}
                                        disabled={fontSizeLevel === 0}
                                        className="p-1 text-slate-300 hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
                                        title="Yazıyı Küçült"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="px-2 font-mono font-semibold text-amber-400 text-xs">
                                        {['24', '30', '36', '44'][fontSizeLevel]}px
                                    </span>
                                    <button
                                        onClick={() => setFontSizeLevel(prev => Math.min(3, prev + 1))}
                                        disabled={fontSizeLevel === 3}
                                        className="p-1 text-slate-300 hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
                                        title="Yazıyı Büyüt"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Okuma Cetveli Butonu */}
                                <button
                                    onClick={() => setShowReadingRuler(prev => !prev)}
                                    className={`px-2.5 py-1 rounded-lg border font-semibold transition active:scale-95 cursor-pointer text-xs flex items-center gap-1 ${
                                        showReadingRuler 
                                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' 
                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                                    }`}
                                    title="Satır Takip Çizgisi"
                                >
                                    <span>📏 Cetvel</span>
                                </button>

                                {/* Raporu Tekrar Aç (Eğer daha önce kelime seçilmişse) */}
                                {readWordsCount > 0 && !showReportModal && (
                                    <button
                                        onClick={() => setShowReportModal(true)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold transition active:scale-95 cursor-pointer text-xs flex items-center gap-1"
                                    >
                                        <Trophy className="w-3 h-3 text-amber-400" />
                                        <span>Karnemi Gör</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* --- İŞARETLEME ÇAĞRISI BANNERI (YÜKSEK KONTRASTLI, NET VE OKUNAKLI) --- */}
                        <AnimatePresence>
                            {isWaitingForMarking && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0, y: -8 }}
                                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                                    exit={{ height: 0, opacity: 0, y: -8 }}
                                    className="bg-slate-950 border-y-2 border-amber-400 px-4 py-3 text-white shadow-2xl shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shrink-0 shadow-lg shadow-amber-400/30 animate-bounce">
                                            👇
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-amber-400 font-black text-sm sm:text-base tracking-wide uppercase">
                                                    🎉 HARİKA OKUDUN, TEBRİKLER! 👏
                                                </span>
                                                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    Sıra Sende
                                                </span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-100 font-bold mt-0.5 leading-snug">
                                                Aşağıdaki metinde <span className="text-amber-300 underline underline-offset-4 decoration-amber-400 decoration-2 font-black">en son okuduğun kelimeye parmağınla dokun</span>; okuma hızın ve başarı karnen anında hazırlansın!
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                        <span className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md uppercase tracking-wider animate-pulse">
                                            <span>📍</span>
                                            <span>Kaldığın Kelimeye Dokun</span>
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ========================================================= */}
                        {/* ANA OKUMA METNİ ALANI                                     */}
                        {/* ========================================================= */}
                        <div 
                            ref={contentRef}
                            onMouseMove={handleMouseMove}
                            className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-10 relative select-none cursor-default bg-slate-900"
                        >
                            {/* Okuma Cetveli (Satır Takip) */}
                            {showReadingRuler && (
                                <div 
                                    className="absolute left-0 right-0 h-16 bg-amber-400/15 border-y-2 border-amber-400/40 pointer-events-none transition-all duration-75 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                                    style={{ top: `${Math.max(0, rulerY - 32)}px` }}
                                />
                            )}

                            {/* Kelime İşaretleme Yüzen Rehberi */}
                            {isWaitingForMarking && (
                                <div className="flex justify-center mb-4">
                                    <span className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 text-xs sm:text-sm font-black px-4 py-2 rounded-full shadow-xl animate-bounce border-2 border-slate-950">
                                        <span>👉</span>
                                        <span>Kaldığın son kelimeye dokun</span>
                                        <span>👇</span>
                                    </span>
                                </div>
                            )}

                            {/* Hikaye Başlığı (Sığmayan Başlıklar Kayar Yazı Olur) */}
                            <div className="text-center mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                                <AutoScrollText className="font-diktemel text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide text-amber-300 text-center">
                                    {activeText.title}
                                </AutoScrollText>
                                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-2 rounded-full" />
                            </div>

                            {/* Özel Metin Girişi veya Standart Kelime Kelime Metin */}
                            {isCustomMode ? (
                                <div className="max-w-3xl mx-auto">
                                    <textarea
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value)}
                                        placeholder="Öğrencileriniz için buraya okuma metnini yazın veya yapıştırın..."
                                        className="w-full h-72 p-5 bg-slate-850 border-2 border-dashed border-amber-500/40 rounded-2xl font-diktemel text-2xl sm:text-3xl leading-loose tracking-wide text-slate-100 outline-none focus:ring-3 focus:ring-amber-500/30 resize-none shadow-inner"
                                    />
                                    <p className="text-xs text-slate-400 text-center mt-2">
                                        Metni yazdıktan sonra yukarıdaki sayaç ile hızlı okuma egzersizini hemen başlatabilirsiniz.
                                    </p>
                                </div>
                            ) : (
                                <div className="max-w-4xl mx-auto px-2 sm:px-6">
                                    <p 
                                        className={`font-diktemel ${['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'][fontSizeLevel]} leading-loose tracking-wide text-left`}
                                        style={{ wordSpacing: '0.18em' }}
                                    >
                                        {words.map((word, index) => {
                                            const isRead = lastReadWordIndex !== null && index <= lastReadWordIndex;
                                            const isCurrent = lastReadWordIndex === index;

                                            return (
                                                <span
                                                    key={index}
                                                    onClick={() => handleWordClick(index)}
                                                    className={`inline-block mr-2 px-1.5 py-0.5 rounded-xl transition cursor-pointer relative group touch-manipulation ${
                                                        isCurrent 
                                                            ? 'bg-amber-400 text-slate-950 font-black scale-110 shadow-lg ring-4 ring-amber-300/60 z-10' 
                                                            : isRead 
                                                                ? 'text-emerald-300 bg-emerald-500/15 font-semibold border-b-2 border-emerald-400' 
                                                                : isWaitingForMarking
                                                                    ? 'hover:bg-amber-400/30 hover:scale-105 active:scale-95 text-slate-200 border-b border-dashed border-amber-400/50'
                                                                    : 'hover:bg-white/10 active:scale-95 text-slate-100'
                                                    }`}
                                                    title={`Kelime #${index + 1} - Kaldığın yeri işaretlemek için dokun!`}
                                                >
                                                    {word}
                                                    {/* En son okunan kelime üzerine sevimli pin */}
                                                    {isCurrent && (
                                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-sans text-[10px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap animate-bounce flex items-center gap-0.5">
                                                            <span>📍</span>
                                                            <span>Kaldığın Yer</span>
                                                        </span>
                                                    )}
                                                </span>
                                            );
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* --- ALT BİLGİ & HIZLI İLERLEME ÇUBUĞU --- */}
                        <footer className="px-4 sm:px-6 py-2.5 bg-slate-850 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className={`w-2 h-2 rounded-full inline-block ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                                <span className="line-clamp-1">
                                    {isWaitingForMarking 
                                        ? '✨ Şimdi en son okuduğun kelimeye tıkla, başarı karnen hazırlansın!' 
                                        : 'Süre bittiğinde kaldığın kelimeye tıklayarak okuma hızını hemen ölçebilirsin.'}
                                </span>
                            </div>

                            {/* Canlı Skor Özeti */}
                            {readWordsCount > 0 && (
                                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl shadow-xs">
                                    <Trophy className="w-4 h-4 text-amber-400" />
                                    <div className="text-xs">
                                        <span className="font-bold text-white mr-1">
                                            {readWordsCount}
                                        </span>
                                        <span className="text-slate-300">kelime</span>
                                        <span className="ml-1.5 font-bold text-emerald-400">
                                            ({wpm} WPM 🚀)
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setShowReportModal(true)}
                                        className="ml-1 text-[11px] underline text-amber-300 font-bold hover:text-amber-200 cursor-pointer"
                                    >
                                        Karneni Gör
                                    </button>
                                </div>
                            )}
                        </footer>

                        {/* ========================================================= */}
                        {/* SEVİMLİ BAŞARI KARNESİ & ANALİZ MODALI                   */}
                        {/* ========================================================= */}
                        <AnimatePresence>
                            {showReportModal && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm">
                                    <motion.div
                                        initial={{ scale: 0.85, opacity: 0, y: 20 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        exit={{ scale: 0.85, opacity: 0, y: 20 }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                        className="relative w-full max-w-lg bg-gradient-to-b from-slate-850 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden text-center"
                                    >
                                        {/* Üst Kapat Butonu */}
                                        <button
                                            onClick={() => setShowReportModal(false)}
                                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                                            title="Kapat"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>

                                        {/* Şenlik Başlığı */}
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 text-3xl mb-2.5 animate-bounce">
                                                {badge.emoji}
                                            </div>
                                            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                                Tebrikler, Harika Okudun! 🎉
                                            </h3>
                                            <p className="text-xs text-amber-300 font-bold mt-0.5">
                                                İşte senin sevimli okuma başarın ve karnen:
                                            </p>
                                        </div>

                                        {/* 4'lü İstatistik Kartları Grid */}
                                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-5">
                                            {/* Kart 1: Okunan Kelime */}
                                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center">
                                                <span className="text-[11px] font-semibold text-slate-400">📖 Okunan Kelime</span>
                                                <div className="text-xl sm:text-2xl font-black text-white mt-1">
                                                    {readWordsCount}
                                                    <span className="text-xs font-medium text-slate-400 ml-1">/ {words.length}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-emerald-400 mt-0.5">
                                                    %{completionPct} tamamlandı
                                                </span>
                                            </div>

                                            {/* Kart 2: Okuma Hızı (WPM) */}
                                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center">
                                                <span className="text-[11px] font-semibold text-slate-400">⚡ Okuma Hızı</span>
                                                <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                                                    {wpm}
                                                </div>
                                                <span className="text-[10px] font-bold text-amber-300 mt-0.5">
                                                    Kelime / Dakika
                                                </span>
                                            </div>

                                            {/* Kart 3: Geçen Süre */}
                                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center">
                                                <span className="text-[11px] font-semibold text-slate-400">⏱️ Okuma Süresi</span>
                                                <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-1">
                                                    {effectiveSeconds}
                                                    <span className="text-xs font-medium text-slate-400 ml-0.5">sn</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                    {durationSeconds} saniyelik tur
                                                </span>
                                            </div>

                                            {/* Kart 4: Maskot Rozeti & Yıldızlar */}
                                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center">
                                                <span className="text-[11px] font-semibold text-slate-400">🏆 Başarı Rozeti</span>
                                                <div className="text-sm sm:text-base font-black text-orange-400 mt-1 flex items-center gap-1">
                                                    <span>{badge.title}</span>
                                                </div>
                                                <div className="flex items-center gap-0.5 mt-0.5">
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            className={`w-3.5 h-3.5 ${i < badge.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Maskot Özel Mesajı & Pedagojik İpucu */}
                                        <div className={`p-3.5 rounded-2xl border ${badge.bgSoft} mb-5 text-left`}>
                                            <div className="flex items-start gap-2.5">
                                                <div className="text-2xl shrink-0 mt-0.5">{badge.emoji}</div>
                                                <div>
                                                    <div className="text-xs font-black text-white">
                                                        {badge.subtitle}
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                                                        {badge.note}
                                                    </p>
                                                    <p className="text-[11px] text-amber-300/90 font-medium mt-1 pt-1 border-t border-white/10 leading-relaxed">
                                                        💡 {pedagogicalTip}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Eylemler Buton Çubuğu */}
                                        <div className="flex flex-col sm:flex-row items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setShowReportModal(false);
                                                    handleReset();
                                                    setTimeout(() => setIsRunning(true), 100);
                                                }}
                                                className="w-full sm:flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                <span>Tekrar Oku</span>
                                            </button>

                                            <button
                                                onClick={() => setShowReportModal(false)}
                                                className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-slate-700 transition active:scale-95 cursor-pointer"
                                            >
                                                <Eye className="w-4 h-4 text-emerald-400" />
                                                <span>Metinde İncele</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* --- 3. SEKME 2: HARF & KELİME ÇALIŞMA ATÖLYESİ --- */}
                {activeTab === 'letters' && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
                        {/* Harf Çalışma Üst Barı: Dinamik Font Seçimi */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 py-3 bg-slate-850 border-b border-slate-800 shrink-0">
                            {/* Harf Grubu Seçimi */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-300">Harf Grubu:</span>
                                <select
                                    value={selectedGroupIndex}
                                    onChange={(e) => setSelectedGroupIndex(Number(e.target.value))}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                >
                                    {LETTER_GROUPS.map((g, idx) => (
                                        <option key={idx} value={idx}>
                                            {g.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Dinamik Font Modu Toggle'ı */}
                            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-2xl border border-slate-700 shadow-xs">
                                <button
                                    onClick={() => setFontMode('normal')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                                        fontMode === 'normal'
                                            ? 'bg-slate-700 text-indigo-300 shadow-sm ring-1 ring-white/10'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Type className="w-3.5 h-3.5" />
                                    <span>Standart Abece (Normal)</span>
                                </button>

                                <button
                                    onClick={() => setFontMode('kilavuzlu')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                                        fontMode === 'kilavuzlu'
                                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                                            : 'text-slate-400 hover:text-indigo-400'
                                    }`}
                                >
                                    <PenTool className="w-3.5 h-3.5" />
                                    <span>🎯 Kılavuzlu (Yazılış Yönü)</span>
                                </button>
                            </div>

                            {/* Harf Boyutu */}
                            <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700 p-0.5 text-xs">
                                <button
                                    onClick={() => setPracticeFontSize('text-5xl')}
                                    className={`px-2 py-0.5 rounded font-semibold ${practiceFontSize === 'text-5xl' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                                >
                                    Büyük
                                </button>
                                <button
                                    onClick={() => setPracticeFontSize('text-6xl')}
                                    className={`px-2 py-0.5 rounded font-semibold ${practiceFontSize === 'text-6xl' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                                >
                                    Çok Büyük
                                </button>
                                <button
                                    onClick={() => setPracticeFontSize('text-7xl')}
                                    className={`px-2 py-0.5 rounded font-semibold ${practiceFontSize === 'text-7xl' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                                >
                                    Dev
                                </button>
                            </div>
                        </div>

                        {/* Hızlı Harf & Kelime Seçimi Rozetleri */}
                        <div className="px-3 sm:px-6 py-2.5 bg-slate-850/80 border-b border-slate-800 flex flex-wrap items-center gap-2 shrink-0 overflow-x-auto">
                            <span className="text-xs font-semibold text-slate-400 mr-1">Hızlı Harf:</span>
                            {LETTER_GROUPS[selectedGroupIndex].letters.map((l, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActivePracticeText(`${l} ${l} ${l}`)}
                                    className={`w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center border shadow-xs transition active:scale-95 cursor-pointer ${
                                        fontMode === 'kilavuzlu' ? 'font-diktemel-kilavuzlu' : 'font-diktemel-normal'
                                    } bg-slate-800 border-slate-700 hover:border-indigo-400 hover:text-indigo-400 text-slate-100`}
                                >
                                    {l}
                                </button>
                            ))}

                            <div className="h-6 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

                            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Örnek Kelimeler:</span>
                            {LETTER_GROUPS[selectedGroupIndex].samples.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActivePracticeText(s)}
                                    className={`px-3 py-1 rounded-xl text-sm font-semibold border shadow-xs transition active:scale-95 cursor-pointer ${
                                        fontMode === 'kilavuzlu' ? 'font-diktemel-kilavuzlu' : 'font-diktemel-normal'
                                    } bg-slate-800 border-slate-700 hover:border-indigo-400 hover:text-indigo-400 text-slate-100`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Ana Harf İnceleme ve Çalışma Tahtası */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center relative bg-slate-900">
                            {/* Rozet */}
                            <div className="mb-4 flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                                    fontMode === 'kilavuzlu'
                                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300/40'
                                        : 'bg-indigo-600 text-white'
                                }`}>
                                    {fontMode === 'kilavuzlu' ? '🎯 Kılavuzlu Yazılış Yönü Modu Aktif' : '✏️ Standart Temiz Abece Modu Aktif'}
                                </span>
                            </div>

                            {/* İlkokul Yazı Tahtası / Çalışma Kartı */}
                            <div className="w-full max-w-4xl p-6 sm:p-12 rounded-3xl bg-slate-850 shadow-xl border-2 border-indigo-900/50 relative text-center">
                                {/* İlkokul Defter Çizgileri */}
                                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-20 border-y border-dashed border-indigo-500/20 pointer-events-none" />

                                <input
                                    type="text"
                                    value={activePracticeText}
                                    onChange={(e) => setActivePracticeText(e.target.value)}
                                    className={`w-full text-center bg-transparent border-none outline-none tracking-wider leading-loose text-slate-100 transition-all ${practiceFontSize} ${
                                        fontMode === 'kilavuzlu' ? 'font-diktemel-kilavuzlu' : 'font-diktemel-normal'
                                    }`}
                                    placeholder="Buraya harf veya kelime yazın..."
                                />

                                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                                    <span>Aktif Font:</span>
                                    <code className="bg-slate-800 px-2 py-0.5 rounded font-mono text-indigo-400 font-bold border border-slate-700">
                                        {fontMode === 'kilavuzlu' ? 'TTKBDikTemel-Kilavuzlu' : 'TTKBDikTemel-Normal'}
                                    </code>
                                </div>
                            </div>
                        </div>

                        {/* Alt Bilgi */}
                        <footer className="px-4 sm:px-6 py-2.5 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span>İpucu: Kılavuzlu fontta harflerin yazılış yönlerini gösteren oklar ve başlangıç sayıları yer alır.</span>
                            </div>
                        </footer>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
