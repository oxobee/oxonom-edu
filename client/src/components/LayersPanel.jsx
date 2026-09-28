import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    FaLayerGroup, FaTimes, FaLock, FaLockOpen, FaEye, FaEyeSlash,
    FaArrowUp, FaArrowDown, FaTrash, FaImage, FaObjectGroup,
    FaFont, FaStickyNote, FaPen, FaHighlighter, FaSquare, FaCircle
} from 'react-icons/fa';
import {
    BsSquare, BsCircle, BsTriangle, BsPentagon, BsHexagon, BsOctagon, BsStar, BsGripVertical
} from 'react-icons/bs';

// Layer Thumbnail Preview Component
const LayerThumbnail = ({ element }) => {
    if (!element) return null;

    if (element.type === 'image' && (element.dataURL || element.src)) {
        const imgSrc = element.dataURL || element.src;
        return (
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0 relative">
                <img
                    src={imgSrc}
                    alt="Katman Görseli"
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            </div>
        );
    }

    if (element.points && Array.isArray(element.points) && element.points.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        element.points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        });
        const w = Math.max(maxX - minX, 10);
        const h = Math.max(maxY - minY, 10);
        const pad = Math.max(w, h) * 0.15;

        return (
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-700 bg-slate-800/90 flex-shrink-0 flex items-center justify-center p-0.5">
                <svg
                    viewBox={`${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`}
                    className="w-full h-full"
                >
                    <polyline
                        points={element.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={element.color || '#3b82f6'}
                        strokeWidth={Math.max((element.size || 2) * 1.5, 3)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        );
    }

    if (['rect', 'circle', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star'].includes(element.type)) {
        const shapeColor = element.color || '#3b82f6';
        return (
            <div className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-800/90 flex-shrink-0 flex items-center justify-center">
                {element.type === 'rect' && <BsSquare className="text-base" style={{ color: shapeColor }} />}
                {element.type === 'circle' && <BsCircle className="text-base" style={{ color: shapeColor }} />}
                {element.type === 'triangle' && <BsTriangle className="text-base" style={{ color: shapeColor }} />}
                {element.type === 'pentagon' && <BsPentagon className="text-base" style={{ color: shapeColor }} />}
                {element.type === 'hexagon' && <BsHexagon className="text-base" style={{ color: shapeColor }} />}
                {element.type === 'octagon' && <BsOctagon className="text-base" style={{ color: shapeColor }} />}
                {element.type === 'star' && <BsStar className="text-base" style={{ color: shapeColor }} />}
            </div>
        );
    }

    if (element.type === 'text') {
        return (
            <div className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-800/90 flex-shrink-0 flex items-center justify-center text-blue-400 font-bold text-sm">
                T
            </div>
        );
    }

    if (element.type === 'sticky') {
        return (
            <div className="w-9 h-9 rounded-lg border border-amber-500/40 bg-amber-500/20 flex-shrink-0 flex items-center justify-center text-amber-300">
                <FaStickyNote className="text-sm" />
            </div>
        );
    }

    return (
        <div className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-800 flex-shrink-0 flex items-center justify-center text-slate-400">
            <FaLayerGroup className="text-xs" />
        </div>
    );
};

// Helper to get descriptive title for a layer
const getLayerTitle = (element, index, total) => {
    if (!element) return `Katman ${total - index}`;
    if (element.type === 'image') return `Görsel (${total - index})`;
    if (element.type === 'pen') return `Kalem Çizimi (${total - index})`;
    if (element.type === 'highlighter') return `Vurgulayıcı (${total - index})`;
    if (element.type === 'rect') return `Dikdörtgen (${total - index})`;
    if (element.type === 'circle') return `Daire (${total - index})`;
    if (element.type === 'triangle') return `Üçgen (${total - index})`;
    if (element.type === 'star') return `Yıldız (${total - index})`;
    if (element.type === 'line') return `Çizgi (${total - index})`;
    if (element.type === 'text') {
        const preview = (element.text || '').trim();
        return preview ? `Metin: "${preview.slice(0, 14)}${preview.length > 14 ? '...' : ''}"` : `Metin (${total - index})`;
    }
    if (element.type === 'sticky') {
        const preview = (element.text || '').trim();
        return preview ? `Not: "${preview.slice(0, 14)}${preview.length > 14 ? '...' : ''}"` : `Not (${total - index})`;
    }
    return `Katman ${total - index}`;
};

const LayersPanel = ({
    isOpen,
    onClose,
    elements = [],
    selectedElements = [],
    onSelectElement,
    onSelectMultiple,
    onReorderElements,
    onToggleLock,
    onToggleVisibility,
    onDeleteElements,
    onConvertToImage,
    onMergeLayers,
    darkMode = true,
    readOnly = false
}) => {
    const { t } = useTranslation();

    // In elements array, index 0 is bottom-most, last index is top-most (front-most).
    // In UI Layers list, we show front-most element at top of list.
    const displayLayers = useMemo(() => {
        return elements.filter(el => el && el.type !== 'eraser').slice().reverse();
    }, [elements]);

    const longPressTimerRef = useRef(null);
    const isLongPressActiveRef = useRef(false);
    const pointerStartPosRef = useRef({ x: 0, y: 0 });

    const selectedIdsSet = useMemo(() => {
        return new Set(selectedElements.map(s => s.id));
    }, [selectedElements]);

    const isLayerSelected = (id) => selectedIdsSet.has(id);

    // Selected elements list for bulk actions
    const selectedElementsList = useMemo(() => {
        return elements.filter(el => selectedIdsSet.has(el.id));
    }, [elements, selectedIdsSet]);

    // Handle reordering when dragged in Reorder.Group
    const handleReorder = (newDisplayOrder) => {
        if (readOnly) return;
        // newDisplayOrder is in visual top-to-bottom order (highest z-index first).
        // Convert back to canvas elements array order (lowest z-index first).
        const reordered = newDisplayOrder.slice().reverse().map((el, idx) => ({
            ...el,
            order: idx
        }));
        if (onReorderElements) {
            onReorderElements(reordered);
        }
    };

    // Quick Move Up in list (Bring towards front)
    const handleMoveUp = (e, index) => {
        e.stopPropagation();
        if (readOnly) return;
        if (index <= 0) return; // Already at top of list (front)
        const updated = [...displayLayers];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        handleReorder(updated);
    };

    // Quick Move Down in list (Send towards back)
    const handleMoveDown = (e, index) => {
        e.stopPropagation();
        if (readOnly) return;
        if (index >= displayLayers.length - 1) return; // Already at bottom of list (back)
        const updated = [...displayLayers];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        handleReorder(updated);
    };

    // Pointer Down: Start Long Press Timer for Multi-Select
    const handlePointerDown = (el, e) => {
        if (readOnly) return;
        pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
        isLongPressActiveRef.current = false;

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = setTimeout(() => {
            isLongPressActiveRef.current = true;
            // Vibrate on mobile for tactile feedback
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(35); } catch (_) {}
            }
            if (onSelectMultiple) {
                onSelectMultiple(el.id);
            }
        }, 420);
    };

    // Pointer Move: Cancel Long Press if user drags
    const handlePointerMove = (e) => {
        if (!longPressTimerRef.current) return;
        const dist = Math.hypot(
            e.clientX - pointerStartPosRef.current.x,
            e.clientY - pointerStartPosRef.current.y
        );
        if (dist > 8) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    // Pointer Up: If not a long press, handle normal click / multi-click
    const handlePointerUp = (el, e) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (!isLongPressActiveRef.current) {
            const isShiftOrCmd = e.shiftKey || e.ctrlKey || e.metaKey;
            if (isShiftOrCmd && onSelectMultiple) {
                onSelectMultiple(el.id);
            } else if (onSelectElement) {
                onSelectElement(el.id);
            }
        }
    };

    const handlePointerCancel = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0.05}
                initial={{ opacity: 0, x: 50, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.98 }}
                transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                className="fixed right-3 sm:right-6 top-16 sm:top-20 z-40 w-80 sm:w-96 max-h-[calc(100dvh-100px)] flex flex-col rounded-3xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-2xl shadow-2xl overflow-hidden select-none"
            >
                {/* Header (Draggable Handle) */}
                <div className="p-3.5 sm:p-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-800/40 cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            <FaLayerGroup className="text-base" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Katmanlar</h3>
                                {readOnly && (
                                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                                        🔒 {t('whiteboard.viewOnly', 'Sadece Görüntüleme')}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400">Üstteki katman tuvalde en önde görünür</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Katmanları Kapat"
                    >
                        <FaTimes className="text-base" />
                    </button>
                </div>

                {/* Multi-Selection Action Bar (Opens when 2 or more layers selected) */}
                <AnimatePresence>
                    {!readOnly && selectedElementsList.length >= 2 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-blue-950/50 border-b border-blue-500/30 px-3 py-2.5 flex items-center justify-between gap-1.5 overflow-hidden"
                        >
                            <span className="text-xs font-semibold text-blue-300 whitespace-nowrap pl-1">
                                {selectedElementsList.length} Katman Seçili:
                            </span>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Görsele Dönüştür */}
                                <button
                                    onClick={() => onConvertToImage && onConvertToImage(selectedElementsList)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                    title="Seçilen katmanları birleşik PNG görsele dönüştür"
                                >
                                    <FaImage className="text-xs" />
                                    <span>Görsele Dönüştür</span>
                                </button>

                                {/* Birleştir (Merge) */}
                                <button
                                    onClick={() => onMergeLayers && onMergeLayers(selectedElementsList)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                    title="Seçilen katmanları tek bir katmanda birleştir"
                                >
                                    <FaObjectGroup className="text-xs" />
                                    <span>Birleştir</span>
                                </button>

                                {/* Toplu Sil */}
                                <button
                                    onClick={() => onDeleteElements && onDeleteElements(selectedElementsList.map(el => el.id))}
                                    className="p-1.5 text-xs rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                                    title="Seçili Katmanları Sil"
                                >
                                    <FaTrash className="text-xs" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Layers List */}
                <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5 max-h-[60vh] custom-scrollbar">
                    {displayLayers.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 space-y-2">
                            <FaLayerGroup className="text-3xl mx-auto opacity-30" />
                            <p className="text-xs sm:text-sm font-medium">Henüz tahtada katman yok.</p>
                            <p className="text-[11px] text-slate-600">Çizim yaptığınızda veya görsel eklediğinizde burada listelenecektir.</p>
                        </div>
                    ) : (
                        <Reorder.Group
                            axis="y"
                            values={displayLayers}
                            onReorder={handleReorder}
                            className="space-y-1.5"
                        >
                            {displayLayers.map((el, index) => {
                                const isSelected = isLayerSelected(el.id);
                                const isLocked = !!el.locked;
                                const isHidden = !!el.hidden;

                                return (
                                    <Reorder.Item
                                        key={el.id}
                                        value={el}
                                        dragListener={!readOnly}
                                        className={`group relative flex items-center justify-between p-2 rounded-2xl border transition-all select-none ${
                                            readOnly ? 'cursor-default' : 'cursor-pointer'
                                        } ${
                                            isSelected
                                                ? 'bg-blue-600/25 border-blue-500/60 shadow-md shadow-blue-500/10'
                                                : isLocked
                                                ? 'bg-amber-950/20 border-amber-600/30 hover:bg-slate-800/80'
                                                : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800/90 hover:border-slate-600'
                                        } ${isHidden ? 'opacity-50' : ''}`}
                                        onPointerDown={(e) => handlePointerDown(el, e)}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={(e) => handlePointerUp(el, e)}
                                        onPointerCancel={handlePointerCancel}
                                    >
                                        {/* Left Side: Drag Handle + Thumbnail + Title */}
                                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                                            {/* Drag Handle (Hidden in readOnly) */}
                                            {!readOnly && (
                                                <div
                                                    className="text-slate-500 group-hover:text-slate-300 p-0.5 cursor-grab active:cursor-grabbing transition-colors"
                                                    title="Sürükleyip sıralamayı değiştirin"
                                                >
                                                    <BsGripVertical className="text-sm" />
                                                </div>
                                            )}

                                            {/* Thumbnail Preview */}
                                            <LayerThumbnail element={el} />

                                            {/* Title & Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-300' : 'text-slate-200'}`}>
                                                        {getLayerTitle(el, index, displayLayers.length)}
                                                    </span>
                                                    {isLocked && (
                                                        <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
                                                            Kilitli
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 block truncate">
                                                    {index === 0 ? 'En Üstte (Önde)' : index === displayLayers.length - 1 ? 'En Altta (Arkada)' : `Sıra ${displayLayers.length - index}`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right Controls: Quick Move Up/Down + Lock + Eye (Completely disabled in readOnly) */}
                                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {readOnly ? (
                                                isLocked && (
                                                    <span className="p-1 text-amber-400 text-xs" title="Kilitli">
                                                        <FaLock />
                                                    </span>
                                                )
                                            ) : (
                                                <>
                                                    {/* Move Up (Bring to Front) */}
                                                    <button
                                                        disabled={index === 0}
                                                        onClick={(e) => handleMoveUp(e, index)}
                                                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                                                            index === 0
                                                                ? 'text-slate-600 cursor-not-allowed'
                                                                : 'text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer'
                                                        }`}
                                                        title="Bir Katman Öne Getir"
                                                    >
                                                        <FaArrowUp />
                                                    </button>

                                                    {/* Move Down (Send to Back) */}
                                                    <button
                                                        disabled={index === displayLayers.length - 1}
                                                        onClick={(e) => handleMoveDown(e, index)}
                                                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                                                            index === displayLayers.length - 1
                                                                ? 'text-slate-600 cursor-not-allowed'
                                                                : 'text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer'
                                                        }`}
                                                        title="Bir Katman Arkaya Gönder"
                                                    >
                                                        <FaArrowDown />
                                                    </button>

                                                    {/* Lock / Unlock */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onToggleLock) onToggleLock(el);
                                                        }}
                                                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                                            isLocked
                                                                ? 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25'
                                                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                                        }`}
                                                        title={isLocked ? "Kilidi Aç" : "Katmanı Kilitle"}
                                                    >
                                                        {isLocked ? <FaLock /> : <FaLockOpen />}
                                                    </button>

                                                    {/* Visibility Eye */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onToggleVisibility) onToggleVisibility(el);
                                                        }}
                                                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                                            isHidden
                                                                ? 'text-slate-500 hover:text-slate-300'
                                                                : 'text-blue-400 hover:text-blue-300 hover:bg-slate-700'
                                                        }`}
                                                        title={isHidden ? "Katmanı Göster" : "Katmanı Gizle"}
                                                    >
                                                        {isHidden ? <FaEyeSlash /> : <FaEye />}
                                                    </button>

                                                    {/* Delete Single Layer */}
                                                    <button
                                                        disabled={isLocked}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isLocked && onDeleteElements) onDeleteElements([el.id]);
                                                        }}
                                                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                                            isLocked
                                                                ? 'text-slate-600 opacity-30 cursor-not-allowed'
                                                                : 'text-rose-400 hover:text-white hover:bg-rose-500/20'
                                                        }`}
                                                        title={isLocked ? "Kilitli katman silinemez" : "Katmanı Sil"}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </Reorder.Item>
                                );
                            })}
                        </Reorder.Group>
                    )}
                </div>

                {/* Footer Quick Info */}
                <div className="p-2.5 px-3.5 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    {readOnly ? (
                        <span className="text-cyan-300 font-medium">
                            🔒 {t('whiteboard.layersViewOnlyNotice', 'Sadece görüntüleme modundasınız. Katmanlar değiştirilemez.')}
                        </span>
                    ) : (
                        <>
                            <span>💡 Basılı tutarak çoklu seçim yapabilirsiniz</span>
                            {selectedElementsList.length > 0 && (
                                <button
                                    onClick={() => onSelectElement && onSelectElement(null)}
                                    className="text-blue-400 hover:underline cursor-pointer font-medium"
                                >
                                    Seçimi Temizle
                                </button>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LayersPanel;
