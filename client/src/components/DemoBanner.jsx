import React, { useState } from 'react';
import { Sparkles, RotateCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../lib/api';

const DemoBanner = () => {
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isStudent = user?.role === 'student';

  const handleManualReset = async () => {
    if (resetting) return;
    setResetting(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.post('/api/demo/reset');
      setSuccessMsg('Demo verileri sıfırlandı! Sayfa yenileniyor...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Demo reset error:', err);
      setErrorMsg('Sıfırlama sırasında hata oluştu.');
      setResetting(false);
    }
  };

  return (
    <div className={`w-full ${isStudent ? 'bg-gradient-to-r from-emerald-500/20 via-cyan-600/20 to-blue-600/20 border-b border-emerald-500/30' : 'bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-blue-600/20 border-b border-amber-500/30'} px-4 py-2.5 backdrop-blur-md sticky top-0 z-40 transition-all`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Left Side: Icon & Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg ${isStudent ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'} flex items-center justify-center shrink-0`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-bold ${isStudent ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' : 'text-amber-300 bg-amber-500/10 border-amber-500/25'} tracking-wide uppercase text-[11px] px-2 py-0.5 rounded border`}>
                {isStudent ? '🎓 Demo Öğrenci Modu' : '⚡ Demo Öğretmen Modu'}
              </span>
              <p className="text-slate-200 font-medium truncate">
                {isStudent
                  ? <>Öğrenci panelini ve ders içeriklerini inceliyorsunuz. Yapılan değişiklikler <strong className="text-emerald-300 font-semibold">30 dakika sonra</strong> sıfırlanacaktır.</>
                  : <>Öğretmen yönetim panelini inceliyorsunuz. Yapılan tüm değişiklikler <strong className="text-amber-300 font-semibold">30 dakika sonra</strong> otomatik olarak sıfırlanacaktır.</>}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Cycle badge & Quick Reset Button */}
        <div className="flex items-center gap-2 shrink-0">
          {successMsg ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {successMsg}
            </span>
          ) : errorMsg ? (
            <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMsg}
            </span>
          ) : (
            <>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                <Clock className="w-3 h-3 text-amber-400" />
                30 dk Periyodik Sıfırlama
              </span>
              <button
                type="button"
                onClick={handleManualReset}
                disabled={resetting}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                title="Tüm demo verilerini ilk haline hemen sıfırla"
              >
                <RotateCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span>{resetting ? 'Sıfırlanıyor...' : 'Hemen Sıfırla'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
