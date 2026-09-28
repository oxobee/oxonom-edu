import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaCamera, FaImage, FaExclamationTriangle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const QRScannerModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [scannerError, setScannerError] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const html5QrCodeRef = useRef(null);
    const scannerRegionId = 'qr-camera-scanner-region';

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setScannerError(null);

        // Initialize scanner after modal DOM is mounted
        const timer = setTimeout(async () => {
            if (!isMounted) return;
            try {
                const html5QrCode = new Html5Qrcode(scannerRegionId);
                html5QrCodeRef.current = html5QrCode;

                const qrCodeSuccessCallback = (decodedText) => {
                    handleScanSuccess(decodedText);
                };

                const config = { fps: 10, qrbox: { width: 220, height: 220 } };

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    config,
                    qrCodeSuccessCallback,
                    () => {} // Ignore scan failure frame errors
                );

                if (isMounted) setIsScanning(true);
            } catch (err) {
                console.error('[QR-SCANNER] Camera start failed:', err);
                if (isMounted) {
                    setScannerError(
                        t('qr.cameraError', 'Kameraya erişilemedi. Lütfen kamera izni verin veya oda kodunu elle girin.')
                    );
                }
            }
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            stopScanner();
        };
    }, [isOpen]);

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error('[QR-SCANNER] Stop error:', err);
            }
            html5QrCodeRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScanSuccess = async (decodedText) => {
        await stopScanner();
        onClose();

        // Check if scanned text is full URL: .../board/EDU-XXXX-XXXX
        let targetCode = null;
        let searchParams = '';
        try {
            const parsedUrl = new URL(decodedText);
            const pathParts = parsedUrl.pathname.match(/\/board\/([A-Za-z0-9_-]+)/);
            if (pathParts && pathParts[1]) {
                targetCode = pathParts[1].toUpperCase();
                searchParams = parsedUrl.search || '';
            }
        } catch (_) {
            const urlMatch = decodedText.match(/\/board\/([A-Za-z0-9_-]+)(\?[^\s]*)?/);
            if (urlMatch && urlMatch[1]) {
                targetCode = urlMatch[1].toUpperCase();
                searchParams = urlMatch[2] || '';
            }
        }

        if (!targetCode) {
            // Check if raw room code
            const rawMatch = decodedText.trim().match(/EDU-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
            if (rawMatch) {
                targetCode = rawMatch[0].toUpperCase();
            } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedText.trim())) {
                targetCode = decodedText.trim();
            }
        }

        if (targetCode) {
            navigate(`/board/${targetCode}${searchParams}`);
        } else {
            alert(t('qr.invalidQR', 'Geçersiz QR Kod. Lütfen geçerli bir EduBoard oda QR kodu taratın.'));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const html5QrCode = new Html5Qrcode('qr-temp-file-scanner');
            const result = await html5QrCode.scanFile(file, true);
            html5QrCode.clear();
            handleScanSuccess(result);
        } catch (err) {
            alert(t('qr.fileScanFailed', 'Fotoğraftan QR kod okunamadı. Lütfen net bir fotoğraf seçin veya kamerayı kullanın.'));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center"
                >
                    {/* Close */}
                    <button
                        onClick={() => {
                            stopScanner();
                            onClose();
                        }}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <FaTimes className="text-base" />
                    </button>

                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl mx-auto mb-3 shadow-lg shadow-indigo-500/25">
                        <FaCamera />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">
                        {t('qr.scannerTitle', 'QR Kod ile Derse Katıl')}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                        {t('qr.scannerSubtitle', 'Öğretmeninizin tahtasındaki QR kodu kameranıza gösterin')}
                    </p>

                    {/* Camera Scanner Viewport */}
                    <div className="relative overflow-hidden rounded-2xl bg-black border border-white/10 aspect-square max-w-[260px] mx-auto mb-4 flex items-center justify-center">
                        <div id={scannerRegionId} className="w-full h-full" />
                        <div id="qr-temp-file-scanner" style={{ display: 'none' }} />

                        {scannerError && (
                            <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-slate-900/90 text-xs text-slate-300">
                                <FaExclamationTriangle className="text-amber-400 text-2xl mb-2" />
                                <p className="mb-3">{scannerError}</p>
                            </div>
                        )}
                    </div>

                    {/* File upload alternative */}
                    <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium cursor-pointer border border-white/10 transition-colors">
                        <FaImage />
                        <span>{t('qr.uploadImage', 'Galeriden QR Fotoğrafı Seç')}</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default QRScannerModal;
