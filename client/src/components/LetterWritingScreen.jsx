import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, RotateCcw,
    X, Maximize2, Minimize2, GripHorizontal,
    Type, PenTool, Check, Palette, Eraser, Trash2, ArrowRight,
    HelpCircle, Eye, EyeOff, Layers, Download, Minus
} from 'lucide-react';
import { getStrokesForChar, transformStrokePoint } from '../utils/letterStrokes';
import { useModuleDock } from '../context/ModuleDockContext';

// MEB 1. Sınıf Ses Grupları ve Görsel Kartları
const MEB_LETTER_GROUPS = [
    {
        id: 'grup-1',
        title: '1. Grup: E - L - A - K - İ - N',
        letters: [
            { char: 'E', lower: 'e', word: 'Elma', icon: '🍎', strokes: 4, desc: 'Büyük E (4 hamle), Küçük e (1 hamle)' },
            { char: 'L', lower: 'l', word: 'Limon', icon: '🍋', strokes: 2, desc: 'Büyük L (2 hamle), Küçük l (1 hamle)' },
            { char: 'A', lower: 'a', word: 'Araba', icon: '🚗', strokes: 3, desc: 'Büyük A (3 hamle), Küçük a (2 hamle)' },
            { char: 'K', lower: 'k', word: 'Kedi', icon: '🐱', strokes: 3, desc: 'Büyük K (3 hamle), Küçük k (2 hamle)' },
            { char: 'İ', lower: 'i', word: 'İncir', icon: '🍇', strokes: 3, desc: 'Büyük İ (3 hamle), Küçük i (2 hamle)' },
            { char: 'N', lower: 'n', word: 'Nar', icon: '🫐', strokes: 3, desc: 'Büyük N (3 hamle), Küçük n (2 hamle)' }
        ]
    },
    {
        id: 'grup-2',
        title: '2. Grup: O - M - U - T - Ü - Y',
        letters: [
            { char: 'O', lower: 'o', word: 'Otobüs', icon: '🚌', strokes: 1, desc: 'Büyük O (1 hamle), Küçük o (1 hamle)' },
            { char: 'M', lower: 'm', word: 'Masa', icon: '🪑', strokes: 4, desc: 'Büyük M (4 hamle), Küçük m (3 hamle)' },
            { char: 'U', lower: 'u', word: 'Uçak', icon: '✈️', strokes: 1, desc: 'Büyük U (1 hamle), Küçük u (2 hamle)' },
            { char: 'T', lower: 't', word: 'Top', icon: '⚽', strokes: 2, desc: 'Büyük T (2 hamle), Küçük t (2 hamle)' },
            { char: 'Ü', lower: 'ü', word: 'Üzüm', icon: '🍇', strokes: 3, desc: 'Büyük Ü (3 hamle), Küçük ü (4 hamle)' },
            { char: 'Y', lower: 'y', word: 'Yıldız', icon: '⭐', strokes: 3, desc: 'Büyük Y (3 hamle), Küçük y (2 hamle)' }
        ]
    },
    {
        id: 'grup-3',
        title: '3. Grup: Ö - R - I - D - S - B',
        letters: [
            { char: 'Ö', lower: 'ö', word: 'Ördek', icon: '🦆', strokes: 3, desc: 'Büyük Ö (3 hamle), Küçük ö (3 hamle)' },
            { char: 'R', lower: 'r', word: 'Robot', icon: '🤖', strokes: 3, desc: 'Büyük R (3 hamle), Küçük r (2 hamle)' },
            { char: 'I', lower: 'ı', word: 'Işık', icon: '💡', strokes: 1, desc: 'Büyük I (1 hamle), Küçük ı (1 hamle)' },
            { char: 'D', lower: 'd', word: 'Dondurma', icon: '🍦', strokes: 2, desc: 'Büyük D (2 hamle), Küçük d (2 hamle)' },
            { char: 'S', lower: 's', word: 'Salyangoz', icon: '🐌', strokes: 1, desc: 'Büyük S (1 hamle), Küçük s (1 hamle)' },
            { char: 'B', lower: 'b', word: 'Balık', icon: '🐟', strokes: 3, desc: 'Büyük B (3 hamle), Küçük b (2 hamle)' }
        ]
    },
    {
        id: 'grup-4',
        title: '4. Grup: Z - Ç - G - Ş - C - P',
        letters: [
            { char: 'Z', lower: 'z', word: 'Zebra', icon: '🦓', strokes: 3, desc: 'Büyük Z (3 hamle), Küçük z (3 hamle)' },
            { char: 'Ç', lower: 'ç', word: 'Çiçek', icon: '🌸', strokes: 2, desc: 'Büyük Ç (2 hamle), Küçük ç (2 hamle)' },
            { char: 'G', lower: 'g', word: 'Güneş', icon: '☀️', strokes: 2, desc: 'Büyük G (2 hamle), Küçük g (2 hamle)' },
            { char: 'Ş', lower: 'ş', word: 'Şapka', icon: '🧢', strokes: 2, desc: 'Büyük Ş (2 hamle), Küçük ş (2 hamle)' },
            { char: 'C', lower: 'c', word: 'Ceviz', icon: '🌰', strokes: 1, desc: 'Büyük C (1 hamle), Küçük c (1 hamle)' },
            { char: 'P', lower: 'p', word: 'Papatya', icon: '🌼', strokes: 2, desc: 'Büyük P (2 hamle), Küçük p (2 hamle)' }
        ]
    },
    {
        id: 'grup-5',
        title: '5. Grup: H - V - Ğ - F - J',
        letters: [
            { char: 'H', lower: 'h', word: 'Havuç', icon: '🥕', strokes: 3, desc: 'Büyük H (3 hamle), Küçük h (2 hamle)' },
            { char: 'V', lower: 'v', word: 'Vapur', icon: '🚢', strokes: 2, desc: 'Büyük V (2 hamle), Küçük v (2 hamle)' },
            { char: 'Ğ', lower: 'ğ', word: 'Ağaç', icon: '🌳', strokes: 3, desc: 'Büyük Ğ (3 hamle), Küçük ğ (3 hamle)' },
            { char: 'F', lower: 'f', word: 'Fincan', icon: '☕', strokes: 3, desc: 'Büyük F (3 hamle), Küçük f (2 hamle)' },
            { char: 'J', lower: 'j', word: 'Jelibon', icon: '🍬', strokes: 1, desc: 'Büyük J (1 hamle), Küçük j (2 hamle)' }
        ]
    }
];

