import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { useModuleDock } from '../context/ModuleDockContext';

export default function MinimizedModulesDock() {
  const { dockedModules, restoreModule, closeModule } = useModuleDock();
  const minimized = dockedModules.filter(m => m.isMinimized);

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [minimized.length]);

  const handleScroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -200 : 200;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 250);
  };

  if (minimized.length === 0) return null;

  return (
    <aside 
      aria-label="Simge Durumuna Küçültülmüş Modüller"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-[calc(100vw-1.5rem)] pointer-events-none"
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.92 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="pointer-events-auto flex items-center gap-1.5 p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/60"
      >
        {/* Sol Kaydırma Oku (Taşma Varsa Görünür) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition shadow-sm cursor-pointer shrink-0"
            title="Sola Kaydır"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Modüller Slider Alanı */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory py-0.5 px-0.5 max-w-[85vw] sm:max-w-[620px] scroll-smooth"
        >
          <AnimatePresence mode="popLayout">
            {minimized.map((mod) => (
              <motion.div
                key={mod.id}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="snap-start shrink-0 group relative flex items-center gap-2.5 px-3 py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-800/90 to-slate-850/90 hover:from-slate-750 hover:to-slate-800 border border-slate-700 hover:border-slate-500 shadow-md cursor-pointer select-none transition-all active:scale-97"
                onClick={() => restoreModule(mod.id)}
                title={`${mod.title} modülünü ekrana getir`}
              >
                {/* Modül İkonu */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 font-bold shadow-sm ${
                    mod.gradient || 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white'
                  }`}
                >
                  {mod.icon || '📦'}
                </div>

                {/* Modül Başlığı ve Anlık Canlı Durum */}
                <div className="text-left font-sans min-w-[90px] max-w-[150px] sm:max-w-[190px]">
                  <div className="text-xs font-bold text-white tracking-tight truncate leading-tight">
                    {mod.shortTitle || mod.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono font-semibold text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">{mod.badge || 'Çalışıyor'}</span>
                  </div>
                </div>

                {/* Geri Yükle & Kapat Butonları */}
                <div className="flex items-center gap-1 pl-1 border-l border-slate-700/80 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreModule(mod.id);
                    }}
                    className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 transition cursor-pointer"
                    title="Büyüt / Ekrana Getir"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeModule(mod.id);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                    title="Modülü Kapat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Sağ Kaydırma Oku (Taşma Varsa Görünür) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition shadow-sm cursor-pointer shrink-0"
            title="Sağa Kaydır"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </aside>
  );
}
