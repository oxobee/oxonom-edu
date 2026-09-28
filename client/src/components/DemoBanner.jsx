import React from 'react';
import { Sparkles, Clock } from 'lucide-react';

const DemoBanner = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isStudent = user?.role === 'student';

  return (
    <div
      role="alert"
      className={`w-full shrink-0 z-40 transition-colors backdrop-blur-md border-b ${
        isStudent
          ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-500/20 text-emerald-200'
          : 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-amber-500/20 text-amber-200'
      } px-3 sm:px-4 py-1.5 sm:py-2`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Icon, Badge & Explanation */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0 ${
              isStudent
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 text-[11px] sm:text-xs">
            <span
              className={`font-bold tracking-wide uppercase text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                isStudent
                  ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                  : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
              }`}
            >
              {isStudent ? '🎓 Demo Öğrenci' : '⚡ Demo Öğretmen'}
            </span>

            <span className="text-slate-300 font-normal leading-tight">
              <span className="hidden sm:inline">
                {isStudent ? 'Öğrenci panelini inceliyorsunuz. ' : 'Yönetim panelini inceliyorsunuz. '}
              </span>
              Değişiklikler{' '}
              <strong className={isStudent ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                30 dakika sonra
              </strong>{' '}
              otomatik sıfırlanır.
            </span>
          </div>
        </div>

        {/* Right: Auto-reset schedule badge */}
        <div className="hidden xs:flex sm:flex items-center gap-1 shrink-0 text-[10px] sm:text-[11px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800">
          <Clock className={`w-3 h-3 ${isStudent ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="whitespace-nowrap">30 dk Otomatik</span>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;