// Rakamlar
const NUMBERS_LIST = [
    { char: '0', word: 'Sıfır', icon: '⭕', strokes: 1 },
    { char: '1', word: 'Bir', icon: '☝️', strokes: 2 },
    { char: '2', word: 'İki', icon: '✌️', strokes: 1 },
    { char: '3', word: 'Üç', icon: '🥉', strokes: 1 },
    { char: '4', word: 'Dört', icon: '🍀', strokes: 3 },
    { char: '5', word: 'Beş', icon: '🖐️', strokes: 2 },
    { char: '6', word: 'Altı', icon: '🎲', strokes: 1 },
    { char: '7', word: 'Yedi', icon: '🌈', strokes: 2 },
    { char: '8', word: 'Sekiz', icon: '🎱', strokes: 1 },
    { char: '9', word: 'Dokuz', icon: '🎈', strokes: 1 }
];

// Çizgi Çalışmaları (Motor Beceriler)
const LINE_EXERCISES = [
    { id: 'dik', title: 'Dikey Çizgiler', desc: 'Yukarıdan aşağıya dik çizgi', icon: '│' },
    { id: 'yatay', title: 'Yatay Çizgiler', desc: 'Soldan sağa yatay çizgi', icon: '─' },
    { id: 'egik-sag', title: 'Sağa Eğik Çizgiler', desc: 'Yukarıdan sağa eğimli çizgi', icon: '╱' },
    { id: 'egik-sol', title: 'Sola Eğik Çizgiler', desc: 'Yukarıdan sola eğimli çizgi', icon: '╲' },
    { id: 'dalga', title: 'Dalgalı Çizgiler', desc: 'Akıcı dalga ve kavis hareketi', icon: '〰️' },
    { id: 'cember', title: 'Çember & Yuvarlak', desc: 'Saat yönünün tersine dairesel çizim', icon: '⭕' }
];

// Canlı Çizim Renkleri (Çocuk dostu, parlak ve net)
const PEN_COLORS = [
    { name: 'Neon Mavi', hex: '#38bdf8' },
    { name: 'Zümrüt Yeşil', hex: '#10b981' },
    { name: 'Elektrik Mor', hex: '#a855f7' },
    { name: 'Güneş Sarısı', hex: '#facc15' },
    { name: 'Canlı Turuncu', hex: '#fb923c' },
    { name: 'Pembe Şeker', hex: '#f43f5e' },
    { name: 'Saf Beyaz', hex: '#ffffff' }
];

