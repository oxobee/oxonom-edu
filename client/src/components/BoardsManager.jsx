import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import api from "../lib/api";
import {
    FaFolder,
    FaSearch,
    FaEdit,
    FaPalette,
    FaTimes,
    FaArrowRight,
    FaTrash,
    FaQrcode,
    FaCheck,
    FaPlus,
    FaExchangeAlt,
    FaChevronLeft,
    FaCalendarAlt
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import CreateBoardModal from "./CreateBoardModal";
import RoomQRModal from "./RoomQRModal";
import { useTranslation } from "react-i18next";

const BOARD_COLOR_PALETTE = [
    { id: 'indigo', name: 'İndigo', hex: '#6366f1' },
    { id: 'blue', name: 'Mavi', hex: '#3b82f6' },
    { id: 'cyan', name: 'Turkuaz', hex: '#06b6d4' },
    { id: 'emerald', name: 'Zümrüt', hex: '#10b981' },
    { id: 'amber', name: 'Kehribar', hex: '#f59e0b' },
    { id: 'rose', name: 'Gül', hex: '#f43f5e' },
    { id: 'purple', name: 'Menekşe', hex: '#a855f7' },
    { id: 'orange', name: 'Turuncu', hex: '#ea580c' },
];

const getDeterministicColor = (roomId, index) => {
    if (!roomId) return BOARD_COLOR_PALETTE[index % BOARD_COLOR_PALETTE.length].hex;
    let hash = 0;
    for (let i = 0; i < roomId.length; i++) {
        hash = roomId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % BOARD_COLOR_PALETTE.length;
    return BOARD_COLOR_PALETTE[idx].hex;
};

const BoardsManager = ({
    classId = null,
    isUnassigned = false,
    availableClasses = [],
    onBoardsCountChange = null
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isTeacher = user?.role === "teacher";

    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedQRBoard, setSelectedQRBoard] = useState(null);
    const [editingBoardId, setEditingBoardId] = useState(null);
    const [editingBoardName, setEditingBoardName] = useState("");
    const [colorPickerBoardId, setColorPickerBoardId] = useState(null);
    const [movingBoardId, setMovingBoardId] = useState(null);
    const [selectedFolderDate, setSelectedFolderDate] = useState(null);
    const [editingFolderDate, setEditingFolderDate] = useState(null);
    const [editingFolderTitle, setEditingFolderTitle] = useState("");

    const formatDateKey = (d) => {
        if (!d) return 'Tarihsiz';
        const date = new Date(d);
        if (isNaN(date.getTime())) return 'Tarihsiz';
        return date.toISOString().split('T')[0];
    };

    const formatDisplayDate = (dateKey) => {
        if (!dateKey || dateKey === 'Tarihsiz') return 'Tarihsiz Tahtalar';
        const d = new Date(dateKey + 'T00:00:00');
        if (isNaN(d.getTime())) return dateKey;
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const dateGroups = useMemo(() => {
        const map = {};
        boards.forEach(b => {
            const key = formatDateKey(b.boardDate || b.createdAt);
            if (!map[key]) {
                map[key] = {
                    dateKey: key,
                    displayDate: formatDisplayDate(key),
                    groupTitle: b.groupTitle || '',
                    boards: []
                };
            } else if (!map[key].groupTitle && b.groupTitle) {
                map[key].groupTitle = b.groupTitle;
            }
            map[key].boards.push(b);
        });

        return Object.values(map).sort((a, b) => {
            if (a.dateKey === 'Tarihsiz') return 1;
            if (b.dateKey === 'Tarihsiz') return -1;
            return b.dateKey.localeCompare(a.dateKey);
        });
    }, [boards]);

    const handleSaveGroupTitle = async (dateKey) => {
        const trimmed = editingFolderTitle.trim();
        try {
            await api.patch('/api/boards/group-title', {
                date: dateKey,
                groupTitle: trimmed,
                classId: classId || null
            });
            setBoards(prev => prev.map(b => {
                const k = formatDateKey(b.boardDate || b.createdAt);
                if (k === dateKey) {
                    return { ...b, groupTitle: trimmed };
                }
                return b;
            }));
        } catch (err) {
            console.error("Error saving group title:", err);
        } finally {
            setEditingFolderDate(null);
            setEditingFolderTitle("");
        }
    };

    useEffect(() => {
        fetchBoards();
    }, [classId, isUnassigned]);

    const fetchBoards = async () => {
        setLoading(true);
        try {
            let res;
            if (isUnassigned) {
                // Unassigned boards only
                res = await api.get('/api/boards/unassigned/list');
            } else if (classId) {
                // Class boards only
                res = await api.get(`/api/boards/class/${classId}`);
            } else if (isTeacher) {
                // All boards of teacher
                res = await api.get(`/api/boards/user/${user.id}`);
            } else {
                // Student saved boards
                res = await api.get(`/api/boards/saved/${user.id}`);
            }

            const boardsWithColors = (res.data || []).map((b, idx) => {
                const cachedColor = localStorage.getItem(`board_color_${b.roomId}`);
                return {
                    ...b,
                    color: cachedColor || b.color || getDeterministicColor(b.roomId, idx)
                };
            });

            setBoards(boardsWithColors);
            if (onBoardsCountChange) {
                onBoardsCountChange(boardsWithColors.length);
            }
        } catch (err) {
            console.error("Error fetching boards in BoardsManager:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBoard = async (data) => {
        const boardData = typeof data === 'string' ? { name: data } : data;
        const generatedRoomId = `EDU-${uuidv4().substring(0, 8).toUpperCase()}`;
        try {
            await api.post('/api/boards/create', {
                name: boardData.name,
                roomId: generatedRoomId,
                classId: boardData.classId || classId || null,
                boardDate: boardData.boardDate || new Date(),
                isPasswordProtected: !!boardData.isPasswordProtected,
                password: boardData.password || null
            });
            setIsCreateModalOpen(false);
            fetchBoards();
            navigate(`/board/${generatedRoomId}`);
        } catch (err) {
            console.error("Error creating board:", err);
            // Fallback: navigate directly so user doesn't get stuck
            navigate(`/board/${generatedRoomId}`);
        }
    };

    const handleStartRename = (board, e) => {
        e.stopPropagation();
        setEditingBoardId(board.roomId);
        setEditingBoardName((isTeacher ? board.name : board.boardName) || "");
        setColorPickerBoardId(null);
        setMovingBoardId(null);
    };

    const handleSaveRename = async (roomId, e) => {
        if (e) e.stopPropagation();
        const trimmed = editingBoardName.trim();
        if (!trimmed) {
            setEditingBoardId(null);
            return;
        }

        setBoards((prev) =>
            prev.map((b) => (b.roomId === roomId ? { ...b, name: trimmed, boardName: trimmed } : b))
        );
        setEditingBoardId(null);

        try {
            await api.patch(`/api/boards/${roomId}`, { name: trimmed });
        } catch (err) {
            console.error("Error renaming board:", err);
            fetchBoards();
        }
    };

    const handleCancelRename = (e) => {
        if (e) e.stopPropagation();
        setEditingBoardId(null);
        setEditingBoardName("");
    };

    const handleSelectColor = (roomId, newColor, e) => {
        if (e) {
            if (e.stopPropagation) e.stopPropagation();
            if (e.preventDefault) e.preventDefault();
        }
        setColorPickerBoardId(null);

        try {
            localStorage.setItem(`board_color_${roomId}`, newColor);
        } catch (err) {
            console.error("localStorage error:", err);
        }

        setBoards((prev) =>
            prev.map((b) => (b.roomId === roomId ? { ...b, color: newColor } : b))
        );

        api.patch(`/api/boards/${roomId}`, { color: newColor }).catch((err) => {
            console.error("Error updating board color:", err);
        });
    };

    const handleAssignClass = async (roomId, targetClassId, e) => {
        if (e) e.stopPropagation();
        setMovingBoardId(null);

        try {
            await api.patch(`/api/boards/${roomId}`, {
                classId: targetClassId || null
            });
            // Refresh list
            fetchBoards();
        } catch (err) {
            console.error("Error assigning class to board:", err);
            alert("Tahta sınıfa taşınırken bir hata oluştu.");
        }
    };

    const handleDeleteBoard = async (roomId, boardTitle, mongoId, e) => {
        if (e) e.stopPropagation();
        const confirmed = window.confirm(
            `"${boardTitle}" adlı beyaz tahtayı silmek istediğinizden emin misiniz?`
        );
        if (!confirmed) return;

        setBoards((prev) => prev.filter((b) => b.roomId !== roomId));

        try {
            if (isTeacher) {
                await api.delete(`/api/boards/${roomId}`);
            } else {
                await api.delete(`/api/boards/saved/${mongoId}`);
            }
            if (onBoardsCountChange) {
                onBoardsCountChange(boards.length - 1);
            }
        } catch (err) {
            console.error("Error deleting board:", err);
            fetchBoards();
        }
    };

    const openBoard = (roomId) => {
        navigate(`/board/${roomId}`);
    };

    const filteredBoards = boards.filter((board) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        const name = ((isTeacher ? board.name : board.boardName) || "").toLowerCase();
        const code = (board.roomId || "").toLowerCase();
        const teacher = (board.teacherName || "").toLowerCase();
        return name.includes(term) || code.includes(term) || teacher.includes(term);
    });

    const activeGroup = useMemo(() => {
        if (!selectedFolderDate) return null;
        return dateGroups.find(g => g.dateKey === selectedFolderDate);
    }, [dateGroups, selectedFolderDate]);

    const displayedBoards = useMemo(() => {
        let list = [];
        if (searchTerm.trim()) {
            list = filteredBoards;
        } else if (selectedFolderDate) {
            list = activeGroup ? activeGroup.boards : [];
        }
        // En yeni en üstte olacak şekilde sıralansın (newest first)
        return [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [searchTerm, selectedFolderDate, filteredBoards, activeGroup]);

    return (
        <div className="flex flex-col space-y-4">
            {/* Top Action Bar: Create Board & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Field */}
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                        type="text"
                        placeholder={t('dashboard.searchPlaceholder', 'Tahtalarda ara...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>

                {/* Create Board Button (Teachers) */}
                {isTeacher && (
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
                    >
                        <FaPlus className="text-xs" />
                        <span>Yeni Beyaz Tahta Oluştur</span>
                    </button>
                )}
            </div>

            {/* Breadcrumb Header when inside a date folder */}
            {!searchTerm && selectedFolderDate && activeGroup && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => setSelectedFolderDate(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                        >
                            <FaChevronLeft className="text-xs" />
                            <span>Tüm Klasörler</span>
                        </button>
                        <div className="h-4 w-px bg-white/10 shrink-0" />
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FaFolder className="text-indigo-400 text-sm shrink-0" />
                            <span className="text-sm font-bold text-white shrink-0">
                                {activeGroup.displayDate}
                            </span>

                            {editingFolderDate === activeGroup.dateKey ? (
                                <div className="flex items-center gap-1.5 ml-2" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editingFolderTitle}
                                        onChange={(e) => setEditingFolderTitle(e.target.value)}
                                        placeholder="Örn: 26 Eylül - Üslü Sayılar"
                                        className="px-2.5 py-1 bg-slate-950 border border-indigo-500 rounded-lg text-xs text-white focus:outline-none w-44 sm:w-64 shadow-inner"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveGroupTitle(activeGroup.dateKey);
                                            if (e.key === 'Escape') setEditingFolderDate(null);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleSaveGroupTitle(activeGroup.dateKey)}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                        title="Kaydet"
                                    >
                                        <FaCheck className="text-xs" />
                                        <span>Kaydet</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingFolderDate(null)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                                        title="İptal"
                                    >
                                        <FaTimes className="text-xs" />
                                    </button>
                                </div>
                            ) : (
                                activeGroup.groupTitle && (
                                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium truncate max-w-xs">
                                        {activeGroup.groupTitle}
                                    </span>
                                )
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400 font-medium">
                            {activeGroup.boards.length} Tahta
                        </span>
                        {isTeacher && editingFolderDate !== activeGroup.dateKey && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingFolderDate(activeGroup.dateKey);
                                    setEditingFolderTitle(activeGroup.groupTitle || "");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <FaEdit className="text-[10px]" />
                                <span>{activeGroup.groupTitle ? 'Başlığı Değiştir' : 'Başlık Ekle'}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Boards List Container */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-slate-400 text-xs sm:text-sm">Tahtalar yükleniyor...</p>
                </div>
            ) : boards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center surface-card rounded-2xl p-6 border border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                        <FaFolder className="text-xl" />
                    </div>
                    <h4 className="text-white font-semibold text-sm sm:text-base mb-1">
                        {searchTerm ? "Eşleşen tahta bulunamadı" : "Bu alanda henüz tahta bulunmuyor"}
                    </h4>
                    <p className="text-slate-400 text-xs max-w-sm mb-4">
                        {searchTerm
                            ? `"${searchTerm}" aramasına uygun tahta bulunamadı.`
                            : isTeacher
                            ? "Yeni bir tahta oluşturarak ders anlatımına başlayabilirsiniz."
                            : "Öğretmeninizin paylaştığı tahtalar burada görünecektir."}
                    </p>
                    {isTeacher && !searchTerm && (
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
                        >
                            <FaPlus className="text-xs" />
                            <span>İlk Tahtanızı Oluşturun</span>
                        </button>
                    )}
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
                        >
                            Aramayı Temizle
                        </button>
                    )}
                </div>
            ) : !searchTerm && !selectedFolderDate ? (
                /* FOLDER GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {dateGroups.map((group) => {
                        const isEditingThis = editingFolderDate === group.dateKey;
                        return (
                            <div
                                key={group.dateKey}
                                onClick={() => !isEditingThis && setSelectedFolderDate(group.dateKey)}
                                className="group relative p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-indigo-500/50 shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col justify-between gap-4 backdrop-blur-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                                            <FaFolder className="text-xl" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5 truncate">
                                                <FaCalendarAlt className="text-xs text-indigo-400 shrink-0" />
                                                <span>{group.displayDate}</span>
                                            </h4>

                                            {isEditingThis ? (
                                                <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={editingFolderTitle}
                                                        onChange={(e) => setEditingFolderTitle(e.target.value)}
                                                        placeholder="Örn: Matematik - Kesirler"
                                                        className="px-2 py-1 rounded bg-slate-950 border border-indigo-500 text-xs text-white focus:outline-none w-36"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveGroupTitle(group.dateKey);
                                                            if (e.key === 'Escape') setEditingFolderDate(null);
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveGroupTitle(group.dateKey)}
                                                        className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                                                        title="Kaydet"
                                                    >
                                                        <FaCheck />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingFolderDate(null)}
                                                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white text-xs"
                                                        title="İptal"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    {group.groupTitle ? (
                                                        <span className="text-xs text-slate-300 font-medium truncate max-w-[170px]" title={group.groupTitle}>
                                                            {group.groupTitle}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-500 italic">
                                                            Başlık eklenmemiş
                                                        </span>
                                                    )}
                                                    {isTeacher && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingFolderDate(group.dateKey);
                                                                setEditingFolderTitle(group.groupTitle || "");
                                                            }}
                                                            className="text-slate-500 hover:text-indigo-400 p-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Başlık Ekle / Düzenle"
                                                        >
                                                            <FaEdit className="text-[10px]" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shrink-0">
                                        {group.boards.length} Tahta
                                    </span>
                                </div>

                                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                                    <span className="text-[11px]">Tıklayarak tahtaları açın</span>
                                    <span className="flex items-center gap-1 text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                                        Klasörü Aç <FaArrowRight className="text-[10px]" />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : displayedBoards.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
                    <p className="text-sm text-slate-400">Bu klasörde tahta bulunamadı.</p>
                </div>
            ) : (
                <div className="flex flex-col space-y-3">
                    {displayedBoards.map((board, index) => {
                        const boardColor = board.color || getDeterministicColor(board.roomId, index);
                        const isEditing = editingBoardId === board.roomId;
                        const isColorPickerOpen = colorPickerBoardId === board.roomId;
                        const isMoveMenuOpen = movingBoardId === board.roomId;
                        const boardTitle = (isTeacher ? board.name : board.boardName) || "Untitled Board";

                        return (
                            <motion.div
                                key={board.roomId}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => !isEditing && openBoard(board.roomId)}
                                style={{
                                    borderColor: `${boardColor}90`,
                                    background: `linear-gradient(135deg, ${boardColor}30 0%, ${boardColor}12 50%, rgba(15, 23, 42, 0.95) 100%)`,
                                    boxShadow: `0 4px 24px -2px ${boardColor}30`,
                                }}
                                className={`border-2 rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all group relative flex flex-col justify-between gap-3 backdrop-blur-md ${
                                    isColorPickerOpen || isMoveMenuOpen ? 'z-30' : 'z-0'
                                } hover:border-opacity-100 hover:shadow-xl`}
                            >
                                {/* Sol Renk Çizgisi Vurgusu */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-2xl transition-all group-hover:w-3"
                                    style={{ backgroundColor: boardColor, boxShadow: `0 0 14px ${boardColor}cc` }}
                                />

                                {/* Üst Kısım: Klasör İkonu, Başlık / Yeniden Adlandırma, Renk Seçici */}
                                <div className="flex items-center justify-between gap-2 pl-2.5">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <FaFolder
                                            className="text-base shrink-0 transition-transform group-hover:scale-110"
                                            style={{ color: boardColor }}
                                        />

                                        {isEditing ? (
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleSaveRename(board.roomId, e);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-1.5 flex-1 min-w-0"
                                            >
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editingBoardName}
                                                    onChange={(e) => setEditingBoardName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") handleCancelRename(e);
                                                    }}
                                                    className="bg-slate-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none w-full shadow-inner"
                                                />
                                                <button
                                                    type="submit"
                                                    className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer shrink-0"
                                                    title="Kaydet"
                                                >
                                                    <FaCheck className="text-xs" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelRename}
                                                    className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                                                    title="Vazgeç"
                                                >
                                                    <FaTimes className="text-xs" />
                                                </button>
                                            </form>
                                        ) : (
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1 group/title">
                                                <h4
                                                    onDoubleClick={(e) => isTeacher && handleStartRename(board, e)}
                                                    className="font-bold text-sm sm:text-base truncate transition-colors text-white"
                                                    title={isTeacher ? `${boardTitle} (Çift tıkla veya kaleme basarak yeniden adlandır)` : boardTitle}
                                                >
                                                    {boardTitle}
                                                </h4>
                                                {isTeacher && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleStartRename(board, e)}
                                                        className="p-1 rounded-md text-slate-400 hover:text-white opacity-50 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                                                        title="Yeniden Adlandır"
                                                    >
                                                        <FaEdit className="text-xs" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sağ Bölüm: Renk Seçici Butonu ve Popover */}
                                    {isTeacher && (
                                        <div
                                            className="relative shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setColorPickerBoardId((prev) => (prev === board.roomId ? null : board.roomId));
                                                    setMovingBoardId(null);
                                                }}
                                                className="w-7 h-7 rounded-full border-2 border-white/50 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all"
                                                style={{ backgroundColor: boardColor, boxShadow: `0 0 10px ${boardColor}90` }}
                                                title="Tahta Rengini Değiştir"
                                            >
                                                <FaPalette className="text-[11px] text-white drop-shadow" />
                                            </button>

                                            {isColorPickerOpen && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    className="absolute right-0 top-full mt-2 p-2.5 bg-slate-900 border-2 border-white/20 rounded-2xl shadow-2xl z-50 grid grid-cols-4 gap-2 w-44 backdrop-blur-2xl"
                                                >
                                                    {BOARD_COLOR_PALETTE.map((c) => {
                                                        const isSelected = boardColor.toLowerCase() === c.hex.toLowerCase();
                                                        return (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleSelectColor(board.roomId, c.hex, e);
                                                                }}
                                                                className={`w-7 h-7 rounded-full transition-all hover:scale-110 cursor-pointer flex items-center justify-center border-2 ${
                                                                    isSelected
                                                                        ? 'ring-2 ring-white border-white scale-105 shadow-lg'
                                                                        : 'border-white/20 hover:border-white/60'
                                                                }`}
                                                                style={{ backgroundColor: c.hex }}
                                                                title={c.name}
                                                            >
                                                                {isSelected && (
                                                                    <FaCheck className="text-[10px] text-white drop-shadow font-bold" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Orta Kısım: Detaylı Tahta İstatistikleri (Bağlantı kodu kaldırıldı) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 pl-2.5 text-[11px]">
                                    {/* Oluşturulma Tarihi */}
                                    <div className="flex items-center gap-1.5 text-slate-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                                        <FaCalendarAlt className="text-indigo-400 shrink-0 text-xs" />
                                        <span className="truncate">
                                            {board.createdAt
                                                ? new Date(board.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : 'Yeni'}
                                        </span>
                                    </div>

                                    {/* Son İşlem / Güncellenme */}
                                    <div className="flex items-center gap-1.5 text-slate-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                        <span className="truncate">
                                            Son İşlem: {board.updatedAt
                                                ? new Date(board.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                                                : '-'}
                                        </span>
                                    </div>

                                    {/* Çizim Katmanı / Nesne Sayısı */}
                                    <div className="flex items-center gap-1.5 text-slate-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                                        <FaPalette className="text-purple-400 shrink-0 text-xs" />
                                        <span className="font-semibold text-white">
                                            {board.elements?.length || board.elementCount || 0}
                                        </span>
                                        <span className="truncate text-slate-400">Çizim Nesnesi</span>
                                    </div>

                                    {/* Sınıf Durumu */}
                                    <div className="flex items-center gap-1.5 text-slate-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                                        <FaFolder className="text-amber-400 shrink-0 text-xs" />
                                        <span className="truncate font-medium text-amber-300">
                                            {board.classId?.name || (typeof board.classId === 'string' && availableClasses.find(c => c._id === board.classId)?.name) || 'Atanmamış'}
                                        </span>
                                    </div>
                                </div>

                                {/* Alt Kısım: Durum Bilgisi, Sınıfa Taşı, Sil ve Aç */}
                                <div
                                    className="flex items-center justify-between pt-2 border-t border-white/10 pl-2.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Sol Durum Hapları */}
                                    <div className="flex items-center gap-2">
                                        {board.allowStudentEditing ? (
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                                                Öğrenci Yazabilir
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 text-[11px] font-medium">
                                                Yalnızca İzleme
                                            </span>
                                        )}
                                        {board.isPasswordProtected && (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                                                🔒 Şifreli
                                            </span>
                                        )}
                                        {!isTeacher && board.teacherName && (
                                            <span className="text-slate-400 text-[11px] truncate">
                                                Öğretmen: {board.teacherName}
                                            </span>
                                        )}
                                    </div>

                                    {/* Sağ Eylemler: Sınıfa Taşı, QR, Sil, Aç */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Sınıfa Ata / Taşı Menüsü (Öğretmen ve Sınıflar Varsa) */}
                                        {isTeacher && availableClasses.length > 0 && (
                                            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMovingBoardId((prev) => (prev === board.roomId ? null : board.roomId));
                                                        setColorPickerBoardId(null);
                                                    }}
                                                    className={`p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs ${
                                                        isMoveMenuOpen
                                                            ? 'bg-indigo-600 text-white border-indigo-400'
                                                            : 'bg-white/5 hover:bg-white/15 text-slate-300 border-white/10'
                                                    }`}
                                                    title="Tahtanın Sınıfını Değiştir"
                                                >
                                                    <FaExchangeAlt className="text-xs" />
                                                    <span className="hidden md:inline text-[11px]">Sınıfa Ata</span>
                                                </button>

                                                {isMoveMenuOpen && (
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute right-0 bottom-full mb-2 p-2 bg-slate-900 border border-white/20 rounded-xl shadow-2xl z-50 flex flex-col gap-1 w-48 backdrop-blur-xl max-h-48 overflow-y-auto"
                                                    >
                                                        <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 border-b border-white/10">
                                                            Sınıf Seçin
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleAssignClass(board.roomId, null, e)}
                                                            className={`text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                                                !board.classId ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span>Sınıflandırılmamış</span>
                                                            {!board.classId && <FaCheck className="text-[10px]" />}
                                                        </button>
                                                        {availableClasses.map((cls) => (
                                                            <button
                                                                key={cls._id}
                                                                type="button"
                                                                onClick={(e) => handleAssignClass(board.roomId, cls._id, e)}
                                                                className={`text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                                                    board.classId === cls._id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <span className="truncate">{cls.name}</span>
                                                                {board.classId === cls._id && <FaCheck className="text-[10px]" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={(e) =>
                                                handleDeleteBoard(
                                                    board.roomId,
                                                    boardTitle,
                                                    board._id,
                                                    e
                                                )
                                            }
                                            className="p-1.5 sm:p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer shrink-0"
                                            title="Sil"
                                        >
                                            <FaTrash className="text-xs sm:text-sm" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => openBoard(board.roomId)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/15 transition-all cursor-pointer shrink-0"
                                            title="Tahtayı Aç"
                                        >
                                            <span>Tahtayı Aç</span>
                                            <FaArrowRight className="text-[10px]" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create Board Modal */}
            <CreateBoardModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreateBoard={handleCreateBoard}
                initialClassId={classId}
            />

            {/* Room QR Code Modal */}
            <RoomQRModal
                isOpen={Boolean(selectedQRBoard)}
                onClose={() => setSelectedQRBoard(null)}
                roomId={selectedQRBoard?.roomId}
                boardName={selectedQRBoard?.name}
            />
        </div>
    );
};

export default BoardsManager;
