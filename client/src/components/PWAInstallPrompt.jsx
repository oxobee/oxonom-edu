import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaTimes, FaShareSquare, FaPlusSquare } from 'react-icons/fa';

const PWAInstallPrompt = ({ variant = 'button' }) => {
    const { t } = useTranslation();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIOSModal, setShowIOSModal] = useState(false);

    useEffect(() => {
        // Check if running in standalone mode (already installed)
        const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        setIsStandalone(checkStandalone);

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const iosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(iosDevice);

        // Capture Android / Chrome beforeinstallprompt event
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Listen for app installed
        window.addEventListener('appinstalled', () => {
            setIsStandalone(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isStandalone) return;

        if (deferredPrompt) {
            // Android / Desktop Chrome install prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstallable(false);
            }
            setDeferredPrompt(null);
        } else if (isIOS) {
            // Show iOS step-by-step modal
            setShowIOSModal(true);
        } else {
            // Fallback instruction
            setShowIOSModal(true);
        }
    };

    if (isStandalone) {
        return null; // Already running as PWA
    }

    return (
        <>
            {variant === 'button' ? (
                <button
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer"
                    title={t('pwa.installTitle', 'Uygulamayı Cihaza Yükle')}
                >
                    <FaDownload className="text-xs" />
                    <span>{t('pwa.installBtn', 'Uygulamayı Yükle')}</span>
                </button>
            ) : variant === 'whiteboard' ? (
                <button
                    onClick={handleInstallClick}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-slate-700 shadow-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                    title={t('pwa.installWhiteboard', 'PWA Uygulaması Olarak Aç')}
                >
                    <FaDownload className="text-sm" />
                    <span className="hidden sm:inline">{t('pwa.installBtn', 'Uygulamayı Yükle')}</span>
                </button>
            ) : (
                <div
                    onClick={handleInstallClick}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                >
                    <FaDownload />
                    <span>{t('pwa.installBtn', 'Uygulamayı Yükle')}</span>
                </div>
            )}

            {/* iOS / Fallback Guide Modal */}
            {showIOSModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-left">
                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                        >
                            <FaTimes />
                        </button>

                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl mb-4 shadow-lg shadow-indigo-500/20">
                            <FaDownload />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2">
                            {t('pwa.modalTitle', 'Oxonom Edu Uygulamasını Yükleyin')}
                        </h3>
                        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                            {t('pwa.modalDesc', 'Oxonom Edu’yu telefonunuza tam ekran uygulama (PWA) olarak yükleyerek sıfır gecikme ve kusursuz çizim deneyimi elde edin:')}
                        </p>

                        <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/5 text-xs text-slate-200">
                            <div className="flex items-start gap-2.5">
                                <span className="font-bold text-indigo-400">1.</span>
                                <span>
                                    {isIOS 
                                        ? t('pwa.step1IOS', 'Safari tarayıcısının altındaki Paylaş (Share) butonuna dokunun.') 
                                        : t('pwa.step1Chrome', 'Tarayıcınızın sağ üstündeki menüye (üç nokta) dokunun.')}
                                </span>
                                {isIOS && <FaShareSquare className="text-indigo-400 text-sm flex-shrink-0 mt-0.5" />}
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="font-bold text-indigo-400">2.</span>
                                <span>
                                    {t('pwa.step2', 'Menüden "Ana Ekrana Ekle" (Add to Home Screen) seçeneğini seçin.')}
                                </span>
                                <FaPlusSquare className="text-purple-400 text-sm flex-shrink-0 mt-0.5" />
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="font-bold text-indigo-400">3.</span>
                                <span>{t('pwa.step3', 'Sağ üst köşedeki "Ekle" butonuna basın. Uygulamanız hazır!')}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                            {t('common.understood', 'Anladım')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default PWAInstallPrompt;