export default function LetterWritingScreen({ isOpen = true, onClose }) {
    // Kategori: 'letters', 'numbers', 'lines'
    const [category, setCategory] = useState('letters');
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
    const [selectedLetter, setSelectedLetter] = useState(MEB_LETTER_GROUPS[0].letters[0]);
    const [isUpperCase, setIsUpperCase] = useState(true);
    const [selectedNumber, setSelectedNumber] = useState(NUMBERS_LIST[1]);
    const [selectedLine, setSelectedLine] = useState(LINE_EXERCISES[0]);

    // Çizim Araçları State'leri
    const [penColor, setPenColor] = useState(PEN_COLORS[0].hex);
    const [penSize, setPenSize] = useState(8);
    const [isEraser, setIsEraser] = useState(false);
    const [showGhostGuide, setShowGhostGuide] = useState(true);
    const [showGuidelines, setShowGuidelines] = useState(true);
    const [isDemonstrating, setIsDemonstrating] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Pencere Durumu & Taşıma
    const [windowState, setWindowState] = useState('normal'); // 'normal', 'maximized'
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    // Canvas Referansları
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef(null);
    const containerRef = useRef(null);

    // Kılavuz Çizgi ve Harf Geometrik Ölçüleri
    const [metrics, setMetrics] = useState({
        xLeft: 120,
        letterWidth: 160,
        yTepe: 70,
        yGovde: 140,
        yTaban: 210,
        yKuyruk: 280,
        spacing: 70,
        width: 600,
        height: 400
    });

    // Dinamik Yuvarlak İmleç Pozisyonu (Kalem boyutuna göre büyür/küçülür)
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, visible: false });

    // Animasyon Gösterim Referansları & State'leri
    const [demoPencil, setDemoPencil] = useState(null); // { x, y, strokeNum }
    const animRef = useRef(null);
    const pauseTimerRef = useRef(null);

    // Mevcut aktif karakter anahtarını belirle
    const currentCharKey = category === 'letters'
        ? (isUpperCase ? selectedLetter.char : selectedLetter.lower)
        : category === 'numbers'
            ? selectedNumber.char
            : selectedLine.id;

    const currentChar = category === 'letters'
        ? (isUpperCase ? selectedLetter.char : selectedLetter.lower)
        : category === 'numbers'
            ? selectedNumber.char
            : '';

    const currentCard = category === 'letters' ? selectedLetter : category === 'numbers' ? selectedNumber : null;

    // Ölçüleri güncelleme
    const updateMetrics = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        if (W === 0 || H === 0) return;

        const spacing = Math.max(36, Math.min(Math.floor(H * 0.20), 105));
        const centerY = H * 0.46;
        const yTepe = centerY - 1.5 * spacing;
        const yGovde = centerY - 0.5 * spacing;
        const yTaban = centerY + 0.5 * spacing;
        const yKuyruk = centerY + 1.5 * spacing;
        const letterWidth = Math.min(W * 0.75, spacing * 1.6);
        const xLeft = (W - letterWidth) / 2;

        setMetrics({
            xLeft,
            letterWidth,
            yTepe,
            yGovde,
            yTaban,
            yKuyruk,
            spacing,
            width: W,
            height: H
        });
    };

    // Canvas Boyutlandırma
    useEffect(() => {
        if (!isOpen) return;
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            if (!canvas || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            updateMetrics();
        };

        const timer = setTimeout(resizeCanvas, 100);
        window.addEventListener('resize', resizeCanvas);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [isOpen, windowState]);

    const stopDemonstration = () => {
        if (animRef.current) {
            cancelAnimationFrame(animRef.current);
            animRef.current = null;
        }
        if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = null;
        }
        setIsDemonstrating(false);
        setDemoPencil(null);
    };

    // Karakter değiştiğinde canvas'ı ve animasyonu sıfırla
    useEffect(() => {
        stopDemonstration();
        clearCanvas();
    }, [selectedLetter, isUpperCase, selectedNumber, selectedLine, category]);

    useEffect(() => {
        return () => {
            stopDemonstration();
        };
    }, []);

    // Modül Dock Entegrasyonu (Simge Durumu ve Çoklu Modül Yönetimi)
    const { registerModule, unregisterModule } = useModuleDock();

    useEffect(() => {
        if (!isOpen) {
            unregisterModule('harf-cizgi-atolyesi');
            return;
        }

        const badgeText = category === 'letters'
            ? `${currentCharKey} Harfi • ${isUpperCase ? 'Büyük' : 'Küçük'}`
            : category === 'numbers'
            ? `${currentCharKey} Rakamı`
            : `${selectedLine.title}`;

        registerModule({
            id: 'harf-cizgi-atolyesi',
            title: 'Harf & Çizgi Atölyesi',
            shortTitle: 'Harf Atölyesi',
            icon: '✏️',
            gradient: 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white',
            badge: badgeText,
            isMinimized: windowState === 'minimized',
            onRestore: () => setWindowState('normal'),
            onClose: () => {
                if (onClose) onClose();
            }
        });
    }, [isOpen, windowState, category, currentCharKey, isUpperCase, selectedLine, onClose, registerModule, unregisterModule]);

    useEffect(() => {
        return () => {
            unregisterModule('harf-cizgi-atolyesi');
        };
    }, [unregisterModule]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    // "Nasıl Yazılır?" Animasyon Motoru - MEB Standart Çizgilerini Birebir Takip Eder
    const startDemonstration = () => {
        stopDemonstration();
        clearCanvas();
        setIsDemonstrating(true);

        const strokes = getStrokesForChar(currentCharKey);
        if (!strokes || strokes.length === 0) {
            setIsDemonstrating(false);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            setIsDemonstrating(false);
            return;
        }
        const ctx = canvas.getContext('2d');

        // Hamleleri piksel koordinatlarına çevir
        const pixelStrokes = strokes.map(stroke =>
            stroke.map(pt => transformStrokePoint(pt, metrics))
        );

        let currentStrokeIndex = 0;
        let pointIndex = 0;
        let t = 0;

        let prevPos = pixelStrokes[0][0];
        setDemoPencil({ x: prevPos.x, y: prevPos.y, strokeNum: 1 });

        const step = () => {
            if (currentStrokeIndex >= pixelStrokes.length) {
                setDemoPencil(null);
                setIsDemonstrating(false);
                return;
            }

            const stroke = pixelStrokes[currentStrokeIndex];

            // Nokta hamlesi (örn: 'i', 'ü', 'ö' noktaları)
            if (stroke.length === 1) {
                const p = stroke[0];
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(penSize / 2, 4), 0, Math.PI * 2);
                ctx.fillStyle = penColor;
                ctx.fill();
                setDemoPencil({ x: p.x, y: p.y, strokeNum: currentStrokeIndex + 1 });

                currentStrokeIndex++;
                pointIndex = 0;
                t = 0;
                if (currentStrokeIndex < pixelStrokes.length) {
                    prevPos = pixelStrokes[currentStrokeIndex][0];
                    setDemoPencil({ x: prevPos.x, y: prevPos.y, strokeNum: currentStrokeIndex + 1 });
                }
                pauseTimerRef.current = setTimeout(() => {
                    animRef.current = requestAnimationFrame(step);
                }, 300);
                return;
            }

            const p1 = stroke[pointIndex];
            const p2 = stroke[pointIndex + 1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);

            // Doğal el yazısı hızı
            const stepSize = Math.max(3.5, 5);
            const deltaT = dist > 0 ? stepSize / dist : 1;

            t += deltaT;
            if (t >= 1) {
                t = 0;
                ctx.beginPath();
                ctx.moveTo(prevPos.x, prevPos.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = penColor;
                ctx.lineWidth = penSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();

                prevPos = p2;
                setDemoPencil({ x: p2.x, y: p2.y, strokeNum: currentStrokeIndex + 1 });

                pointIndex++;
                if (pointIndex >= stroke.length - 1) {
                    // Hamle bitti
                    currentStrokeIndex++;
                    pointIndex = 0;
                    t = 0;
                    if (currentStrokeIndex < pixelStrokes.length) {
                        prevPos = pixelStrokes[currentStrokeIndex][0];
                        setDemoPencil({ x: prevPos.x, y: prevPos.y, strokeNum: currentStrokeIndex + 1 });
                        pauseTimerRef.current = setTimeout(() => {
                            animRef.current = requestAnimationFrame(step);
                        }, 260);
                        return;
                    } else {
                        // Tüm hamleler tamamlandı
                        setDemoPencil(null);
                        setIsDemonstrating(false);
                        return;
                    }
                }
            } else {
                const curX = p1.x + dx * t;
                const curY = p1.y + dy * t;

                ctx.beginPath();
                ctx.moveTo(prevPos.x, prevPos.y);
                ctx.lineTo(curX, curY);
                ctx.strokeStyle = penColor;
                ctx.lineWidth = penSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();

                prevPos = { x: curX, y: curY };
                setDemoPencil({ x: curX, y: curY, strokeNum: currentStrokeIndex + 1 });
            }

            animRef.current = requestAnimationFrame(step);
        };

        animRef.current = requestAnimationFrame(step);
    };

    // Çizim Olayları (Pointer & Touch uyumlu, kaydırmayı engeller)
    const getCoordinates = (e) => {
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
        if (isDemonstrating) return;
        if (e.cancelable && e.type.startsWith('touch')) {
            e.preventDefault();
        }
        try {
            if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId) {
                e.currentTarget.setPointerCapture(e.pointerId);
            }
        } catch (_) {}

        const pt = getCoordinates(e);
        isDrawingRef.current = true;
        lastPointRef.current = pt;
        setHasDrawn(true);
        setCursorPos({ x: pt.x, y: pt.y, visible: true });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (isEraser ? penSize * 3 : penSize) / 2, 0, Math.PI * 2);
        ctx.fillStyle = isEraser ? '#090d16' : penColor;
        ctx.fill();
    };

    const handlePointerMove = (e) => {
        const pt = getCoordinates(e);
        setCursorPos({ x: pt.x, y: pt.y, visible: true });

        if (!isDrawingRef.current || isDemonstrating) return;
        if (e.cancelable && e.type.startsWith('touch')) {
            e.preventDefault();
        }
        const last = lastPointRef.current;
        if (!last) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.strokeStyle = isEraser ? '#090d16' : penColor;
        ctx.lineWidth = isEraser ? penSize * 3 : penSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        ctx.restore();

        lastPointRef.current = pt;
    };

    const handlePointerUp = (e) => {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        try {
            if (e && e.currentTarget && e.currentTarget.releasePointerCapture && e.pointerId) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch (_) {}
        if (e && e.type && e.type.startsWith('touch')) {
            setCursorPos(prev => ({ ...prev, visible: false }));
        }
    };

    const handlePointerLeave = () => {
        setCursorPos(prev => ({ ...prev, visible: false }));
        isDrawingRef.current = false;
        lastPointRef.current = null;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ display: windowState === 'minimized' ? 'none' : 'flex' }}
                className={`fixed z-50 flex flex-col shadow-2xl overflow-hidden bg-slate-950 text-slate-100 ${
                    windowState === 'maximized'
                        ? 'inset-0 sm:inset-4 md:inset-6 sm:rounded-2xl sm:border sm:border-slate-700/80'
                        : 'inset-0 sm:inset-auto sm:w-[96vw] sm:max-w-5xl sm:h-[88vh] sm:max-h-[820px] sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-slate-700/80'
                }`}
            >
                {/* 1. ÜST BAŞLIK & TAŞIMA BARI (Header Bar) */}
                <div className="shrink-0 h-13 sm:h-14 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between select-none gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
                            <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h3 className="font-bold text-xs sm:text-sm md:text-base text-white tracking-tight truncate">
                                    Harf & Çizgi Atölyesi
                                </h3>
                                <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
                                    MEB
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Kategori Sekmeleri (Harfler, Rakamlar, Çizgiler) */}
                    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                        <button
                            type="button"
                            onClick={() => setCategory('letters')}
                            className={`px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                category === 'letters'
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            🔤 <span className="hidden xs:inline">Harfler</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('numbers')}
                            className={`px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                category === 'numbers'
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            🔢 <span className="hidden xs:inline">Rakamlar</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('lines')}
                            className={`px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                category === 'lines'
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            〰️ <span className="hidden xs:inline">Çizgiler</span>
                        </button>
                    </div>

                    {/* Sağ Kontroller: Küçült / Büyüt / Kapat */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => setWindowState('minimized')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
                            title="Simge Durumuna Küçült"
                        >
                            <Minus className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setWindowState(prev => prev === 'maximized' ? 'normal' : 'maximized')}
                            className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
                            title={windowState === 'maximized' ? 'Normal Boyut' : 'Tam Ekran'}
                        >
                            {windowState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-500/20 transition-colors cursor-pointer active:scale-95"
                            title="Kapat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 1.5 MOBİL HIZLI SEÇİM BARI (lg:hidden) */}
                <div className="lg:hidden shrink-0 bg-slate-900/95 border-b border-slate-800 px-3 py-2 space-y-2 select-none z-20">
                    {category === 'letters' && (
                        <>
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedGroupIndex}
                                    onChange={(e) => {
                                        const idx = Number(e.target.value);
                                        setSelectedGroupIndex(idx);
                                        setSelectedLetter(MEB_LETTER_GROUPS[idx].letters[0]);
                                    }}
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-500"
                                >
                                    {MEB_LETTER_GROUPS.map((grp, idx) => (
                                        <option key={grp.id} value={idx}>
                                            {grp.title}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsUpperCase(true)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                            isUpperCase ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                                        }`}
                                    >
                                        Büyük
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsUpperCase(false)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                            !isUpperCase ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                                        }`}
                                    >
                                        Küçük
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                                {MEB_LETTER_GROUPS[selectedGroupIndex].letters.map((item) => {
                                    const displayChar = isUpperCase ? item.char : item.lower;
                                    const isSelected = selectedLetter.char === item.char;
                                    return (
                                        <button
                                            key={item.char}
                                            type="button"
                                            onClick={() => setSelectedLetter(item)}
                                            className={`px-3 py-1.5 rounded-xl border shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md scale-105'
                                                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
                                            }`}
                                        >
                                            <span className="text-xl font-bold font-diktemel leading-none">{displayChar}</span>
                                            <span className="text-xs">{item.icon}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {category === 'numbers' && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                            {NUMBERS_LIST.map((num) => {
                                const isSelected = selectedNumber.char === num.char;
                                return (
                                    <button
                                        key={num.char}
                                        type="button"
                                        onClick={() => setSelectedNumber(num)}
                                        className={`px-3 py-1.5 rounded-xl border shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md scale-105'
                                                : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
                                        }`}
                                    >
                                        <span className="text-xl font-bold font-diktemel leading-none">{num.char}</span>
                                        <span className="text-xs">{num.icon}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {category === 'lines' && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                            {LINE_EXERCISES.map((line) => {
                                const isSelected = selectedLine.id === line.id;
                                return (
                                    <button
                                        key={line.id}
                                        type="button"
                                        onClick={() => setSelectedLine(line)}
                                        className={`px-3 py-1.5 rounded-xl border shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{line.icon}</span>
                                        <span className="text-xs font-semibold">{line.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. ANA ÇALIŞMA ALANI (Masaüstü: 2 Sütun, Mobil: Tam Ekran Canvas) */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0 bg-slate-950">
                    
                    {/* SOL PANEL (Masaüstünde Görünür, Mobilde Üstteki Hızlı Seçim Barı Kullanılır) */}
                    <div className="hidden lg:flex lg:col-span-4 border-r border-slate-800 flex-col min-h-0 bg-slate-900/60 p-4 space-y-4 overflow-y-auto">
                        
                        {/* A. Harfler Kategorisi */}
                        {category === 'letters' && (
                            <>
                                {/* Grup Seçimi */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        MEB Harf Grupları
                                    </label>
                                    <select
                                        value={selectedGroupIndex}
                                        onChange={(e) => {
                                            const idx = Number(e.target.value);
                                            setSelectedGroupIndex(idx);
                                            setSelectedLetter(MEB_LETTER_GROUPS[idx].letters[0]);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-500 shadow-sm"
                                    >
                                        {MEB_LETTER_GROUPS.map((grp, idx) => (
                                            <option key={grp.id} value={idx}>
                                                {grp.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Büyük / Küçük Harf Seçimi Toggle */}
                                <div className="flex items-center justify-between p-1 bg-slate-950 rounded-xl border border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setIsUpperCase(true)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            isUpperCase
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Büyük Harfler (A, B, C)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsUpperCase(false)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            !isUpperCase
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Küçük Harfler (a, b, c)
                                    </button>
                                </div>

                                {/* Seçili Grubun Harf Butonları */}
                                <div className="grid grid-cols-3 gap-2">
                                    {MEB_LETTER_GROUPS[selectedGroupIndex].letters.map((item) => {
                                        const displayChar = isUpperCase ? item.char : item.lower;
                                        const isSelected = selectedLetter.char === item.char;

                                        return (
                                            <button
                                                key={item.char}
                                                type="button"
                                                onClick={() => setSelectedLetter(item)}
                                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-105 font-bold'
                                                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800'
                                                }`}
                                            >
                                                <span className="text-3xl font-diktemel font-bold leading-none">
                                                    {displayChar}
                                                </span>
                                                <span className={`text-[10px] mt-1 ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                                                    {item.icon} {item.word}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Seçili Harfin Görsel & Fonetik Kartı */}
                                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl">
                                            {selectedLetter.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-lg font-bold text-white font-diktemel">
                                                    {currentChar}
                                                </span>
                                                <span className="text-xs text-indigo-300 font-medium">
                                                    harfi ({selectedLetter.word})
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                {selectedLetter.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* B. Rakamlar Kategorisi */}
                        {category === 'numbers' && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    0-9 Rakamlar
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {NUMBERS_LIST.map((num) => {
                                        const isSelected = selectedNumber.char === num.char;
                                        return (
                                            <button
                                                key={num.char}
                                                type="button"
                                                onClick={() => setSelectedNumber(num)}
                                                className={`py-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold scale-105'
                                                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                                                }`}
                                            >
                                                <span className="text-2xl font-bold font-diktemel leading-none">
                                                    {num.char}
                                                </span>
                                                <span className="text-[10px] mt-1">{num.icon}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-white font-diktemel">
                                            Rakam: {selectedNumber.char} ({selectedNumber.word})
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            Doğru başlangıç noktası ve yazılış yönü
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* C. Çizgi Çalışmaları Kategorisi */}
                        {category === 'lines' && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Temel Motor Beceri Çizgileri
                                </label>
                                <div className="space-y-1.5">
                                    {LINE_EXERCISES.map((line) => {
                                        const isSelected = selectedLine.id === line.id;
                                        return (
                                            <button
                                                key={line.id}
                                                type="button"
                                                onClick={() => setSelectedLine(line)}
                                                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                                                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-lg w-6 text-center">{line.icon}</span>
                                                    <div>
                                                        <div className="text-xs font-semibold">{line.title}</div>
                                                        <div className={`text-[10px] ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                                                            {line.desc}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && <Check className="w-4 h-4 text-slate-950" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Çizim Renk Paleti & Kalem Boyutu */}
                        <div className="mt-auto pt-3 border-t border-slate-800/80 space-y-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                <span>Kalem Rengi</span>
                                <span>{penSize}px</span>
                            </div>

                            {/* Renk Düğmeleri */}
                            <div className="flex items-center justify-between gap-1">
                                {PEN_COLORS.map((c) => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        onClick={() => {
                                            setPenColor(c.hex);
                                            setIsEraser(false);
                                        }}
                                        style={{ backgroundColor: c.hex }}
                                        className={`w-7 h-7 rounded-full transition-all cursor-pointer shadow-sm ${
                                            penColor === c.hex && !isEraser
                                                ? 'ring-2 ring-white scale-110'
                                                : 'hover:scale-105 opacity-80 hover:opacity-100'
                                        }`}
                                        title={c.name}
                                    />
                                ))}
                            </div>

                            {/* Kalınlık Kaydırıcısı */}
                            <input
                                type="range"
                                min="4"
                                max="24"
                                step="2"
                                value={penSize}
                                onChange={(e) => setPenSize(Number(e.target.value))}
                                className="w-full accent-amber-500 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* SAĞ PANEL (8 Sütun): MEB Kılavuz Çizgili Çizim Tuvali */}
                    <div className="lg:col-span-8 flex flex-col min-h-0 bg-slate-950 relative overflow-hidden">
                        
                        {/* Tuval Üst Araç Çubuğu (Masaüstü için) */}
                        <div className="hidden lg:flex shrink-0 h-12 bg-slate-900/60 border-b border-slate-800/80 px-4 items-center justify-between gap-2 z-20">
                            
                            {/* Sol Araçlar: Nasıl Yazılır, Kılavuz Çizgi Göster/Gizle, Hayalet Harf */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    type="button"
                                    onClick={isDemonstrating ? stopDemonstration : startDemonstration}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                                >
                                    {isDemonstrating ? (
                                        <>
                                            <Pause className="w-3.5 h-3.5 fill-current text-amber-300" />
                                            <span className="text-amber-200">Durdur</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            <span>Nasıl Yazılır?</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowGhostGuide(prev => !prev)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                        showGhostGuide
                                            ? 'bg-slate-800 text-amber-300 border-amber-500/30'
                                            : 'bg-slate-950 text-slate-400 border-slate-800'
                                    }`}
                                    title="Örnek Harf İzi"
                                >
                                    {showGhostGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">İz Harf</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowGuidelines(prev => !prev)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                        showGuidelines
                                            ? 'bg-slate-800 text-cyan-300 border-cyan-500/30'
                                            : 'bg-slate-950 text-slate-400 border-slate-800'
                                    }`}
                                    title="MEB 4 Çizgili Satır"
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Kılavuz Çizgiler</span>
                                </button>
                            </div>

                            {/* Sağ Araçlar: Silgi, Temizle */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setIsEraser(prev => !prev)}
                                    className={`p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                                        isEraser
                                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                                    }`}
                                    title="Silgi Modu"
                                >
                                    <Eraser className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={clearCanvas}
                                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors cursor-pointer"
                                    title="Tuvali Temizle"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Kılavuz Çizgili Satır & Dokunmatik Çizim Alanı */}
                        <div
                            ref={containerRef}
                            className="flex-1 relative flex items-center justify-center overflow-hidden select-none bg-[#090d16]"
                        >
                            {/* 1. MEB Standart Kılavuz Çizgili Satırlar (4 Çizgi, 3 Eşit Aralık) */}
                            {showGuidelines && (
                                <div className="absolute inset-0 pointer-events-none px-4">
                                    {/* 1. Çizgi: Tepe Çizgisi */}
                                    <div
                                        className="absolute left-4 right-4 h-0.5 bg-sky-400/50 shadow-xs"
                                        style={{ top: `${metrics.yTepe}px` }}
                                    >
                                        <span className="absolute -top-4 left-2 text-[10px] text-sky-400/80 font-mono font-medium">
                                            Tepe Çizgisi
                                        </span>
                                    </div>

                                    {/* 2. Çizgi: Gövde Çizgisi (Kesikli) */}
                                    <div
                                        className="absolute left-4 right-4 border-t-2 border-dashed border-slate-500/50"
                                        style={{ top: `${metrics.yGovde}px` }}
                                    >
                                        <span className="absolute -top-3.5 left-2 text-[10px] text-slate-400/70 font-mono font-medium">
                                            Gövde Çizgisi
                                        </span>
                                    </div>

                                    {/* 3. Çizgi: Taban Çizgisi (Kırmızı Zemin) */}
                                    <div
                                        className="absolute left-4 right-4 h-1 bg-rose-500/85 shadow-sm"
                                        style={{ top: `${metrics.yTaban}px` }}
                                    >
                                        <span className="absolute -top-4 left-2 text-[10px] text-rose-400 font-bold font-mono">
                                            Taban Çizgisi
                                        </span>
                                    </div>

                                    {/* 4. Çizgi: Kuyruk Çizgisi */}
                                    <div
                                        className="absolute left-4 right-4 h-0.5 bg-sky-400/50 shadow-xs"
                                        style={{ top: `${metrics.yKuyruk}px` }}
                                    >
                                        <span className="absolute -top-4 left-2 text-[10px] text-sky-400/80 font-mono font-medium">
                                            Kuyruk Çizgisi
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 2. Hayalet Harf & Yön Okları Kılavuzu (MEB Standart Vektör Şablon) */}
                            {showGhostGuide && (
                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                    {getStrokesForChar(currentCharKey).map((stroke, sIdx) => {
                                        const pts = stroke.map(p => transformStrokePoint(p, metrics));
                                        if (pts.length < 2) {
                                            const p = pts[0];
                                            return (
                                                <g key={`stroke-${sIdx}`}>
                                                    <circle cx={p.x} cy={p.y} r={penSize * 0.75} fill="rgba(255,255,255,0.3)" />
                                                    <circle cx={p.x} cy={p.y} r="10" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                                                    <text x={p.x} y={p.y + 3.5} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">
                                                        {sIdx + 1}
                                                    </text>
                                                </g>
                                            );
                                        }

                                        const pathD = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                                        const startP = pts[0];
                                        const midIdx = Math.floor(pts.length / 2);
                                        const midP = pts[midIdx];
                                        const nextP = pts[Math.min(midIdx + 1, pts.length - 1)];
                                        const angle = Math.atan2(nextP.y - midP.y, nextP.x - midP.x) * (180 / Math.PI);

                                        return (
                                            <g key={`stroke-${sIdx}`}>
                                                {/* Kesikli kılavuz şablon çizgisi */}
                                                <path
                                                    d={pathD}
                                                    fill="none"
                                                    stroke="rgba(255, 255, 255, 0.20)"
                                                    strokeWidth="12"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeDasharray="6 8"
                                                />

                                                {/* Akış yön oku */}
                                                {pts.length > 2 && (
                                                    <g transform={`translate(${midP.x}, ${midP.y}) rotate(${angle})`}>
                                                        <polygon points="-7,-4.5 5,0 -7,4.5" fill="#38bdf8" opacity="0.85" />
                                                    </g>
                                                )}

                                                {/* Başlangıç hamle numarası rozeti */}
                                                <circle
                                                    cx={startP.x}
                                                    cy={startP.y}
                                                    r="11"
                                                    fill="#f59e0b"
                                                    stroke="#0f172a"
                                                    strokeWidth="1.5"
                                                />
                                                <text
                                                    x={startP.x}
                                                    y={startP.y + 3.5}
                                                    textAnchor="middle"
                                                    fill="#0f172a"
                                                    fontSize="10"
                                                    fontWeight="bold"
                                                >
                                                    {sIdx + 1}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            )}

                            {/* 3. Etkileşimli Çizim Canvas'ı (Öğrencinin Dokunarak Çizdiği Katman) */}
                            <canvas
                                ref={canvasRef}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerLeave}
                                onTouchStart={handlePointerDown}
                                onTouchMove={handlePointerMove}
                                onTouchEnd={handlePointerUp}
                                onTouchCancel={handlePointerLeave}
                                className="absolute inset-0 w-full h-full cursor-none z-10 touch-none"
                            />

                            {/* 4. Dinamik Dairesel Fırça / Silgi İmleci (Kalem Boyutuna Göre Büyür/Küçülür) */}
                            {cursorPos.visible && !isDemonstrating && (
                                <div
                                    className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-[width,height] duration-75 flex items-center justify-center shadow-lg"
                                    style={{
                                        left: `${cursorPos.x}px`,
                                        top: `${cursorPos.y}px`,
                                        width: `${isEraser ? penSize * 3 : penSize}px`,
                                        height: `${isEraser ? penSize * 3 : penSize}px`,
                                        borderColor: isEraser ? '#f43f5e' : '#ffffff',
                                        backgroundColor: isEraser ? 'rgba(244, 63, 94, 0.25)' : `${penColor}35`,
                                        boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 0 12px ${isEraser ? 'rgba(244, 63, 94, 0.6)' : penColor + '99'}`
                                    }}
                                >
                                    {(isEraser ? penSize * 3 : penSize) >= 10 && (
                                        <div
                                            className="w-1.5 h-1.5 rounded-full shadow-xs"
                                            style={{ backgroundColor: isEraser ? '#f43f5e' : '#ffffff' }}
                                        />
                                    )}
                                </div>
                            )}

                            {/* 5. Gösterim Modunda MEB Çizgilerini Takip Eden Animasyonlu Kalem */}
                            {demoPencil && isDemonstrating && (
                                <div
                                    className="pointer-events-none absolute z-40 flex flex-col items-center select-none"
                                    style={{
                                        left: `${demoPencil.x}px`,
                                        top: `${demoPencil.y}px`,
                                        transform: 'translate(-4px, -100%)'
                                    }}
                                >
                                    {/* Kalem ucunda çizim kıvılcımı */}
                                    <div 
                                        className="w-3.5 h-3.5 rounded-full animate-ping absolute bottom-0 -mb-1"
                                        style={{ backgroundColor: penColor }}
                                    />
                                    {/* Kalem Görseli */}
                                    <div className="text-2xl -rotate-45 drop-shadow-xl">
                                        ✏️
                                    </div>
                                    {/* Hamle Rozeti */}
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-md whitespace-nowrap -mt-1">
                                        {demoPencil.strokeNum}. Hamle
                                    </span>
                                </div>
                            )}

                            {/* İpucu Göstergesi (Alt Bar) */}
                            <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none z-20">
                                <span className="bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
                                    💡 Parmağınızla veya kalemle harfin başlangıç noktasından ({category === 'lines' ? 'çizgi boyunca' : 'numaralı daireden'}) ok yönünde çizin.
                                </span>
                                <span className="bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 hidden sm:inline">
                                    Kılavuz Çizgi Standardı: MEB TTKB
                                </span>
                            </div>
                        </div>

                        {/* MOBİL ALT ÇİZİM ARAÇLARI DOKU (lg:hidden) */}
                        <div className="lg:hidden shrink-0 bg-slate-900/95 border-t border-slate-800 px-3 py-2 flex items-center justify-between gap-2 z-20 select-none">
                            {/* Renk Seçimi */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {PEN_COLORS.slice(0, 5).map((c) => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        onClick={() => {
                                            setPenColor(c.hex);
                                            setIsEraser(false);
                                        }}
                                        style={{ backgroundColor: c.hex }}
                                        className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                                            penColor === c.hex && !isEraser
                                                ? 'ring-2 ring-white scale-110'
                                                : 'opacity-70 hover:opacity-100'
                                        }`}
                                        title={c.name}
                                    />
                                ))}
                            </div>

                            {/* Çizim & Kontrol Butonları */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsEraser(prev => !prev)}
                                    className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                                        isEraser
                                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                                            : 'bg-slate-950 border-slate-800 text-slate-300'
                                    }`}
                                    title="Silgi"
                                >
                                    <Eraser className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={clearCanvas}
                                    className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                                    title="Temizle"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={isDemonstrating ? stopDemonstration : startDemonstration}
                                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                                    title={isDemonstrating ? "Durdur" : "Nasıl Yazılır?"}
                                >
                                    {isDemonstrating ? (
                                        <>
                                            <Pause className="w-3.5 h-3.5 fill-current text-amber-300" />
                                            <span className="text-amber-200">Dur</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            <span>Yaz</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowGhostGuide(prev => !prev)}
                                    className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                                        showGhostGuide
                                            ? 'bg-slate-800 text-amber-300 border-amber-500/30'
                                            : 'bg-slate-950 text-slate-400 border-slate-800'
                                    }`}
                                    title="İz Harf"
                                >
                                    {showGhostGuide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
