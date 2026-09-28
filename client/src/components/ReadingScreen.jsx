import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, RotateCcw, Clock, BookOpen, Volume2, 
    Sparkles, CheckCircle2, ChevronDown, Plus, Minus,
    X, Maximize2, Minimize2, MoveRight, Award, Share2,
    GripHorizontal, Type, PenTool, Check, Palette, FileText
} from 'lucide-react';

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

export default function ReadingScreen({ isOpen = true, onClose, onAddToCanvas }) {
    // Aktif Ana Sekme: 'reading' (1 Dk Okuma) veya 'letters' (Harf/Kelime Çalışma Atölyesi)
    const [activeTab, setActiveTab] = useState('reading');

    // Pencere Durumu: 'normal', 'minimized', 'maximized'
    const [windowState, setWindowState] = useState('normal');

    // Arka Plan Teması: Daima koyu mod (Gece Teması)
    const theme = 'dark';

    // --- SEKME 1: OKUMA METNİ & SAYAÇ STATE'LERİ ---
    const [selectedTextId, setSelectedTextId] = useState('metin-1');
    const [customText, setCustomText] = useState('');
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [fontSizeLevel, setFontSizeLevel] = useState(2); // 0: 24px, 1: 30px, 2: 36px, 3: 48px
    const [showReadingRuler, setShowReadingRuler] = useState(false);
    const [rulerY, setRulerY] = useState(0);

    // Sayaç State'leri
    const [durationSeconds, setDurationSeconds] = useState(60);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isRunning, setIsRunning] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [lastReadWordIndex, setLastReadWordIndex] = useState(null);
    const [readWordsCount, setReadWordsCount] = useState(0);

    // --- SEKME 2: HARF & KELİME ÇALIŞMA ATÖLYESİ STATE'LERİ ---
    // fontMode: 'normal' (TTKBDikTemel-Normal) veya 'kilavuzlu' (TTKBDikTemel-Kilavuzlu ok ve sayılar)
    const [fontMode, setFontMode] = useState('kilavuzlu'); 
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
    const [activePracticeText, setActivePracticeText] = useState('Ela lale el ele.');
    const [practiceFontSize, setPracticeFontSize] = useState('text-6xl'); // text-5xl, text-6xl, text-7xl

    const timerRef = useRef(null);
    const contentRef = useRef(null);
    const windowConstraintsRef = useRef(null);

    // Aktif Okuma Metni
    const activeText = isCustomMode 
        ? { title: 'Özel Okuma Metnim', content: customText || 'Lütfen buraya kendi okuma metninizi yazın...' }
        : SAMPLE_TEXTS.find(t => t.id === selectedTextId) || SAMPLE_TEXTS[0];

    const words = activeText.content.trim().split(/\s+/);

    // Zamanlayıcı
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setIsRunning(false);
                        setIsFinished(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning, timeLeft]);

    const handleStartPause = () => {
        if (isFinished) handleReset();
        setIsRunning(prev => !prev);
    };

    const handleReset = () => {
        setIsRunning(false);
        setIsFinished(false);
        setTimeLeft(durationSeconds);
        setLastReadWordIndex(null);
        setReadWordsCount(0);
        clearInterval(timerRef.current);
    };

    const handleSelectDuration = (seconds) => {
        setDurationSeconds(seconds);
        setTimeLeft(seconds);
        setIsRunning(false);
        setIsFinished(false);
    };

    const handleWordClick = (index) => {
        setLastReadWordIndex(index);
        setReadWordsCount(index + 1);
    };

    const handleMouseMove = (e) => {
        if (!showReadingRuler || !contentRef.current) return;
        const rect = contentRef.current.getBoundingClientRect();
        setRulerY(e.clientY - rect.top);
    };

    // Tema Stilleri (Göz yormayan soft ve dinlendirici paletler)
    const themeStyles = {
        parchment: {
            container: 'bg-[#faf7f2] dark:bg-slate-900 border-[#e8dfd5] dark:border-slate-800 text-slate-800 dark:text-slate-100',
            header: 'bg-[#f5ede4]/90 dark:bg-slate-850/90 border-[#e5d9cd] dark:border-slate-800',
            toolbar: 'bg-[#f7f0e8]/80 dark:bg-slate-850/60 border-[#e5d9cd] dark:border-slate-800',
            content: 'bg-[#faf7f2] dark:bg-slate-900 text-slate-800 dark:text-slate-100',
            footer: 'bg-[#f5ede4]/90 dark:bg-slate-850/90 border-[#e5d9cd] dark:border-slate-800',
            accent: 'text-amber-800 dark:text-amber-300'
        },
        sage: {
            container: 'bg-[#f4f8f5] dark:bg-slate-900 border-[#dce8df] dark:border-slate-800 text-slate-800 dark:text-slate-100',
            header: 'bg-[#eaf2ec]/90 dark:bg-slate-850/90 border-[#d4e4d8] dark:border-slate-800',
            toolbar: 'bg-[#edf5ef]/80 dark:bg-slate-850/60 border-[#d4e4d8] dark:border-slate-800',
            content: 'bg-[#f4f8f5] dark:bg-slate-900 text-slate-800 dark:text-slate-100',
            footer: 'bg-[#eaf2ec]/90 dark:bg-slate-850/90 border-[#d4e4d8] dark:border-slate-800',
            accent: 'text-emerald-800 dark:text-emerald-300'
        },
        white: {
            container: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100',
            header: 'bg-slate-50/90 dark:bg-slate-850/90 border-slate-200 dark:border-slate-800',
            toolbar: 'bg-slate-100/70 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800',
            content: 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100',
            footer: 'bg-slate-50/90 dark:bg-slate-850/90 border-slate-200 dark:border-slate-800',
            accent: 'text-indigo-800 dark:text-indigo-300'
        },
        dark: {
            container: 'bg-slate-900 border-slate-800 text-slate-100',
            header: 'bg-slate-850 border-slate-800',
            toolbar: 'bg-slate-800 border-slate-750',
            content: 'bg-slate-900 text-slate-100',
            footer: 'bg-slate-850 border-slate-800',
            accent: 'text-indigo-300'
        }
    };

    const currentTheme = themeStyles[theme] || themeStyles.parchment;

    if (!isOpen) return null;

    // --- KÜÇÜLTÜLMÜŞ (SİMGE DURUMUNA GETİRİLMİŞ) YÜZEN KAPSÜL ---
    if (windowState === 'minimized') {
        return (
            <motion.div
                drag
                dragMomentum={false}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-xl border-2 border-amber-300 cursor-pointer select-none active:scale-95 transition"
                onClick={() => setWindowState('normal')}
                title="Okuma ve Harf Atölyesini Aç"
            >
                <BookOpen className="w-5 h-5 animate-bounce" />
                <div className="text-left font-sans">
                    <div className="text-xs font-bold leading-tight">Okuma & Harf Atölyesi</div>
                    <div className="text-[10px] text-amber-100">
                        {activeTab === 'reading' ? `1 Dk Sayaç (${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')})` : 'Harf Çalışması'}
                    </div>
                </div>
                <Maximize2 className="w-4 h-4 ml-1 opacity-80" />
            </motion.div>
        );
    }

    // --- TAM / NORMAL PENCERE GÖRÜNÜMÜ ---
    const isMax = windowState === 'maximized';

    return (
        <div ref={windowConstraintsRef} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            {/* Arka Plan Karartması (Yarı saydam, pencere dışına tıklama) */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto transition-opacity"
                onClick={() => {}}
            />

            {/* Hareket Ettirilebilir (Draggable) Ana Pencere */}
            <motion.div
                drag={!isMax}
                dragMomentum={false}
                dragElastic={0.05}
                initial={{ scale: 0.9, opacity: 0, y: 15 }}
                animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    y: 0,
                    width: isMax ? '98vw' : '92vw',
                    maxWidth: isMax ? '100%' : '1080px',
                    height: isMax ? '96vh' : '88vh',
                    maxHeight: isMax ? '100%' : '840px'
                }}
                exit={{ scale: 0.9, opacity: 0, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`pointer-events-auto relative rounded-3xl shadow-2xl border flex flex-col overflow-hidden select-none ${currentTheme.container}`}
            >
                {/* --- 1. ÜST BAŞLIK VE PENCERE KONTROLLERİ (Sürüklenebilir Alan) --- */}
                <header className={`window-drag-handle flex flex-wrap items-center justify-between px-5 py-3 border-b cursor-grab active:cursor-grabbing backdrop-blur-md ${currentTheme.header}`}>
                    {/* Sol: İkon, Başlık ve Sekme Değiştirici */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold shadow-inner">
                            <BookOpen className="w-5 h-5" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold flex items-center gap-1.5">
                                    <span>İlkokul Okuma & Harf Atölyesi</span>
                                </h2>
                                <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold font-mono">
                                    MEB TTKB Uyumlu
                                </span>
                            </div>

                            {/* Sekme Butonları (Tabs) */}
                            <div className="flex items-center gap-1.5 mt-1">
                                <button
                                    onClick={() => setActiveTab('reading')}
                                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                        activeTab === 'reading'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    📖 1 Dk Okuma Ekranı
                                </button>
                                <button
                                    onClick={() => setActiveTab('letters')}
                                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                        activeTab === 'letters'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    ✍️ Harf & Kelime Çalışması
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Tema Seçici, Büyüt/Küçült ve Kapat Butonları */}
                    <div className="flex items-center gap-1.5 sm:gap-2">


                        {/* Simge Durumuna Küçült */}
                        <button
                            onClick={() => setWindowState('minimized')}
                            className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                            title="Simge Durumuna Küçült"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>

                        {/* Tam Ekran / Normal Boyut */}
                        <button
                            onClick={() => setWindowState(prev => prev === 'maximized' ? 'normal' : 'maximized')}
                            className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                            title={isMax ? "Normal Boyut" : "Genişlet"}
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>

                        {/* Kapat */}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center transition cursor-pointer ml-1"
                                title="Kapat"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </header>

                {/* --- 2. SEKME 1: 1 DAKİKA OKUMA EKRANI --- */}
                {activeTab === 'reading' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Araç Çubuğu: Hikaye Seçici, Süre Kontrolleri, Okuma Cetveli */}
                        <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b text-xs ${currentTheme.toolbar}`}>
                            {/* Hikaye Seçici */}
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">Hikaye:</span>
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
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer max-w-[210px] sm:max-w-xs truncate"
                                >
                                    {SAMPLE_TEXTS.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.title} ({t.grade})
                                        </option>
                                    ))}
                                    <option value="custom">✏️ Kendi Hikayeni Yaz</option>
                                </select>
                            </div>

                            {/* 1 Dakikalık Sayaç & Kontroller */}
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                                <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                                    <span>
                                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-1.5">
                                    <button
                                        onClick={() => handleSelectDuration(60)}
                                        className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${durationSeconds === 60 ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        1 Dk
                                    </button>
                                    <button
                                        onClick={() => handleSelectDuration(120)}
                                        className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${durationSeconds === 120 ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        2 Dk
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-1.5">
                                    <button
                                        onClick={handleStartPause}
                                        className={`px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer text-xs ${
                                            isRunning 
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                    >
                                        {isRunning ? (
                                            <>
                                                <Pause className="w-3 h-3" />
                                                <span>Duraklat</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-3 h-3" />
                                                <span>{isFinished ? 'Tekrar' : 'Başlat'}</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleReset}
                                        className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
                                        title="Sıfırla"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Tipografi Araçları */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                                    <button
                                        onClick={() => setFontSizeLevel(prev => Math.max(0, prev - 1))}
                                        disabled={fontSizeLevel === 0}
                                        className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
                                        title="Yazıyı Küçült"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="px-2 font-mono font-semibold text-slate-700 dark:text-slate-200 text-xs">
                                        {['24', '30', '36', '48'][fontSizeLevel]}px
                                    </span>
                                    <button
                                        onClick={() => setFontSizeLevel(prev => Math.min(3, prev + 1))}
                                        disabled={fontSizeLevel === 3}
                                        className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
                                        title="Yazıyı Büyüt"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowReadingRuler(prev => !prev)}
                                    className={`px-2.5 py-1 rounded-lg border font-semibold transition active:scale-95 cursor-pointer text-xs ${
                                        showReadingRuler 
                                            ? 'bg-amber-500 text-white border-amber-600' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                    }`}
                                    title="Satır Takip Çizgisi"
                                >
                                    📏 Cetvel
                                </button>

                                {onAddToCanvas && (
                                    <button
                                        onClick={() => {
                                            onAddToCanvas({
                                                text: activeText.content,
                                                title: activeText.title,
                                                fontFamily: 'TTKBDikTemel-Normal',
                                                fontSize: 28
                                            });
                                            if (onClose) onClose();
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                                        title="Bu metni panoya yazı olarak aktar"
                                    >
                                        <Share2 className="w-3 h-3" />
                                        <span className="hidden md:inline">Panoya Aktar</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Metin Alanı */}
                        <div 
                            ref={contentRef}
                            onMouseMove={handleMouseMove}
                            className={`flex-1 overflow-y-auto p-6 sm:p-10 relative select-none cursor-default ${currentTheme.content}`}
                        >
                            {/* Okuma Cetveli (Satır Takip Kılavuzu) */}
                            {showReadingRuler && (
                                <div 
                                    className="absolute left-0 right-0 h-14 bg-amber-400/20 border-y-2 border-amber-500/40 pointer-events-none transition-all duration-75"
                                    style={{ top: `${Math.max(0, rulerY - 28)}px` }}
                                />
                            )}

                            {/* Metin Başlığı */}
                            <div className="text-center mb-6">
                                <h3 className={`font-diktemel text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide ${currentTheme.accent}`}>
                                    {activeText.title}
                                </h3>
                                <div className="w-20 h-0.5 bg-amber-400/70 mx-auto mt-2 rounded-full" />
                            </div>

                            {/* Özel Metin Girişi veya Standart Okuma Metni */}
                            {isCustomMode ? (
                                <div className="max-w-3xl mx-auto">
                                    <textarea
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value)}
                                        placeholder="Öğrencileriniz için buraya metin yazın veya yapıştırın..."
                                        className="w-full h-72 p-5 bg-white/90 dark:bg-slate-800/90 border-2 border-dashed border-amber-300 dark:border-slate-700 rounded-2xl font-diktemel text-3xl leading-loose tracking-wide text-slate-800 dark:text-slate-100 outline-none focus:ring-3 focus:ring-amber-400/30 resize-none shadow-inner"
                                    />
                                </div>
                            ) : (
                                <div className="max-w-4xl mx-auto px-2 sm:px-6">
                                    <p 
                                        className={`font-diktemel ${['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'][fontSizeLevel]} leading-loose tracking-wide text-left`}
                                        style={{ wordSpacing: '0.15em' }}
                                    >
                                        {words.map((word, index) => {
                                            const isRead = lastReadWordIndex !== null && index <= lastReadWordIndex;
                                            const isCurrent = lastReadWordIndex === index;

                                            return (
                                                <span
                                                    key={index}
                                                    onClick={() => handleWordClick(index)}
                                                    className={`inline-block mr-2 px-1 rounded-md transition cursor-pointer hover:bg-amber-200/50 ${
                                                        isCurrent 
                                                            ? 'bg-amber-400 text-amber-950 font-bold scale-105 shadow-sm ring-2 ring-amber-500' 
                                                            : isRead 
                                                                ? 'text-emerald-700 dark:text-emerald-400 font-medium' 
                                                                : ''
                                                    }`}
                                                    title={`Kelime #${index + 1} - Kaldığınız yeri işaretlemek için tıklayın`}
                                                >
                                                    {word}
                                                </span>
                                            );
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Alt Skor Alanı */}
                        <footer className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 ${currentTheme.footer}`}>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                                <span>1 dakika bittiğinde kaldığınız son kelimeye tıklayarak okuma hızınızı ölçün!</span>
                            </div>

                            {readWordsCount > 0 && (
                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 border border-emerald-500/30 px-3.5 py-1 rounded-xl shadow-xs"
                                >
                                    <Award className="w-4 h-4 text-amber-500" />
                                    <div className="text-xs">
                                        <span className="font-bold text-slate-800 dark:text-slate-100 mr-1">
                                            {readWordsCount}
                                        </span>
                                        <span>kelime okundu!</span>
                                        {durationSeconds === 60 && (
                                            <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                                                (Hız: {readWordsCount} Kelime / Dk 🚀)
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </footer>
                    </div>
                )}

                {/* --- 3. SEKME 2: HARF & KELİME ÇALIŞMA ATÖLYESİ (NORMAL VS KILAVUZLU TOGGLE) --- */}
                {activeTab === 'letters' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Harf Çalışma Üst Barı: Dinamik Toggle (Normal vs Kılavuzlu Ok/Sayı) */}
                        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b ${currentTheme.toolbar}`}>
                            {/* Sol: Harf Grubu Seçimi */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Harf Grubu:</span>
                                <select
                                    value={selectedGroupIndex}
                                    onChange={(e) => setSelectedGroupIndex(Number(e.target.value))}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                >
                                    {LETTER_GROUPS.map((g, idx) => (
                                        <option key={idx} value={idx}>
                                            {g.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ORTA: DİNAMİK FONT GEÇİŞ TOGGLE'I (KULLANICI TALEBİ) */}
                            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-slate-800/90 p-1 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-xs">
                                <button
                                    onClick={() => setFontMode('normal')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                                        fontMode === 'normal'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                                            : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                                    }`}
                                >
                                    <PenTool className="w-3.5 h-3.5" />
                                    <span>🎯 Kılavuzlu (Yazılış Yönü & Oklar)</span>
                                </button>
                            </div>

                            {/* Sağ: Harf Boyutu & Tahtaya Aktar */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs">
                                    <button
                                        onClick={() => setPracticeFontSize('text-5xl')}
                                        className={`px-2 py-0.5 rounded font-semibold ${practiceFontSize === 'text-5xl' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        Büyük
                                    </button>
                                    <button
                                        onClick={() => setPracticeFontSize('text-6xl')}
                                        className={`px-2 py-0.5 rounded font-semibold ${practiceFontSize === 'text-6xl' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        Çok Büyük
                                    </button>
                                    <button
                                        onClick={() => setPracticeFontSize('text-7xl')}
                                        className={`px-2 py-0.5 rounded font-semibold ${practiceFontSize === 'text-7xl' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        Dev
                                    </button>
                                </div>

                                {onAddToCanvas && (
                                    <button
                                        onClick={() => {
                                            onAddToCanvas({
                                                text: activePracticeText,
                                                title: fontMode === 'kilavuzlu' ? 'Kılavuzlu Harf Çalışması' : 'Standart Harf Çalışması',
                                                fontFamily: fontMode === 'kilavuzlu' ? 'TTKBDikTemel-Kilavuzlu' : 'TTKBDikTemel-Normal',
                                                fontSize: 48
                                            });
                                            if (onClose) onClose();
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                                        title="Bu harf veya kelimeyi panoya aktar"
                                    >
                                        <Share2 className="w-3 h-3" />
                                        <span className="hidden md:inline">Panoya Aktar</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Harf Seçim Rozetleri (Hızlı Tıklama) */}
                        <div className={`px-5 py-2.5 border-b flex flex-wrap items-center gap-2 ${currentTheme.toolbar}`}>
                            <span className="text-xs font-semibold text-slate-500 mr-1">Hızlı Seçim:</span>
                            {LETTER_GROUPS[selectedGroupIndex].letters.map((l, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActivePracticeText(`${l} ${l} ${l}`)}
                                    className={`w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center border shadow-xs transition active:scale-95 cursor-pointer ${
                                        fontMode === 'kilavuzlu' ? 'font-diktemel-kilavuzlu' : 'font-diktemel-normal'
                                    } bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600`}
                                >
                                    {l}
                                </button>
                            ))}

                            <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />

                            <span className="text-xs font-semibold text-slate-500 mr-1">Örnek Kelimeler:</span>
                            {LETTER_GROUPS[selectedGroupIndex].samples.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActivePracticeText(s)}
                                    className={`px-3 py-1 rounded-xl text-sm font-semibold border shadow-xs transition active:scale-95 cursor-pointer ${
                                        fontMode === 'kilavuzlu' ? 'font-diktemel-kilavuzlu' : 'font-diktemel-normal'
                                    } bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Ana Harf İnceleme ve Çalışma Tuvali */}
                        <div className={`flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center relative ${currentTheme.content}`}>
                            {/* Kılavuzlu / Normal Durum Bildirim Rozeti */}
                            <div className="mb-4 flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                                    fontMode === 'kilavuzlu'
                                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                                        : 'bg-indigo-600 text-white'
                                }`}>
                                    {fontMode === 'kilavuzlu' ? '🎯 Kılavuzlu Yazılış Yönü Modu Aktif' : '✏️ Standart Temiz Abece Modu Aktif'}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    (Metnin üzerine tıklayarak istediğiniz harfi veya kelimeyi serbestçe yazabilirsiniz)
                                </span>
                            </div>

                            {/* Devasa İlkokul Yazı Tahtası / Çalışma Kartı */}
                            <div className="w-full max-w-4xl p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-800 shadow-xl border-2 border-indigo-100 dark:border-slate-700 relative text-center">
                                {/* İlkokul Yazı Defteri Kılavuz Çizgileri */}
                                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-20 border-y border-dashed border-indigo-200 dark:border-indigo-900/40 pointer-events-none" />

                                <input
                                    type="text"
                                    value={activePracticeText}
                                    onChange={(e) => setActivePracticeText(e.target.value)}
                                    className={`w-full text-center bg-transparent border-none outline-none tracking-wider leading-loose text-slate-800 dark:text-slate-100 transition-all ${practiceFontSize} ${
                                        fontMode === 'kilavuzlu' ? 'font-diktemel-kilavuzlu' : 'font-diktemel-normal'
                                    }`}
                                    placeholder="Buraya harf veya kelime yazın..."
                                />

                                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span>Aktif Font:</span>
                                    <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                        {fontMode === 'kilavuzlu' ? 'TTKBDikTemel-Kilavuzlu' : 'TTKBDikTemel-Normal'}
                                    </code>
                                </div>
                            </div>
                        </div>

                        {/* Alt Bilgi */}
                        <footer className={`px-5 py-3 border-t flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 ${currentTheme.footer}`}>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span>İpucu: Kılavuzlu fontta harflerin yazılış yönlerini gösteren oklar ve başlangıç sayıları yer alır.</span>
                            </div>
                        </footer>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
