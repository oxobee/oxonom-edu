import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaCopy, FaCheck, FaShareAlt, FaQrcode, FaWifi } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { getNetworkOrigin } from '../lib/network';

const RoomQRModal = ({ isOpen, onClose, roomId, boardName = '' }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [mode, setMode] = useState('companion'); // 'companion' | 'student'
    const [networkOrigin, setNetworkOrigin] = useState(() => getNetworkOrigin());

    useEffect(() => {
        if (!isOpen) return;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            api.get('/api/network-ip')
                .then(res => {
                    if (res.data?.ip && res.data.ip !== '127.0.0.1') {
                        const port = window.location.port ? `:${window.location.port}` : '';
                        setNetworkOrigin(`${window.location.protocol}//${res.data.ip}${port}`);
                    }
                })
                .catch(() => {
                    setNetworkOrigin(getNetworkOrigin());
                });
        }
    }, [isOpen]);

    if (!isOpen || !roomId) return null;

    let user = null;
    let token = null;
    try {
        token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (userStr) user = JSON.parse(userStr);
    } catch (e) {
        user = null;
    }
    const isTeacher = user?.role === 'teacher';

    const companionUrl = `${networkOrigin}/board/${roomId}${token ? `?auth=${token}` : ''}`;
    const studentUrl = `${networkOrigin}/board/${roomId}`;

    const activeUrl = (isTeacher && mode === 'companion') ? companionUrl : studentUrl;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(activeUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy URL:', e);
        }
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        } catch (e) {
            console.error('Failed to copy code:', e);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-card border border-border text-card-foreground rounded-xl p-6 sm:p-7 max-w-md w-full shadow-xl relative text-center"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        title={t('common.close', 'Kapat')}
                    >
                        <FaTimes className="text-sm" />
                    </button>

                    {/* Header */}
                    <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-lg mx-auto mb-3 shadow-xs">
                        <FaQrcode />
                    </div>

                    <h3 className="text-lg font-semibold text-foreground tracking-tight mb-1">
                        {isTeacher && mode === 'companion' 
                            ? '📱 Akıllı Tahtayı Telefona Bağla' 
                            : t('qr.title', 'Derse Katıl')}
                    </h3>

                    {/* Mode Selector for Teachers */}
                    {isTeacher && (
                        <div className="flex bg-muted/50 p-1 rounded-lg border border-border my-3">
                            <button
                                onClick={() => setMode('companion')}
                                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                    mode === 'companion'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                📱 Kumanda Yap
                            </button>
                            <button
                                onClick={() => setMode('student')}
                                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                    mode === 'student'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                👥 Öğrenci Katılımı
                            </button>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground mb-4 px-2">
                        {isTeacher && mode === 'companion' ? (
                            <span className="font-medium text-foreground">
                                ✨ Telefonunuzun kamerasını okutun. Şifre girmeden telefonunuz tahtaya kablosuz kalem olarak bağlanır; telefondan çizdiğiniz her şey anında tahtada görünür!
                            </span>
                        ) : (
                            t('qr.subtitle', 'Kameranızı QR koda tutarak hemen bağlanın')
                        )}
                    </p>

                    {/* QR Code Container with High-Contrast White Background */}
                    <div className="bg-white p-3.5 rounded-xl shadow-xs inline-block mx-auto mb-3 border border-border">
                        <QRCodeSVG
                            value={activeUrl}
                            size={200}
                            level="H"
                            includeMargin={false}
                        />
                    </div>

                    {/* Wi-Fi Network Address Badge */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground mb-3 bg-muted/40 py-1 px-3 rounded-md border border-border w-fit mx-auto">
                        <FaWifi className="text-emerald-500 text-xs" />
                        <span>Wi-Fi:</span>
                        <span className="font-mono text-foreground font-medium">{networkOrigin.replace(/^https?:\/\//, '')}</span>
                    </div>

                    {/* Room Code Badge */}
                    <div className="bg-muted/30 border border-border rounded-lg p-3 mb-4 flex items-center justify-between">
                        <div className="text-left">
                            <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground block">
                                {t('whiteboard.room', 'Oda Kodu')}
                            </span>
                            <span className="text-base sm:text-lg font-mono font-bold text-foreground tracking-widest">
                                {roomId}
                            </span>
                        </div>
                        <button
                            onClick={handleCopyCode}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                copiedCode
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                            }`}
                            title={t('whiteboard.copyCode', 'Kodu Kopyala')}
                        >
                            {copiedCode ? <FaCheck /> : <FaCopy />}
                        </button>
                    </div>

                    {/* Action: Copy Link */}
                    <button
                        onClick={handleCopyUrl}
                        className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                            copied
                                ? 'bg-green-600 text-white shadow-green-600/30'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                        }`}
                    >
                        {copied ? (
                            <>
                                <FaCheck />
                                <span>{t('whiteboard.codeCopied', 'Bağlantı Kopyalandı!')}</span>
                            </>
                        ) : (
                            <>
                                <FaShareAlt />
                                <span>{isTeacher && mode === 'companion' ? '📱 Kumanda Bağlantısını Kopyala' : t('qr.copyLink', 'Katılım Bağlantısını Kopyala')}</span>
                            </>
                        )}
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RoomQRModal;
