import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaTimes, FaUndo, FaCrop } from 'react-icons/fa';

const ImageCropModal = ({ isOpen, imageElement, onClose, onApplyCrop }) => {
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const loadedImgRef = useRef(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [imgDims, setImgDims] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
    const [aspectMode, setAspectMode] = useState('free');
    
    // Crop box in display pixels relative to the displayed image
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [dragMode, setDragMode] = useState(null); // 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, crop: null });

    useEffect(() => {
        if (!isOpen || !imageElement) {
            setImgLoaded(false);
            setIsProcessing(false);
            loadedImgRef.current = null;
            return;
        }

        let isCancelled = false;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            if (isCancelled) return;
            loadedImgRef.current = img;
            const naturalW = img.naturalWidth || img.width;
            const naturalH = img.naturalHeight || img.height;

            // Fit into container max bounds (e.g. max 650px wide, max 450px high)
            const maxW = Math.min(window.innerWidth * 0.85, 680);
            const maxH = Math.min(window.innerHeight * 0.55, 440);

            let dispW = naturalW;
            let dispH = naturalH;

            const ratio = naturalW / naturalH;
            if (dispW > maxW) {
                dispW = maxW;
                dispH = dispW / ratio;
            }
            if (dispH > maxH) {
                dispH = maxH;
                dispW = dispH * ratio;
            }

            const finalW = Math.round(dispW);
            const finalH = Math.round(dispH);

            setImgDims({
                width: finalW,
                height: finalH,
                naturalWidth: naturalW,
                naturalHeight: naturalH
            });

            // Initial crop box: default to full image with slight margin
            const initialMarginX = Math.round(finalW * 0.05);
            const initialMarginY = Math.round(finalH * 0.05);
            setCrop({
                x: initialMarginX,
                y: initialMarginY,
                width: Math.round(finalW - initialMarginX * 2),
                height: Math.round(finalH - initialMarginY * 2)
            });

            setAspectMode('free');
            setImgLoaded(true);
        };
        img.onerror = () => {
            if (isCancelled) return;
            console.warn("Failed to load image with crossOrigin anonymous, falling back...");
            // Retry without crossOrigin if needed
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
                if (isCancelled) return;
                loadedImgRef.current = fallbackImg;
                const naturalW = fallbackImg.naturalWidth || fallbackImg.width;
                const naturalH = fallbackImg.naturalHeight || fallbackImg.height;
                const maxW = Math.min(window.innerWidth * 0.85, 680);
                const maxH = Math.min(window.innerHeight * 0.55, 440);
                let dispW = naturalW;
                let dispH = naturalH;
                const ratio = naturalW / naturalH;
                if (dispW > maxW) {
                    dispW = maxW;
                    dispH = dispW / ratio;
                }
                if (dispH > maxH) {
                    dispH = maxH;
                    dispW = dispH * ratio;
                }
                const finalW = Math.round(dispW);
                const finalH = Math.round(dispH);
                setImgDims({ width: finalW, height: finalH, naturalWidth: naturalW, naturalHeight: naturalH });
                setCrop({
                    x: Math.round(finalW * 0.05),
                    y: Math.round(finalH * 0.05),
                    width: Math.round(finalW * 0.9),
                    height: Math.round(finalH * 0.9)
                });
                setAspectMode('free');
                setImgLoaded(true);
            };
            fallbackImg.src = imageElement.dataURL;
        };
        img.src = imageElement.dataURL;

        return () => {
            isCancelled = true;
        };
    }, [isOpen, imageElement]);

    const applyPresetRatio = (ratio, modeName) => {
        setAspectMode(modeName);
        if (!imgDims.width || !imgDims.height) return;

        const containerW = imgDims.width;
        const containerH = imgDims.height;
        let newW = containerW * 0.9;
        let newH = newW / ratio;

        if (newH > containerH * 0.9) {
            newH = containerH * 0.9;
            newW = newH * ratio;
        }

        const newX = (containerW - newW) / 2;
        const newY = (containerH - newH) / 2;

        setCrop({
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH)
        });
    };

    // Handle drag operations for crop box and handles
    const handlePointerDown = (mode, e) => {
        e.stopPropagation();
        e.preventDefault();
        setDragMode(mode);
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            crop: { ...crop }
        };
    };

    useEffect(() => {
        if (!dragMode) return;

        const handlePointerMove = (e) => {
            const dx = e.clientX - dragStartRef.current.mouseX;
            const dy = e.clientY - dragStartRef.current.mouseY;
            const initial = dragStartRef.current.crop;
            const minSize = 30;

            let newCrop = { ...initial };

            if (dragMode === 'move') {
                newCrop.x = Math.max(0, Math.min(imgDims.width - initial.width, initial.x + dx));
                newCrop.y = Math.max(0, Math.min(imgDims.height - initial.height, initial.y + dy));
            } else {
                if (dragMode.includes('l')) {
                    const proposedX = initial.x + dx;
                    const constrainedX = Math.max(0, Math.min(initial.x + initial.width - minSize, proposedX));
                    newCrop.x = constrainedX;
                    newCrop.width = initial.width + (initial.x - constrainedX);
                }
                if (dragMode.includes('r')) {
                    const proposedW = initial.width + dx;
                    newCrop.width = Math.max(minSize, Math.min(imgDims.width - initial.x, proposedW));
                }
                if (dragMode.includes('t')) {
                    const proposedY = initial.y + dy;
                    const constrainedY = Math.max(0, Math.min(initial.y + initial.height - minSize, proposedY));
                    newCrop.y = constrainedY;
                    newCrop.height = initial.height + (initial.y - constrainedY);
                }
                if (dragMode.includes('b')) {
                    const proposedH = initial.height + dy;
                    newCrop.height = Math.max(minSize, Math.min(imgDims.height - initial.y, proposedH));
                }
            }

            setCrop(newCrop);
        };

        const handlePointerUp = () => {
            setDragMode(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [dragMode, imgDims]);

    const handleApply = async () => {
        if (!imageElement || !imgLoaded || isProcessing) return;
        if (!imgDims.width || !imgDims.height) return;

        setIsProcessing(true);

        try {
            const scaleX = imgDims.naturalWidth / imgDims.width;
            const scaleY = imgDims.naturalHeight / imgDims.height;

            const cropNativeX = Math.max(0, Math.round(crop.x * scaleX));
            const cropNativeY = Math.max(0, Math.round(crop.y * scaleY));
            const cropNativeW = Math.max(1, Math.min(imgDims.naturalWidth - cropNativeX, Math.round(crop.width * scaleX)));
            const cropNativeH = Math.max(1, Math.min(imgDims.naturalHeight - cropNativeY, Math.round(crop.height * scaleY)));

            const cropFromSource = (srcImg) => {
                const offscreen = document.createElement('canvas');
                offscreen.width = cropNativeW;
                offscreen.height = cropNativeH;
                const ctx = offscreen.getContext('2d');
                ctx.drawImage(
                    srcImg,
                    cropNativeX, cropNativeY, cropNativeW, cropNativeH,
                    0, 0, cropNativeW, cropNativeH
                );
                return offscreen.toDataURL('image/png');
            };

            let croppedDataURL = null;

            // 1. Try with loadedImgRef (created with crossOrigin="anonymous")
            if (loadedImgRef.current && loadedImgRef.current.complete) {
                try {
                    croppedDataURL = cropFromSource(loadedImgRef.current);
                } catch (e) {
                    console.warn("Direct crop from loadedImgRef failed:", e);
                }
            }

            // 2. Try with DOM image ref
            if (!croppedDataURL && imageRef.current && imageRef.current.complete) {
                try {
                    croppedDataURL = cropFromSource(imageRef.current);
                } catch (e) {
                    console.warn("Direct crop from imageRef failed:", e);
                }
            }

            // 3. Robust CORS Fallback: fetch blob and create a local blob object URL (blob URLs never taint canvas!)
            if (!croppedDataURL && imageElement.dataURL) {
                try {
                    const response = await fetch(imageElement.dataURL, { mode: 'cors' });
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const tempImg = await new Promise((resolve, reject) => {
                        const i = new Image();
                        i.onload = () => resolve(i);
                        i.onerror = reject;
                        i.src = blobUrl;
                    });
                    try {
                        croppedDataURL = cropFromSource(tempImg);
                    } finally {
                        URL.revokeObjectURL(blobUrl);
                    }
                } catch (fetchErr) {
                    console.warn("Fetch blob fallback failed:", fetchErr);
                }
            }

            if (!croppedDataURL) {
                throw new Error("Görsel kırpma verisi oluşturulamadı (CORS veya tuval hatası).");
            }

            // Precise fractions of original image dimensions that were kept
            const fractionW = crop.width / imgDims.width;
            const fractionH = crop.height / imgDims.height;

            onApplyCrop(croppedDataURL, cropNativeW, cropNativeH, fractionW, fractionH);
            onClose();
        } catch (err) {
            console.error("handleApply error:", err);
            alert("Kırpma işlemi uygulanamadı: " + (err?.message || "Bilinmeyen hata"));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResetCrop = () => {
        setAspectMode('free');
        setCrop({
            x: 0,
            y: 0,
            width: imgDims.width,
            height: imgDims.height
        });
    };

    if (!isOpen || !imageElement) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-2 text-white font-semibold text-base sm:text-lg">
                        <FaCrop className="text-blue-400" />
                        <span>Görseli Kırp</span>
                    </div>

                    {/* Aspect Ratio Presets */}
                    <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                        <button
                            onClick={() => setAspectMode('free')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                aspectMode === 'free' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Serbest
                        </button>
                        <button
                            onClick={() => applyPresetRatio(1, '1:1')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                aspectMode === '1:1' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            1:1 Kare
                        </button>
                        <button
                            onClick={() => applyPresetRatio(4 / 3, '4:3')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                aspectMode === '4:3' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            4:3
                        </button>
                        <button
                            onClick={() => applyPresetRatio(16 / 9, '16:9')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                aspectMode === '16:9' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            16:9
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleResetCrop}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Kırpmayı Sıfırla"
                        >
                            <FaUndo className="text-xs" />
                            <span className="hidden sm:inline">Sıfırla</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Body / Cropper Preview */}
                <div className="flex-1 p-5 flex flex-col items-center justify-center bg-slate-950/40 select-none">
                    {imgLoaded ? (
                        <div
                            ref={containerRef}
                            className="relative shadow-2xl rounded overflow-hidden"
                            style={{ width: imgDims.width, height: imgDims.height }}
                        >
                            {/* Base Image */}
                            <img
                                ref={imageRef}
                                crossOrigin="anonymous"
                                src={imageElement.dataURL}
                                alt="Crop target"
                                className="w-full h-full object-contain pointer-events-none"
                                draggable={false}
                            />

                            {/* Darkened Overlay */}
                            <div className="absolute inset-0 bg-black/60 pointer-events-none" />

                            {/* Active Crop Area */}
                            <div
                                onPointerDown={(e) => handlePointerDown('move', e)}
                                className="absolute cursor-move border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                                style={{
                                    left: crop.x,
                                    top: crop.y,
                                    width: crop.width,
                                    height: crop.height
                                }}
                            >
                                {/* Grid lines inside crop box */}
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                                    <div className="border-r border-b border-blue-300/60" />
                                    <div className="border-r border-b border-blue-300/60" />
                                    <div className="border-b border-blue-300/60" />
                                    <div className="border-r border-b border-blue-300/60" />
                                    <div className="border-r border-b border-blue-300/60" />
                                    <div className="border-b border-blue-300/60" />
                                    <div className="border-r border-b border-blue-300/60" />
                                    <div className="border-r border-b border-blue-300/60" />
                                    <div />
                                </div>

                                {/* Corner Handles */}
                                <div
                                    onPointerDown={(e) => handlePointerDown('tl', e)}
                                    className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                                />
                                <div
                                    onPointerDown={(e) => handlePointerDown('tr', e)}
                                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
                                />
                                <div
                                    onPointerDown={(e) => handlePointerDown('bl', e)}
                                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
                                />
                                <div
                                    onPointerDown={(e) => handlePointerDown('br', e)}
                                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                                />

                                {/* Edge Handles */}
                                <div
                                    onPointerDown={(e) => handlePointerDown('t', e)}
                                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-blue-400 rounded-full cursor-ns-resize"
                                />
                                <div
                                    onPointerDown={(e) => handlePointerDown('b', e)}
                                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-blue-400 rounded-full cursor-ns-resize"
                                />
                                <div
                                    onPointerDown={(e) => handlePointerDown('l', e)}
                                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 h-8 w-2.5 bg-blue-400 rounded-full cursor-ew-resize"
                                />
                                <div
                                    onPointerDown={(e) => handlePointerDown('r', e)}
                                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-8 w-2.5 bg-blue-400 rounded-full cursor-ew-resize"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-slate-400 text-sm animate-pulse">
                            Görsel yükleniyor...
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 bg-slate-950/60">
                    <p className="text-xs text-slate-400">
                        {aspectMode === '1:1' ? '1:1 Kare Kırpma Alanı' : 'Kırpmak istediğiniz alanı sürükleyip ayarlayın'}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm font-medium rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={isProcessing}
                            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:brightness-110 active:scale-95 transition-all ${
                                isProcessing ? 'opacity-70 cursor-wait' : ''
                            }`}
                        >
                            {isProcessing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <FaCheck className="text-xs" />
                            )}
                            <span>{isProcessing ? 'Kırpılıyor...' : 'Kırpmayı Uygula'}</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ImageCropModal;
