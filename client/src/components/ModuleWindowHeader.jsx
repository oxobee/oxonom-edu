import React from 'react';
import { Minus, Maximize2, Minimize2, X } from 'lucide-react';

/**
 * ModuleWindowHeader
 * Standart ve anlaşılır modül pencere başlığı.
 * 
 * - Simge Durumuna Küçült: Minus (—) ikonu
 * - Büyüt / Normal Boyut: Maximize2 / Minimize2 ikonu
 * - Kapat: X ikonu
 */
export default function ModuleWindowHeader({
  icon,
  iconGradient = 'from-amber-500 to-orange-500',
  title,
  subtitle,
  badge,
  children,
  isMaximized = false,
  onMinimize,
  onToggleMaximize,
  onClose,
  className = ''
}) {
  return (
    <header className={`flex items-center justify-between px-3 sm:px-5 py-2.5 bg-slate-900 border-b border-slate-850 gap-2 shrink-0 select-none ${className}`}>
      {/* Sol: İkon, Başlık ve Alt Alanlar */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {icon && (
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr ${iconGradient} text-white flex items-center justify-center font-bold shadow-md text-lg shrink-0`}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {title}
            </h2>
            {badge && (
              <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Orta: Opsiyonel Özel Butonlar (Sekmeler vb.) */}
      {children && (
        <div className="flex items-center gap-1">
          {children}
        </div>
      )}

      {/* Sağ: Standart Pencere Yönetim Butonları */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Simge Durumuna Küçült (Eksiksiz & Net - Minus Butonu) */}
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Simge Durumuna Küçült"
          >
            <Minus className="w-4 h-4" />
          </button>
        )}

        {/* Büyüt / Normal Boyuta Döndür */}
        {onToggleMaximize && (
          <button
            type="button"
            onClick={onToggleMaximize}
            className="hidden sm:flex w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white items-center justify-center transition cursor-pointer active:scale-95"
            title={isMaximized ? "Normal Boyut" : "Tam Ekran"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Kapat Butonu */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 ml-0.5"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
