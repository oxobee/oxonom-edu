import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
// import { v4 as uuidv4 } from 'uuid'; // Removed in favor of crypto.randomUUID()
import io from 'socket.io-client';
import api, { getApiBaseUrl } from '../lib/api';
import {
    FaEraser, FaPen, FaTrash, FaSignOutAlt, FaShareAlt, FaCopy,
    FaSlash, FaUndo, FaRedo, FaSave, FaMoon, FaSun, FaDownload, FaFilePdf, FaFont,
    FaHighlighter, FaImage, FaStickyNote, FaMousePointer, FaDrawPolygon, FaUserEdit, FaUsers, FaTimes,
    FaHandPaper, FaQrcode, FaCropAlt, FaSyncAlt, FaLock, FaLockOpen,
    FaLongArrowAltRight, FaArrowsAltH, FaBold, FaItalic, FaUnderline, FaStrikethrough, FaMinus, FaChevronDown, FaChevronUp, FaGripHorizontal,
    FaSlidersH
} from 'react-icons/fa';
import {
    BsSquare, BsCircle, BsTriangle, BsPentagon, BsHexagon, BsOctagon, BsStar,
    BsZoomIn, BsZoomOut, BsStars, BsLayers, BsGripVertical
} from 'react-icons/bs';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import LanguageToggle from './LanguageToggle';
import PWAInstallPrompt from './PWAInstallPrompt';
import RoomQRModal from './RoomQRModal';
import ImageCropModal from './ImageCropModal';
import LayersPanel from './LayersPanel';
import ReadingScreen from './ReadingScreen';
import LetterWritingScreen from './LetterWritingScreen';
import EmojiPickerModal, { createEmojiImage } from './EmojiPickerModal';
import { Focus, Smile } from 'lucide-react';

const PRESET_COLORS = [
    '#ffffff', '#000000', '#475569', '#ef4444', '#f97316', '#f59e0b', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
];

const Whiteboard = () => {
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const [socket, setSocket] = useState(null);
    const imageCache = useRef({}); // Cache for loaded images

    // State
    const [elements, setElements] = useState([]); // History of all drawn elements
    const [history, setHistory] = useState([]); // Array<Action> {type, ...}
    const [redoStack, setRedoStack] = useState([]);
    const [undoSnapshot, setUndoSnapshot] = useState(null); // Snapshot for diffing updates
    const [cursors, setCursors] = useState({}); // { socketId: { x, y, color, username } }

    // Debug: Expose elements -> Removed
    // useEffect(() => { window.elements = elements; }, [elements]);

    let user = null;
    try {
        const searchParams = new URLSearchParams(window.location.search);
        const authParam = searchParams.get('auth');
        if (authParam) {
            try {
                const payload = JSON.parse(atob(authParam.split('.')[1]));
                localStorage.setItem('token', authParam);
                const companionUser = {
                    id: payload.id,
                    role: payload.role || 'teacher',
                    username: payload.username || 'Öğretmen',
                    email: payload.email || 'ogretmen@oxonom.com',
                    isVerified: true
                };
                localStorage.setItem('user', JSON.stringify(companionUser));
            } catch (e) {}
        }
        const userStr = localStorage.getItem('user');
        if (userStr) {
            user = JSON.parse(userStr);
        }
    } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        user = null;
    }
    const isTeacherUser = user?.role === 'teacher' || user?.role === 'admin';
    const [isHost, setIsHost] = useState(isTeacherUser);
    const isStudent = !isHost;

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [brushSize, setBrushSize] = useState(5);
    const [tool, setTool] = useState('pen'); // pen, eraser, rect, circle, line
    const [darkMode, setDarkMode] = useState(true);
    const [showCopied, setShowCopied] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showSaveMenu, setShowSaveMenu] = useState(false);
    const [showShapeMenu, setShowShapeMenu] = useState(false);
    const [lineStyle, setLineStyle] = useState('plain'); // 'plain', 'arrow', 'double-arrow', 'dashed', 'dashed-arrow'
    const [showLineMenu, setShowLineMenu] = useState(false);
    const linePressTimerRef = useRef(null);
    const [showTextMenu, setShowTextMenu] = useState(false);
    const textPressTimerRef = useRef(null);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [textMode, setTextMode] = useState('single'); // 'single' | 'multi'
    const textBoxStartRef = useRef(null);
    const textBoxPreviewRef = useRef(null);
    const resizeHandleRef = useRef('br'); // 'br' or 'bl'

    // Rich Typography State for Text Tool
    const [currentFontFamily, setCurrentFontFamily] = useState('TTKBDikTemel');
    const [currentFontSize, setCurrentFontSize] = useState(24);
    const [isTextBold, setIsTextBold] = useState(false);
    const [isTextItalic, setIsTextItalic] = useState(false);
    const [isTextUnderline, setIsTextUnderline] = useState(false);
    const [isTextStrike, setIsTextStrike] = useState(false);

    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [renderTrigger, setRenderTrigger] = useState(0); // Force re-renders for remote strokes

    // Per-student permission states
    const [connectedUsers, setConnectedUsers] = useState([]); // All users in room
    const [allowedStudents, setAllowedStudents] = useState([]); // Students with permission
    const [hasEditPermission, setHasEditPermission] = useState(isTeacherUser); // Current student's permission
    const [showStudentPanel, setShowStudentPanel] = useState(false); // Panel visibility
    
    // Waiting room state
    const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
    const [waitingStudents, setWaitingStudents] = useState([]);

    const [currentElement, setCurrentElement] = useState(null);
    const [selectedElements, setSelectedElements] = useState([]); // Array of { id, index, initialX, initialY, initialSnapshot, attachedElements }
    const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, currentX, currentY }
    const selectionBoxRef = useRef(null);
    const [lassoPath, setLassoPath] = useState(null); // Array<{x, y}> for freehand lasso multi-selection
    const lassoPathRef = useRef(null);
    const selectedElementsRef = useRef(selectedElements);
    selectedElementsRef.current = selectedElements;
    const dragStartPosRef = useRef({ mouseX: 0, mouseY: 0 });

    // Backward-compatible single selectedElement (null when 0 or multiple selected)
    const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
    const setSelectedElement = useCallback((val) => {
        if (!val) {
            setSelectedElements([]);
        } else if (typeof val === 'function') {
            setSelectedElements(prev => {
                const currentSingle = prev.length === 1 ? prev[0] : (prev[0] || null);
                const res = val(currentSingle);
                if (!res) return [];
                return [res];
            });
        } else {
            setSelectedElements([val]);
        }
    }, []);

    const [cropModalElement, setCropModalElement] = useState(null);
    const [showRotateMenu, setShowRotateMenu] = useState(false);
    const [showLayersPanel, setShowLayersPanel] = useState(false); // Layers panel visibility
    const [showReadingScreen, setShowReadingScreen] = useState(false); // İlkokul 1 Dk Okuma Ekranı
    const [showLetterWritingScreen, setShowLetterWritingScreen] = useState(false); // İlkokul Harf Çizgi & Yazılış Yönü Atölyesi
    const [showEmojiModal, setShowEmojiModal] = useState(false); // Emoji & İşaret Kütüphanesi Modalı
    const [showColorPalette, setShowColorPalette] = useState(false); // Hızlı Renk Paleti Popover
    const colorInputRef = useRef(null);
    const colorPaletteRef = useRef(null);
    const [isDockCollapsed, setIsDockCollapsed] = useState(false); // Dokunmatik yüzey için ana dock küçültme
    const [isTextFormatCollapsed, setIsTextFormatCollapsed] = useState(false); // Metin format barı küçültme
    const [aiToastMessage, setAiToastMessage] = useState(null);
    const [editingElement, setEditingElement] = useState(null); // { index, text, x, y, width, height }
    const [action, setAction] = useState('none'); // 'drawing', 'moving', 'resizing'
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false); // ← NEW
    const textAreaRef = useRef(null);
    const draggedElementRef = useRef(null); // Fix for stale state in history
    const currentStrokeRef = useRef(null); // Optimization: Mutable ref for drawing to bypass React Render Cycle
    const isDrawingRef = useRef(false); // Synchronous drawing flag to eliminate mobile event drop
    const actionRef = useRef('none'); // Synchronous action state
    const lastEmitTimeRef = useRef(0); // Throttle socket emissions
    const isHostRef = useRef(isTeacherUser);
    const isHostStateRef = useRef(isTeacherUser);
    const hasEditPermissionRef = useRef(isTeacherUser);
    hasEditPermissionRef.current = hasEditPermission || isTeacherUser;
    const elementsRef = useRef(elements);
    elementsRef.current = elements;
    const userRef = useRef(user);
    userRef.current = user;
    const scaleRef = useRef(scale);
    scaleRef.current = scale;
    const panOffsetRef = useRef(panOffset);
    panOffsetRef.current = panOffset;
    const toolRef = useRef(tool);
    toolRef.current = tool;
    const colorRef = useRef(color);
    colorRef.current = color;
    const brushSizeRef = useRef(brushSize);
    brushSizeRef.current = brushSize;
    const isHostStateUpdatedRef = useRef(isHost);
    isHostStateUpdatedRef.current = isHost;
    const fitToContentRef = useRef(null);
    const userHasManuallyPannedRef = useRef(false);
    const autoFitDebounceRef = useRef(null);
    const activePointersRef = useRef(new Map());
    const startDrawingRef = useRef(null);
    const handleStrokeMoveRef = useRef(null);
    const stopDrawingRef = useRef(null);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100, visible: false });
    const erasedInStrokeRef = useRef(new Set());
    const erasedListRef = useRef([]);
    const lastEraserWorldPosRef = useRef(null);
    const eraserInitialElementsRef = useRef(null);
    const modifiedImagesInStrokeRef = useRef(new Set());
    const [isTopLeftExpanded, setIsTopLeftExpanded] = useState(false);
    const [isTopRightExpanded, setIsTopRightExpanded] = useState(false);

    const navigate = useNavigate();
    const { roomId } = useParams();

    // Board Metadata, Sticky Header, and Password Protection States
    const [boardMeta, setBoardMeta] = useState(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    const handleVerifyPassword = async (e) => {
        if (e) e.preventDefault();
        if (!passwordInput.trim()) return;
        setIsUnlocking(true);
        setPasswordError('');
        try {
            const res = await api.post(`/api/boards/${roomId}/verify-password`, { password: passwordInput });
            if (res.data.success) {
                if (res.data.elements) {
                    setElements(res.data.elements);
                }
                setIsPasswordModalOpen(false);
                setPasswordInput('');
            }
        } catch (err) {
            setPasswordError(err.response?.data?.message || 'Şifre hatalı.');
        } finally {
            setIsUnlocking(false);
        }
    };

    // Prevent mobile browser page bounce/slip while drawing on whiteboard
    useEffect(() => {
        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyTouch = document.body.style.touchAction;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.touchAction = originalBodyTouch;
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.documentElement.style.overscrollBehavior = '';
        };
    }, []);

    // Auto-focus on initial open or page refresh (Sayfa yenilendiğinde veya ilk açıldığında otomatik odaklama)
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentEls = elementsRef.current;
            if (fitToContentRef.current && currentEls && currentEls.length > 0) {
                userHasManuallyPannedRef.current = false;
                fitToContentRef.current(currentEls);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, []);

    // Socket Init + Board Existence Check
    useEffect(() => {
        const token = localStorage.getItem('token');
        const newSocket = io(getApiBaseUrl(), {
            auth: {
                token: token // Add JWT token for Socket.IO authentication
            }
        });
        setSocket(newSocket);

        const joinRoom = () => {
            newSocket.emit('join-room', roomId, {
                userId: user?.id,
                username: user?.username || user?.email?.split('@')[0] || 'Anonymous',
                role: user?.role || 'student'
            });
        };

        newSocket.on('connect', joinRoom);
        if (newSocket.connected) {
            joinRoom();
        }

        // Check if board still exists and fetch metadata & lock status
        const checkBoardExists = async () => {
            try {
                const response = await api.get(`/api/boards/${roomId}`);
                if (!response.data) {
                    alert('This board does not exist or has been deleted');
                    navigate('/dashboard', { replace: true });
                    return;
                }
                setBoardMeta(response.data);
                if (response.data.isLocked) {
                    setIsPasswordModalOpen(true);
                    setElements([]);
                } else if (response.data.elements && response.data.elements.length > 0) {
                    setElements(response.data.elements);
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log('[BOARD-CHECK] Board was deleted (404), clearing state');
                    alert('This board does not exist or has been deleted');
                    navigate('/dashboard', { replace: true });
                } else if (error.response?.status === 403) {
                    alert(error.response?.data?.message || 'Bu tahtaya erişim yetkiniz yok');
                    navigate('/dashboard', { replace: true });
                }
            }
        };

        checkBoardExists();

        return () => newSocket.close();
    }, [roomId]);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('draw-element', (element) => {
            setElements((prev) => {
                const index = prev.findIndex((el) => el.id === element.id);
                if (index !== -1) {
                    // Update existing element
                    const newElements = [...prev];
                    newElements[index] = element;
                    return newElements;
                } else {
                    // Add new element
                    return [...prev, element];
                }
            });

            // Clean up remote stroke when it's finalized
            if (window.remoteStrokes) {
                if (element.socketId) delete window.remoteStrokes[element.socketId];
                if (element.userId) delete window.remoteStrokes[element.userId];
            }

            // Auto-fit on mobile student if user hasn't manually panned
            if (window.innerWidth < 768 && !isHostRef.current && !userHasManuallyPannedRef.current) {
                if (autoFitDebounceRef.current) clearTimeout(autoFitDebounceRef.current);
                autoFitDebounceRef.current = setTimeout(() => {
                    setElements(latest => {
                        if (fitToContentRef.current) {
                            fitToContentRef.current(latest);
                        }
                        return latest;
                    });
                }, 350);
            }
        });

        // Waiting Room Listeners
        socket.on('waiting-for-approval', () => {
            setIsWaitingForApproval(true);
        });

        socket.on('participant-waiting', (student) => {
            if (isHost) {
                setWaitingStudents(prev => [...prev.filter(s => s.socketId !== student.socketId), student]);
            }
        });

        socket.on('waiting-participants-list', (students) => {
            if (isHost) {
                setWaitingStudents(students);
            }
        });

        socket.on('join-accepted', () => {
            setIsWaitingForApproval(false);
        });

        socket.on('join-declined', () => {
            alert('Your request to join the board was declined by the teacher.');
            navigate('/dashboard', { replace: true });
        });

        // Real-time stroke updates (while drawing)
        socket.on('drawing-stroke', (strokeData) => {
            // Ignore own stroke if socketId matches
            if (strokeData.socketId && socket && strokeData.socketId === socket.id) {
                return;
            }
            if (!strokeData.socketId && strokeData.userId === user?.id) {
                return;
            }
            // Store the remote device's current stroke for real-time rendering
            if (!window.remoteStrokes) window.remoteStrokes = {};
            const strokeKey = strokeData.socketId || strokeData.userId || 'remote';
            window.remoteStrokes[strokeKey] = strokeData.stroke;
            // Force re-render immediately
            setRenderTrigger(prev => prev + 1);
        });

        // Delete element (for undo synchronization)
        socket.on('delete-element', (elementId) => {
            setElements(prev => {
                const filtered = prev.filter(el => el.id !== elementId);
                return filtered;
            });
        });

        // Clear canvas (when teacher clicks Clear All button)
        socket.on('clear-canvas', () => {
            setElements([]);
            elementsRef.current = [];
            setSelectedElements([]);
            setSelectedElement(null);

            // Use requestAnimationFrame to ensure canvas clears after state update
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                });
            });
        });

        socket.on('load-board', async (boardData) => {
            if (boardData.isLocked) {
                setIsPasswordModalOpen(true);
                setElements([]);
                return;
            }

            // Handle both old format (array) and new format (object)
            const loadedElements = Array.isArray(boardData) ? boardData : (boardData.elements || []);
            const allowedStudentsList = boardData.allowedParticipants || [];
            const isCurrentUserHost = user?.id === boardData.hostId;
            setIsHost(isCurrentUserHost);
            isHostRef.current = isCurrentUserHost;

            // Deduplicate loaded elements (Fix for "ghost" images from previous bug)
            const uniqueMap = new Map();
            loadedElements.forEach(el => {
                uniqueMap.set(el.id, el); // Latest wins
            });
            const allEls = Array.from(uniqueMap.values());
            setElements(allEls);
            setAllowedStudents(allowedStudentsList);

            // Auto-fit content on load/refresh so all drawings are immediately framed and focused
            if (allEls.length > 0) {
                userHasManuallyPannedRef.current = false;
                setTimeout(() => {
                    if (fitToContentRef.current) {
                        fitToContentRef.current(allEls);
                    }
                }, 200);
            }

            // Check if current student has permission
            if (!isCurrentUserHost) {
                const hasPermission = (allowedStudentsList && allowedStudentsList.some(s => s._id === user?.id)) || Boolean(boardData.allowStudentEditing);
                setHasEditPermission(hasPermission);

                // Auto-save board for student (independent copy)
                try {
                    await api.post('/api/boards/save', {
                        roomId: roomId,
                        boardName: boardData.boardName || 'Untitled Board',
                        teacherName: boardData.hostName || 'Unknown Host',
                        elements: loadedElements
                    });
                } catch (err) {
                    // Silently fail if already saved or error occurs
                    if (err.response?.status !== 400) {
                        console.error('[AUTO-SAVE] Error:', err);
                    }
                }
            }
        });

        // Board deleted event - clear everything and redirect
        socket.on('board-deleted', (data) => {
            // Clear all state
            setElements([]);
            setHistory([]);
            setRedoStack([]);

            // Clear canvas
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }

            // Show notification and redirect
            alert('This board has been deleted');
            navigate('/dashboard');
        });

        socket.on('cursor-move', (data) => {
            setCursors(prev => ({ ...prev, [data.userId]: data }));
        });

        // Viewport sync - students follow teacher's view
        socket.on('viewport-change', (viewportData) => {
            // Only students should follow teacher's viewport
            const isCurrentStudent = !isHostRef.current;
            if (isCurrentStudent && viewportData.userId !== user?.id) {
                const isMobile = window.innerWidth < 768;
                if (isMobile && viewportData.worldCenterX !== undefined && viewportData.worldCenterY !== undefined) {
                    const screenW = window.innerWidth;
                    const screenH = window.innerHeight;
                    const paddingTop = 80;
                    const paddingBottom = 150;
                    const visibleH = Math.max(screenH - paddingTop - paddingBottom, 100);
                    const targetScreenCenterX = screenW / 2;
                    const targetScreenCenterY = paddingTop + (visibleH / 2);

                    let studentScale = viewportData.scale;
                    if (viewportData.screenWidth && viewportData.screenHeight) {
                        const widthRatio = (screenW - 32) / viewportData.screenWidth;
                        const heightRatio = visibleH / viewportData.screenHeight;
                        const responsiveRatio = Math.min(widthRatio, heightRatio);
                        studentScale = Math.min(Math.max(viewportData.scale * responsiveRatio, 0.2), 1.0);
                    }

                    setScale(studentScale);
                    setPanOffset({
                        x: (targetScreenCenterX / studentScale) - viewportData.worldCenterX,
                        y: (targetScreenCenterY / studentScale) - viewportData.worldCenterY
                    });
                } else {
                    setScale(viewportData.scale);
                    setPanOffset(viewportData.panOffset);
                }
            }
        });

        // Room users updated (for teacher's student panel)
        socket.on('room-users-updated', (users) => {
            setConnectedUsers(users);
        });

        // Student editing permission changed (for individual students or global toggle)
        socket.on('editing-permission-changed', (hasPermission) => {
            if (!isHost) {
                setHasEditPermission(hasPermission);
            }
        });

        socket.on('student-editing-changed', (allowEditing) => {
            if (!isHost) {
                setHasEditPermission(Boolean(allowEditing));
            }
        });

        // Theme synchronization (students follow teacher's theme)
        socket.on('theme-changed', (isDark) => {
            if (!isHost) {
                setDarkMode(isDark);
            } else {
                console.log('[THEME-SYNC] Ignoring theme change (not a student)');
            }
        });

        // Delete element (for undo synchronization)
        socket.on('delete-element', (elementId) => {
            setElements(prev => {
                const filtered = prev.filter(el => el.id !== elementId);
                // Force canvas re-render after state update
                requestAnimationFrame(() => {
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        filtered.forEach(el => drawElement(ctx, el));
                    }
                });

                return filtered;
            });
        });

        // Update element (for eraser redo synchronization and live sticky note editing)
        socket.on('update-element', ({ elementId, updates }) => {
            setElements(prev => {
                const updated = prev.map(el =>
                    el.id === elementId ? { ...el, ...updates } : el
                );

                // Force canvas re-render to show live text changes
                requestAnimationFrame(() => {
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        updated.forEach(el => drawElement(ctx, el));
                    }
                });

                return updated;
            });
        });

        // Sync state (for redo to maintain exact element order)
        socket.on('sync-state', (elements) => {
            setElements(elements);

            // Force canvas re-render to ensure visual consistency
            requestAnimationFrame(() => {
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    elements.forEach(el => drawElement(ctx, el));
                }
            });
        });

        return () => {
            socket.off('draw-element');
            socket.off('drawing-stroke');
            socket.off('load-board');
            socket.off('clear-canvas');
            socket.off('cursor-move');
            socket.off('viewport-change');
            socket.off('room-users-updated');
            socket.off('editing-permission-changed');
            socket.off('student-editing-changed');
            socket.off('theme-changed');
            socket.off('delete-element');
            socket.off('update-element');
            socket.off('sync-state');
            socket.off('waiting-for-approval');
            socket.off('participant-waiting');
            socket.off('waiting-participants-list');
            socket.off('join-accepted');
            socket.off('join-declined');
        };
    }, [socket]);

    const distToSegmentSquared = (p, v, w) => {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
    };

    const distToSegment = (p, v, w) => Math.sqrt(distToSegmentSquared(p, v, w));

    const getElementBounds = (el) => {
        if (!el) return null;
        if (el.points && Array.isArray(el.points) && el.points.length > 0) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let i = 0; i < el.points.length; i++) {
                const pt = el.points[i];
                if (!pt) continue;
                const px = pt.x ?? 0;
                const py = pt.y ?? 0;
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
            }
            if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
            const pad = Math.max(el.size || 5, 4);
            return {
                x: minX - pad,
                y: minY - pad,
                width: Math.max((maxX - minX) + pad * 2, 20),
                height: Math.max((maxY - minY) + pad * 2, 20)
            };
        }
        if (el.type === 'line') {
            const ex = el.x ?? 0;
            const ey = el.y ?? 0;
            const endX = el.endX ?? ex;
            const endY = el.endY ?? ey;
            const minX = Math.min(ex, endX);
            const maxX = Math.max(ex, endX);
            const minY = Math.min(ey, endY);
            const maxY = Math.max(ey, endY);
            const pad = Math.max(el.size || 5, 8);
            return {
                x: minX - pad,
                y: minY - pad,
                width: Math.max((maxX - minX) + pad * 2, 20),
                height: Math.max((maxY - minY) + pad * 2, 20)
            };
        }
        if (el.type === 'circle') {
            const cx = el.x ?? 0;
            const cy = el.y ?? 0;
            const r = Math.sqrt(Math.pow(el.width || 0, 2) + Math.pow(el.height || 0, 2));
            return {
                x: cx - r,
                y: cy - r,
                width: Math.max(r * 2, 20),
                height: Math.max(r * 2, 20)
            };
        }
        if (el.type === 'text') {
            const fSize = el.fontSize || (el.size || 5) * 5;
            const singleH = Math.round(fSize * 1.25);
            const isSingle = el.textMode === 'single' || el.isSingleLine;
            const textH = isSingle ? singleH : Math.max(el.height || singleH, singleH);
            return {
                x: el.x || 0,
                y: el.y || 0,
                width: Math.max(el.width || 40, 20),
                height: textH
            };
        }
        const w = Math.max(el.width || 0, 20);
        const h = Math.max(el.height || 0, 20);
        return {
            x: el.x || 0,
            y: el.y || 0,
            width: w,
            height: h
        };
    };

    // Text wrapping and rich formatting helper
    const wrapText = (ctx, text, x, y, maxWidth, lineHeight, maxHeight, format = {}) => {
        const paragraphs = (text || '').split('\n');
        let currentY = y;

        const drawFormattedLine = (lineStr, lineX, lineY) => {
            ctx.fillText(lineStr, lineX, lineY);
            if (format && (format.underline || format.strike)) {
                const textW = ctx.measureText(lineStr.trimEnd()).width;
                if (textW > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = ctx.fillStyle;
                    ctx.lineWidth = Math.max(1, (format.fontSize || 20) / 14);
                    if (format.underline) {
                        const ulY = lineY + (format.fontSize || 20) * 1.05;
                        ctx.moveTo(lineX, ulY);
                        ctx.lineTo(lineX + textW, ulY);
                    }
                    if (format.strike) {
                        const stY = lineY + (format.fontSize || 20) * 0.55;
                        ctx.moveTo(lineX, stY);
                        ctx.lineTo(lineX + textW, stY);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            }
        };

        paragraphs.forEach(paragraph => {
            let words = paragraph.split(' ');
            let line = '';

            for (let n = 0; n < words.length; n++) {
                if (maxHeight && currentY + lineHeight > y + maxHeight) {
                    return;
                }

                let word = words[n];

                if (ctx.measureText(word).width > maxWidth) {
                    if (line.trim()) {
                        drawFormattedLine(line, x, currentY);
                        currentY += lineHeight;
                        line = '';
                    }

                    let remainingWord = word;
                    while (remainingWord.length > 0) {
                        if (maxHeight && currentY + lineHeight > y + maxHeight) {
                            return;
                        }

                        let chunk = '';
                        for (let i = 0; i < remainingWord.length; i++) {
                            let testChunk = chunk + remainingWord[i];
                            if (ctx.measureText(testChunk).width > maxWidth) {
                                break;
                            }
                            chunk = testChunk;
                        }

                        if (chunk.length === 0) chunk = remainingWord[0];
                        drawFormattedLine(chunk, x, currentY);
                        currentY += lineHeight;
                        remainingWord = remainingWord.substring(chunk.length);
                    }
                    continue;
                }

                let testLine = line + word + ' ';
                let metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    drawFormattedLine(line, x, currentY);
                    line = word + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }

            if (!maxHeight || currentY + lineHeight <= y + maxHeight) {
                drawFormattedLine(line, x, currentY);
                currentY += lineHeight;
            }
        });
        return currentY;
    };

    // Doodle Line & Arrow Helpers
    const drawDoodleLine = (ctx, x1, y1, x2, y2, size, color, isDashed = false) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        if (length < 1) return;

        // Pseudo-random deterministic jitter based on coordinates
        const seed = Math.abs(Math.sin(x1 * 12.9898 + y1 * 78.233 + x2 * 37.719 + y2 * 53.123));
        const nx = -dy / length;
        const ny = dx / length;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isDashed) {
            ctx.setLineDash([Math.max(8, size * 2.5), Math.max(6, size * 1.8)]);
        } else {
            ctx.setLineDash([]);
        }

        // Midpoint organic curve
        const curveOffset = (seed - 0.5) * Math.min(length * 0.04, 3.5);
        const mx = (x1 + x2) / 2 + nx * curveOffset;
        const my = (y1 + y2) / 2 + ny * curveOffset;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.stroke();

        // Subtle sketch second pass for non-dashed solid lines
        if (!isDashed && size >= 2) {
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.lineWidth = Math.max(1, size * 0.65);
            const curveOffset2 = -curveOffset * 0.7;
            const mx2 = (x1 + x2) / 2 + nx * curveOffset2;
            const my2 = (y1 + y2) / 2 + ny * curveOffset2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(mx2, my2, x2, y2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    };

    const drawDoodleArrowHead = (ctx, fromX, fromY, toX, toY, size, color) => {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const headLength = Math.max(size * 3.5, 14);
        const wingAngle = Math.PI / 6.5;

        const x1 = toX - headLength * Math.cos(angle - wingAngle);
        const y1 = toY - headLength * Math.sin(angle - wingAngle);
        const x2 = toX - headLength * Math.cos(angle + wingAngle);
        const y2 = toY - headLength * Math.sin(angle + wingAngle);

        ctx.save();
        ctx.setLineDash([]); // Arrowhead is always solid
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, size);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Wing 1
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + toX) / 2, (y1 + toY) / 2, toX, toY);
        ctx.stroke();

        // Wing 2
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.quadraticCurveTo((x2 + toX) / 2, (y2 + toY) / 2, toX, toY);
        ctx.stroke();

        ctx.restore();
    };

    // Text dimension recalculator helper
    const recalculateTextDimensions = (el, newProps = {}) => {
        const canvas = canvasRef.current;
        if (!canvas) return { width: el.width || 200, height: el.height || 50 };
        const ctx = canvas.getContext('2d');
        const fFamily = newProps.fontFamily !== undefined ? newProps.fontFamily : (el.fontFamily || 'TTKBDikTemel, sans-serif');
        const fSize = newProps.fontSize !== undefined ? newProps.fontSize : (el.fontSize || (el.size || 5) * 5);
        const isB = newProps.bold !== undefined ? newProps.bold : !!el.bold;
        const isI = newProps.italic !== undefined ? newProps.italic : !!el.italic;
        ctx.font = `${isI ? 'italic ' : ''}${isB ? 'bold ' : ''}${fSize}px ${fFamily}`;
        const lineHeight = fFamily.includes('TTKB') ? fSize * 2.0 : fSize * 1.3;
        const text = newProps.text !== undefined ? newProps.text : (el.text || '');

        let calculatedWidth = el.width || 200;
        if (!el.isFixedWidth) {
            const lines = text.split('\n');
            let maxLineW = 0;
            lines.forEach(line => {
                const w = ctx.measureText(line).width;
                if (w > maxLineW) maxLineW = w;
            });
            calculatedWidth = Math.max(100, maxLineW + 24);
        }
        const measuredHeight = wrapText(ctx, text, 0, 0, calculatedWidth, lineHeight);
        return {
            width: calculatedWidth,
            height: Math.max(measuredHeight, fSize * (fFamily.includes('TTKB') ? 2.0 : 1.3))
        };
    };

    // 1. Define drawElement first so it's available
    const drawElement = (ctx, element) => {
        const { type, color, size, points, x, y, width, height, endX, endY, text, dataURL } = element;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (type === 'pen' || type === 'eraser' || type === 'highlighter') {
            if (type === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.globalAlpha = 1.0; // Full opacity to completely erase
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = color;
            }
            ctx.lineWidth = size;
            if (type === 'highlighter') {
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = size * 3;
            }
            ctx.beginPath();
            if (points.length > 0) {
                ctx.moveTo(points[0].x, points[0].y);
                if (points.length < 3) {
                    // Not enough points for curves, straight lines
                    points.forEach(p => ctx.lineTo(p.x, p.y));
                } else {
                    // Quadratic Bezier Smoothing
                    let i;
                    for (i = 1; i < points.length - 2; i++) {
                        const xc = (points[i].x + points[i + 1].x) / 2;
                        const yc = (points[i].y + points[i + 1].y) / 2;
                        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                    }
                    // Curve through the last two points
                    ctx.quadraticCurveTo(
                        points[i].x,
                        points[i].y,
                        points[i + 1].x,
                        points[i + 1].y
                    );

                    // ACTIVE TIP IMPLEMENTATION
                    // If this is the currently active stroke, draw a straight line 
                    // from the last rendered geometric point to the actual latest point.
                    // This creates an "instant" feel while curves settle behind it.
                    if (currentStrokeRef.current && element.id === currentStrokeRef.current.id) {
                        const lastP = points[points.length - 1];
                        ctx.lineTo(lastP.x, lastP.y);
                    }
                }
                ctx.stroke();
                // Reset globalAlpha and globalCompositeOperation after highlighter
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'source-over';
            }
        } else if (type === 'rect') {
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.beginPath();
            ctx.rect(x, y, width, height);
            ctx.stroke();
        } else if (type === 'sticky') {
            ctx.save();
            const noteColor = element.color || '#fef08a';
            const curlSize = Math.max(12, Math.min(26, width * 0.14, height * 0.14));

            // 1. Realistic Soft Multi-layer Drop Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.20)';
            ctx.shadowBlur = 14;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 6;

            // 2. Paper Path with bottom-right fold cut
            ctx.beginPath();
            ctx.moveTo(x + 4, y);
            ctx.lineTo(x + width - 4, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + 4);
            ctx.lineTo(x + width, y + height - curlSize);
            ctx.lineTo(x + width - curlSize, y + height);
            ctx.lineTo(x + 4, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - 4);
            ctx.lineTo(x, y + 4);
            ctx.quadraticCurveTo(x, y, x + 4, y);
            ctx.closePath();

            // Tactile Warm Paper Gradient
            const paperGrad = ctx.createLinearGradient(x, y, x, y + height);
            paperGrad.addColorStop(0, '#fffdf0');
            paperGrad.addColorStop(0.18, noteColor);
            paperGrad.addColorStop(1, '#fde047');
            ctx.fillStyle = paperGrad;
            ctx.fill();

            // Clear shadow for internal elements
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // 3. Top Adhesive Band (Yapışkan üst şerit)
            const adhesiveH = Math.max(14, height * 0.12);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
            ctx.fillRect(x, y, width, adhesiveH);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(x, y, width, 2);

            // 4. Frosted Washi Tape at Top Center (Şeffaf koruyucu bant efekti)
            const tapeW = Math.min(68, width * 0.38);
            const tapeH = 14;
            const tapeX = x + (width - tapeW) / 2;
            const tapeY = y - 6;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
            ctx.fillRect(tapeX, tapeY, tapeW, tapeH);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1;
            ctx.strokeRect(tapeX, tapeY, tapeW, tapeH);

            // 5. 3D Corner Curl (Kıvrık köşe ve alt gölgesi)
            if (curlSize > 6) {
                // Curl under-shadow
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x + width - curlSize, y + height);
                ctx.lineTo(x + width, y + height - curlSize);
                ctx.lineTo(x + width - curlSize, y + height - curlSize);
                ctx.closePath();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
                ctx.fill();

                // Folded triangular flap with 3D gradient
                ctx.beginPath();
                ctx.moveTo(x + width - curlSize, y + height);
                ctx.lineTo(x + width - curlSize, y + height - curlSize);
                ctx.lineTo(x + width, y + height - curlSize);
                ctx.closePath();
                const curlGrad = ctx.createLinearGradient(
                    x + width - curlSize, y + height,
                    x + width, y + height - curlSize
                );
                curlGrad.addColorStop(0, '#fffbeb');
                curlGrad.addColorStop(0.5, '#fde047');
                curlGrad.addColorStop(1, '#ca8a04');
                ctx.fillStyle = curlGrad;
                ctx.fill();

                // Subtle edge stroke on the fold
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
                ctx.restore();
            }

            // 6. Subtle Ruled Notebook Lines (Hafif defter çizgileri)
            const lineGap = Math.max(18, height * 0.13);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.045)';
            ctx.lineWidth = 1;
            for (let ly = y + adhesiveH + lineGap; ly < y + height - curlSize - 6; ly += lineGap) {
                ctx.beginPath();
                ctx.moveTo(x + width * 0.07, ly);
                ctx.lineTo(x + width * 0.93, ly);
                ctx.stroke();
            }

            // 7. Text Rendering with Language Awareness
            const isTr = !i18n?.language?.startsWith('en');
            let displayText = text || "";
            const isPlaceholder = (
                displayText === "Double click to edit..." ||
                displayText === "Düzenlemek için çift tıklayın..."
            );
            if (isPlaceholder) {
                displayText = isTr ? "Düzenlemek için çift tıklayın..." : "Double click to edit...";
                ctx.fillStyle = 'rgba(71, 85, 105, 0.65)';
            } else {
                ctx.fillStyle = '#0f172a';
            }

            const fontSize = Math.max(12, width * 0.095);
            ctx.font = `${isPlaceholder ? 'italic ' : '500 '}${fontSize}px sans-serif`;
            const paddingX = width * 0.08;
            const paddingY = adhesiveH + 10;
            const lineHeight = fontSize * 1.35;
            const maxTextHeight = height - paddingY - curlSize;
            wrapText(ctx, displayText, x + paddingX, y + paddingY, width - paddingX * 2, lineHeight, maxTextHeight);
            ctx.restore();
        } else if (type === 'circle') {
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            const r = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (type === 'line') {
            const lStyle = element.lineStyle || 'plain';
            const isDashed = lStyle === 'dashed' || lStyle === 'dashed-arrow';
            const hasEndArrow = lStyle === 'arrow' || lStyle === 'double-arrow' || lStyle === 'dashed-arrow';
            const hasStartArrow = lStyle === 'double-arrow';

            drawDoodleLine(ctx, x, y, endX, endY, size, color, isDashed);
            if (hasEndArrow) {
                drawDoodleArrowHead(ctx, x, y, endX, endY, size, color);
            }
            if (hasStartArrow) {
                drawDoodleArrowHead(ctx, endX, endY, x, y, size, color);
            }
        } else if (['triangle', 'pentagon', 'hexagon', 'octagon'].includes(type)) {
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            const sides = type === 'triangle' ? 3 : type === 'pentagon' ? 5 : type === 'hexagon' ? 6 : 8;

            ctx.beginPath();
            const cx = x + width / 2;
            const cy = y + height / 2;
            const r = Math.min(width, height) / 2;

            // Standard vertex-up logic (start at -PI/2)
            const startAngle = -Math.PI / 2;

            for (let i = 0; i < sides; i++) {
                const angle = startAngle + (i * 2 * Math.PI / sides);
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (type === 'star') {
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.beginPath();
            const cx = x + width / 2;
            const cy = y + height / 2;
            const outerRadius = Math.min(width, height) / 2;
            const innerRadius = outerRadius / 2;
            const spikes = 5;
            let rot = Math.PI / 2 * 3;
            let x_val = cx;
            let y_val = cy;
            const step = Math.PI / spikes;

            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x_val = cx + Math.cos(rot) * outerRadius;
                y_val = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x_val, y_val);
                rot += step;

                x_val = cx + Math.cos(rot) * innerRadius;
                y_val = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x_val, y_val);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
            ctx.stroke();
        } else if (type === 'image') {
            const rot = element.rotation || 0;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const imgSrc = dataURL || element.dataURL || element.src;

            ctx.save();
            if (rot !== 0) {
                ctx.translate(cx, cy);
                ctx.rotate((rot * Math.PI) / 180);
                ctx.translate(-cx, -cy);
            }

            const cached = imageCache.current[element.id];
            if (cached && (!element.dataURL || !cached._dataURL || cached._dataURL === element.dataURL)) {
                ctx.drawImage(cached, x, y, width, height);
            } else if (imgSrc) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = imgSrc;
                img.onload = () => {
                    img._dataURL = imgSrc;
                    imageCache.current[element.id] = img;
                    renderCanvas();
                };
                img.onerror = (e) => {
                    console.error("Failed to load image for drawing", element.id, e);
                };
            }
            ctx.restore();
        } else if (type === 'text') {
            ctx.save();
            ctx.fillStyle = color || (darkMode ? '#ffffff' : '#0f172a');
            const elFontFamily = element.fontFamily || 'TTKBDikTemel, sans-serif';
            const elFontSize = element.fontSize || (size || 5) * 5;
            const elBold = element.bold ? 'bold ' : '';
            const elItalic = element.italic ? 'italic ' : '';
            ctx.font = `${elItalic}${elBold}${elFontSize}px ${elFontFamily}`;
            ctx.textBaseline = 'top';
            const lineHeight = elFontFamily.includes('TTKB') ? Math.round(elFontSize * 1.35) : Math.round(elFontSize * 1.25);
            const isSingle = element.textMode === 'single' || element.isSingleLine;
            if (isSingle) {
                const cleanText = (text || '').replace(/\r?\n|\r/g, ' ');
                ctx.fillText(cleanText, x, y);
                if (element.underline || element.strike) {
                    const textW = ctx.measureText(cleanText).width;
                    if (textW > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = ctx.fillStyle;
                        ctx.lineWidth = Math.max(1, elFontSize / 14);
                        if (element.underline) {
                            ctx.moveTo(x, y + elFontSize * 1.05);
                            ctx.lineTo(x + textW, y + elFontSize * 1.05);
                        }
                        if (element.strike) {
                            ctx.moveTo(x, y + elFontSize * 0.55);
                            ctx.lineTo(x + textW, y + elFontSize * 0.55);
                        }
                        ctx.stroke();
                    }
                }
            } else {
                const w = Math.max(width || 200, 20);
                wrapText(ctx, text || '', x, y, w, lineHeight, null, {
                    fontSize: elFontSize,
                    underline: element.underline,
                    strike: element.strike
                });
            }
            ctx.restore();
        }
        // CRITICAL: Reset all canvas state before restore to prevent contamination
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    };

    // 2. Define renderCanvas (depends on drawElement)
    // 2. Define renderCanvas (depends on drawElement)
    const renderCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Dynamic Grid
        drawGrid(ctx, canvas.width, canvas.height, scale, panOffset);

        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(panOffset.x, panOffset.y);

        // Sort elements by explicit order or timestamp for consistent z-ordering across clients
        const sortedElements = [...elements].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : (a.timestamp || 0);
            const orderB = b.order !== undefined ? b.order : (b.timestamp || 0);
            return orderA - orderB;
        });

        // Integrate remote users' in-progress strokes into sorted elements for proper z-ordering
        // This maintains real-time drawing while respecting timestamp-based layering
        if (window.remoteStrokes) {
            Object.values(window.remoteStrokes).forEach(stroke => {
                if (stroke && stroke.points && stroke.points.length > 0) {
                    sortedElements.push(stroke);
                }
            });
            // Re-sort to include remote strokes in correct z-order
            sortedElements.sort((a, b) => {
                const orderA = a.order !== undefined ? a.order : (a.timestamp || 0);
                const orderB = b.order !== undefined ? b.order : (b.timestamp || 0);
                return orderA - orderB;
            });
        }

        sortedElements.forEach((element) => {
            // Skip rendering if element is hidden
            if (element.hidden) return;

            // Find original index for selection/editing checks
            const originalIndex = elements.findIndex(el => el.id === element.id);

            // Skip rendering if currently being edited (prevents double text defect for both sticky notes and text)
            if (editingElement && (editingElement.index === originalIndex || (element.id && editingElement.id === element.id))) {
                return;
            }
            drawElement(ctx, element);

            const isSelected = selectedElementsRef.current && selectedElementsRef.current.some(sel => 
                (sel.id && sel.id === element.id) || (sel.index !== -1 && sel.index === originalIndex)
            );

            if (isSelected) {
                ctx.save();
                const isLocked = !!element.locked;
                ctx.strokeStyle = isLocked ? '#f59e0b' : '#3b82f6'; // Amber if locked, Blue otherwise
                ctx.lineWidth = 2 / scale; // Keep border thin
                ctx.setLineDash([5 / scale, 3 / scale]); // Dashed sleek selection border

                const b = getElementBounds(element);
                if (b) {
                    if (element.type === 'image' && element.rotation) {
                        const cx = element.x + (element.width || 0) / 2;
                        const cy = element.y + (element.height || 0) / 2;
                        ctx.translate(cx, cy);
                        ctx.rotate((element.rotation * Math.PI) / 180);
                        ctx.translate(-cx, -cy);
                    }

                    ctx.strokeRect(b.x - 3 / scale, b.y - 3 / scale, b.width + 6 / scale, b.height + 6 / scale);

                    if (isLocked) {
                        // Draw lock badge at top-right corner
                        ctx.setLineDash([]);
                        const badgeSize = 20 / scale;
                        const bx = b.x + b.width + 3 / scale - badgeSize / 2;
                        const by = b.y - 3 / scale - badgeSize / 2;
                        ctx.fillStyle = '#f59e0b';
                        ctx.beginPath();
                        ctx.arc(bx + badgeSize / 2, by + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
                        ctx.fill();

                        // Lock padlock icon inside badge
                        ctx.fillStyle = '#ffffff';
                        const lw = 9 / scale;
                        const lh = 7.5 / scale;
                        const lx = bx + (badgeSize - lw) / 2;
                        const ly = by + (badgeSize - lh) / 2 + 2 / scale;
                        ctx.fillRect(lx, ly, lw, lh);

                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.6 / scale;
                        ctx.beginPath();
                        ctx.arc(lx + lw / 2, ly, lw / 3.2, Math.PI, 0);
                        ctx.stroke();
                    } else if (selectedElementsRef.current && selectedElementsRef.current.length === 1) {
                        // Resize handles only if exactly ONE element is selected AND NOT locked
                        ctx.setLineDash([]);
                        const handleRadius = 6.5 / scale;

                        const drawHandle = (hx, hy, isLeft = false) => {
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(hx, hy, handleRadius, 0, Math.PI * 2);
                            ctx.fillStyle = '#ffffff';
                            ctx.fill();
                            ctx.strokeStyle = '#3b82f6';
                            ctx.lineWidth = 2.5 / scale;
                            ctx.stroke();
                            if (isLeft) {
                                ctx.beginPath();
                                ctx.arc(hx, hy, handleRadius * 0.45, 0, Math.PI * 2);
                                ctx.fillStyle = '#3b82f6';
                                ctx.fill();
                            }
                            ctx.restore();
                        };

                        // Bottom-Right Handle
                        drawHandle(b.x + b.width, b.y + b.height, false);

                        // Bottom-Left Handle (Allows user to expand text/box from bottom-left)
                        drawHandle(b.x, b.y + b.height, true);
                    }
                }
                ctx.restore();
            }
        });

        // Draw combined bounding box if multiple elements are selected
        if (selectedElementsRef.current && selectedElementsRef.current.length > 1) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selectedElementsRef.current.forEach(s => {
                const el = elements.find(e => e.id === s.id);
                if (el) {
                    const b = getElementBounds(el);
                    if (b) {
                        minX = Math.min(minX, b.x);
                        minY = Math.min(minY, b.y);
                        maxX = Math.max(maxX, b.x + b.width);
                        maxY = Math.max(maxY, b.y + b.height);
                    }
                }
            });
            if (isFinite(minX) && isFinite(minY)) {
                ctx.save();
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 1.5 / scale;
                ctx.setLineDash([6 / scale, 4 / scale]);
                ctx.strokeRect(minX - 6 / scale, minY - 6 / scale, (maxX - minX) + 12 / scale, (maxY - minY) + 12 / scale);
                ctx.restore();
            }
        }

        // Draw selection marquee rectangle or freehand lasso path
        if (lassoPathRef.current && lassoPathRef.current.length > 2) {
            const lp = lassoPathRef.current;
            ctx.save();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.8 / scale;
            ctx.setLineDash([5 / scale, 4 / scale]);
            ctx.beginPath();
            ctx.moveTo(lp[0].x, lp[0].y);
            for (let i = 1; i < lp.length; i++) {
                ctx.lineTo(lp[i].x, lp[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        } else if (selectionBoxRef.current) {
            const sb = selectionBoxRef.current;
            const boxX = Math.min(sb.startX, sb.currentX);
            const boxY = Math.min(sb.startY, sb.currentY);
            const boxW = Math.abs(sb.currentX - sb.startX);
            const boxH = Math.abs(sb.currentY - sb.startY);
            ctx.save();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.5 / scale;
            ctx.setLineDash([4 / scale, 3 / scale]);
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeRect(boxX, boxY, boxW, boxH);
            ctx.restore();
        }

        // Draw preview when dragging to mark a multi-line text box
        if (actionRef.current === 'drawing-textbox' && textBoxPreviewRef.current) {
            const tp = textBoxPreviewRef.current;
            if (tp.width > 2 || tp.height > 2) {
                ctx.save();
                ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 1.8 / scale;
                ctx.setLineDash([5 / scale, 4 / scale]);
                ctx.fillRect(tp.x, tp.y, tp.width, tp.height);
                ctx.strokeRect(tp.x, tp.y, tp.width, tp.height);
                
                // Mini corner indicators
                ctx.fillStyle = '#6366f1';
                const hSize = 6 / scale;
                ctx.fillRect(tp.x - hSize / 2, tp.y + tp.height - hSize / 2, hSize, hSize);
                ctx.fillRect(tp.x + tp.width - hSize / 2, tp.y + tp.height - hSize / 2, hSize, hSize);
                ctx.restore();
            }
        }

        // Draw preview for current element being drawn (Stateless/Ref optimized)
        // If we are drawing a pen/stroke, we use the Ref to avoid lagging.
        // If we are drawing a shape using setCurrentElement (still using state for shapes for now), we use that.

        if (currentStrokeRef.current) {
            drawElement(ctx, currentStrokeRef.current);
        } else if (currentElement) {
            drawElement(ctx, currentElement);
        }


        ctx.restore();
    };

    // 3. Effects
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                renderCanvas();
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        renderCanvas();
    }, [elements, darkMode, editingElement, scale, panOffset, currentElement, renderTrigger, selectedElements, selectionBox, lassoPath]);

    // Verify board exists when theme changes (prevents ghost drawings from deleted boards)
    useEffect(() => {
        const verifyBoardOnThemeChange = async () => {
            try {
                const response = await api.get(`/api/boards/${roomId}`);
                if (!response.data) {
                    setElements([]);
                    setHistory([]);
                    setRedoStack([]);
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log('[THEME-CHANGE] Board was deleted (404), clearing ghost drawings');
                    setElements([]);
                    setHistory([]);
                    setRedoStack([]);

                    // Force clear canvas
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                }
            }
        };

        verifyBoardOnThemeChange();
    }, [darkMode]);

    // Emit viewport changes for students to follow (teachers only)
    useEffect(() => {
        if (socket && !isStudent && user?.id) {
            const worldCenterX = (window.innerWidth / 2) / scale - panOffset.x;
            const worldCenterY = (window.innerHeight / 2) / scale - panOffset.y;
            socket.emit('viewport-change', {
                roomId,
                userId: user.id,
                scale,
                panOffset,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                worldCenterX,
                worldCenterY
            });
        }
    }, [scale, panOffset, socket, isStudent, roomId, user?.id]);



    // Drawing Logic

    // Helper to translate any element (stroke, shape, text, sticky) by (dx, dy)
    const translateElement = (element, dx, dy) => {
        if (!element) return element;
        const cloned = { ...element };
        if (cloned.points && Array.isArray(cloned.points)) {
            cloned.points = cloned.points.map(p => ({
                x: p.x + dx,
                y: p.y + dy
            }));
        }
        if (cloned.x !== undefined) cloned.x = cloned.x + dx;
        if (cloned.y !== undefined) cloned.y = cloned.y + dy;
        if (cloned.endX !== undefined) cloned.endX = cloned.endX + dx;
        if (cloned.endY !== undefined) cloned.endY = cloned.endY + dy;
        return cloned;
    };

    // Helper to test if another element was drawn on / belongs to an image
    const isDrawingOnImage = (el, img, isAfterInOrder) => {
        if (!el || !img || el.id === img.id) return false;

        const isTimestampValid = el.timestamp && img.timestamp ? el.timestamp >= (img.timestamp - 1000) : isAfterInOrder;
        if (!isTimestampValid && !isAfterInOrder) return false;

        const imgLeft = img.x;
        const imgTop = img.y;
        const imgRight = img.x + (img.width || 0);
        const imgBottom = img.y + (img.height || 0);

        // 15px padding tolerance around the image boundaries
        const pad = 15;

        // 1. Freehand strokes (pen, highlighter, eraser)
        if (el.points && Array.isArray(el.points) && el.points.length > 0) {
            let insidePoints = 0;
            for (let i = 0; i < el.points.length; i++) {
                const p = el.points[i];
                if (p.x >= imgLeft - pad && p.x <= imgRight + pad &&
                    p.y >= imgTop - pad && p.y <= imgBottom + pad) {
                    insidePoints++;
                }
            }
            return insidePoints > 0 && (insidePoints >= el.points.length * 0.3 || insidePoints >= 2);
        }

        // 2. Shapes, text, sticky notes
        const elWidth = el.width || 0;
        const elHeight = el.height || 0;
        const elCenterX = el.x + elWidth / 2;
        const elCenterY = el.y + elHeight / 2;

        return (
            elCenterX >= imgLeft - pad && elCenterX <= imgRight + pad &&
            elCenterY >= imgTop - pad && elCenterY <= imgBottom + pad
        );
    };

    const isWithinElement = (x, y, element) => {
        if (!element) return false;

        // 1. Image (with rotation support)
        if (element.type === 'image') {
            const w = Math.max(element.width || 0, 20);
            const h = Math.max(element.height || 0, 20);
            let checkX = x;
            let checkY = y;
            if (element.rotation) {
                const cx = element.x + w / 2;
                const cy = element.y + h / 2;
                const rad = (-element.rotation * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const dx = x - cx;
                const dy = y - cy;
                checkX = cx + (dx * cos - dy * sin);
                checkY = cy + (dx * sin + dy * cos);
            }
            return checkX >= element.x - 12 && checkX <= element.x + w + 12 &&
                   checkY >= element.y - 12 && checkY <= element.y + h + 12;
        }

        // 2. Rect, sticky, polygon shapes
        if (['rect', 'sticky', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star'].includes(element.type)) {
            const w = Math.max(element.width || 0, 20);
            const h = Math.max(element.height || 0, 20);
            return x >= element.x - 10 && x <= element.x + w + 10 &&
                   y >= element.y - 10 && y <= element.y + h + 10;
        }

        // 3. Circle
        if (element.type === 'circle') {
            const r = Math.sqrt(Math.pow(element.width || 0, 2) + Math.pow(element.height || 0, 2));
            const dist = Math.sqrt(Math.pow(x - element.x, 2) + Math.pow(y - element.y, 2));
            return dist <= r + 15;
        }

        // 4. Line
        if (element.type === 'line') {
            const endX = element.endX ?? element.x;
            const endY = element.endY ?? element.y;
            const d = distToSegment({ x, y }, { x: element.x, y: element.y }, { x: endX, y: endY });
            const hitTol = Math.max((element.size || 5) * 2.5, 16);
            if (d <= hitTol) return true;
            if (element.lineStyle && element.lineStyle !== 'plain' && element.lineStyle !== 'dashed') {
                if (Math.hypot(x - endX, y - endY) <= hitTol + 6) return true;
                if (element.lineStyle === 'double-arrow' && Math.hypot(x - element.x, y - element.y) <= hitTol + 6) return true;
            }
            return false;
        }

        // 5. Pen, Highlighter, Eraser strokes
        if (element.points && Array.isArray(element.points) && element.points.length > 0) {
            const bounds = getElementBounds(element);
            if (!bounds) return false;
            const hitPad = Math.max((element.size || 5) * 2.5, 18);
            if (x < bounds.x - hitPad || x > bounds.x + bounds.width + hitPad ||
                y < bounds.y - hitPad || y > bounds.y + bounds.height + hitPad) {
                return false;
            }
            if (element.points.length === 1) {
                const p = element.points[0];
                return Math.hypot(x - p.x, y - p.y) <= hitPad;
            }
            for (let i = 0; i < element.points.length - 1; i++) {
                const p1 = element.points[i];
                const p2 = element.points[i + 1];
                if (distToSegment({ x, y }, p1, p2) <= hitPad) {
                    return true;
                }
            }
            return false;
        }

        // 6. Text
        if (element.type === 'text') {
            const w = Math.max(element.width || 50, 20);
            const h = Math.max(element.height || 20, 20);
            return x >= element.x - 10 && x <= element.x + w + 10 &&
                   y >= element.y - 10 && y <= element.y + h + 10;
        }

        return false;
    };

    // Gerçek silgi fonksiyonu: Dokunulan nesneleri katman yaratmadan doğrudan ve kısmi olarak (tıpkı gerçek silgi gibi) siler
    const performEraseAt = (worldX, worldY) => {
        const currentScale = scaleRef.current || scale || 1;
        const currentSize = Math.max(1, Math.round(brushSizeRef.current || brushSize || 5));
        const ew = Math.max(20, Math.round(currentSize * 2.2));
        const eh = Math.max(16, Math.round(currentSize * 1.8));
        const halfW = (ew / 2) / currentScale;
        const halfH = (eh / 2) / currentScale;

        const eMinX = worldX - halfW;
        const eMaxX = worldX + halfW;
        const eMinY = worldY - halfH;
        const eMaxY = worldY + halfH;

        const currentElements = elementsRef.current || elements;
        let hasChanges = false;
        const nextElements = [];
        const deletedIds = [];

        for (let i = 0; i < currentElements.length; i++) {
            const el = currentElements[i];
            if (!el || el.locked) {
                nextElements.push(el);
                continue;
            }

            // 1. Serbest çizimler (Kalem, Fosforlu Kalem vb. - points içeren nesneler):
            // Tıpkı gerçek silgi gibi sadece karenin üstünde bulunduğu kısmı keser/siler
            if (el.points && Array.isArray(el.points) && el.points.length > 0) {
                const b = getElementBounds(el);
                const strokePad = Math.max(((el.size || 2) / 2) * 0.8, 2);
                const hitMinX = eMinX - strokePad;
                const hitMaxX = eMaxX + strokePad;
                const hitMinY = eMinY - strokePad;
                const hitMaxY = eMaxY + strokePad;

                // Hızlı sınır kutusu (bounding box) kontrolü
                if (b && (b.x > hitMaxX || b.x + b.width < hitMinX || b.y > hitMaxY || b.y + b.height < hitMinY)) {
                    nextElements.push(el);
                    continue;
                }

                // Çizim noktalarını yoğunlaştır (aralıklar büyükse silgi aradan atlamasın)
                const maxStep = Math.max(3, halfH * 0.6);
                const dense = [];
                for (let pIdx = 0; pIdx < el.points.length; pIdx++) {
                    dense.push(el.points[pIdx]);
                    if (pIdx < el.points.length - 1) {
                        const p1 = el.points[pIdx];
                        const p2 = el.points[pIdx + 1];
                        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                        if (dist > maxStep) {
                            const steps = Math.ceil(dist / maxStep);
                            for (let s = 1; s < steps; s++) {
                                const t = s / steps;
                                dense.push({
                                    x: p1.x + (p2.x - p1.x) * t,
                                    y: p1.y + (p2.y - p1.y) * t
                                });
                            }
                        }
                    }
                }

                // Karenin içindeki noktaları tespit et ve kalan kısımları segmentlere ayır
                let hitAny = false;
                const keptSegments = [];
                let curSeg = [];

                for (let dIdx = 0; dIdx < dense.length; dIdx++) {
                    const pt = dense[dIdx];
                    const isInside = pt.x >= hitMinX && pt.x <= hitMaxX && pt.y >= hitMinY && pt.y <= hitMaxY;
                    if (isInside) {
                        hitAny = true;
                        if (curSeg.length > 0) {
                            keptSegments.push(curSeg);
                            curSeg = [];
                        }
                    } else {
                        curSeg.push(pt);
                    }
                }
                if (curSeg.length > 0) {
                    keptSegments.push(curSeg);
                }

                if (!hitAny) {
                    nextElements.push(el);
                    continue;
                }

                // Silgi bu çizginin bir kısmına veya tamamına temas etti
                hasChanges = true;
                if (keptSegments.length === 0) {
                    deletedIds.push(el.id);
                    continue;
                }

                // Kalan parçaları yeni çizgi elementleri olarak Whiteboard'a ekle
                let isFirst = true;
                keptSegments.forEach(seg => {
                    const validPoints = seg.length === 1 
                        ? [seg[0], { x: seg[0].x + 0.1, y: seg[0].y + 0.1 }]
                        : seg;

                    const newEl = {
                        ...el,
                        id: isFirst ? el.id : crypto.randomUUID(),
                        points: validPoints
                    };
                    nextElements.push(newEl);
                    isFirst = false;
                });
                continue;
            }

            // 2. Oklar ve Doğrusal Çizgiler (line / arrow):
            // Tıpkı serbest çizimler gibi sadece silginin temas ettiği kısmı keser/siler
            if (el.type === 'line') {
                const lx1 = el.x;
                const ly1 = el.y;
                const lx2 = el.endX !== undefined ? el.endX : (el.x + (el.width || 0));
                const ly2 = el.endY !== undefined ? el.endY : (el.y + (el.height || 0));
                const lineLen = Math.hypot(lx2 - lx1, ly2 - ly1);

                const strokePad = Math.max(((el.size || 2) / 2) * 0.8, 2);
                const hitMinX = eMinX - strokePad;
                const hitMaxX = eMaxX + strokePad;
                const hitMinY = eMinY - strokePad;
                const hitMaxY = eMaxY + strokePad;

                const minX = Math.min(lx1, lx2) - strokePad;
                const maxX = Math.max(lx1, lx2) + strokePad;
                const minY = Math.min(ly1, ly2) - strokePad;
                const maxY = Math.max(ly1, ly2) + strokePad;

                // Sınır kutusu kontrolü
                if (minX > hitMaxX || maxX < hitMinX || minY > hitMaxY || maxY < hitMinY) {
                    nextElements.push(el);
                    continue;
                }

                if (lineLen < 4) {
                    nextElements.push(el);
                    continue;
                }

                // Doğru üzerindeki noktaları yoğunlaştır
                const maxStep = Math.max(2, halfH * 0.5);
                const stepCount = Math.max(2, Math.ceil(lineLen / maxStep));
                const pts = [];
                for (let s = 0; s <= stepCount; s++) {
                    const t = s / stepCount;
                    pts.push({
                        x: lx1 + (lx2 - lx1) * t,
                        y: ly1 + (ly2 - ly1) * t
                    });
                }

                let hitAny = false;
                const keptSegments = [];
                let curSeg = [];

                for (let dIdx = 0; dIdx < pts.length; dIdx++) {
                    const pt = pts[dIdx];
                    const isInside = pt.x >= hitMinX && pt.x <= hitMaxX && pt.y >= hitMinY && pt.y <= hitMaxY;
                    if (isInside) {
                        hitAny = true;
                        if (curSeg.length > 0) {
                            keptSegments.push(curSeg);
                            curSeg = [];
                        }
                    } else {
                        curSeg.push(pt);
                    }
                }
                if (curSeg.length > 0) {
                    keptSegments.push(curSeg);
                }

                if (!hitAny) {
                    nextElements.push(el);
                    continue;
                }

                hasChanges = true;
                const validSegments = keptSegments.filter(seg => {
                    const slen = Math.hypot(seg[seg.length - 1].x - seg[0].x, seg[seg.length - 1].y - seg[0].y);
                    return slen >= 4;
                });

                if (validSegments.length === 0) {
                    deletedIds.push(el.id);
                    continue;
                }

                let isFirst = true;
                validSegments.forEach(seg => {
                    const sx1 = seg[0].x;
                    const sy1 = seg[0].y;
                    const sx2 = seg[seg.length - 1].x;
                    const sy2 = seg[seg.length - 1].y;

                    const hasOrigStart = Math.hypot(sx1 - lx1, sy1 - ly1) < 6;
                    const hasOrigEnd = Math.hypot(sx2 - lx2, sy2 - ly2) < 6;

                    let finalStyle = 'plain';
                    const origStyle = el.lineStyle || 'plain';

                    if (origStyle === 'arrow') {
                        finalStyle = hasOrigEnd ? 'arrow' : 'plain';
                    } else if (origStyle === 'dashed-arrow') {
                        finalStyle = hasOrigEnd ? 'dashed-arrow' : 'dashed';
                    } else if (origStyle === 'double-arrow') {
                        if (hasOrigStart && hasOrigEnd) finalStyle = 'double-arrow';
                        else if (hasOrigEnd) finalStyle = 'arrow';
                        else if (hasOrigStart) finalStyle = 'arrow';
                        else finalStyle = 'plain';
                    } else if (origStyle === 'dashed') {
                        finalStyle = 'dashed';
                    } else {
                        finalStyle = 'plain';
                    }

                    const newEl = {
                        ...el,
                        id: isFirst ? el.id : crypto.randomUUID(),
                        x: sx1,
                        y: sy1,
                        endX: sx2,
                        endY: sy2,
                        width: sx2 - sx1,
                        height: sy2 - sy1,
                        lineStyle: finalStyle
                    };
                    nextElements.push(newEl);
                    isFirst = false;
                });
                continue;
            }

            // 3. Resimler (image): Tıpkı gerçek silgi gibi sadece fırça ebatı kadar pikselleri şeffaflaştırarak siler
            if (el.type === 'image') {
                const imgW = el.width || 100;
                const imgH = el.height || 100;

                if (el.x > eMaxX || el.x + imgW < eMinX || el.y > eMaxY || el.y + imgH < eMinY) {
                    nextElements.push(el);
                    continue;
                }

                let localX = worldX - el.x;
                let localY = worldY - el.y;

                if (el.rotation) {
                    const rad = (-el.rotation * Math.PI) / 180;
                    const cx = imgW / 2;
                    const cy = imgH / 2;
                    const dx = localX - cx;
                    const dy = localY - cy;
                    localX = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
                    localY = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
                }

                if (localX + halfW < 0 || localX - halfW > imgW || localY + halfH < 0 || localY - halfH > imgH) {
                    nextElements.push(el);
                    continue;
                }

                let cachedObj = imageCache.current[el.id];
                let offCanvas = null;

                if (cachedObj instanceof HTMLCanvasElement) {
                    offCanvas = cachedObj;
                } else if (cachedObj) {
                    const oc = document.createElement('canvas');
                    oc.width = Math.max(1, Math.round(cachedObj.naturalWidth || imgW));
                    oc.height = Math.max(1, Math.round(cachedObj.naturalHeight || imgH));
                    const octx = oc.getContext('2d');
                    try {
                        octx.drawImage(cachedObj, 0, 0, oc.width, oc.height);
                    } catch (e) {}
                    oc._dataURL = el.dataURL;
                    offCanvas = oc;
                    imageCache.current[el.id] = oc;
                }

                if (offCanvas) {
                    const octx = offCanvas.getContext('2d');
                    octx.save();
                    octx.globalCompositeOperation = 'destination-out';
                    octx.fillStyle = 'rgba(0, 0, 0, 1)';

                    const scaleX = offCanvas.width / imgW;
                    const scaleY = offCanvas.height / imgH;

                    const cLocalX = localX * scaleX;
                    const cLocalY = localY * scaleY;
                    const cHalfW = halfW * scaleX;
                    const cHalfH = halfH * scaleY;

                    const rx = cLocalX - cHalfW;
                    const ry = cLocalY - cHalfH;
                    const rw = cHalfW * 2;
                    const rh = cHalfH * 2;
                    const cornerR = Math.min(6 * scaleX, rw / 4, rh / 4);

                    octx.beginPath();
                    if (typeof octx.roundRect === 'function') {
                        octx.roundRect(rx, ry, rw, rh, cornerR);
                    } else {
                        octx.rect(rx, ry, rw, rh);
                    }
                    octx.fill();
                    octx.restore();

                    hasChanges = true;
                    if (!modifiedImagesInStrokeRef.current) modifiedImagesInStrokeRef.current = new Set();
                    modifiedImagesInStrokeRef.current.add(el.id);
                }

                nextElements.push(el);
                continue;
            }

            // 4. Nokta/doğru/resim tabanlı olmayan diğer nesneler (yapışkan not, metin, diğer geometrik şekiller)
            const testPoints = [
                { x: worldX, y: worldY },
                { x: worldX - halfW * 0.7, y: worldY },
                { x: worldX + halfW * 0.7, y: worldY },
                { x: worldX, y: worldY - halfH * 0.7 },
                { x: worldX, y: worldY + halfH * 0.7 }
            ];
            const isHit = testPoints.some(pt => isWithinElement(pt.x, pt.y, el));
            if (isHit) {
                hasChanges = true;
                deletedIds.push(el.id);
                continue;
            }

            nextElements.push(el);
        }

        if (hasChanges) {
            elementsRef.current = nextElements;
            setElements(nextElements);
            if (deletedIds.length > 0) {
                const delSet = new Set(deletedIds);
                setSelectedElements(prev => prev.filter(s => !delSet.has(s.id)));
                if (socket) {
                    deletedIds.forEach(id => {
                        socket.emit('delete-element', { roomId, elementId: id });
                    });
                }
            }
            renderCanvas();
        }
    };

    const isElementInBox = (element, box) => {
        if (!element || !box) return false;
        const b = getElementBounds(element);
        if (!b) return false;
        const boxRight = box.x + box.width;
        const boxBottom = box.y + box.height;
        const bRight = b.x + b.width;
        const bBottom = b.y + b.height;

        const overlap = !(
            box.x > bRight ||
            boxRight < b.x ||
            box.y > bBottom ||
            boxBottom < b.y
        );
        if (!overlap) return false;

        if (element.points && Array.isArray(element.points) && element.points.length > 0) {
            return element.points.some(p => 
                p.x >= box.x && p.x <= boxRight && p.y >= box.y && p.y <= boxBottom
            );
        }
        return true;
    };

    const isPointInPolygon = (px, py, polygon) => {
        if (!polygon || polygon.length < 3) return false;
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            const intersect = ((yi > py) !== (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    const isElementInLasso = (element, polygon, box) => {
        if (!element || !polygon || polygon.length < 2) return false;
        if (polygon.length < 3 && box) {
            return isElementInBox(element, box);
        }

        const b = getElementBounds(element);
        if (!b) return false;

        // Quick bounding box check with the actual lasso envelope box
        if (box) {
            const overlap = !(
                box.x > b.x + b.width ||
                box.x + box.width < b.x ||
                box.y > b.y + b.height ||
                box.y + box.height < b.y
            );
            if (!overlap) return false;
        }

        // Center of element
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        if (isPointInPolygon(cx, cy, polygon)) return true;

        // Corners
        if (isPointInPolygon(b.x, b.y, polygon)) return true;
        if (isPointInPolygon(b.x + b.width, b.y, polygon)) return true;
        if (isPointInPolygon(b.x, b.y + b.height, polygon)) return true;
        if (isPointInPolygon(b.x + b.width, b.y + b.height, polygon)) return true;

        // Lines (arrows, straight, dashed)
        if (element.type === 'line') {
            const lx1 = element.x ?? 0;
            const ly1 = element.y ?? 0;
            const lx2 = element.endX ?? lx1;
            const ly2 = element.endY ?? ly1;
            if (isPointInPolygon(lx1, ly1, polygon)) return true;
            if (isPointInPolygon(lx2, ly2, polygon)) return true;
            if (isPointInPolygon((lx1 + lx2) / 2, (ly1 + ly2) / 2, polygon)) return true;
        }

        // Points of stroke
        if (element.points && Array.isArray(element.points) && element.points.length > 0) {
            const step = Math.max(1, Math.floor(element.points.length / 20));
            for (let i = 0; i < element.points.length; i += step) {
                if (isPointInPolygon(element.points[i].x, element.points[i].y, polygon)) {
                    return true;
                }
            }
        }

        // Any polygon point inside element
        for (let i = 0; i < polygon.length; i += 2) {
            const p = polygon[i];
            if (isWithinElement(p.x, p.y, element)) {
                return true;
            }
        }

        return false;
    };

    const handleToggleLock = (target) => {
        const targets = Array.isArray(target) ? target : [target];
        if (targets.length === 0) return;

        // If all are locked, unlock. Otherwise, lock all.
        const shouldLock = !targets.every(el => el.locked);
        const targetIds = new Set(targets.map(el => el.id));

        setElements(prev => {
            const next = prev.map(el => {
                if (targetIds.has(el.id)) {
                    return { ...el, locked: shouldLock };
                }
                return el;
            });
            return next;
        });

        // Sync locked state across sockets
        if (socket) {
            targets.forEach(el => {
                socket.emit('draw-element', {
                    roomId,
                    socketId: socket.id,
                    userId: user?.id,
                    ...el,
                    locked: shouldLock
                });
            });
        }

        setTimeout(() => renderCanvas(), 10);
    };

    const handleReorderLayers = (newElements) => {
        setElements(newElements);
        if (socket) {
            socket.emit('sync-state', { roomId, elements: newElements });
        }
        setTimeout(() => renderCanvas(), 10);
    };

    const handleToggleVisibility = (target) => {
        const targets = Array.isArray(target) ? target : [target];
        if (targets.length === 0) return;
        const targetIds = new Set(targets.map(el => el.id));
        const shouldHide = !targets.every(el => el.hidden);

        setElements(prev => {
            const updated = prev.map(el => {
                if (targetIds.has(el.id)) {
                    return { ...el, hidden: shouldHide };
                }
                return el;
            });
            return updated;
        });

        if (socket) {
            targets.forEach(el => {
                socket.emit('draw-element', {
                    roomId,
                    socketId: socket.id,
                    userId: user?.id,
                    ...el,
                    hidden: shouldHide
                });
            });
        }
        setTimeout(() => renderCanvas(), 10);
    };

    const handleMergeLayers = async (selectedList) => {
        if (!selectedList || selectedList.length < 2) return;

        // 1. Calculate combined bounding box of all selected elements
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedList.forEach(el => {
            const b = getElementBounds(el);
            if (b) {
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
            }
        });

        if (!isFinite(minX) || !isFinite(minY)) return;

        const padding = 12;
        const width = Math.max(maxX - minX + padding * 2, 20);
        const height = Math.max(maxY - minY + padding * 2, 20);

        // 2. Offscreen canvas at 2x resolution
        const offCanvas = document.createElement('canvas');
        const dpr = 2;
        offCanvas.width = width * dpr;
        offCanvas.height = height * dpr;
        const offCtx = offCanvas.getContext('2d');
        offCtx.scale(dpr, dpr);
        offCtx.translate(-minX + padding, -minY + padding);

        // 3. Sort selected elements by their current order and draw them
        const sortedSelected = [...selectedList].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : (a.timestamp || 0);
            const orderB = b.order !== undefined ? b.order : (b.timestamp || 0);
            return orderA - orderB;
        });

        for (const el of sortedSelected) {
            if (el.type === 'image') {
                const imgSrc = el.dataURL || el.src;
                let imgObj = imageCache.current[el.id];
                if (!imgObj || !imgObj.complete || imgObj.naturalWidth === 0) {
                    if (imgSrc) {
                        imgObj = await new Promise((resolve) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => resolve(img);
                            img.onerror = () => resolve(null);
                            img.src = imgSrc;
                        });
                        if (imgObj) {
                            imageCache.current[el.id] = imgObj;
                        }
                    }
                }
            }
            drawElement(offCtx, el);
        }

        const mergedDataUrl = offCanvas.toDataURL('image/png');

        // 4. Create merged single element & pre-populate imageCache for instantaneous rendering
        const mergedId = crypto.randomUUID();
        const mergedImg = new Image();
        mergedImg.src = mergedDataUrl;
        imageCache.current[mergedId] = mergedImg;

        const maxOrder = Math.max(...selectedList.map(el => el.order ?? 0));
        const mergedElement = {
            id: mergedId,
            type: 'image',
            dataURL: mergedDataUrl,
            src: mergedDataUrl,
            x: minX - padding,
            y: minY - padding,
            width: width,
            height: height,
            timestamp: Date.now(),
            order: maxOrder
        };

        // 5. Replace selected elements with merged element in elements array
        const selectedIds = new Set(selectedList.map(el => el.id));
        const nextElements = [];
        let inserted = false;

        elements.forEach(el => {
            if (selectedIds.has(el.id)) {
                if (!inserted) {
                    nextElements.push(mergedElement);
                    inserted = true;
                }
            } else {
                nextElements.push(el);
            }
        });

        if (!inserted) {
            nextElements.push(mergedElement);
        }

        // Re-index orders
        const finalElements = nextElements.map((el, idx) => ({ ...el, order: idx }));
        setElements(finalElements);
        setSelectedElements([createSelectionItem(mergedElement, -1, finalElements)]);

        if (socket) {
            socket.emit('sync-state', { roomId, elements: finalElements });
        }

        setTimeout(() => renderCanvas(), 10);
    };

    const createSelectionItem = (el, hitIndex, allElements) => {
        if (!el) return null;
        const bounds = getElementBounds(el);
        const bx = bounds ? bounds.x : (el.x || 0);
        const by = bounds ? bounds.y : (el.y || 0);

        let attachedElements = [];
        if ((el.type === 'image' || el.type === 'sticky') && el.width && el.height) {
            const list = allElements || elementsRef.current || [];
            const elIdx = (hitIndex !== -1 && hitIndex !== undefined) ? hitIndex : list.findIndex(e => e.id === el.id);
            list.forEach((otherEl, otherIdx) => {
                if (otherIdx === elIdx) return;
                if (isDrawingOnImage(otherEl, el, otherIdx > elIdx)) {
                    attachedElements.push({
                        id: otherEl.id,
                        initialSnapshot: JSON.parse(JSON.stringify(otherEl))
                    });
                }
            });
        }

        return {
            id: el.id,
            index: (hitIndex !== -1 && hitIndex !== undefined) ? hitIndex : (allElements || elementsRef.current || []).findIndex(e => e.id === el.id),
            initialX: bx,
            initialY: by,
            initialSnapshot: JSON.parse(JSON.stringify(el)),
            attachedElements
        };
    };

    // Helper: Cursor style
    useEffect(() => {
        if (action === 'resizing') {
            document.body.style.cursor = 'nwse-resize';
        } else if (action === 'moving') {
            document.body.style.cursor = 'move';
        } else if (action === 'selecting') {
            document.body.style.cursor = 'crosshair';
        } else {
            document.body.style.cursor = 'default';
        }
    }, [action]);

    const updateElement = (index, newProps) => {
        setElements(prev => {
            if (!prev[index]) return prev;
            const updated = [...prev];
            updated[index] = { ...updated[index], ...newProps };
            if (socket) socket.emit('draw-element', { roomId, socketId: socket.id, userId: user?.id, ...updated[index] });
            return updated;
        });
    };

    const handleRotateImage = (angleDelta) => {
        if (!selectedElement) return;
        const targetIdx = elements.findIndex(el => 
            (selectedElement.id && el.id === selectedElement.id) || el === elements[selectedElement.index]
        );
        if (targetIdx === -1) return;
        const currentEl = elements[targetIdx];
        if (!currentEl || currentEl.type !== 'image') return;

        const currentRot = currentEl.rotation || 0;
        const newRot = (currentRot + angleDelta + 360) % 360;

        updateElement(targetIdx, { rotation: newRot });
        setSelectedElement(prev => ({
            ...prev,
            initialSnapshot: { ...prev?.initialSnapshot, rotation: newRot }
        }));
    };

    const handleApplyCrop = (croppedDataURL, newCropW, newCropH, fractionW, fractionH) => {
        if (!cropModalElement) return;

        setElements(prev => {
            const targetIdx = prev.findIndex(el => el.id === cropModalElement.id);
            if (targetIdx === -1) return prev;

            const el = prev[targetIdx];
            const origW = el.width || 200;
            const origH = el.height || 200;

            let finalW, finalH;
            const aspect = (newCropW && newCropH) ? (newCropW / newCropH) : 1;
            if (fractionW && isFinite(fractionW) && fractionW > 0) {
                finalW = Math.round(origW * fractionW);
                finalH = Math.round(finalW / aspect);
            } else {
                finalW = origW;
                finalH = Math.round(origW / aspect);
            }

            const updatedProps = {
                dataURL: croppedDataURL,
                width: Math.max(finalW, 20),
                height: Math.max(finalH, 20),
                aspectRatio: newCropW / newCropH,
                uploading: false
            };

            const imgObj = new Image();
            imgObj.onload = () => {
                renderCanvas();
            };
            imgObj.src = croppedDataURL;
            imageCache.current[el.id] = imgObj;

            const updated = [...prev];
            updated[targetIdx] = { ...el, ...updatedProps };

            if (socket) {
                socket.emit('draw-element', { roomId, socketId: socket.id, userId: user?.id, ...updated[targetIdx] });
            }

            setSelectedElement(sel => {
                if (!sel) return sel;
                return {
                    ...sel,
                    initialSnapshot: { ...sel.initialSnapshot, ...updatedProps }
                };
            });

            return updated;
        });

        setCropModalElement(null);
        setTimeout(() => renderCanvas(), 10);
    };

    const convertDrawingToImage = (target) => {
        if (!target) return;
        const targetList = Array.isArray(target) ? target.filter(Boolean) : [target];
        if (targetList.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        targetList.forEach(el => {
            const b = getElementBounds(el);
            if (b) {
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
            }
        });

        if (!isFinite(minX) || !isFinite(minY) || maxX <= minX || maxY <= minY) return;

        const pad = 12;
        const totalW = maxX - minX;
        const totalH = maxY - minY;
        const canvasW = Math.ceil(totalW + pad * 2);
        const canvasH = Math.ceil(totalH + pad * 2);

        const offscreen = document.createElement('canvas');
        offscreen.width = canvasW;
        offscreen.height = canvasH;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.translate(-(minX - pad), -(minY - pad));
        targetList.forEach(el => {
            drawElement(ctx, el);
        });
        ctx.restore();

        const dataURL = offscreen.toDataURL('image/png');

        const newImageEl = {
            id: crypto.randomUUID(),
            type: 'image',
            x: minX - pad,
            y: minY - pad,
            width: canvasW,
            height: canvasH,
            dataURL: dataURL,
            aspectRatio: canvasW / canvasH,
            rotation: 0,
            timestamp: Date.now()
        };

        const imgObj = new Image();
        imgObj.src = dataURL;
        imageCache.current[newImageEl.id] = imgObj;

        const targetIds = new Set(targetList.map(el => el.id));
        setElements(prev => {
            const remaining = prev.filter(el => !targetIds.has(el.id));
            return [...remaining, newImageEl];
        });

        const newSelectionItem = {
            id: newImageEl.id,
            index: -1,
            initialX: newImageEl.x,
            initialY: newImageEl.y,
            initialSnapshot: JSON.parse(JSON.stringify(newImageEl)),
            attachedElements: []
        };
        setSelectedElements([newSelectionItem]);

        if (socket) {
            targetList.forEach(el => {
                socket.emit('delete-element', { roomId, elementId: el.id });
            });
            socket.emit('draw-element', { roomId, socketId: socket.id, userId: user?.id, ...newImageEl });
        }

        if (isHost || isHostRef.current) {
            setHistory(prev => [...prev, {
                type: 'COMPOSITE_REPLACE',
                oldElements: targetList,
                oldElement: targetList[0],
                newElement: newImageEl
            }]);
        }
        setTimeout(() => renderCanvas(), 10);
    };

    const saveNote = (e) => {
        if (!editingElement) return;
        const index = editingElement.index;
        const newText = e.target.value;

        // Measure text using wrap calculation
        const ctx = canvasRef.current.getContext('2d');
        const el = elements[index] || {};
        const fFamily = el.fontFamily || currentFontFamily || 'TTKBDikTemel, sans-serif';
        const fontSize = el.fontSize || (el.size || 5) * 5;
        const isB = el.bold;
        const isI = el.italic;
        ctx.font = `${isI ? 'italic ' : ''}${isB ? 'bold ' : ''}${fontSize}px ${fFamily}`;
        const lineHeight = fFamily.includes('TTKB') ? Math.round(fontSize * 1.35) : Math.round(fontSize * 1.25);
        const singleLineHeight = Math.round(fontSize * 1.25);

        // Preserve width if it was manually resized, otherwise assume a default or grow
        const currentWidth = editingElement.width || 200;

        let calculatedWidth = currentWidth;
        let measuredHeight = singleLineHeight;

        if (editingElement.type === 'text') {
            const isSingle = el.textMode === 'single' || el.isSingleLine;
            if (isSingle) {
                const cleanText = (newText || '').replace(/\r?\n|\r/g, ' ');
                const textW = ctx.measureText(cleanText).width;
                const canvasLogicalWidth = canvasRef.current ? (canvasRef.current.width / (window.devicePixelRatio || 1)) / scale - panOffset.x : 2000;
                const maxW = Math.max(100, canvasLogicalWidth - (el.x || 0) - 20);
                calculatedWidth = Math.min(Math.max(textW + 16, 40), maxW);
                measuredHeight = singleLineHeight;
            } else {
                calculatedWidth = Math.max(currentWidth, 40);
                const wrapH = wrapText(ctx, newText, 0, 0, calculatedWidth, lineHeight);
                measuredHeight = Math.max(wrapH, singleLineHeight);
            }
        } else {
            measuredHeight = wrapText(ctx, newText, 0, 0, calculatedWidth, lineHeight);
        }

        // Enforce minimum height based on type
        const minHeight = editingElement.type === 'sticky' ? (elements[index].height || 200 / scale) : singleLineHeight;

        if (editingElement.type === 'text' && !newText.trim()) {
            setElements(prev => prev.filter((_, idx) => idx !== index));
            if (socket && elements[index]) {
                socket.emit('delete-element', { roomId, elementId: elements[index].id });
            }
            setEditingElement(null);
            setTool('select');
            setTimeout(() => renderCanvas(), 10);
            return;
        }

        const finalText = (editingElement.type === 'text' && (el.textMode === 'single' || el.isSingleLine))
            ? newText.replace(/\r?\n|\r/g, ' ')
            : newText;

        const oldProps = {
            text: editingElement.text,
            width: elements[index].width,
            height: elements[index].height
        };

        const newProps = {
            text: finalText,
            width: Math.max(calculatedWidth, 20), // Ensure min width
            height: Math.max(measuredHeight, minHeight)
        };

        updateElement(index, newProps);

        // Ensure all users receive the final state for sticky notes and text
        if (socket && elements[index]) {
            socket.emit('draw-element', {
                roomId,
                socketId: socket.id,
                userId: user?.id,
                ...elements[index],
                ...newProps
            });
        }

        if (isHost) {
            setHistory(prev => [...prev, {
                type: 'UPDATE',
                id: elements[index].id,
                index: index,
                oldProps,
                newProps
            }]);
        }
        setRedoStack([]);
        setEditingElement(null);

        // Auto-switch to select mode for immediate resizing
        setTool('select');
        setSelectedElement({
            index: index,
            offsetX: 0,
            offsetY: 0
        });
    };

    const activeTextIndex = (() => {
        if (editingElement && editingElement.type === 'text') return editingElement.index;
        if (selectedElements && selectedElements.length === 1) {
            const selId = selectedElements[0].id;
            const idx = elements.findIndex(e => e.id === selId);
            if (idx !== -1 && elements[idx].type === 'text') return idx;
        }
        return -1;
    })();
    const activeTextEl = activeTextIndex !== -1 ? elements[activeTextIndex] : null;

    const handleUpdateTextFormat = (updates) => {
        if (updates.fontFamily) setCurrentFontFamily(updates.fontFamily);
        if (updates.fontSize) setCurrentFontSize(updates.fontSize);
        if (updates.bold !== undefined) setIsTextBold(updates.bold);
        if (updates.italic !== undefined) setIsTextItalic(updates.italic);
        if (updates.underline !== undefined) setIsTextUnderline(updates.underline);
        if (updates.strike !== undefined) setIsTextStrike(updates.strike);

        if (activeTextIndex === -1 || !activeTextEl) return;

        const newProps = { ...updates };
        if (updates.fontSize) {
            newProps.size = Math.round(updates.fontSize / 5);
        }

        const dims = recalculateTextDimensions(activeTextEl, newProps);
        newProps.width = dims.width;
        newProps.height = dims.height;

        if (editingElement && editingElement.index === activeTextIndex) {
            setEditingElement(prev => ({
                ...prev,
                ...newProps
            }));
        }

        updateElement(activeTextIndex, newProps);
        renderCanvas();
    };

    const getMousePos = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();

        let clientX = e.clientX;
        let clientY = e.clientY;

        if (clientX === undefined || clientY === undefined) {
            const touch = (e.touches && e.touches[0]) || 
                          (e.changedTouches && e.changedTouches[0]) ||
                          (e.nativeEvent?.touches && e.nativeEvent.touches[0]) ||
                          (e.nativeEvent?.changedTouches && e.nativeEvent.changedTouches[0]);
            if (touch) {
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else {
                clientX = 0;
                clientY = 0;
            }
        }

        const currentScale = scaleRef.current || scale || 1;
        const currentPan = panOffsetRef.current || panOffset || { x: 0, y: 0 };

        return {
            x: (clientX - rect.left) / currentScale - currentPan.x,
            y: (clientY - rect.top) / currentScale - currentPan.y
        };
    };

    // Shared Stroke Move Handler for both Pointer Events and Native Touch Events
    const handleStrokeMove = (e) => {
        if (!isDrawingRef.current) return;

        const currentScale = scaleRef.current || scale || 1;
        const nativeEv = e.nativeEvent || e;
        const coalesced = (nativeEv.getCoalescedEvents && typeof nativeEv.getCoalescedEvents === 'function')
            ? nativeEv.getCoalescedEvents()
            : [];
        const events = (coalesced && coalesced.length > 0) ? coalesced : [e];
        let hasUpdates = false;

        events.forEach(event => {
            const { x, y } = getMousePos(event);

            if (actionRef.current === 'erasing' || action === 'erasing') {
                const prev = lastEraserWorldPosRef.current || { x, y };
                const dist = Math.hypot(x - prev.x, y - prev.y);
                const steps = Math.max(1, Math.min(30, Math.ceil(dist / 5)));
                for (let s = 1; s <= steps; s++) {
                    const ix = prev.x + (x - prev.x) * (s / steps);
                    const iy = prev.y + (y - prev.y) * (s / steps);
                    performEraseAt(ix, iy);
                }
                lastEraserWorldPosRef.current = { x, y };
                hasUpdates = true;
            } else if (actionRef.current === 'drawing' && currentStrokeRef.current) {
                const newPoint = { x, y };
                currentStrokeRef.current.points.push(newPoint);
                hasUpdates = true;
            } else if (actionRef.current === 'panning') {
                userHasManuallyPannedRef.current = true;
                const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]);
                const clientX = event.clientX !== undefined ? event.clientX : (touch ? touch.clientX : 0);
                const clientY = event.clientY !== undefined ? event.clientY : (touch ? touch.clientY : 0);
                const { startX, startY, initialPan } = draggedElementRef.current || {};
                if (startX !== undefined) {
                    const dx = (clientX - startX) / currentScale;
                    const dy = (clientY - startY) / currentScale;
                    setPanOffset({ x: initialPan.x + dx, y: initialPan.y + dy });
                    hasUpdates = true;
                }
            } else if (actionRef.current === 'drawing' && currentElement) {
                setCurrentElement(prev => ({
                    ...prev,
                    width: x - prev.x,
                    height: y - prev.y,
                    endX: x,
                    endY: y
                }));
            } else if (actionRef.current === 'moving' || actionRef.current === 'resizing' || actionRef.current === 'selecting') {
                draw(event);
            }
        });

        if (hasUpdates && actionRef.current === 'drawing' && currentStrokeRef.current) {
            renderCanvas();

            const now = Date.now();
            if (socket && currentStrokeRef.current.points.length > 0 && (now - lastEmitTimeRef.current) > 16) {
                socket.emit('drawing-stroke', {
                    roomId,
                    userId: user?.id,
                    socketId: socket.id,
                    stroke: currentStrokeRef.current
                });
                lastEmitTimeRef.current = now;
            }
        }
    };

    // Pointer Events for Desktop Mouse, Touch & Stylus
    const handlePointerDown = (e) => {
        if (e.pointerType === 'touch') {
            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            // If two or more fingers are on screen, abort drawing and let gesture take over
            if (activePointersRef.current.size >= 2) {
                if (isDrawingRef.current) {
                    isDrawingRef.current = false;
                    actionRef.current = 'none';
                    currentStrokeRef.current = null;
                    renderCanvas();
                }
                return;
            }
        }
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
        startDrawing(e);
    };

    const handlePointerUp = (e) => {
        if (e.pointerType === 'touch') {
            activePointersRef.current.delete(e.pointerId);
            if (activePointersRef.current.size > 0) return;
        }
        try {
            if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch (err) {}
        stopDrawing(e);
    };

    const handlePointerLeave = (e) => {
        if (e.pointerType === 'touch') return;
        handlePointerUp(e);
    };

    const handlePointerMove = (e) => {
        if (e.pointerType === 'touch') {
            if (activePointersRef.current.size >= 2) return;
        }
        handleStrokeMove(e);
    };

    const startDrawing = (e) => {
        // Prevent duplicate execution if stroke already started
        if (isDrawingRef.current && currentStrokeRef.current) return;

        const currentUser = userRef.current || user;
        const currentTool = toolRef.current || tool;
        const currentColor = colorRef.current || color;
        const currentBrushSize = brushSizeRef.current || brushSize;
        const currentScale = scaleRef.current || scale || 1;
        const currentPan = panOffsetRef.current || panOffset || { x: 0, y: 0 };
        const currentElements = elementsRef.current || elements;

        // Check if user can edit (teacher/admin always can, student needs permission)
        const canEdit = isHost || isHostRef.current || isHostStateRef.current || 
                        currentUser?.role === 'teacher' || currentUser?.role === 'admin' || 
                        hasEditPermissionRef.current || hasEditPermission;
        if (!canEdit) return;

        // Spacebar Panning Logic OR Hand/Pan Tool
        if (isSpacePressed || currentTool === 'pan' || currentTool === 'hand') {
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            actionRef.current = 'panning';
            isDrawingRef.current = true;
            setAction('panning');
            userHasManuallyPannedRef.current = true;
            setIsDrawing(true);
            draggedElementRef.current = { startX: clientX, startY: clientY, initialPan: { ...currentPan } };
            document.body.style.cursor = 'grabbing';
            return;
        }

        const { x: offsetX, y: offsetY } = getMousePos(e);

        // FIRST: Check resize handle if exactly one element is selected
        if (selectedElementsRef.current.length === 1 && currentTool === 'select') {
            const single = selectedElementsRef.current[0];
            const el = currentElements[single.index] || currentElements.find(e => e.id === single.id);
            if (el && !el.locked) {
                const bounds = getElementBounds(el);
                const w = bounds ? bounds.width : (el.width || (el.type === 'text' ? 50 : 0));
                const h = bounds ? bounds.height : (el.height || (el.type === 'text' ? 20 : 0));
                const bx = bounds ? bounds.x : (el.x || 0);
                const by = bounds ? bounds.y : (el.y || 0);
                const handleHit = 18 / currentScale;

                // Check Bottom-Right handle
                if (offsetX >= bx + w - handleHit && offsetX <= bx + w + handleHit &&
                    offsetY >= by + h - handleHit && offsetY <= by + h + handleHit) {
                    resizeHandleRef.current = 'br';
                    actionRef.current = 'resizing';
                    isDrawingRef.current = true;
                    setAction('resizing');
                    setIsDrawing(true);
                    setUndoSnapshot(JSON.parse(JSON.stringify(el)));
                    return;
                }

                // Check Bottom-Left handle (User requested bottom-left resize point)
                if (offsetX >= bx - handleHit && offsetX <= bx + handleHit &&
                    offsetY >= by + h - handleHit && offsetY <= by + h + handleHit) {
                    resizeHandleRef.current = 'bl';
                    actionRef.current = 'resizing';
                    isDrawingRef.current = true;
                    setAction('resizing');
                    setIsDrawing(true);
                    setUndoSnapshot(JSON.parse(JSON.stringify(el)));
                    return;
                }
            }
        }

        // Selection & Element Manipulation - Only active in 'select' mode
        if (currentTool === 'select') {
            const isShiftOrCmd = e.shiftKey || e.ctrlKey || e.metaKey;

            let hitIndex = -1;
            for (let i = currentElements.length - 1; i >= 0; i--) {
                if (isWithinElement(offsetX, offsetY, currentElements[i])) {
                    hitIndex = i;
                    break;
                }
            }

            if (editingElement) {
                setEditingElement(null);
            }

            dragStartPosRef.current = { mouseX: offsetX, mouseY: offsetY };

            if (hitIndex !== -1) {
                const el = currentElements[hitIndex];
                const isAlreadySelected = selectedElementsRef.current.some(s => s.id === el.id);

                let nextSelected;
                if (isShiftOrCmd) {
                    if (isAlreadySelected) {
                        nextSelected = selectedElementsRef.current.filter(s => s.id !== el.id);
                    } else {
                        const item = createSelectionItem(el, hitIndex, currentElements);
                        nextSelected = [...selectedElementsRef.current, item];
                    }
                } else {
                    if (isAlreadySelected && selectedElementsRef.current.length > 1) {
                        // Clicking on one of multiple selected elements: keep multi-selection so all move together!
                        nextSelected = selectedElementsRef.current.map(s => {
                            const found = currentElements.find(e => e.id === s.id);
                            return found ? createSelectionItem(found, -1, currentElements) : s;
                        });
                    } else {
                        // Single selection
                        const item = createSelectionItem(el, hitIndex, currentElements);
                        nextSelected = [item];
                    }
                }

                setSelectedElements(nextSelected);

                if (nextSelected.length > 0) {
                    // Check if at least one selected item is NOT locked
                    const canMoveAny = nextSelected.some(s => {
                        const targetEl = currentElements.find(e => e.id === s.id);
                        return targetEl && !targetEl.locked;
                    });
                    if (canMoveAny) {
                        actionRef.current = 'moving';
                        isDrawingRef.current = true;
                        setAction('moving');
                        setIsDrawing(true);
                    } else {
                        actionRef.current = 'none';
                        isDrawingRef.current = false;
                        setAction('none');
                        setIsDrawing(false);
                    }
                } else {
                    actionRef.current = 'none';
                    isDrawingRef.current = false;
                    setAction('none');
                    setIsDrawing(false);
                }

                if (el.color) setColor(el.color);
                if (el.size) setBrushSize(Math.max(1, Math.min(50, Math.round(Number(el.size) || 5))));
                renderCanvas();
                return;
            }

            // Clicked on empty space
            if (!isShiftOrCmd) {
                setSelectedElements([]);
            }

            // Start Marquee / Lasso Selection
            actionRef.current = 'selecting';
            isDrawingRef.current = true;
            setAction('selecting');
            setIsDrawing(true);
            lassoPathRef.current = [{ x: offsetX, y: offsetY }];
            selectionBoxRef.current = {
                startX: offsetX,
                startY: offsetY,
                currentX: offsetX,
                currentY: offsetY,
                additive: isShiftOrCmd,
                initialSelectedIds: isShiftOrCmd ? selectedElementsRef.current.map(s => s.id) : []
            };
            setSelectionBox({
                startX: offsetX,
                startY: offsetY,
                currentX: offsetX,
                currentY: offsetY
            });
            setLassoPath([{ x: offsetX, y: offsetY }]);
            renderCanvas();
            return;
        }

        if (currentTool === 'sticky') {
            const id = crypto.randomUUID();
            const isTr = !i18n?.language?.startsWith('en');
            const defaultText = isTr ? "Düzenlemek için çift tıklayın..." : "Double click to edit...";
            const newElement = {
                id,
                type: 'sticky',
                x: offsetX - (100 / currentScale),
                y: offsetY - (100 / currentScale),
                width: 200 / currentScale,
                height: 200 / currentScale,
                text: defaultText,
                timestamp: Date.now()
            };

            setElements(prev => [...prev, newElement]);
            if (isHost || isHostRef.current) {
                setHistory(prev => [...prev, { type: 'ADD', element: newElement }]);
            }

            if (socket) {
                socket.emit('draw-element', { roomId, socketId: socket.id, userId: currentUser?.id, ...newElement });
            }

            setTool('select');
            return;
        }

        if (currentTool === 'text') {
            if (textMode === 'multi') {
                textBoxStartRef.current = { x: offsetX, y: offsetY };
                textBoxPreviewRef.current = { x: offsetX, y: offsetY, width: 0, height: 0 };
                actionRef.current = 'drawing-textbox';
                setAction('drawing-textbox');
                isDrawingRef.current = true;
                setIsDrawing(true);
                return;
            }

            // Single line text mode
            const id = crypto.randomUUID();
            const chosenFont = currentFontFamily || 'TTKBDikTemel';
            const initialFontSize = currentFontSize || 24;
            const singleH = Math.round(initialFontSize * 1.25);
            
            // Calculate max width until canvas right edge so text doesn't overflow page
            const canvasLogicalWidth = canvasRef.current ? (canvasRef.current.width / (window.devicePixelRatio || 1)) / currentScale - currentPan.x : 2000;
            const maxW = Math.max(100, canvasLogicalWidth - offsetX - 20);
            const initialWidth = Math.min(180 / currentScale, maxW);

            const newElement = {
                id,
                type: 'text',
                textMode: 'single',
                isSingleLine: true,
                isFixedWidth: false,
                x: offsetX,
                y: offsetY,
                width: initialWidth,
                height: singleH,
                maxWidth: maxW,
                size: Math.round(initialFontSize / 5),
                fontSize: initialFontSize,
                fontFamily: chosenFont,
                bold: isTextBold || false,
                italic: isTextItalic || false,
                underline: isTextUnderline || false,
                strike: isTextStrike || false,
                color: currentColor,
                text: '',
                timestamp: Date.now(),
                order: elements.length
            };

            setElements(prev => {
                const next = [...prev, newElement];
                const newIdx = next.length - 1;
                setTimeout(() => {
                    setEditingElement({
                        index: newIdx,
                        id: newElement.id,
                        type: 'text',
                        textMode: 'single',
                        isSingleLine: true,
                        text: '',
                        x: offsetX,
                        y: offsetY,
                        width: initialWidth,
                        height: singleH,
                        maxWidth: maxW,
                        color: currentColor,
                        fontSize: initialFontSize,
                        fontFamily: chosenFont,
                        bold: isTextBold || false,
                        italic: isTextItalic || false,
                        underline: isTextUnderline || false,
                        strike: isTextStrike || false
                    });
                }, 10);
                return next;
            });

            if (isHost || isHostRef.current) {
                setHistory(prev => [...prev, { type: 'ADD', element: newElement }]);
            }

            if (socket) {
                socket.emit('draw-element', { roomId, socketId: socket.id, userId: currentUser?.id, ...newElement });
            }

            setTool('select');
            return;
        }

        isDrawingRef.current = true;
        actionRef.current = 'drawing';
        setIsDrawing(true);
        setAction('drawing');

        if (currentTool === 'eraser') {
            actionRef.current = 'erasing';
            isDrawingRef.current = true;
            setAction('erasing');
            setIsDrawing(true);
            erasedInStrokeRef.current = new Set();
            erasedListRef.current = [];
            lastEraserWorldPosRef.current = { x: offsetX, y: offsetY };
            eraserInitialElementsRef.current = [...(elementsRef.current || elements)];
            performEraseAt(offsetX, offsetY);
            return;
        }

        if (currentTool === 'pen' || currentTool === 'highlighter') {
            currentStrokeRef.current = {
                id: crypto.randomUUID(),
                type: currentTool,
                color: currentColor,
                size: currentBrushSize / currentScale,
                points: [{ x: offsetX, y: offsetY }],
                timestamp: Date.now()
            };
            renderCanvas();
        } else {
            setCurrentElement({
                id: crypto.randomUUID(),
                type: currentTool,
                color: currentColor,
                size: currentBrushSize,
                x: offsetX,
                y: offsetY,
                lineStyle: currentTool === 'line' ? (lineStyle || 'plain') : undefined,
                width: 0,
                height: 0,
                timestamp: Date.now()
            });
        }
    };

    const draw = (e) => {
        const { x: offsetX, y: offsetY } = getMousePos(e);

        if (socket) {
            // ... cursor logic
            socket.emit('cursor-move', {
                roomId,
                userId: user?.username || 'Guest',
                x: offsetX,
                y: offsetY,
                color: color
            });
        }

        if (action === 'panning') {
            const { clientX, clientY } = e;
            const { startX, startY, initialPan } = draggedElementRef.current;

            // Delta in SCREEN pixels (dividing by scale NOT needed for raw translation if we translate by screen pixels? 
            // Wait. ctx.translate(x,y) happens AFTER ctx.scale? 
            // If we did ctx.scale then ctx.translate, translate is in SCALED units.
            // If we did ctx.translate then ctx.scale, translate is in SCREEN units.
            // In renderCanvas: ctx.scale() then ctx.translate(). 
            // So translate(10, 0) moves 10 * scale pixels?
            // NO. standard transform order:
            // transform(a,b,c,d,e,f) -> e,f are translation.
            // If I did ctx.scale(2,2); ctx.translate(10,10);
            // Drawing at 0,0 lands at 20,20 on screen?
            // Actually, let's verify standard canvas behavior or just test.
            // Usually: Pan should be in "World Units" if inside the scale.
            // If I drag mouse 100px. I want to see 100px move on screen.
            // If scale is 2x. I need to change panOffset by 50px?
            // Let's assume panOffset is in WORLD coords.

            const dx = (clientX - startX) / scale;
            const dy = (clientY - startY) / scale;

            setPanOffset({
                x: initialPan.x + dx,
                y: initialPan.y + dy
            });
            return;
        }

        if (action === 'drawing-textbox' || actionRef.current === 'drawing-textbox') {
            if (textBoxStartRef.current) {
                const sx = textBoxStartRef.current.x;
                const sy = textBoxStartRef.current.y;
                textBoxPreviewRef.current = {
                    x: Math.min(sx, offsetX),
                    y: Math.min(sy, offsetY),
                    width: Math.abs(offsetX - sx),
                    height: Math.abs(offsetY - sy)
                };
                renderCanvas();
            }
            return;
        }

        if (action === 'erasing' || actionRef.current === 'erasing') {
            const prev = lastEraserWorldPosRef.current || { x: offsetX, y: offsetY };
            const dist = Math.hypot(offsetX - prev.x, offsetY - prev.y);
            const steps = Math.max(1, Math.min(20, Math.ceil(dist / 8)));
            for (let s = 1; s <= steps; s++) {
                const ix = prev.x + (offsetX - prev.x) * (s / steps);
                const iy = prev.y + (offsetY - prev.y) * (s / steps);
                performEraseAt(ix, iy);
            }
            lastEraserWorldPosRef.current = { x: offsetX, y: offsetY };
            return;
        }

        if ((action === 'selecting' || actionRef.current === 'selecting') && selectionBoxRef.current) {
            selectionBoxRef.current.currentX = offsetX;
            selectionBoxRef.current.currentY = offsetY;

            if (lassoPathRef.current) {
                const lastPt = lassoPathRef.current[lassoPathRef.current.length - 1];
                if (!lastPt || Math.hypot(offsetX - lastPt.x, offsetY - lastPt.y) > 3 / (scaleRef.current || scale || 1)) {
                    lassoPathRef.current.push({ x: offsetX, y: offsetY });
                }
            }

            setSelectionBox({ ...selectionBoxRef.current });
            setLassoPath(lassoPathRef.current ? [...lassoPathRef.current] : null);

            const sb = selectionBoxRef.current;
            const normBox = {
                x: Math.min(sb.startX, offsetX),
                y: Math.min(sb.startY, offsetY),
                width: Math.abs(offsetX - sb.startX),
                height: Math.abs(offsetY - sb.startY)
            };

            const lp = lassoPathRef.current;
            const isLasso = lp && lp.length >= 3;

            let lassoBox = normBox;
            if (isLasso) {
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (let i = 0; i < lp.length; i++) {
                    const pt = lp[i];
                    if (pt.x < minX) minX = pt.x;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.y > maxY) maxY = pt.y;
                }
                lassoBox = {
                    x: minX,
                    y: minY,
                    width: Math.max(maxX - minX, 1),
                    height: Math.max(maxY - minY, 1)
                };
            }

            const boxSelected = elements.filter(el => 
                isLasso ? isElementInLasso(el, lp, lassoBox) : isElementInBox(el, normBox)
            );
            const baseIds = new Set(sb.initialSelectedIds || []);
            const allSelectedElements = [
                ...elements.filter(el => baseIds.has(el.id)),
                ...boxSelected.filter(el => !baseIds.has(el.id))
            ];

            const newSelectionItems = allSelectedElements.map(el => createSelectionItem(el, -1, elements));
            setSelectedElements(newSelectionItems);
            renderCanvas();
            return;
        }

        if ((action === 'moving' || actionRef.current === 'moving') && selectedElementsRef.current.length > 0) {
            const dx = offsetX - dragStartPosRef.current.mouseX;
            const dy = offsetY - dragStartPosRef.current.mouseY;

            // Store specific changed props in ref for reliable history
            draggedElementRef.current = { dx, dy };

            setElements(prev => {
                const next = [...prev];
                selectedElementsRef.current.forEach(sel => {
                    const idx = next.findIndex(el => el.id === sel.id);
                    if (idx !== -1 && !next[idx].locked) {
                        next[idx] = translateElement(sel.initialSnapshot, dx, dy);
                    }
                    if (sel.attachedElements && sel.attachedElements.length > 0) {
                        sel.attachedElements.forEach(att => {
                            const attIdx = next.findIndex(el => el.id === att.id);
                            if (attIdx !== -1 && !next[attIdx].locked) {
                                next[attIdx] = translateElement(att.initialSnapshot, dx, dy);
                            }
                        });
                    }
                });
                return next;
            });

            // Smooth throttled socket emission for real-time collaboration preview
            const now = Date.now();
            if (socket && (now - lastEmitTimeRef.current) > 35) {
                lastEmitTimeRef.current = now;
                selectedElementsRef.current.forEach(sel => {
                    const el = elementsRef.current?.find(e => e.id === sel.id);
                    if (el && el.locked) return;
                    const translatedEl = translateElement(sel.initialSnapshot, dx, dy);
                    socket.emit('draw-element', { roomId, socketId: socket.id, userId: user?.id, ...translatedEl });
                    if (sel.attachedElements && sel.attachedElements.length > 0) {
                        sel.attachedElements.forEach(att => {
                            const attEl = elementsRef.current?.find(e => e.id === att.id);
                            if (attEl && attEl.locked) return;
                            const translatedAtt = translateElement(att.initialSnapshot, dx, dy);
                            socket.emit('draw-element', { roomId, socketId: socket.id, userId: user?.id, ...translatedAtt });
                        });
                    }
                });
            }

            renderCanvas();
            return;
        }

        if (action === 'resizing' && selectedElement) {
            const { index } = selectedElement;
            const el = elements[index] || elements.find(e => e.id === selectedElement.id);
            if (!el || el.locked) return;
            const bounds = getElementBounds(el);
            const bx = bounds ? bounds.x : (el.x || 0);
            const by = bounds ? bounds.y : (el.y || 0);
            const bw = bounds ? bounds.width : (el.width || 20);

            const isBL = resizeHandleRef.current === 'bl';
            let newWidth, newHeight, newX = el.x;

            if (isBL) {
                const fixedRight = bx + bw;
                newWidth = Math.max(fixedRight - offsetX, 30);
                newX = fixedRight - newWidth;
                newHeight = Math.max(offsetY - by, 20);
            } else {
                newWidth = Math.max(offsetX - bx, 30);
                newHeight = Math.max(offsetY - by, 20);
            }

            if (el.type === 'image') {
                // Maintain aspect ratio for images
                const aspectRatio = el.aspectRatio || (el.width / el.height);
                newHeight = newWidth / aspectRatio;
                const props = isBL ? { x: newX, width: newWidth, height: newHeight } : { width: newWidth, height: newHeight };
                draggedElementRef.current = props;
                updateElement(index, props);
            } else if (el.type === 'text') {
                // Calculate height based on wrapping with newWidth
                const ctx = canvasRef.current.getContext('2d');
                const fFamily = el.fontFamily || currentFontFamily || 'TTKBDikTemel, sans-serif';
                const fontSize = el.fontSize || (el.size || 5) * 5;
                ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${fontSize}px ${fFamily}`;
                const lineHeight = fFamily.includes('TTKB') ? Math.round(fontSize * 1.35) : Math.round(fontSize * 1.25);
                const singleLineH = Math.round(fontSize * 1.25);

                newWidth = Math.max(newWidth, 30);
                const isSingle = el.textMode === 'single' || el.isSingleLine;
                const newHeightCalc = isSingle ? singleLineH : Math.max(wrapText(ctx, el.text || '', 0, 0, newWidth, lineHeight), singleLineH);

                const props = isBL
                    ? { x: newX, width: newWidth, height: newHeightCalc, isFixedWidth: true }
                    : { width: newWidth, height: newHeightCalc, isFixedWidth: true };
                draggedElementRef.current = props;
                updateElement(index, props);
            } else if (el.points && Array.isArray(el.points) && bounds) {
                // Proportional scale for freehand stroke points
                const origW = bounds.width;
                const origH = bounds.height;
                if (origW > 0 && origH > 0) {
                    const scaleX = newWidth / origW;
                    const scaleY = newHeight / origH;
                    const newPoints = el.points.map(p => ({
                        x: (isBL ? newX : bx) + (p.x - bx) * scaleX,
                        y: by + (p.y - by) * scaleY
                    }));
                    const props = isBL ? { x: newX, points: newPoints } : { points: newPoints };
                    draggedElementRef.current = props;
                    updateElement(index, props);
                }
            } else {
                const props = isBL ? { x: newX, width: newWidth, height: newHeight } : { width: newWidth, height: newHeight };
                draggedElementRef.current = props;
                updateElement(index, props);
            }
            renderCanvas();
            return;
        }

        if (!isDrawing) return;

        const ctx = canvasRef.current.getContext('2d');

        if (tool === 'pen' || tool === 'highlighter') {
            if (currentStrokeRef.current) {
                const newPoint = { x: offsetX, y: offsetY };
                currentStrokeRef.current.points.push(newPoint);

                // Emit real-time stroke updates (throttled to every 3rd point to reduce network load)
                if (socket && currentStrokeRef.current.points.length % 3 === 0) {
                    socket.emit('drawing-stroke', {
                        roomId,
                        userId: user?.id,
                        socketId: socket.id,
                        stroke: currentStrokeRef.current
                    });
                }

                // Force Render safely
                renderCanvas();
            }
        } else {
            // ... existing shape preview code ...
            // shape preview also relies on renderCanvas now
            const previewElement = {
                ...currentElement,
                width: offsetX - currentElement.x,
                height: offsetY - currentElement.y,
                endX: offsetX,
                endY: offsetY
            };
            setCurrentElement(previewElement);
        }
    };

    const stopDrawing = () => {
        if (actionRef.current === 'panning' || action === 'panning') {
            actionRef.current = 'none';
            isDrawingRef.current = false;
            setAction('none');
            setIsDrawing(false);
            draggedElementRef.current = null;
            document.body.style.cursor = isSpacePressed ? 'grab' : 'default';
            return;
        }

        if (actionRef.current === 'drawing-textbox' || action === 'drawing-textbox') {
            actionRef.current = 'none';
            isDrawingRef.current = false;
            setAction('none');
            setIsDrawing(false);

            const start = textBoxStartRef.current;
            const preview = textBoxPreviewRef.current;
            textBoxStartRef.current = null;
            textBoxPreviewRef.current = null;

            if (start) {
                const id = crypto.randomUUID();
                const chosenFont = currentFontFamily || 'TTKBDikTemel';
                const initialFontSize = currentFontSize || 24;
                const singleLineH = Math.round(initialFontSize * 1.25);
                const currentScale = scaleRef.current || scale || 1;

                let width = preview && preview.width > 20 ? preview.width : (280 / currentScale);
                let height = preview && preview.height > 20 ? preview.height : (singleLineH * 2.5);
                let posX = preview && preview.width > 20 ? preview.x : start.x;
                let posY = preview && preview.height > 20 ? preview.y : start.y;

                const newElement = {
                    id,
                    type: 'text',
                    textMode: 'multi',
                    isFixedWidth: true,
                    isMultiLine: true,
                    x: posX,
                    y: posY,
                    width,
                    height,
                    size: Math.round(initialFontSize / 5),
                    fontSize: initialFontSize,
                    fontFamily: chosenFont,
                    bold: isTextBold || false,
                    italic: isTextItalic || false,
                    underline: isTextUnderline || false,
                    strike: isTextStrike || false,
                    color: colorRef.current || color,
                    text: '',
                    timestamp: Date.now(),
                    order: elements.length
                };

                setElements(prev => {
                    const next = [...prev, newElement];
                    const newIdx = next.length - 1;
                    setTimeout(() => {
                        setEditingElement({
                            index: newIdx,
                            id: newElement.id,
                            type: 'text',
                            textMode: 'multi',
                            isMultiLine: true,
                            isFixedWidth: true,
                            text: '',
                            x: posX,
                            y: posY,
                            width,
                            height,
                            color: newElement.color,
                            fontSize: initialFontSize,
                            fontFamily: chosenFont,
                            bold: isTextBold || false,
                            italic: isTextItalic || false,
                            underline: isTextUnderline || false,
                            strike: isTextStrike || false
                        });
                    }, 10);
                    return next;
                });

                if (isHost || isHostRef.current) {
                    setHistory(prev => [...prev, { type: 'ADD', element: newElement }]);
                }
                if (socket) {
                    socket.emit('draw-element', { roomId, socketId: socket.id, userId: userRef.current?.id, ...newElement });
                }
                setTool('select');
            }
            renderCanvas();
            return;
        }

        if (actionRef.current === 'selecting' || action === 'selecting') {
            if (selectionBoxRef.current) {
                const sb = selectionBoxRef.current;
                const normBox = {
                    x: Math.min(sb.startX, sb.currentX),
                    y: Math.min(sb.startY, sb.currentY),
                    width: Math.abs(sb.currentX - sb.startX),
                    height: Math.abs(sb.currentY - sb.startY)
                };

                const lp = lassoPathRef.current;
                const isLasso = lp && lp.length >= 3;

                let lassoBox = normBox;
                if (isLasso) {
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    for (let i = 0; i < lp.length; i++) {
                        const pt = lp[i];
                        if (pt.x < minX) minX = pt.x;
                        if (pt.x > maxX) maxX = pt.x;
                        if (pt.y < minY) minY = pt.y;
                        if (pt.y > maxY) maxY = pt.y;
                    }
                    lassoBox = {
                        x: minX,
                        y: minY,
                        width: Math.max(maxX - minX, 1),
                        height: Math.max(maxY - minY, 1)
                    };
                }

                if (normBox.width > 4 || normBox.height > 4 || (isLasso && (lassoBox.width > 6 || lassoBox.height > 6 || lp.length > 5))) {
                    const boxSelected = elements.filter(el => 
                        isLasso ? isElementInLasso(el, lp, lassoBox) : isElementInBox(el, normBox)
                    );
                    const baseIds = new Set(sb.initialSelectedIds || []);
                    const allSelectedElements = [
                        ...elements.filter(el => baseIds.has(el.id)),
                        ...boxSelected.filter(el => !baseIds.has(el.id))
                    ];
                    const newSelectionItems = allSelectedElements.map(el => createSelectionItem(el, -1, elements));
                    setSelectedElements(newSelectionItems);
                } else if (!sb.additive) {
                    // Simple click on empty canvas
                    setSelectedElements([]);
                }
            }
            selectionBoxRef.current = null;
            lassoPathRef.current = null;
            setSelectionBox(null);
            setLassoPath(null);
            actionRef.current = 'none';
            isDrawingRef.current = false;
            setAction('none');
            setIsDrawing(false);
            renderCanvas();
            return;
        }

        if (actionRef.current === 'moving' || action === 'moving') {
            if (selectedElementsRef.current.length > 0) {
                const currentUser = userRef.current || user;
                const movedItems = [];

                selectedElementsRef.current.forEach(sel => {
                    const finalEl = elementsRef.current?.find(el => el.id === sel.id);
                    if (finalEl && !finalEl.locked) {
                        movedItems.push({
                            id: sel.id,
                            oldProps: sel.initialSnapshot,
                            newProps: JSON.parse(JSON.stringify(finalEl))
                        });
                        if (socket) {
                            socket.emit('draw-element', { roomId, socketId: socket.id, userId: currentUser?.id, ...finalEl });
                        }
                    }
                    if (sel.attachedElements) {
                        sel.attachedElements.forEach(att => {
                            const finalAtt = elementsRef.current?.find(el => el.id === att.id);
                            if (finalAtt && !finalAtt.locked && socket) {
                                socket.emit('draw-element', { roomId, socketId: socket.id, userId: currentUser?.id, ...finalAtt });
                            }
                        });
                    }
                });

                if ((isHost || isHostRef.current) && movedItems.length > 0) {
                    setHistory(prev => [...prev, {
                        type: 'MULTI_UPDATE',
                        elements: movedItems
                    }]);
                }

                // Update initialSnapshots to current element state for subsequent moves
                setSelectedElements(prev => prev.map(sel => {
                    const el = elementsRef.current?.find(e => e.id === sel.id);
                    return el ? createSelectionItem(el, -1, elementsRef.current) : sel;
                }));
                setRedoStack([]);
            }
            actionRef.current = 'none';
            isDrawingRef.current = false;
            setAction('none');
            setIsDrawing(false);
            draggedElementRef.current = null;
            document.body.style.cursor = 'default';
            renderCanvas();
            return;
        }

        if (actionRef.current === 'resizing' || action === 'resizing') {
            if (selectedElement && undoSnapshot) {
                const index = selectedElement.index;
                const finalElement = elementsRef.current?.[index] || elements[index];
                const currentUser = userRef.current || user;

                // Final emission to socket for persistent save in MongoDB and all clients
                if (socket && finalElement) {
                    socket.emit('draw-element', { roomId, socketId: socket.id, userId: currentUser?.id, ...finalElement });
                }

                if ((isHost || isHostRef.current) && finalElement) {
                    setHistory(prev => [...prev, {
                        type: 'UPDATE',
                        id: finalElement.id,
                        index: index,
                        oldProps: undoSnapshot,
                        newProps: finalElement
                    }]);
                }
                setRedoStack([]);
                setUndoSnapshot(null);
            }
            actionRef.current = 'none';
            isDrawingRef.current = false;
            setAction('none');
            setIsDrawing(false);
            draggedElementRef.current = null;
            document.body.style.cursor = 'default';
            renderCanvas();
            return;
        }

        if (actionRef.current === 'erasing' || action === 'erasing') {
            actionRef.current = 'none';
            isDrawingRef.current = false;
            setAction('none');
            setIsDrawing(false);
            lastEraserWorldPosRef.current = null;

            // Resimler üzerinde kısmi silme yapıldıysa yeni dataURL üret ve kaydet
            let finalEls = elementsRef.current || elements;
            if (modifiedImagesInStrokeRef.current && modifiedImagesInStrokeRef.current.size > 0) {
                const modIds = new Set(modifiedImagesInStrokeRef.current);
                modifiedImagesInStrokeRef.current = new Set();
                finalEls = finalEls.map(el => {
                    if (modIds.has(el.id) && imageCache.current[el.id]) {
                        try {
                            const newURL = imageCache.current[el.id].toDataURL('image/png');
                            imageCache.current[el.id]._dataURL = newURL;
                            return { ...el, dataURL: newURL };
                        } catch (e) {
                            return el;
                        }
                    }
                    return el;
                });
                elementsRef.current = finalEls;
                setElements(finalEls);
            }

            const initialElements = eraserInitialElementsRef.current;
            const currentEls = finalEls;

            if (initialElements && (initialElements.length !== currentEls.length || JSON.stringify(initialElements) !== JSON.stringify(currentEls))) {
                if (isHost || isHostRef.current) {
                    setHistory(prev => [...prev, {
                        type: 'SYNC_STATE',
                        oldElements: initialElements,
                        newElements: currentEls
                    }]);
                }
                setRedoStack([]);
            }
            eraserInitialElementsRef.current = null;
            erasedListRef.current = [];
            erasedInStrokeRef.current = new Set();

            if (socket) {
                socket.emit('sync-state', { roomId, elements: currentEls });
            }

            renderCanvas();
            return;
        }

        if (!isDrawingRef.current && !isDrawing) return;
        isDrawingRef.current = false;
        actionRef.current = 'none';
        setIsDrawing(false);
        setAction('none');

        const currentUser = userRef.current || user;

        // Commit Stroke
        if (currentStrokeRef.current) {
            const newElement = currentStrokeRef.current;
            setElements(prev => [...prev, newElement]);
            if (isHost || isHostRef.current) {
                setHistory(prev => [...prev, { type: 'ADD', element: newElement }]);
            }

            // Emit to socket
            if (socket) {
                socket.emit('draw-element', { roomId, socketId: socket.id, userId: currentUser?.id, ...newElement });
            }

            currentStrokeRef.current = null;
            renderCanvas();
        } else if (currentElement) {
            // Commit Shape / Line
            if (currentElement.type === 'line') {
                const lx1 = currentElement.x;
                const ly = currentElement.y;
                const lx2 = currentElement.endX ?? currentElement.x;
                const ly2 = currentElement.endY ?? currentElement.y;
                if (Math.hypot(lx2 - lx1, ly2 - ly) < 4) {
                    setCurrentElement(null);
                    return;
                }
            } else if (currentElement.width === 0 && currentElement.height === 0 && currentElement.type !== 'text') {
                setCurrentElement(null);
                return;
            }

            setElements(prev => [...prev, currentElement]);
            if (isHost || isHostRef.current) {
                setHistory(prev => [...prev, { type: 'ADD', element: currentElement }]);
            }
            if (socket) {
                socket.emit('draw-element', { roomId, socketId: socket.id, userId: currentUser?.id, ...currentElement });
            }
            setCurrentElement(null);
            renderCanvas();
        }
    };

    startDrawingRef.current = startDrawing;
    handleStrokeMoveRef.current = handleStrokeMove;
    stopDrawingRef.current = stopDrawing;

    // Actions
    const handleUndo = () => {
        if (history.length === 0) return;
        const newHistory = [...history];
        const lastAction = newHistory.pop();
        setHistory(newHistory);
        setRedoStack(prev => [...prev, lastAction]);

        if (lastAction.type === 'ADD') {
            // Remove the added element
            setElements(prev => prev.filter(el => el.id !== lastAction.element.id));
            // Emit delete to other users for undo synchronization
            if (socket) {
                socket.emit('delete-element', { roomId, elementId: lastAction.element.id });
            }
        } else if (lastAction.type === 'CLEAR') {
            setElements(lastAction.elements);
            elementsRef.current = lastAction.elements;
            if (socket && (isHost || isHostRef.current)) {
                socket.emit('sync-state', { roomId, elements: lastAction.elements });
            }
        } else if (lastAction.type === 'COMPOSITE_UPDATE') {
            setElements(prev => {
                let updated = [...prev];
                if (lastAction.oldImage) {
                    const imgIdx = updated.findIndex(el => el.id === lastAction.oldImage.id);
                    if (imgIdx !== -1) updated[imgIdx] = { ...lastAction.oldImage };
                }
                if (lastAction.oldAttached && Array.isArray(lastAction.oldAttached)) {
                    lastAction.oldAttached.forEach(oldEl => {
                        const elIdx = updated.findIndex(el => el.id === oldEl.id);
                        if (elIdx !== -1) updated[elIdx] = { ...oldEl };
                    });
                }
                if (socket && (isHost || isHostRef.current)) {
                    socket.emit('sync-state', { roomId, elements: updated });
                }
                return updated;
            });
        } else if (lastAction.type === 'COMPOSITE_REPLACE') {
            setElements(prev => {
                const next = prev.map(el => el.id === lastAction.newElement.id ? lastAction.oldElement : el);
                if (socket) {
                    socket.emit('delete-element', { roomId, elementId: lastAction.newElement.id });
                    socket.emit('draw-element', { roomId, ...lastAction.oldElement });
                }
                return next;
            });
            setSelectedElement(null);
        } else if (lastAction.type === 'MULTI_UPDATE') {
            setElements(prev => {
                let updated = [...prev];
                lastAction.elements.forEach(item => {
                    const idx = updated.findIndex(el => el.id === item.id);
                    if (idx !== -1) updated[idx] = { ...item.oldProps };
                });
                if (socket && (isHost || isHostRef.current)) {
                    socket.emit('sync-state', { roomId, elements: updated });
                }
                return updated;
            });
        } else if (lastAction.type === 'MULTI_DELETE') {
            setElements(prev => {
                const next = [...prev, ...lastAction.elements];
                if (socket) {
                    lastAction.elements.forEach(el => {
                        socket.emit('draw-element', { roomId, ...el });
                    });
                }
                return next;
            });
        } else if (lastAction.type === 'DELETE') {
            setElements(prev => {
                const next = [...prev, lastAction.element];
                if (socket) {
                    socket.emit('draw-element', { roomId, ...lastAction.element });
                }
                return next;
            });
        } else if (lastAction.type === 'SYNC_STATE') {
            setElements(lastAction.oldElements);
            elementsRef.current = lastAction.oldElements;
            if (socket && (isHost || isHostRef.current)) {
                socket.emit('sync-state', { roomId, elements: lastAction.oldElements });
            }
        } else if (lastAction.type === 'UPDATE') {
            // Revert changes - FIND INDEX BY ID for stability
            const targetIndex = elements.findIndex(el => el.id === lastAction.id);
            if (targetIndex !== -1) {
                updateElement(targetIndex, lastAction.oldProps);
            }
        } else {
            // Fallback for legacy history (if any exists in active session before reload)
            setElements(prev => prev.slice(0, -1));
        }
        setTimeout(() => renderCanvas(), 10);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const newRedoStack = [...redoStack];
        const action = newRedoStack.pop();
        setRedoStack(newRedoStack);

        if (isHost || isHostRef.current) {
            setHistory(prev => [...prev, action]);
        }

        if (action.type === 'ADD') {
            setElements(prev => {
                const newElements = [...prev, action.element];
                if (socket && (isHost || isHostRef.current)) {
                    socket.emit('sync-state', { roomId, elements: newElements });
                }
                return newElements;
            });
        } else if (action.type === 'COMPOSITE_REPLACE') {
            setElements(prev => {
                const next = prev.map(el => el.id === action.oldElement.id ? action.newElement : el);
                if (socket) {
                    socket.emit('delete-element', { roomId, elementId: action.oldElement.id });
                    socket.emit('draw-element', { roomId, ...action.newElement });
                }
                return next;
            });
            setSelectedElement(null);
        } else if (action.type === 'MULTI_DELETE') {
            setElements(prev => {
                const deleteIds = new Set(action.elements.map(e => e.id));
                const next = prev.filter(el => !deleteIds.has(el.id));
                if (socket) {
                    action.elements.forEach(el => {
                        socket.emit('delete-element', { roomId, elementId: el.id });
                    });
                }
                return next;
            });
            setSelectedElements([]);
        } else if (action.type === 'DELETE') {
            setElements(prev => {
                const next = prev.filter(el => el.id !== action.element.id);
                if (socket) {
                    socket.emit('delete-element', { roomId, elementId: action.element.id });
                }
                return next;
            });
            setSelectedElement(null);
        } else if (action.type === 'MULTI_UPDATE') {
            setElements(prev => {
                let updated = [...prev];
                action.elements.forEach(item => {
                    const idx = updated.findIndex(el => el.id === item.id);
                    if (idx !== -1) updated[idx] = { ...item.newProps };
                });
                if (socket && (isHost || isHostRef.current)) {
                    socket.emit('sync-state', { roomId, elements: updated });
                }
                return updated;
            });
        } else if (action.type === 'COMPOSITE_UPDATE') {
            setElements(prev => {
                let updated = [...prev];
                if (action.newImage) {
                    const imgIdx = updated.findIndex(el => el.id === action.newImage.id);
                    if (imgIdx !== -1) updated[imgIdx] = { ...action.newImage };
                }
                if (action.newAttached && Array.isArray(action.newAttached)) {
                    action.newAttached.forEach(newEl => {
                        const elIdx = updated.findIndex(el => el.id === newEl.id);
                        if (elIdx !== -1) updated[elIdx] = { ...newEl };
                    });
                }
                if (socket && (isHost || isHostRef.current)) {
                    socket.emit('sync-state', { roomId, elements: updated });
                }
                return updated;
            });
        } else if (action.type === 'UPDATE') {
            setElements(prev => {
                const targetIndex = prev.findIndex(el => el.id === action.id);
                if (targetIndex !== -1) {
                    const updatedElements = prev.map((el, idx) =>
                        idx === targetIndex ? { ...el, ...action.newProps } : el
                    );
                    if (socket && (isHost || isHostRef.current)) {
                        socket.emit('sync-state', { roomId, elements: updatedElements });
                    }
                    return updatedElements;
                } else {
                    console.error("[HandleRedo] Element not found for UPDATE:", action.id);
                    return prev;
                }
            });
        } else if (action.type === 'CLEAR') {
            setSelectedElements([]);
            setSelectedElement(null);
            setElements([]);
            elementsRef.current = [];
            if (socket && (isHost || isHostRef.current)) {
                socket.emit('clear-canvas', roomId);
            }
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        } else if (action.type === 'SYNC_STATE') {
            setElements(action.newElements);
            elementsRef.current = action.newElements;
            if (socket && (isHost || isHostRef.current)) {
                socket.emit('sync-state', { roomId, elements: action.newElements });
            }
        }
        setTimeout(() => renderCanvas(), 10);
    };

    const handleDeleteSelected = () => {
        if (!selectedElementsRef.current || selectedElementsRef.current.length === 0) return;
        // Never delete locked elements
        const elementsToDelete = elements.filter(el => 
            selectedElementsRef.current.some(s => s.id === el.id) && !el.locked
        );
        if (elementsToDelete.length === 0) return;

        const deleteIds = new Set(elementsToDelete.map(el => el.id));
        setElements(prev => prev.filter(el => !deleteIds.has(el.id)));
        setSelectedElements(prev => prev.filter(s => !deleteIds.has(s.id)));

        if (isHost || isHostRef.current) {
            if (elementsToDelete.length === 1) {
                setHistory(prev => [...prev, { type: 'DELETE', element: elementsToDelete[0] }]);
            } else {
                setHistory(prev => [...prev, { type: 'MULTI_DELETE', elements: elementsToDelete }]);
            }
        }

        if (socket) {
            elementsToDelete.forEach(el => {
                socket.emit('delete-element', { roomId, elementId: el.id });
            });
        }
        setTimeout(() => renderCanvas(), 10);
    };

    const handleClear = () => {
        const currentElements = elementsRef.current && elementsRef.current.length > 0 
            ? [...elementsRef.current] 
            : [...elements];
        if (currentElements.length === 0) return;

        setSelectedElements([]);
        setSelectedElement(null);
        setElements([]);
        elementsRef.current = [];

        setHistory(prev => [...prev, { type: 'CLEAR', elements: currentElements }]);
        setRedoStack([]);

        if (socket) socket.emit('clear-canvas', roomId);

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setTimeout(() => renderCanvas(), 10);
    };

    const exportImage = async (fileName) => {
        // Default name if not provided (or passed as event object)
        if (!fileName || typeof fileName !== 'string') {
            const date = new Date().toISOString().slice(0, 10);
            fileName = `Whiteboard-${date}`;
        }
        const canvas = canvasRef.current;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');

        // Fill bg
        tCtx.fillStyle = darkMode ? '#0f172a' : '#ffffff';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tCtx.drawImage(canvas, 0, 0);

        try {
            // Try Modern File System Access API
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${fileName}.png`,
                    types: [{
                        description: 'PNG Image',
                        accept: { 'image/png': ['.png'] },
                    }],
                });
                const writable = await handle.createWritable();
                const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
                await writable.write(blob);
                await writable.close();

                // Show success feedback
                setShowCopied('saved');
                setTimeout(() => setShowCopied(false), 2000);

                // HYBRID: Trigger standard download for History
                // Fallback to fileName since handle.name might be unreliable or vary by browser
                const finalName = handle.name || `${fileName}.png`;

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = finalName; // Use the name from FS or default
                document.body.appendChild(link);

                // Small delay to ensure browser treats it cleanly
                setTimeout(() => {
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);

                return;
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File Save Error:', err);
                alert("Deep Deep Error: Failed to save file. If you have images on the board, they might be causing security issues (CORS).");
            }
            // If AbortError (user cancelled), we usually stop. 
            // BUT, if the error was NOT AbortError (e.g. security), we might want to try fallback?
            // For now, let's just logging.
            if (err.name === 'AbortError') return;
        }

        try {
            // Standard Download for Browser Download Manager support
            tempCanvas.toBlob((blob) => {
                if (!blob) {
                    alert("Canvas export failed. (Canvas might be tainted)");
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${fileName}.png`;
                document.body.appendChild(link);
                link.click(); // Browser "Ask where to save" setting will trigger File Manager
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (e) {
            console.error("Standard download failed:", e);
            alert("Save failed. The canvas might be tainted by external images.");
        }
    };

    const exportPDF = async (fileName) => {
        if (!fileName || typeof fileName !== 'string') {
            const date = new Date().toISOString().slice(0, 10);
            fileName = `Whiteboard-${date}`;
        }

        const canvas = canvasRef.current; // Transparent

        // Create a temp canvas with background for PDF
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.fillStyle = darkMode ? '#0f172a' : '#ffffff';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tCtx.drawImage(canvas, 0, 0);

        const imgData = tempCanvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);

        try {
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${fileName}.pdf`,
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] },
                    }],
                });
                const writable = await handle.createWritable();
                const blob = pdf.output('blob');
                await writable.write(blob);
                await writable.close();

                setShowCopied('saved');
                setTimeout(() => setShowCopied(false), 2000);

                // HYBRID: Trigger standard download for History
                const finalName = handle.name || `${fileName}.pdf`;

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = finalName;
                document.body.appendChild(link);

                setTimeout(() => {
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);

                return;
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File Save Error:', err);
                // Proceed to fallback or alert
            } else {
                return; // User cancelled
            }
        }

        try {
            pdf.save(`${fileName}.pdf`);
        } catch (e) {
            console.error("PDF Save failed:", e);
            alert("PDF Save failed. Canvas might be tainted.");
        }
    };

    const handleLogout = () => {
        navigate('/login');
    };

    const fileInputRef = useRef(null);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];


    const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // MIME type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Invalid file type. Please upload a JPEG, PNG, GIF, or WEBP image.');
        e.target.value = null;
        return;
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
        alert('File too large. Maximum allowed size is 5MB.');
        e.target.value = null;
        return;
    }
        // Create local preview URL for immediate display
        const localURL = URL.createObjectURL(file);

        // Create a temporary image element to get dimensions
        const tempImg = new Image();
        tempImg.onload = async () => {
            let w = tempImg.width;
            let h = tempImg.height;

            // Scale-independent sizing
            const targetScreenSize = 300;
            const scaleFactor = 1 / scale;

            if (w > h) {
                w = targetScreenSize * scaleFactor;
                h = w / (tempImg.width / tempImg.height);
            } else {
                h = targetScreenSize * scaleFactor;
                w = h * (tempImg.width / tempImg.height);
            }

            // Create element with local preview immediately
            const newElement = {
                id: crypto.randomUUID(),
                type: 'image',
                x: -panOffset.x + 100 / scale,
                y: -panOffset.y + 100 / scale,
                width: w,
                height: h,
                dataURL: localURL, // Use local URL for immediate display
                aspectRatio: tempImg.width / tempImg.height,
                timestamp: Date.now(),
                uploading: true // Flag to indicate upload in progress
            };

            const newIndex = elements.length;
            setElements(prev => [...prev, newElement]);

            // Auto-switch to select mode
            setTool('select');
            setSelectedElement({
                index: newIndex,
                id: newElement.id,
                offsetX: 0,
                offsetY: 0,
                initialX: newElement.x,
                initialY: newElement.y,
                initialSnapshot: JSON.parse(JSON.stringify(newElement)),
                attachedElements: []
            });

            // Convert to base64 for immediate sharing with students
            const canvas = document.createElement('canvas');
            canvas.width = tempImg.width;
            canvas.height = tempImg.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempImg, 0, 0);
            const base64URL = canvas.toDataURL('image/jpeg', 0.5); // Compressed for faster transmission

            // Update element with base64 for immediate display
            const previewElement = { ...newElement, dataURL: base64URL };
            setElements(prev => prev.map((el, idx) => idx === newIndex ? previewElement : el));

            // Emit base64 preview to students immediately
            if (socket && isHost) {
                socket.emit('draw-element', { roomId, socketId: socket.id, userId: user?.id, ...previewElement });
            }

            // Upload to Cloudinary in background
            const formData = new FormData();
            formData.append('image', file);

            try {
                const res = await api.post('/api/images/upload', formData);

                const { url } = res.data;

                // Update element with Cloudinary URL safely without overwriting crop
                setElements(prev => {
                    const currentEl = prev.find(el => el.id === newElement.id);
                    if (!currentEl) return prev;
                    const isAlreadyCropped = currentEl.dataURL && currentEl.dataURL.startsWith('data:image/png');
                    const updated = {
                        ...currentEl,
                        dataURL: isAlreadyCropped ? currentEl.dataURL : url,
                        uploading: false
                    };
                    if (isHost) {
                        setHistory(h => [...h, { type: 'ADD', element: updated }]);
                    }
                    if (socket) socket.emit('draw-element', { roomId, socketId: socket.id, userId: user?.id, ...updated });
                    return prev.map(el => el.id === newElement.id ? updated : el);
                });
                setRedoStack([]);

                // Clean up local URL
                URL.revokeObjectURL(localURL);

            } catch (error) {
                console.error("Upload failed", error);
                alert("Image upload failed");
                // Remove the failed element
                setElements(prev => prev.filter((_, idx) => idx !== newIndex));
                URL.revokeObjectURL(localURL);
            }
        };

        tempImg.src = localURL;
        e.target.value = null;
    };

    const addStickyNote = () => {
        // Select sticky note tool - user will click on canvas to place it
        setTool('sticky');
    };

    // Emojileri yüksek kaliteli 512x512 PNG olarak tuvale merkezleyerek ekleme
    const handleInsertEmoji = (emojiChar, targetSize = 96) => {
        const dataURL = createEmojiImage(emojiChar, 512);

        const canvas = canvasRef.current;
        const cw = canvas ? canvas.width : window.innerWidth;
        const ch = canvas ? canvas.height : window.innerHeight;

        const viewCenterX = -panOffset.x + (cw / (2 * scale));
        const viewCenterY = -panOffset.y + (ch / (2 * scale));

        const newId = crypto.randomUUID();
        const newElement = {
            id: newId,
            type: 'image',
            isEmoji: true,
            emojiChar: emojiChar,
            x: viewCenterX - (targetSize / 2),
            y: viewCenterY - (targetSize / 2),
            width: targetSize,
            height: targetSize,
            dataURL: dataURL,
            src: dataURL,
            aspectRatio: 1,
            rotation: 0,
            timestamp: Date.now(),
            order: elements.length
        };

        // Cache image immediately so canvas renders without delay
        const img = new Image();
        img.src = dataURL;
        imageCache.current[newId] = img;

        const newElements = [...elements, newElement];
        setElements(newElements);

        // Switch to select tool and highlight the inserted emoji
        setTool('select');
        const selItem = createSelectionItem(newElement, newElements.length - 1, newElements);
        if (selItem) {
            setSelectedElements([selItem]);
        }

        if (socket) {
            socket.emit('sync-state', { roomId, elements: newElements });
        }

        setTimeout(() => renderCanvas(), 20);
    };

    const handleColorChange = (val) => {
        setColor(val);
        if (selectedElements.length > 0) {
            selectedElements.forEach(s => {
                const idx = elements.findIndex(el => el.id === s.id);
                if (idx !== -1) updateElement(idx, { color: val });
            });
        } else if (editingElement) {
            setEditingElement(prev => ({ ...prev, color: val }));
            updateElement(editingElement.index, { color: val });
        }
    };

    useEffect(() => {
        const handleClickOutsideColor = (e) => {
            if (colorPaletteRef.current && !colorPaletteRef.current.contains(e.target)) {
                setShowColorPalette(false);
            }
        };
        if (showColorPalette) {
            document.addEventListener('mousedown', handleClickOutsideColor);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutsideColor);
        };
    }, [showColorPalette]);

    const handleZoom = (delta) => {
        userHasManuallyPannedRef.current = true;
        setScale(prev => Math.min(Math.max(prev + delta, 0.1), 5));
    }

    const fitToContent = (customElements = null) => {
        const targetElements = customElements || elementsRef.current || elements;
        if (!targetElements || targetElements.length === 0) {
            setScale(1);
            setPanOffset({ x: 0, y: 0 });
            return;
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        targetElements.forEach(el => {
            if (el.points && el.points.length > 0) {
                el.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                });
            } else if (el.x !== undefined && el.y !== undefined) {
                minX = Math.min(minX, el.x);
                maxX = Math.max(maxX, el.x + (el.width || 50));
                minY = Math.min(minY, el.y);
                maxY = Math.max(maxY, el.y + (el.height || 50));
            }
        });

        if (minX === Infinity || !isFinite(minX)) return;

        const isMobile = window.innerWidth < 768;
        const contentWidth = Math.max(maxX - minX, 80);
        const contentHeight = Math.max(maxY - minY, 80);

        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const paddingX = isMobile ? 24 : 60;
        const paddingTop = isMobile ? 80 : 60;
        const paddingBottom = isMobile ? 150 : 60;

        const availableWidth = Math.max(screenW - paddingX * 2, 100);
        const availableHeight = Math.max(screenH - paddingTop - paddingBottom, 100);

        const maxScale = isMobile ? 1.0 : 1.5;
        const fitScale = Math.min(
            Math.max(Math.min(availableWidth / contentWidth, availableHeight / contentHeight), 0.15),
            maxScale
        );

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const targetScreenCenterX = screenW / 2;
        const targetScreenCenterY = isMobile ? (paddingTop + availableHeight / 2) : (screenH / 2);

        setPanOffset({
            x: targetScreenCenterX / fitScale - centerX,
            y: targetScreenCenterY / fitScale - centerY
        });
        setScale(fitScale);
    };

    fitToContentRef.current = fitToContent;

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    }

    // Touch pan & pinch-zoom support for mobile
    const touchGestureRef = useRef(null);
    const handleTouchStart = (e) => {
        if (e.touches.length >= 2) {
            userHasManuallyPannedRef.current = true;
            // Two-finger touch: abort any drawing stroke so fingers don't leave marks
            if (isDrawingRef.current || isDrawing) {
                isDrawingRef.current = false;
                actionRef.current = 'none';
                setIsDrawing(false);
                setAction('none');
                currentStrokeRef.current = null;
                renderCanvas();
            }
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const initialDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
            const initialCenter = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
            touchGestureRef.current = {
                initialDist: Math.max(initialDist, 10),
                initialScale: scale,
                initialCenter,
                initialPan: { ...panOffset }
            };
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length >= 2 && touchGestureRef.current) {
            if (e.cancelable) e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
            const currentCenter = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };

            const { initialDist, initialScale, initialCenter, initialPan } = touchGestureRef.current;
            const zoomFactor = currentDist / initialDist;
            const newScale = Math.min(Math.max(initialScale * zoomFactor, 0.15), 4.0);

            const deltaX = (currentCenter.x - initialCenter.x) / newScale;
            const deltaY = (currentCenter.y - initialCenter.y) / newScale;

            setScale(newScale);
            setPanOffset({
                x: initialPan.x + deltaX,
                y: initialPan.y + deltaY
            });
        }
    };

    const handleTouchEnd = (e) => {
        if (!e.touches || e.touches.length < 2) {
            touchGestureRef.current = null;
        }
    };

    // Wheel Logic (Zoom & Pan) + Mobile Native Touch Prevention
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e) => {
            e.preventDefault();
            userHasManuallyPannedRef.current = true;

            const currentScale = scaleRef.current || scale || 1;

            if (e.ctrlKey || e.metaKey) {
                // Zoom-to-Cursor Logic
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Multiplicative Zoom for smooth feel
                const zoomFactor = 0.1;
                let delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;

                // Calculate new scale bounds
                const newScale = Math.min(Math.max(currentScale + delta, 0.1), 5);

                if (newScale === currentScale) return; // Bounds hit

                const scaleAdjustmentX = mouseX * (1 / newScale - 1 / currentScale);
                const scaleAdjustmentY = mouseY * (1 / newScale - 1 / currentScale);

                setPanOffset(prev => ({
                    x: prev.x + scaleAdjustmentX,
                    y: prev.y + scaleAdjustmentY
                }));
                setScale(newScale);

            } else {
                // Pan
                // Divide by scale to keep pan speed consistent with screen pixels
                setPanOffset(prev => ({
                    x: prev.x - e.deltaX / currentScale,
                    y: prev.y - e.deltaY / currentScale
                }));
            }
        };

        // Desktop mouse wheel zoom & pan
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        // Mobile touch handling (non-passive to guarantee preventDefault works on iOS Safari)
        const onNativeTouchStart = (e) => {
            if (e.touches.length === 1) {
                if (e.cancelable) e.preventDefault();
                if (startDrawingRef.current) startDrawingRef.current(e);
            } else if (e.touches.length >= 2) {
                handleTouchStart(e);
            }
        };

        const onNativeTouchMove = (e) => {
            if (e.touches.length === 1) {
                if (e.cancelable) e.preventDefault();
                if (handleStrokeMoveRef.current) handleStrokeMoveRef.current(e);
            } else if (e.touches.length >= 2) {
                handleTouchMove(e);
            }
        };

        const onNativeTouchEnd = (e) => {
            if (!e.touches || e.touches.length === 0) {
                if (stopDrawingRef.current) stopDrawingRef.current(e);
            } else if (e.touches.length < 2) {
                touchGestureRef.current = null;
            }
        };

        const onNativeTouchCancel = (e) => {
            if (!e.touches || e.touches.length === 0) {
                if (stopDrawingRef.current) stopDrawingRef.current(e);
            } else if (e.touches.length < 2) {
                touchGestureRef.current = null;
            }
        };

        canvas.addEventListener('touchstart', onNativeTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onNativeTouchMove, { passive: false });
        canvas.addEventListener('touchend', onNativeTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', onNativeTouchCancel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('touchstart', onNativeTouchStart);
            canvas.removeEventListener('touchmove', onNativeTouchMove);
            canvas.removeEventListener('touchend', onNativeTouchEnd);
            canvas.removeEventListener('touchcancel', onNativeTouchCancel);
        };
    }, []); // Bound once on mount; all handlers access fresh state via refs

    // ... drawGrid ...

    const drawGrid = (ctx, width, height, scale, panOffset) => {
        let gridSize = 40; // World unit size
        const dotSize = 1;

        // Dynamic Level of Detail (LOD)
        // Ensure grid points are at least 20px apart on SCREEN.
        // If scale is 0.1, 40 * 0.1 = 4px (too dense).
        // We double gridSize until it's visually sparse enough.
        while (gridSize * scale < 20) {
            gridSize *= 2;
        }

        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(panOffset.x, panOffset.y);

        // We need to draw grid lines/dots that cover the VISIBLE area.
        // Visible Area in World Coords:
        // Left: -panOffset.x
        // Top: -panOffset.y
        // Right: -panOffset.x + width / scale
        // Bottom: -panOffset.y + height / scale

        const startX = -panOffset.x;
        const startY = -panOffset.y;
        const endX = startX + width / scale;
        const endY = startY + height / scale;

        // Snap to grid
        const gridStartX = Math.floor(startX / gridSize) * gridSize;
        const gridStartY = Math.floor(startY / gridSize) * gridSize;

        ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        for (let x = gridStartX; x < endX; x += gridSize) {
            for (let y = gridStartY; y < endY; y += gridSize) {
                ctx.fillRect(x, y, dotSize, dotSize); // Draw Dot
            }
        }
        ctx.restore();
    };

    // ← NEW
    useEffect(() => { // ← NEW
        const handleKeyDown = (e) => { // ← NEW
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; // ← NEW
            
            if (e.key === '?') { // ← NEW
                setShowShortcutsHelp(prev => !prev); // ← NEW
                return; // ← NEW
            } // ← NEW

            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) { // ← NEW
                e.preventDefault(); // ← NEW
            } // ← NEW
            if (e.key === 'Delete' || e.key === 'Backspace') { // ← NEW
                if (e.key === 'Backspace') e.preventDefault(); // ← NEW
            } // ← NEW

            switch (e.key.toLowerCase()) { // ← NEW
                case 'v': case '0': setTool('select'); break;
                case 'h': setTool('pan'); break;
                case 'p': case '1': setTool('pen'); break; // ← NEW
                case 'e': case '2': setTool('eraser'); break; // ← NEW
                case 'l': case '3': setTool('line'); break; // ← NEW
                case 'r': case '4': setTool('rect'); break; // ← NEW
                case 'c': case '5': setTool('circle'); break; // ← NEW
                case 't': case '6': setTool('text'); break; // ← NEW
                case 'delete': case 'backspace': // ← NEW
                    handleDeleteSelected(); // ← NEW
                    break; // ← NEW
                case 'escape': // ← NEW
                    setSelectedElements([]); // ← NEW
                    setTool('select'); // ← NEW
                    if (isDrawingRef.current || isDrawing) {
                        isDrawingRef.current = false;
                        actionRef.current = 'none';
                        setIsDrawing(false);
                        setAction('none');
                        currentStrokeRef.current = null;
                        setCurrentElement(null);
                        renderCanvas();
                    }
                    break; // ← NEW
                case 'z': // ← NEW
                    if (e.ctrlKey || e.metaKey) { // ← NEW
                        if (e.shiftKey) handleRedo(); // ← NEW
                        else handleUndo(); // ← NEW
                    } // ← NEW
                    break; // ← NEW
                case 'y': // ← NEW
                    if (e.ctrlKey || e.metaKey) handleRedo(); // ← NEW
                    break; // ← NEW
                default: break; // ← NEW
            } // ← NEW
        }; // ← NEW
        window.addEventListener('keydown', handleKeyDown); // ← NEW
        return () => window.removeEventListener('keydown', handleKeyDown); // ← NEW
    }, [isDrawing, selectedElements, elements, socket, roomId]); // ← NEW

    const handleLeaveRoom = () => {
        setShowLeaveModal(true);
    };

    const getCanvasCursor = () => {
        if (isSpacePressed || tool === 'pan' || tool === 'hand') {
            return action === 'panning' ? 'cursor-grabbing' : 'cursor-grab';
        }
        if (tool === 'select') return 'cursor-default';
        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            return 'cursor-none';
        }
        return 'cursor-crosshair';
    };

    return (
        <div 
            className={`relative w-full h-[100dvh] overflow-hidden touch-none select-none ${getCanvasCursor()} transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}
            style={{ overscrollBehavior: 'none' }}
            role="application"
            aria-label="Whiteboard Canvas"
        >

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Waiting For Approval Overlay */}
            <AnimatePresence>
                {isWaitingForApproval && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md"
                    >
                        <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl text-center max-w-sm">
                            <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <h2 className="text-xl font-bold text-white mb-2">{t('whiteboard.waitingForApproval', 'Öğretmen Onayı Bekleniyor')}</h2>
                            <p className="text-slate-400 text-sm">{t('whiteboard.waitingForApprovalDesc', 'Öğretmeninizin derse katılım isteğinizi onaylaması bekleniyor, lütfen bekleyin.')}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Password Protection Modal */}
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 text-2xl">
                                🔒
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-white">Bu tahta şifre ile korunuyor</h3>
                                <p className="text-sm text-slate-400">
                                    Tahta içeriğini görüntülemek ve derse katılmak için lütfen şifreyi giriniz.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyPassword} className="space-y-4">
                                <div>
                                    <input
                                        type="password"
                                        value={passwordInput}
                                        onChange={(e) => {
                                            setPasswordInput(e.target.value);
                                            setPasswordError('');
                                        }}
                                        placeholder="Tahta şifresi"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center tracking-widest text-lg"
                                        autoFocus
                                    />
                                    {passwordError && (
                                        <p className="text-rose-400 text-xs font-medium mt-2">{passwordError}</p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/dashboard')}
                                        className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-sm transition-colors cursor-pointer"
                                    >
                                        Geri Dön
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUnlocking || !passwordInput}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20 cursor-pointer"
                                    >
                                        {isUnlocking ? 'Doğrulanıyor...' : 'Şifreyi Gir'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Waiting Students Notifications (Teacher) */}
            <div 
                className="absolute left-3 sm:left-4 z-[90] flex flex-col gap-2 pointer-events-none"
                style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 10px) + 54px)' }}
            >
                <AnimatePresence>
                    {isHost && waitingStudents.map((student) => (
                        <motion.div
                            key={student.socketId}
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-xl w-72 pointer-events-auto"
                        >
                            <h4 className="text-white font-medium mb-1">{student.username} {t('whiteboard.wantsToJoin', 'derse katılmak istiyor')}</h4>
                            <p className="text-xs text-slate-400 mb-3">{t('whiteboard.role', 'Rol')}: {student.role}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        socket.emit('accept-participant', { roomId, socketId: student.socketId, userData: student });
                                        setWaitingStudents(prev => prev.filter(s => s.socketId !== student.socketId));
                                    }}
                                    className="flex-1 bg-green-500/20 text-green-400 py-1.5 rounded text-sm hover:bg-green-500/30 transition-colors font-medium"
                                >
                                    {t('whiteboard.admit', 'Kabul Et')}
                                </button>
                                <button
                                    onClick={() => {
                                        socket.emit('decline-participant', { roomId, socketId: student.socketId });
                                        setWaitingStudents(prev => prev.filter(s => s.socketId !== student.socketId));
                                    }}
                                    className="flex-1 bg-red-500/20 text-red-400 py-1.5 rounded text-sm hover:bg-red-500/30 transition-colors font-medium"
                                >
                                    {t('whiteboard.decline', 'Reddet')}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Cursors Overlay */}
            {Object.entries(cursors).map(([userId, cursor]) => (
                <div
                    key={userId}
                    className="absolute pointer-events-none transition-all duration-75 z-50 flex items-center gap-2"
                    style={{ left: cursor.x, top: cursor.y }}
                >
                    <FaMousePointer className="text-xl" style={{ color: cursor.color || '#f00' }} />
                    <span className="text-xs px-2 py-1 rounded bg-slate-800/80 text-white backdrop-blur-sm whitespace-nowrap">
                        {userId}
                    </span>
                </div>
            ))}

            {/* Unified Top Header Bar - Coordinated layout preventing any mobile overlapping */}
            <header 
                className="absolute top-0 left-0 w-full px-2 sm:px-4 py-2 flex items-center justify-between z-30 pointer-events-none gap-1.5 sm:gap-3"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
            >
                {/* Left Controls: Leave Room Button + Student Permissions */}
                <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
                    <button
                        onClick={handleLeaveRoom}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm active:scale-95 cursor-pointer backdrop-blur-md whitespace-nowrap"
                        title={t('whiteboard.leaveRoom', 'Dersten Çık')}
                    >
                        <FaSignOutAlt className="text-xs sm:text-sm shrink-0" />
                        <span className="hidden sm:inline">{t('whiteboard.leaveRoom', 'Dersten Çık')}</span>
                    </button>

                    {/* View Only / Editing Badge for Students */}
                    {(!isHost && user?.role !== 'teacher') && (
                        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border backdrop-blur-md shadow-sm transition-all whitespace-nowrap ${
                            hasEditPermission
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                        }`}>
                            <div className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                                hasEditPermission ? 'bg-emerald-400' : 'bg-cyan-400'
                            }`} />
                            <span className="hidden md:inline">
                                {hasEditPermission
                                    ? t('whiteboard.editingEnabled', 'Çizim Yetkisi Açık')
                                    : t('whiteboard.viewOnlyMode', 'Sadece Görüntüleme')}
                            </span>
                        </div>
                    )}

                    <AnimatePresence>
                        {showCopied && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0, scale: 0.9 }} 
                                className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 font-medium backdrop-blur-md whitespace-nowrap"
                            >
                                {showCopied === true ? t('whiteboard.codeCopied') : t('whiteboard.saved')}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Center: Sticky Room Metadata Pill */}
                {boardMeta && (
                    <div className="flex items-center justify-center min-w-0 flex-1 px-1 pointer-events-auto">
                        <div className="px-2.5 sm:px-3.5 py-1 rounded-full bg-card/90 border border-border shadow-md backdrop-blur-md flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground min-w-0 max-w-[140px] sm:max-w-md">
                            <span className="font-semibold text-foreground tracking-tight truncate max-w-[100px] sm:max-w-[200px]">{boardMeta.name}</span>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-border shrink-0" />
                            <span className="hidden sm:inline text-muted-foreground shrink-0 text-[11px]">
                                {new Date(boardMeta.boardDate || boardMeta.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {boardMeta.classId && (
                                <>
                                    <span className="hidden md:inline w-1 h-1 rounded-full bg-border shrink-0" />
                                    <span className="hidden md:inline text-primary font-medium truncate max-w-[140px] text-[11px]">
                                        {boardMeta.classId.schoolName ? `${boardMeta.classId.schoolName} • ` : ''}
                                        {boardMeta.classId.name || `${boardMeta.classId.grade}/${boardMeta.classId.section}`}
                                    </span>
                                </>
                            )}
                            {boardMeta.isPasswordProtected && (
                                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-400 font-medium border border-amber-500/25 text-[10px] shrink-0" title="Şifreli Tahta">
                                    🔒
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Right Controls: Integrated Zoom Controls + Menu */}
                <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 sm:gap-1.5 bg-card/90 border border-border px-1.5 py-1 rounded-xl shadow-md backdrop-blur-md text-card-foreground">
                        <button onClick={() => handleZoom(-0.1)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer" title="Uzaklaştır"><BsZoomOut className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { userHasManuallyPannedRef.current = false; fitToContent(); }} className="text-foreground font-mono text-[11px] sm:text-xs px-1.5 py-0.5 rounded hover:bg-muted/70 hover:text-primary transition-colors cursor-pointer font-semibold" title="Çizime Odakla">{Math.round(scale * 100)}%</button>
                        <button onClick={() => handleZoom(0.1)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer" title="Yakınlaştır"><BsZoomIn className="w-3.5 h-3.5" /></button>
                        
                        {/* Dikkat Çekici & Temayla Uyumlu Odakla Butonu */}
                        <button
                            onClick={() => {
                                userHasManuallyPannedRef.current = false;
                                fitToContent();
                            }}
                            className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/45 shadow-xs hover:shadow-sm transition-all duration-200 active:scale-95 cursor-pointer ml-0.5"
                            title="Tüm Çizimleri Ekrana Sığdır ve Odakla"
                        >
                            <Focus className="w-3.5 h-3.5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90 shrink-0" />
                            <span className="text-[11px] sm:text-xs font-semibold tracking-wide">
                                {t('whiteboard.fitScreen', 'Odakla')}
                            </span>
                        </button>
                    </div>

                    {/* Tools & Settings Toggle */}
                    <AnimatePresence initial={false} mode="wait">
                        {!isTopRightExpanded ? (
                            <motion.button
                                key="collapsed-right"
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setIsTopRightExpanded(true)}
                                className="relative p-1.5 sm:p-2 rounded-xl bg-card/90 border border-border text-foreground hover:bg-muted shadow-sm transition-all active:scale-95 cursor-pointer backdrop-blur-md flex items-center justify-center"
                                title="Araçlar & Ayarlar"
                            >
                                <FaSlidersH className="text-sm text-primary" />
                            </motion.button>
                        ) : (
                            <motion.div 
                                key="expanded-right"
                                initial={{ opacity: 0, scale: 0.9, x: 8 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: 8 }}
                                transition={{ duration: 0.18 }}
                                className="flex items-center gap-1 sm:gap-1.5 flex-wrap bg-card/95 border border-border p-1 rounded-xl shadow-xl backdrop-blur-md"
                            >
                                {/* Katmanlar (Layers) Toggle Button */}
                                <button
                                    onClick={() => setShowLayersPanel(prev => !prev)}
                                    className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold border shadow-xs transition-all active:scale-95 cursor-pointer ${
                                        showLayersPanel
                                            ? 'bg-primary text-primary-foreground border-transparent'
                                            : 'bg-muted/60 border-border/80 text-foreground hover:bg-muted'
                                    }`}
                                    title="Katmanlar (Çizim ve Görselleri Yönet)"
                                >
                                    <BsLayers className="text-xs sm:text-sm" />
                                    <span className="hidden sm:inline">Katmanlar</span>
                                </button>

                                {/* 1 Dakika Okuma Alanı - Sınıf modül yetkisine göre gösterilir */}
                                {(!boardMeta?.classId || (boardMeta.classId.enabledModules || []).includes('1-dk-okuma')) && (
                                    <button
                                        onClick={() => setShowReadingScreen(true)}
                                        className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold border shadow-xs transition-all active:scale-95 cursor-pointer ${
                                            showReadingScreen
                                                ? 'bg-amber-500 text-white border-transparent'
                                                : 'bg-muted/60 border-border/80 text-foreground hover:bg-muted'
                                        }`}
                                        title="İlkokul 1 Dakika Okuma Alanı"
                                    >
                                        <span className="text-xs sm:text-sm">📖</span>
                                        <span className="hidden sm:inline">1 Dk Okuma</span>
                                    </button>
                                )}

                                {/* Harf Çizgi & Yazılış Yönü Atölyesi - Sınıf modül yetkisine göre gösterilir */}
                                {(!boardMeta?.classId || (boardMeta.classId.enabledModules || []).includes('harf-cizgi-atolyesi')) && (
                                    <button
                                        onClick={() => setShowLetterWritingScreen(true)}
                                        className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold border shadow-xs transition-all active:scale-95 cursor-pointer ${
                                            showLetterWritingScreen
                                                ? 'bg-amber-500 text-white border-transparent'
                                                : 'bg-muted/60 border-border/80 text-foreground hover:bg-muted'
                                        }`}
                                        title="İlkokul Harf Çizgi & Yazılış Yönü Atölyesi"
                                    >
                                        <span className="text-xs sm:text-sm">✏️</span>
                                        <span className="hidden sm:inline">Harf Atölyesi</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsTopRightExpanded(false)}
                                    className="p-1 sm:p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors cursor-pointer"
                                    title="Daralt"
                                >
                                    <FaTimes className="text-xs" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Note/Text Editing Overlay */}
            {editingElement && (
                <textarea
                    autoFocus
                    defaultValue={editingElement.text}
                    onBlur={saveNote}
                    onInput={(e) => {
                        const index = editingElement.index;
                        const newText = e.target.value;

                        // Update local state immediately
                        const updated = [...elements];
                        updated[index] = { ...updated[index], text: newText };

                        // For sticky notes: maintain width, but allow height to grow
                        if (editingElement.type === 'sticky') {
                            // Get textarea dimensions to calculate new height
                            e.target.style.height = '0px';
                            const newHeight = Math.max(e.target.scrollHeight, 200 * scale) / scale;
                            updated[index] = { ...updated[index], height: newHeight };
                            e.target.style.height = newHeight * scale + 'px';
                        }

                        setElements(updated);

                        // Emit updates to students (throttled for sticky notes)
                        if (editingElement.type === 'sticky') {
                            const now = Date.now();
                            if (!window.lastStickyNoteUpdate || now - window.lastStickyNoteUpdate >= 30) {
                                window.lastStickyNoteUpdate = now;
                                if (socket) {
                                    socket.emit('update-element', {
                                        roomId,
                                        elementId: updated[index].id,
                                        updates: { text: newText, height: updated[index].height }
                                    });
                                }
                            } else {
                                if (window.stickyNoteUpdateTimeout) {
                                    clearTimeout(window.stickyNoteUpdateTimeout);
                                }
                                window.stickyNoteUpdateTimeout = setTimeout(() => {
                                    window.lastStickyNoteUpdate = Date.now();
                                    if (socket) {
                                        socket.emit('update-element', {
                                            roomId,
                                            elementId: updated[index].id,
                                            updates: { text: newText, height: updated[index].height }
                                        });
                                    }
                                }, 30 - (now - window.lastStickyNoteUpdate));
                            }
                            return; // Skip the text element auto-resize logic below
                        }

                        if (editingElement.type === 'text') {
                            const curEl = elements[editingElement.index] || editingElement;
                            const isSingle = curEl.textMode === 'single' || curEl.isSingleLine;
                            const fs = curEl.fontSize || (curEl.size || 5) * 5;
                            const exactSingleH = Math.round(fs * 1.25 * scale);

                            if (isSingle) {
                                // Tek satır: Yeni satıra geçmeyi engelle, tahtanın sonuna kadar yaz, taşmasın
                                if (e.target.value.includes('\n')) {
                                    e.target.value = e.target.value.replace(/\r?\n|\r/g, ' ');
                                }
                                const ctx = canvasRef.current.getContext('2d');
                                const fFam = curEl.fontFamily || currentFontFamily || 'TTKBDikTemel, sans-serif';
                                ctx.font = `${curEl.italic ? 'italic ' : ''}${curEl.bold ? 'bold ' : ''}${fs}px ${fFam}`;
                                
                                const canvasLogicalWidth = canvasRef.current ? (canvasRef.current.width / (window.devicePixelRatio || 1)) / scale - panOffset.x : 2000;
                                const maxW = Math.max(100, canvasLogicalWidth - (curEl.x || 0) - 20);
                                const measuredW = ctx.measureText(e.target.value || ' ').width + 16;
                                
                                const finalW = Math.min(Math.max(80, measuredW), maxW);
                                e.target.style.width = (finalW * scale) + 'px';
                                e.target.style.height = exactSingleH + 'px';
                            } else {
                                // Çoklu satır: İşaretlenen kutu genişliğini koru, boyutu içerikle uzat
                                e.target.style.height = '0px';
                                e.target.style.height = Math.max(exactSingleH, e.target.scrollHeight) + 'px';
                            }
                            return;
                        }

                        const isFixed = elements[editingElement.index]?.isFixedWidth;
                        if (!isFixed) {
                            e.target.style.width = '0px';
                            e.target.style.height = '0px';
                            e.target.style.width = Math.max(100, e.target.scrollWidth + 10) + 'px';
                            e.target.style.height = Math.max(30, e.target.scrollHeight) + 'px';
                        } else {
                            e.target.style.height = '0px';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }
                    }}
                    onKeyDown={(e) => {
                        const curEl = elements[editingElement.index] || editingElement;
                        const isSingle = curEl.textMode === 'single' || curEl.isSingleLine;
                        if (isSingle && e.key === 'Enter') {
                            e.preventDefault();
                            e.target.blur(); // Tek satırda Enter'a basınca kaydet ve bitir
                            return;
                        }
                        if (e.key === 'Enter' && !e.shiftKey && !curEl.isMultiLine) {
                            e.preventDefault();
                            e.target.blur();
                        }
                    }}
                    style={{
                        position: 'absolute',
                        left: (editingElement.x + panOffset.x) * scale,
                        top: (editingElement.y + panOffset.y) * scale,
                        width: ((elements[editingElement.index]?.width || editingElement.width || 100)) * scale,
                        height: ((elements[editingElement.index]?.height || editingElement.height || 30)) * scale,
                        backgroundColor: editingElement.type === 'sticky' ? '#fef08a' : 'transparent',
                        backgroundImage: editingElement.type === 'sticky' ? 'linear-gradient(175deg, #fffdf0 0%, #fef08a 25%, #fde047 100%)' : 'none',
                        boxShadow: editingElement.type === 'sticky' ? '0 12px 28px rgba(0, 0, 0, 0.22), 0 3px 8px rgba(0, 0, 0, 0.12)' : 'none',
                        borderRadius: editingElement.type === 'sticky' ? (6 * scale) + 'px' : 0,
                        color: editingElement.type === 'sticky' ? '#0f172a' : (elements[editingElement.index]?.color || editingElement.color || color),
                        fontSize: (() => {
                            if (editingElement.type === 'sticky') {
                                const fontSize = (editingElement.width * 0.10) * scale;
                                return fontSize + 'px';
                            }
                            const fs = elements[editingElement.index]?.fontSize || editingElement.fontSize || (elements[editingElement.index]?.size || 5) * 5;
                            return (fs * scale) + 'px';
                        })(),
                        transformOrigin: 'top left',
                        fontFamily: editingElement.type === 'sticky'
                            ? 'sans-serif'
                            : (elements[editingElement.index]?.fontFamily || editingElement.fontFamily || currentFontFamily || 'TTKBDikTemel, sans-serif'),
                        fontWeight: (elements[editingElement.index]?.bold ?? editingElement.bold) ? 'bold' : 'normal',
                        fontStyle: (elements[editingElement.index]?.italic ?? editingElement.italic) ? 'italic' : 'normal',
                        textDecoration: [
                            (elements[editingElement.index]?.underline ?? editingElement.underline) ? 'underline' : '',
                            (elements[editingElement.index]?.strike ?? editingElement.strike) ? 'line-through' : ''
                        ].filter(Boolean).join(' ') || 'none',
                        lineHeight: 1.25,
                        padding: editingElement.type === 'sticky' ? (24 * scale) + 'px ' + (14 * scale) + 'px' : '0px 2px',
                        border: 'none',
                        outline: editingElement.type === 'sticky' ? '2px solid rgba(234, 179, 8, 0.5)' : (editingElement.type === 'text' ? '1.5px dashed #6366f1' : 'none'),
                        resize: 'none',
                        overflow: 'hidden',
                        zIndex: 10,
                        whiteSpace: (editingElement.type === 'text' && (elements[editingElement.index]?.textMode === 'single' || elements[editingElement.index]?.isSingleLine)) ? 'pre' : 'pre-wrap',
                        wordBreak: (editingElement.type === 'text' && (elements[editingElement.index]?.textMode === 'single' || elements[editingElement.index]?.isSingleLine)) ? 'normal' : 'break-word'
                    }}
                    className={editingElement.type === 'sticky' ? "shadow-inner" : ""}
                    placeholder={
                        editingElement.type === 'sticky'
                            ? (i18n?.language?.startsWith('en') ? "Double click to edit..." : "Düzenlemek için çift tıklayın...")
                            : (i18n?.language?.startsWith('en') ? "Type here..." : "Metin yazın...")
                    }
                />
            )}

            {/* Floating Text Formatting & Action Toolbar (Touch-Friendly, Draggable, Collapsible) */}
            {activeTextEl && (
                <motion.div
                    drag
                    dragMomentum={false}
                    dragElastic={0.05}
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed z-40 bg-[#0f172a]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl text-white select-none overflow-hidden"
                    style={{
                        left: Math.max(12, Math.min(window.innerWidth - 360, (activeTextEl.x + panOffset.x) * scale)),
                        top: (activeTextEl.y + panOffset.y + (elements[activeTextIndex]?.height || activeTextEl.height || 40)) * scale + 14,
                        maxWidth: 'calc(100vw - 24px)'
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    {isTextFormatCollapsed ? (
                        /* Küçültülmüş İkon Durumu (Dokununca Genişler) */
                        <div 
                            onClick={() => setIsTextFormatCollapsed(false)}
                            className="flex items-center gap-2 px-3.5 py-2 cursor-pointer hover:bg-white/10 rounded-2xl transition-all"
                            title="Yazı Araçlarını Genişlet"
                        >
                            <FaFont className="text-indigo-400 text-sm animate-pulse" />
                            <span className="text-xs font-bold text-indigo-200">Metin Araçları</span>
                            <FaChevronDown className="text-xs text-slate-400" />
                        </div>
                    ) : (
                        /* Tam Genişlemiş Dokunmatik Bar */
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2">
                            {/* Sürükleme Tutamacı */}
                            <div className="px-1 py-1 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing flex items-center" title="Sürükleyerek Taşı">
                                <BsGripVertical className="text-sm sm:text-base" />
                            </div>

                            {/* Font Family Selector */}
                            <select
                                value={activeTextEl.fontFamily || currentFontFamily}
                                onChange={(e) => handleUpdateTextFormat({ fontFamily: e.target.value })}
                                className="bg-[#1e293b] text-white text-xs sm:text-sm rounded-xl px-2.5 py-1.5 border border-white/15 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-h-[38px]"
                                title="Yazı Tipi"
                            >
                                <option value="TTKBDikTemel-Normal">MEB Dik Temel (Normal)</option>
                                <option value="TTKBDikTemel-Kilavuzlu">MEB Dik Temel (Kılavuzlu / Oklar)</option>
                                <option value="sans-serif">Düz Yazı (Sans-Serif)</option>
                                <option value="Caveat, cursive">El Yazısı (Caveat)</option>
                                <option value="serif">Kitap Yazısı (Serif)</option>
                                <option value="monospace">Daktilo (Monospace)</option>
                            </select>

                            {/* Font Size Selector / Stepper */}
                            <div className="flex items-center bg-[#1e293b] rounded-xl p-0.5 border border-white/15 min-h-[38px]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = activeTextEl.fontSize || (activeTextEl.size || 5) * 5;
                                        const next = Math.max(12, current - 2);
                                        handleUpdateTextFormat({ fontSize: next });
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-white/10 rounded-lg text-slate-300 hover:text-white active:scale-95 cursor-pointer"
                                    title="Yazıyı Küçült"
                                >
                                    -
                                </button>
                                <span className="text-xs sm:text-sm font-mono font-bold px-1.5 text-slate-200 min-w-[32px] text-center">
                                    {activeTextEl.fontSize || (activeTextEl.size || 5) * 5}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = activeTextEl.fontSize || (activeTextEl.size || 5) * 5;
                                        const next = Math.min(96, current + 2);
                                        handleUpdateTextFormat({ fontSize: next });
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-white/10 rounded-lg text-slate-300 hover:text-white active:scale-95 cursor-pointer"
                                    title="Yazıyı Büyüt"
                                >
                                    +
                                </button>
                            </div>

                            {/* Style Toggles: B, I, U, S */}
                            <div className="flex items-center bg-[#1e293b] rounded-xl p-0.5 border border-white/15 min-h-[38px]">
                                <button
                                    type="button"
                                    onClick={() => handleUpdateTextFormat({ bold: !activeTextEl.bold })}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${activeTextEl.bold ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    title="Kalın (Bold)"
                                >
                                    <FaBold className="text-xs" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateTextFormat({ italic: !activeTextEl.italic })}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${activeTextEl.italic ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    title="İtalik (Italic)"
                                >
                                    <FaItalic className="text-xs" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateTextFormat({ underline: !activeTextEl.underline })}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${activeTextEl.underline ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    title="Altı Çizili (Underline)"
                                >
                                    <FaUnderline className="text-xs" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateTextFormat({ strike: !activeTextEl.strike })}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${activeTextEl.strike ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    title="Üstü Çizili (Strikethrough)"
                                >
                                    <FaStrikethrough className="text-xs" />
                                </button>
                            </div>

                            {/* Quick color dots */}
                            <div className="flex items-center gap-1.5 px-1">
                                {['#ffffff', '#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => handleUpdateTextFormat({ color: c })}
                                        className="w-6 h-6 rounded-full border-2 border-white/20 transition-transform hover:scale-125 active:scale-95 cursor-pointer shadow-xs"
                                        style={{ backgroundColor: c }}
                                        title={c}
                                    />
                                ))}
                            </div>

                            <div className="w-[1px] h-6 bg-white/15 mx-0.5" />

                            {/* Kilit (Lock) Toggle Button */}
                            <button
                                type="button"
                                onClick={() => handleToggleLock(activeTextEl)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                                    activeTextEl.locked
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                                        : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800'
                                }`}
                                title={activeTextEl.locked ? "Kilidi Aç" : "Kilitle"}
                            >
                                {activeTextEl.locked ? <FaLock className="text-amber-400 text-xs" /> : <FaLockOpen className="text-slate-400 text-xs" />}
                                <span className="hidden sm:inline">{activeTextEl.locked ? "Kilitli" : "Kilitle"}</span>
                            </button>

                            {/* Sil (Delete) */}
                            <button
                                type="button"
                                onClick={() => !activeTextEl.locked && handleDeleteSelected()}
                                disabled={activeTextEl.locked}
                                className={`p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl transition-all ${
                                    activeTextEl.locked
                                        ? 'opacity-30 cursor-not-allowed text-slate-500'
                                        : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 active:scale-95 cursor-pointer'
                                }`}
                                title="Metni Sil"
                            >
                                <FaTrash className="text-sm" />
                            </button>

                            {/* Simge Durumuna Küçült */}
                            <button
                                type="button"
                                onClick={() => setIsTextFormatCollapsed(true)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                title="Küçült"
                            >
                                <FaChevronUp className="text-xs" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}


            <canvas
                ref={canvasRef}
                onPointerDown={(e) => {
                    setShowLineMenu(false);
                    setShowTextMenu(false);
                    setShowShapeMenu(false);
                    setCursorPos({ x: e.clientX, y: e.clientY, visible: true });
                    handlePointerDown(e);
                }}
                onPointerMove={(e) => {
                    setCursorPos({ x: e.clientX, y: e.clientY, visible: true });
                    handlePointerMove(e);
                }}
                onPointerEnter={(e) => setCursorPos({ x: e.clientX, y: e.clientY, visible: true })}
                onPointerUp={(e) => {
                    setCursorPos({ x: e.clientX, y: e.clientY, visible: true });
                    handlePointerUp(e);
                }}
                onPointerLeave={(e) => {
                    setCursorPos(prev => ({ ...prev, visible: false }));
                    handlePointerLeave(e);
                }}
                onPointerCancel={handlePointerUp}
                onDoubleClick={(e) => {
                    const { x: offsetX, y: offsetY } = getMousePos(e);
                    for (let i = elements.length - 1; i >= 0; i--) {
                        const el = elements[i];
                        if ((el.type === 'sticky' || el.type === 'text') && isWithinElement(offsetX, offsetY, el)) {
                            const isPlaceholder = el.type === 'sticky' && (
                                el.text === "Double click to edit..." ||
                                el.text === "Düzenlemek için çift tıklayın..."
                            );
                            const initialText = isPlaceholder ? "" : (el.text || "");
                            setEditingElement({
                                index: i,
                                id: el.id,
                                type: el.type,
                                textMode: el.textMode || (el.isSingleLine ? 'single' : 'multi'),
                                isSingleLine: el.isSingleLine,
                                isMultiLine: el.isMultiLine,
                                text: initialText,
                                x: el.x,
                                y: el.y,
                                width: el.width,
                                height: el.height,
                                color: el.color,
                                fontSize: el.fontSize || (el.size || 5) * 5,
                                fontFamily: el.fontFamily || currentFontFamily || 'TTKBDikTemel',
                                bold: !!el.bold,
                                italic: !!el.italic,
                                underline: !!el.underline,
                                strike: !!el.strike
                            });
                            return;
                        }
                    }
                }}
                className="absolute inset-0 z-0 touch-none select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            />



            {/* Student Management Panel for Teachers */}
            {isHost && (
                <AnimatePresence>
                    {showStudentPanel && (
                        <motion.div
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            className="fixed right-4 top-20 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-border/70">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-foreground font-semibold flex items-center gap-2 text-sm">
                                        <FaUsers className="text-primary text-base" />
                                        <span>Bağlı Öğrenciler</span>
                                    </h3>
                                    <button onClick={() => setShowStudentPanel(false)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1">
                                        <FaTimes className="text-sm" />
                                    </button>
                                </div>
                            </div>

                            {/* Student List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {connectedUsers.filter(u => u.role === 'student').length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8 text-xs font-medium">
                                        Henüz bağlı öğrenci yok
                                    </div>
                                ) : (
                                    connectedUsers
                                        .filter(u => u.role === 'student')
                                        .map(student => {
                                            const hasPermission = allowedStudents.some(s => s._id === student.userId);

                                            return (
                                                <div
                                                    key={student.userId}
                                                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/70 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                                            {student.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-foreground font-medium text-xs truncate">{student.username}</div>
                                                            <div className="text-[10px] text-muted-foreground truncate">
                                                                {hasPermission ? 'Çizim yetkisi var' : 'Sadece görüntüleme'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            if (hasPermission) {
                                                                socket.emit('revoke-participant-permission', { roomId, studentId: student.userId });
                                                                setAllowedStudents(prev => prev.filter(s => s._id !== student.userId));
                                                            } else {
                                                                socket.emit('grant-participant-permission', { roomId, studentId: student.userId });
                                                                setAllowedStudents(prev => [...prev, { _id: student.userId, username: student.username }]);
                                                            }
                                                        }}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${hasPermission
                                                            ? 'bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30'
                                                            : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                                                            }`}
                                                    >
                                                        {hasPermission ? 'Yetkiyi Al' : 'Yetki Ver'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="p-3 border-t border-border/70 flex gap-2">
                                <button
                                    onClick={() => {
                                        const studentIds = connectedUsers.filter(u => u.role === 'student').map(s => s.userId);
                                        studentIds.forEach(id => {
                                            socket.emit('grant-participant-permission', { roomId, studentId: id });
                                        });
                                        const students = connectedUsers.filter(u => u.role === 'student').map(s => ({ _id: s.userId, username: s.username }));
                                        setAllowedStudents(students);
                                    }}
                                    className="flex-1 px-3 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-500/25 transition-all cursor-pointer text-center"
                                >
                                    Tümüne İzin Ver
                                </button>
                                <button
                                    onClick={() => {
                                        const studentIds = connectedUsers.filter(u => u.role === 'student').map(s => s.userId);
                                        studentIds.forEach(id => {
                                            socket.emit('revoke-participant-permission', { roomId, studentId: id });
                                        });
                                        setAllowedStudents([]);
                                    }}
                                    className="flex-1 px-3 py-2 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl text-xs font-semibold hover:bg-destructive/25 transition-all cursor-pointer text-center"
                                >
                                    Tüm İzinleri Kaldır
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Floating Action Toolbar for Multiple Selected Elements */}
            <AnimatePresence>
                {selectedElements.length > 1 && tool === 'select' && (() => {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    selectedElements.forEach(s => {
                        const el = elements.find(e => e.id === s.id);
                        if (el) {
                            const b = getElementBounds(el);
                            if (b) {
                                minX = Math.min(minX, b.x);
                                minY = Math.min(minY, b.y);
                                maxX = Math.max(maxX, b.x + b.width);
                                maxY = Math.max(maxY, b.y + b.height);
                            }
                        }
                    });

                    if (!isFinite(minX) || !isFinite(minY)) return null;

                    const curScale = scale || 1;
                    const curPan = panOffset || { x: 0, y: 0 };
                    const screenX = (minX + curPan.x) * curScale;
                    const screenY = (minY + curPan.y) * curScale;
                    const screenW = (maxX - minX) * curScale;
                    const screenH = (maxY - minY) * curScale;

                    const centerX = Math.max(160, Math.min(window.innerWidth - 160, screenX + screenW / 2));
                    const posY = screenY + screenH + 14;

                    const selectedList = selectedElements.map(s => elements.find(e => e.id === s.id)).filter(Boolean);

                    return (
                        <motion.div
                            key="multi-select-toolbar"
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                left: `${centerX}px`,
                                top: `${posY}px`,
                                transform: 'translate(-50%, 0)'
                            }}
                            className="fixed z-40 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl select-none"
                        >
                            <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                                <span>{selectedElements.length}</span>
                                <span>Nesne Seçildi</span>
                            </div>

                            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                            {/* Toplu Kilit (Batch Lock) */}
                            {(() => {
                                const allLocked = selectedList.length > 0 && selectedList.every(el => el.locked);
                                return (
                                    <button
                                        onClick={() => handleToggleLock(selectedList)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer ${
                                            allLocked 
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30' 
                                                : 'text-slate-200 hover:text-white hover:bg-slate-800'
                                        }`}
                                        title={allLocked ? "Tümünün Kilidini Aç" : "Tümünü Kilitle"}
                                    >
                                        {allLocked ? <FaLock className="text-amber-400 text-xs" /> : <FaLockOpen className="text-slate-400 text-xs" />}
                                        <span>{allLocked ? "Kilitli" : "Kilitle"}</span>
                                    </button>
                                );
                            })()}

                            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                            <button
                                onClick={() => convertDrawingToImage(selectedList)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                title="Seçilenleri tek bir PNG görsele dönüştür"
                            >
                                <FaImage className="text-sm" />
                                <span>Görsele Dönüştür</span>
                            </button>

                            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                            {(() => {
                                const allLocked = selectedList.length > 0 && selectedList.every(el => el.locked);
                                return (
                                    <button
                                        onClick={handleDeleteSelected}
                                        disabled={allLocked}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-xl transition-all ${
                                            allLocked
                                                ? 'opacity-40 cursor-not-allowed text-slate-500'
                                                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95 cursor-pointer'
                                        }`}
                                        title={allLocked ? "Seçilen tüm nesneler kilitli" : "Seçilenleri Sil"}
                                    >
                                        <FaTrash className="text-xs" />
                                        <span className="hidden sm:inline">Sil</span>
                                    </button>
                                );
                            })()}
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Floating Action Toolbar for Selected Element */}
            <AnimatePresence>
                {selectedElement && tool === 'select' && (() => {
                    const selectedEl = elements[selectedElement.index] || elements.find(el => el.id === selectedElement.id);
                    if (!selectedEl) return null;
                    // Metin elementleri kendi birleşik biçimlendirme ve kilit/silme çubuğunu kullanır, üst üste binmeyi önle
                    if (selectedEl.type === 'text') return null;

                    const bounds = getElementBounds(selectedEl);
                    if (!bounds) return null;

                    const curScale = scale || 1;
                    const curPan = panOffset || { x: 0, y: 0 };
                    const screenX = (bounds.x + curPan.x) * curScale;
                    const screenY = (bounds.y + curPan.y) * curScale;
                    const screenW = bounds.width * curScale;
                    const screenH = bounds.height * curScale;

                    const centerX = Math.max(160, Math.min(window.innerWidth - 160, screenX + screenW / 2));
                    const posY = screenY + screenH + 14;

                    const isImage = selectedEl.type === 'image';

                    return (
                        <motion.div
                            key={selectedEl.id || 'selected-el-toolbar'}
                            drag
                            dragMomentum={false}
                            dragElastic={0.05}
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                left: `${centerX}px`,
                                top: `${posY}px`,
                                transform: 'translate(-50%, 0)'
                            }}
                            className="fixed z-40 flex items-center gap-1.5 p-1.5 sm:p-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl select-none"
                        >
                            {/* Sürükleme Tutamacı */}
                            <div className="px-1 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing flex items-center" title="Sürükleyerek Taşı">
                                <BsGripVertical className="text-sm sm:text-base" />
                            </div>
                            {/* Kilit (Lock) Toggle Button */}
                            <button
                                onClick={() => handleToggleLock(selectedEl)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer ${
                                    selectedEl.locked
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                                        : 'text-slate-200 hover:text-white hover:bg-slate-800'
                                }`}
                                title={selectedEl.locked ? "Kilidi Aç (Taşıma, silme ve boyutlandırmaya izin ver)" : "Kilitle (Silme, taşıma ve ölçeklendirmeyi engelle)"}
                            >
                                {selectedEl.locked ? <FaLock className="text-amber-400 text-xs" /> : <FaLockOpen className="text-slate-400 text-xs" />}
                                <span>{selectedEl.locked ? "Kilitli" : "Kilitle"}</span>
                            </button>

                            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                            {isImage ? (
                                <>
                                    {/* Kırp (Crop) */}
                                    <button
                                        onClick={() => !selectedEl.locked && setCropModalElement(selectedEl)}
                                        disabled={selectedEl.locked}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                                            selectedEl.locked
                                                ? 'opacity-40 cursor-not-allowed text-slate-500'
                                                : 'text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95 cursor-pointer'
                                        }`}
                                        title={selectedEl.locked ? "Nesne kilitli (kırpılamaz)" : "Görseli Kırp"}
                                    >
                                        <FaCropAlt className={selectedEl.locked ? "text-slate-500" : "text-blue-400"} />
                                        <span>Kırp</span>
                                    </button>

                                    <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                                    {/* Döndür (Rotate) Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => !selectedEl.locked && setShowRotateMenu(prev => !prev)}
                                            disabled={selectedEl.locked}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                                                selectedEl.locked
                                                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                                                    : (showRotateMenu ? 'bg-blue-600/20 text-blue-400 cursor-pointer' : 'text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer')
                                            }`}
                                            title={selectedEl.locked ? "Nesne kilitli (döndürülemez)" : "Döndür"}
                                        >
                                            <FaSyncAlt className={selectedEl.locked ? "text-slate-500" : "text-blue-400"} />
                                            <span>Döndür</span>
                                        </button>

                                        <AnimatePresence>
                                            {showRotateMenu && !selectedEl.locked && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 6 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 6 }}
                                                    className="absolute left-0 mt-2 w-48 rounded-xl bg-slate-900/95 border border-slate-700 backdrop-blur-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1"
                                                >
                                                    <button
                                                        onClick={() => { handleRotateImage(90); setShowRotateMenu(false); }}
                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors text-left"
                                                    >
                                                        <FaRedo className="text-blue-400 text-xs" />
                                                        <span>Sağa Döndür (90°)</span>
                                                    </button>
                                                    <button
                                                        onClick={() => { handleRotateImage(-90); setShowRotateMenu(false); }}
                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors text-left"
                                                    >
                                                        <FaUndo className="text-blue-400 text-xs" />
                                                        <span>Sola Döndür (-90°)</span>
                                                    </button>
                                                    <button
                                                        onClick={() => { handleRotateImage(180); setShowRotateMenu(false); }}
                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors text-left"
                                                    >
                                                        <FaSyncAlt className="text-blue-400 text-xs" />
                                                        <span>Ters Döndür (180°)</span>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                                    {/* Yapay Zeka (AI) Button */}
                                    <button
                                        onClick={() => {
                                            setAiToastMessage('✨ Yapay Zeka araçları çok yakında! (Görsel analiz, arka plan silme ve akıllı filtreler)');
                                            setTimeout(() => setAiToastMessage(null), 3500);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                        title="Yapay Zeka (Çok Yakında)"
                                    >
                                        <BsStars className="text-amber-300 text-sm" />
                                        <span>Yapay Zeka</span>
                                    </button>

                                    <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                                    {/* Sil (Delete) */}
                                    <button
                                        onClick={handleDeleteSelected}
                                        disabled={selectedEl.locked}
                                        className={`p-2 text-xs sm:text-sm rounded-xl transition-all ${
                                            selectedEl.locked
                                                ? 'opacity-40 cursor-not-allowed text-slate-500'
                                                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95 cursor-pointer'
                                        }`}
                                        title={selectedEl.locked ? "Nesne kilitli (silinemez)" : "Görseli Sil"}
                                    >
                                        <FaTrash />
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Görsele Dönüştür (Convert to Image / PNG) */}
                                    <button
                                        onClick={() => convertDrawingToImage(selectedEl)}
                                        className="flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                        title="Çizimi PNG görsele dönüştür"
                                    >
                                        <FaImage className="text-sm" />
                                        <span>Görsele Dönüştür</span>
                                    </button>

                                    <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                                    {/* Sil (Delete) */}
                                    <button
                                        onClick={handleDeleteSelected}
                                        disabled={selectedEl.locked}
                                        className={`p-2 text-xs sm:text-sm rounded-xl transition-all ${
                                            selectedEl.locked
                                                ? 'opacity-40 cursor-not-allowed text-slate-500'
                                                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95 cursor-pointer'
                                        }`}
                                        title={selectedEl.locked ? "Nesne kilitli (silinemez)" : "Çizimi Sil"}
                                    >
                                        <FaTrash />
                                    </button>
                                </>
                            )}
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* AI Notification Toast */}
            <AnimatePresence>
                {aiToastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl bg-slate-900/95 border border-purple-500/40 backdrop-blur-xl shadow-2xl text-white text-xs sm:text-sm font-medium flex items-center gap-2.5"
                    >
                        <BsStars className="text-amber-300 text-base" />
                        <span>{aiToastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Image Crop Modal */}
            <ImageCropModal
                isOpen={!!cropModalElement}
                imageElement={cropModalElement}
                onClose={() => setCropModalElement(null)}
                onApplyCrop={handleApplyCrop}
            />

            {/* Main Toolbar - Hidden for Students unless editing is enabled */}
            {(isHost || user?.role === 'teacher' || (!isHost && hasEditPermission)) && (
                <motion.div 
                    drag={typeof window !== 'undefined' && window.innerWidth >= 768}
                    dragMomentum={false}
                    dragElastic={0.05}
                    className="fixed left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 sm:gap-2.5 select-none"
                    style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 14px)' }}
                >
                    {/* Tool Popover Menüleri - Toolbar'ın ÜSTÜNDE (overflow-x-auto tarafından kesilmez!) */}
                    <AnimatePresence>
                        {showLineMenu && !isDockCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="w-64 bg-[#0f172a]/95 border border-white/15 rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-2xl backdrop-blur-xl z-50 mb-1"
                            >
                                <div className="text-[11px] font-semibold text-slate-300 px-2 py-1 border-b border-white/10 flex items-center justify-between">
                                    <span>Çizgi & Ok Stili (Doodle)</span>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowLineMenu(false); }}
                                        className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
                                    >
                                        ✕
                                    </button>
                                </div>
                                {[
                                    { id: 'plain', label: 'Düz Çizgi', desc: 'Doodle düz çizgi', icon: <FaMinus className="text-base" /> },
                                    { id: 'arrow', label: 'Tek Uçlu Ok', desc: 'Ucu ok olan doodle çizgi', icon: <FaLongArrowAltRight className="text-base" /> },
                                    { id: 'double-arrow', label: 'İki Uçlu Ok', desc: 'İki ucu ok olan doodle çizgi', icon: <FaArrowsAltH className="text-base" /> },
                                    {
                                        id: 'dashed',
                                        label: 'Kesikli Çizgi',
                                        desc: 'Kesik kesik doodle çizgi',
                                        icon: (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3">
                                                <line x1="2" y1="12" x2="22" y2="12" />
                                            </svg>
                                        )
                                    },
                                    {
                                        id: 'dashed-arrow',
                                        label: 'Kesikli Ok',
                                        desc: 'Kesik çizgi ve ucu ok',
                                        icon: (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="2" y1="12" x2="18" y2="12" strokeDasharray="3 3" />
                                                <polyline points="14,8 19,12 14,16" />
                                            </svg>
                                        )
                                    }
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            setLineStyle(item.id);
                                            setTool('line');
                                            setShowLineMenu(false);
                                        }}
                                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                            lineStyle === item.id
                                                ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/50'
                                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-slate-300">
                                            {item.icon}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold leading-tight">{item.label}</span>
                                            <span className="text-[10px] text-slate-400 leading-tight">{item.desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        {showTextMenu && !isDockCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="w-72 bg-[#0f172a]/95 border border-white/15 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xl backdrop-blur-xl z-50 mb-1"
                            >
                                <div className="text-[11px] font-semibold text-slate-300 px-1 pb-1.5 border-b border-white/10 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <FaFont className="text-indigo-400 text-xs" />
                                        <span>Yazı ve Font Ayarları</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowTextMenu(false); }}
                                        className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Metin Modu Seçimi (Tek Satır vs Çoklu Satır Kutu) */}
                                <div className="flex flex-col gap-1 pb-1 border-b border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-medium">Metin Modu</span>
                                        <span className="text-[9px] text-indigo-400/90 font-medium">
                                            {textMode === 'single' ? 'Tek Satır (Taşma Yok)' : 'Kutu İşaretle & Yaz'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 bg-[#1e293b] p-0.5 rounded-xl border border-white/10 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setTextMode('single')}
                                            className={`py-1 px-2 rounded-lg font-medium transition-all text-center cursor-pointer ${
                                                textMode === 'single'
                                                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            Tek Satır
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTextMode('multi')}
                                            className={`py-1 px-2 rounded-lg font-medium transition-all text-center cursor-pointer ${
                                                textMode === 'multi'
                                                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            Çoklu Satır (Kutu)
                                        </button>
                                    </div>
                                </div>

                                {/* Font Family Seçimi */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400 font-medium">Yazı Tipi (Font)</span>
                                    <select
                                        value={currentFontFamily}
                                        onChange={(e) => handleUpdateTextFormat({ fontFamily: e.target.value })}
                                        className="bg-[#1e293b] text-white text-xs rounded-xl px-2.5 py-1.5 border border-white/15 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="TTKBDikTemel-Normal">MEB Dik Temel (Normal / Oksuz)</option>
                                        <option value="TTKBDikTemel-Kilavuzlu">MEB Dik Temel (Kılavuzlu / Çizgili)</option>
                                        <option value="sans-serif">Düz Yazı (Modern Sans)</option>
                                        <option value="Caveat, cursive">El Yazısı (Caveat)</option>
                                        <option value="serif">Kitap Yazısı (Serif)</option>
                                        <option value="monospace">Daktilo (Monospace)</option>
                                    </select>
                                </div>

                                {/* Boyut ve Biçimler */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                                    {/* Boyut Stepper */}
                                    <div className="flex items-center bg-[#1e293b] rounded-xl p-0.5 border border-white/15">
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateTextFormat({ fontSize: Math.max(12, currentFontSize - 2) })}
                                            className="w-7 h-7 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer active:scale-95"
                                            title="Yazıyı Küçült"
                                        >
                                            -
                                        </button>
                                        <span className="text-xs font-mono font-bold px-2 text-indigo-300 min-w-[36px] text-center">
                                            {currentFontSize}px
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateTextFormat({ fontSize: Math.min(96, currentFontSize + 2) })}
                                            className="w-7 h-7 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer active:scale-95"
                                            title="Yazıyı Büyüt"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Bold, Italic, Underline */}
                                    <div className="flex items-center gap-1 bg-[#1e293b] rounded-xl p-0.5 border border-white/15">
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateTextFormat({ bold: !isTextBold })}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                isTextBold ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                            title="Kalın (Bold)"
                                        >
                                            <FaBold className="text-xs" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateTextFormat({ italic: !isTextItalic })}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                isTextItalic ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                            title="Eğik (Italic)"
                                        >
                                            <FaItalic className="text-xs" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateTextFormat({ underline: !isTextUnderline })}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                isTextUnderline ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                            title="Altı Çizili (Underline)"
                                        >
                                            <FaUnderline className="text-xs" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {showShapeMenu && !isDockCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="w-64 bg-[#0f172a]/95 border border-white/15 rounded-2xl p-2.5 grid grid-cols-4 gap-1.5 shadow-2xl backdrop-blur-xl z-50 mb-1"
                            >
                                <div className="col-span-4 text-[11px] font-semibold text-slate-300 px-1 pb-1 border-b border-white/10 flex items-center justify-between">
                                    <span>Geometrik Şekiller</span>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowShapeMenu(false); }}
                                        className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
                                    >
                                        ✕
                                    </button>
                                </div>
                                {[
                                    { id: 'rect', icon: BsSquare, label: t('whiteboard.tools.rect'), shortcut: 'R' },
                                    { id: 'circle', icon: BsCircle, label: t('whiteboard.tools.circle'), shortcut: 'C' },
                                    { id: 'triangle', icon: BsTriangle, label: t('whiteboard.tools.triangle'), shortcut: '' },
                                    { id: 'star', icon: BsStar, label: t('whiteboard.tools.star'), shortcut: '' },
                                    { id: 'pentagon', icon: BsPentagon, label: t('whiteboard.tools.pentagon'), shortcut: '' },
                                    { id: 'hexagon', icon: BsHexagon, label: t('whiteboard.tools.hexagon'), shortcut: '' },
                                    { id: 'octagon', icon: BsOctagon, label: t('whiteboard.tools.octagon'), shortcut: '' },
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => { setTool(s.id); setShowShapeMenu(false); }}
                                        aria-label={`${s.label} ${s.shortcut ? `(Shortcut: ${s.shortcut})` : ''}`}
                                        aria-pressed={tool === s.id}
                                        className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                            tool === s.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                        title={s.label}
                                    >
                                        <s.icon className="text-lg" />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isDockCollapsed ? (
                        /* Küçültülmüş Yüzen Araç Rozeti (Dokunmatik ve Sürüklenebilir) */
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            onClick={() => setIsDockCollapsed(false)}
                            className="flex items-center gap-2.5 px-4 py-2 bg-[#020617]/95 border-2 border-indigo-500/50 rounded-2xl shadow-2xl backdrop-blur-xl text-white cursor-pointer active:scale-95 transition-all"
                            title="Araç Çubuğunu Genişlet"
                        >
                            <BsGripVertical className="text-slate-400 text-sm cursor-grab active:cursor-grabbing" />
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md text-sm font-bold">
                                {tool === 'pen' && <FaPen />}
                                {tool === 'highlighter' && <FaHighlighter />}
                                {tool === 'eraser' && <FaEraser />}
                                {tool === 'line' && <FaSlash className="transform -rotate-45" />}
                                {tool === 'select' && <FaMousePointer />}
                                {tool === 'pan' && <FaHandPaper />}
                                {tool === 'shape' && <BsSquare />}
                                {tool === 'text' && <FaFont />}
                            </div>
                            <div className="flex flex-col text-left font-sans">
                                <span className="text-xs font-bold text-white capitalize">{tool}</span>
                                <span className="text-[10px] text-indigo-300">Araçları Aç ▾</span>
                            </div>
                            <div 
                                className="w-5 h-5 rounded-full border border-white/40 shadow-xs"
                                style={{ backgroundColor: color }}
                            />
                        </motion.div>
                    ) : (
                        /* Birleşik Tek Sıra Ana Araç Çubuğu */
                        <div 
                            className="flex items-center gap-1 sm:gap-1.5 bg-card/95 border border-border text-card-foreground rounded-2xl p-1.5 sm:p-2 shadow-2xl backdrop-blur-xl ring-1 ring-border/50 max-w-[calc(100vw-1rem)] sm:max-w-[95vw] overflow-x-auto scrollbar-none touch-pan-x"
                            role="toolbar"
                            aria-label="Whiteboard Tools"
                        >
                            {/* 1. Sürükleme Tutamacı (Masaüstü) */}
                            <div className="hidden md:flex px-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing items-center" title="Sürükleyerek Taşı">
                                <BsGripVertical className="text-sm" />
                            </div>

                            {/* 2. Geri Al / İleri Al (Öğretmen / Host) */}
                            {(isHost || user?.role === 'teacher') && (
                                <>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <div className="relative group flex items-center justify-center">
                                            <button 
                                                onClick={handleUndo} 
                                                aria-label={`${t('whiteboard.controls.undo')} (Shortcut: Ctrl+Z)`} 
                                                aria-keyshortcuts="Control+Z" 
                                                className="p-1.5 sm:p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shrink-0" 
                                                title={t('whiteboard.controls.undo')}
                                            >
                                                <FaUndo className="text-xs sm:text-base" />
                                            </button>
                                            <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                                {t('whiteboard.controls.undo')} <span className="text-gray-400 border border-gray-600 rounded px-1 ml-1">Ctrl+Z</span>
                                            </div>
                                        </div>
                                        <div className="relative group flex items-center justify-center">
                                            <button 
                                                onClick={handleRedo} 
                                                aria-label={`${t('whiteboard.controls.redo')} (Shortcut: Ctrl+Y)`} 
                                                aria-keyshortcuts="Control+Y" 
                                                className="p-1.5 sm:p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shrink-0" 
                                                title={t('whiteboard.controls.redo')}
                                            >
                                                <FaRedo className="text-xs sm:text-base" />
                                            </button>
                                            <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                                {t('whiteboard.controls.redo')} <span className="text-gray-400 border border-gray-600 rounded px-1 ml-1">Ctrl+Y</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-px h-5 bg-border mx-0.5 shrink-0"></div>
                                </>
                            )}

                            {/* 3. Çizim & Seçim Araçları */}
                            <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/60 rounded-xl p-0.5 sm:p-1 border border-border/60 shrink-0">
                                {[
                                    { id: 'select', icon: FaMousePointer, label: t('whiteboard.tools.select'), shortcut: 'V' },
                                    { id: 'pan', icon: FaHandPaper, label: t('whiteboard.tools.hand'), shortcut: 'H' },
                                    { id: 'pen', icon: FaPen, label: t('whiteboard.tools.pen'), shortcut: 'P' },
                                    { id: 'highlighter', icon: FaHighlighter, label: t('whiteboard.tools.highlighter'), shortcut: '' },
                                    { id: 'eraser', icon: FaEraser, label: t('whiteboard.tools.eraser'), shortcut: 'E' }
                                ].map((t) => (
                                    <div key={t.id} className="relative group flex items-center justify-center">
                                        <button
                                            onClick={() => {
                                                setTool(t.id);
                                                setShowLineMenu(false);
                                                setShowTextMenu(false);
                                                setShowShapeMenu(false);
                                            }}
                                            aria-label={`${t.label} ${t.shortcut ? `(Shortcut: ${t.shortcut})` : ''}`}
                                            aria-pressed={tool === t.id}
                                            aria-keyshortcuts={t.shortcut || undefined}
                                            className={`p-1.5 sm:p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shrink-0 ${tool === t.id
                                                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}
                                        >
                                            <t.icon className="text-xs sm:text-base" />
                                        </button>
                                        {t.shortcut && (
                                            <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                                {t.label} <span className="text-gray-400 border border-gray-600 rounded px-1 ml-1">{t.shortcut}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Line Tool with Long-Press & Style Menu */}
                                <div className="relative group flex items-center justify-center">
                                    <button
                                        onClick={() => {
                                            if (tool === 'line') {
                                                setShowLineMenu(prev => !prev);
                                                setShowTextMenu(false);
                                                setShowShapeMenu(false);
                                            } else {
                                                setTool('line');
                                            }
                                        }}
                                        onMouseDown={() => {
                                            if (linePressTimerRef.current) clearTimeout(linePressTimerRef.current);
                                            linePressTimerRef.current = setTimeout(() => {
                                                setShowLineMenu(true);
                                                setShowTextMenu(false);
                                                setShowShapeMenu(false);
                                            }, 300);
                                        }}
                                        onMouseUp={() => {
                                            if (linePressTimerRef.current) {
                                                clearTimeout(linePressTimerRef.current);
                                                linePressTimerRef.current = null;
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (linePressTimerRef.current) {
                                                clearTimeout(linePressTimerRef.current);
                                                linePressTimerRef.current = null;
                                            }
                                        }}
                                        onTouchStart={() => {
                                            if (linePressTimerRef.current) clearTimeout(linePressTimerRef.current);
                                            linePressTimerRef.current = setTimeout(() => {
                                                setShowLineMenu(true);
                                                setShowTextMenu(false);
                                                setShowShapeMenu(false);
                                            }, 300);
                                        }}
                                        onTouchEnd={() => {
                                            if (linePressTimerRef.current) {
                                                clearTimeout(linePressTimerRef.current);
                                                linePressTimerRef.current = null;
                                            }
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setShowLineMenu(true);
                                            setShowTextMenu(false);
                                            setShowShapeMenu(false);
                                        }}
                                        aria-label="Line Tool (L)"
                                        aria-pressed={tool === 'line'}
                                        aria-haspopup="true"
                                        aria-expanded={showLineMenu}
                                        className={`relative p-2 sm:p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${tool === 'line'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                        title="Düz Çizgi ve Oklar - Menü için Basılı Tutun (L)"
                                    >
                                        {lineStyle === 'plain' && <FaSlash className="text-sm sm:text-base transform -rotate-45" />}
                                        {lineStyle === 'arrow' && <FaLongArrowAltRight className="text-sm sm:text-base transform -rotate-45" />}
                                        {lineStyle === 'double-arrow' && <FaArrowsAltH className="text-sm sm:text-base transform -rotate-45" />}
                                        {lineStyle === 'dashed' && (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 transform -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3">
                                                <line x1="2" y1="12" x2="22" y2="12" />
                                            </svg>
                                        )}
                                        {lineStyle === 'dashed-arrow' && (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 transform -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="2" y1="12" x2="18" y2="12" strokeDasharray="3 3" />
                                                <polyline points="14,8 19,12 14,16" />
                                            </svg>
                                        )}
                                        <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-current opacity-70" />
                                    </button>
                                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        {t('whiteboard.tools.line')} <span className="text-gray-400 border border-gray-600 rounded px-1 ml-1">L</span>
                                    </div>
                                </div>

                                {/* Text Tool with Long-Press & Font Menu */}
                                <div className="relative group flex items-center justify-center">
                                    <button
                                        onClick={() => {
                                            if (tool === 'text') {
                                                setShowTextMenu(prev => !prev);
                                                setShowLineMenu(false);
                                                setShowShapeMenu(false);
                                            } else {
                                                setTool('text');
                                            }
                                        }}
                                        onMouseDown={() => {
                                            if (textPressTimerRef.current) clearTimeout(textPressTimerRef.current);
                                            textPressTimerRef.current = setTimeout(() => {
                                                setShowTextMenu(true);
                                                setShowLineMenu(false);
                                                setShowShapeMenu(false);
                                            }, 300);
                                        }}
                                        onMouseUp={() => {
                                            if (textPressTimerRef.current) {
                                                clearTimeout(textPressTimerRef.current);
                                                textPressTimerRef.current = null;
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (textPressTimerRef.current) {
                                                clearTimeout(textPressTimerRef.current);
                                                textPressTimerRef.current = null;
                                            }
                                        }}
                                        onTouchStart={() => {
                                            if (textPressTimerRef.current) clearTimeout(textPressTimerRef.current);
                                            textPressTimerRef.current = setTimeout(() => {
                                                setShowTextMenu(true);
                                                setShowLineMenu(false);
                                                setShowShapeMenu(false);
                                            }, 300);
                                        }}
                                        onTouchEnd={() => {
                                            if (textPressTimerRef.current) {
                                                clearTimeout(textPressTimerRef.current);
                                                textPressTimerRef.current = null;
                                            }
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setShowTextMenu(true);
                                            setShowLineMenu(false);
                                            setShowShapeMenu(false);
                                        }}
                                        aria-label={`${t('whiteboard.tools.text')} (Shortcut: T)`}
                                        aria-pressed={tool === 'text'}
                                        aria-haspopup="true"
                                        aria-expanded={showTextMenu}
                                        aria-keyshortcuts="T"
                                        className={`relative p-2 sm:p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${tool === 'text'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                        title="Metin / Yazı - Font Seçenekleri için Basılı Tutun (T)"
                                    >
                                        <FaFont className="text-sm sm:text-base" />
                                        <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-current opacity-70" />
                                    </button>
                                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        {t('whiteboard.tools.text')} <span className="text-gray-400 border border-gray-600 rounded px-1 ml-1">T</span>
                                    </div>
                                </div>

                                {/* Shapes Menu */}
                                <div className="relative group flex items-center justify-center">
                                    <button
                                        onClick={() => {
                                            setShowShapeMenu(prev => !prev);
                                            setShowLineMenu(false);
                                            setShowTextMenu(false);
                                        }}
                                        aria-label="Shapes Menu"
                                        aria-expanded={showShapeMenu}
                                        aria-haspopup="true"
                                        className={`p-2 sm:p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${(tool === 'rect' || tool === 'circle' || tool === 'triangle' || tool === 'pentagon' || tool === 'hexagon' || tool === 'octagon' || tool === 'star')
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                        title={t('whiteboard.tools.shapes')}
                                    >
                                        <FaDrawPolygon className="text-sm sm:text-base" />
                                    </button>
                                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        {t('whiteboard.tools.shapes')}
                                    </div>
                                </div>
                            </div>

                            {/* 4. Hızlı Ekleme (Bloknot & Görsel) */}
                            <div className="flex items-center gap-0.5 sm:gap-1">
                                <div className="relative group flex items-center justify-center">
                                    <button 
                                        onClick={addStickyNote} 
                                        aria-label="Add Sticky Note"
                                        className="p-2 sm:p-2.5 rounded-lg text-amber-300 hover:bg-amber-400/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        title={t('whiteboard.tools.sticky') || "Bloknot / Yapışkan Not"}
                                    >
                                        <FaStickyNote className="text-sm sm:text-base" />
                                    </button>
                                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        {t('whiteboard.tools.sticky') || "Bloknot"}
                                    </div>
                                </div>
                                <div className="relative group flex items-center justify-center">
                                    <button 
                                        onClick={() => fileInputRef.current.click()} 
                                        aria-label="Upload Image"
                                        className="p-2 sm:p-2.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                        title="Görsel Yükle"
                                    >
                                        <FaImage className="text-sm sm:text-base" />
                                    </button>
                                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        Görsel Yükle
                                    </div>
                                </div>

                                {/* Emoji & İşaret Kütüphanesi */}
                                <div className="relative group flex items-center justify-center">
                                    <button 
                                        onClick={() => setShowEmojiModal(true)} 
                                        aria-label="Emoji & İşaret Kütüphanesi"
                                        className="p-2 sm:p-2.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                        title="Emoji & İşaret Kütüphanesi (Tabela, Oklar, Eğitim Çıkartmaları)"
                                    >
                                        <Smile className="text-sm sm:text-base text-amber-400" />
                                    </button>
                                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        Emoji Kütüphanesi
                                    </div>
                                </div>

                                {/* Quick Convert Drawing to Image */}
                                {selectedElements.length > 0 && (() => {
                                    const nonImages = selectedElements
                                        .map(s => elements.find(e => e.id === s.id))
                                        .filter(el => el && el.type !== 'image');
                                    if (nonImages.length === 0) return null;
                                    return (
                                        <div className="relative group flex items-center justify-center">
                                            <button
                                                onClick={() => convertDrawingToImage(nonImages)}
                                                aria-label="Görsele Dönüştür"
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                                title="Seçili çizimleri PNG görsele dönüştür"
                                            >
                                                <FaImage className="text-sm" />
                                                <span className="hidden sm:inline">
                                                    {nonImages.length > 1 ? `Görsele Dönüştür (${nonImages.length})` : 'Görsele Dönüştür'}
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Ayrıcı Çizgi */}
                            <div className="w-px h-5 bg-white/10 mx-0.5 sm:mx-1"></div>

                            {/* 5. Renk ve Yenilenen Fırça Boyutu Kontrolü */}
                            <div className="flex items-center gap-1.5 sm:gap-2 px-0.5 sm:px-1">
                                {/* Özel & Modern Renk Seçici Butonu */}
                                <div className="relative group flex items-center justify-center shrink-0">
                                    <label
                                        className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-border/80 shadow-md group-hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer overflow-hidden m-0 p-0"
                                        style={{ backgroundColor: color }}
                                        title={`Çizim Rengi: ${color} (Renk seçmek için tıklayın)`}
                                    >
                                        <input
                                            ref={colorInputRef}
                                            type="color"
                                            value={color && color.startsWith('#') && (color.length === 7 || color.length === 4) ? color : '#ffffff'}
                                            onChange={(e) => handleColorChange(e.target.value)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0 m-0 border-0 z-10"
                                            title="Renk Seçme Ekranını Aç"
                                        />
                                        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/25 pointer-events-none" />
                                    </label>
                                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        Renk Seç
                                    </div>
                                </div>

                                {/* Yenilenen Fırça Boyutu: Canlı Dinamik Büyüyen/Küçülen Önizleme Noktası */}
                                <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 bg-muted/40 rounded-xl border border-border/60 hover:border-border transition-all shrink-0">
                                    {/* Slider'a göre dinamik büyüyüp küçülen nokta */}
                                    <div 
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-card/80 border border-border flex items-center justify-center shrink-0 shadow-inner overflow-hidden"
                                        title={`${t('whiteboard.brushSize') || 'Fırça Kalınlığı'}: ${Math.round(brushSize || 5)}px`}
                                    >
                                        <span 
                                            className="rounded-full transition-all duration-75 shadow-xs"
                                            style={{
                                                width: `${Math.round(3 + ((Math.min(50, Math.max(1, Math.round(brushSize || 5))) - 1) / 49) * 23)}px`,
                                                height: `${Math.round(3 + ((Math.min(50, Math.max(1, Math.round(brushSize || 5))) - 1) / 49) * 23)}px`,
                                                backgroundColor: color,
                                                boxShadow: color.toLowerCase() === '#ffffff' ? '0 0 2px rgba(0,0,0,0.5)' : undefined
                                            }}
                                        />
                                    </div>

                                    {/* Slider ve Piksel Badge */}
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            step="1"
                                            value={Math.round(brushSize || 5)}
                                            onChange={(e) => {
                                                const val = Math.max(1, Math.min(50, Math.round(parseInt(e.target.value, 10) || 5)));
                                                setBrushSize(val);
                                                if (selectedElements.length > 0) {
                                                    selectedElements.forEach(s => {
                                                        const index = elements.findIndex(el => el.id === s.id);
                                                        if (index !== -1) {
                                                            const el = elements[index];
                                                            if (el.type === 'text') {
                                                                const ctx = canvasRef.current.getContext('2d');
                                                                const fontSize = val * 5;
                                                                ctx.font = `${fontSize}px sans-serif`;
                                                                const lineHeight = fontSize * 1.2;
                                                                const newHeight = wrapText(ctx, el.text, 0, 0, el.width, lineHeight);
                                                                updateElement(index, { size: val, height: Math.max(newHeight, fontSize) });
                                                            } else {
                                                                updateElement(index, { size: val });
                                                            }
                                                        }
                                                    });
                                                } else if (editingElement) {
                                                    setEditingElement(prev => ({ ...prev, color: prev.color }));
                                                    const index = editingElement.index;
                                                    const el = elements[index];
                                                    if (el.type === 'text') {
                                                        const ctx = canvasRef.current.getContext('2d');
                                                        const fontSize = val * 5;
                                                        ctx.font = `${fontSize}px sans-serif`;
                                                        const lineHeight = fontSize * 1.2;
                                                        const newHeight = wrapText(ctx, el.text, 0, 0, el.width, lineHeight);
                                                        updateElement(index, { size: val, height: Math.max(newHeight, fontSize) });
                                                    } else {
                                                        updateElement(index, { size: val });
                                                    }
                                                }
                                            }}
                                            className="w-14 sm:w-20 h-1.5 bg-muted-foreground/20 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80"
                                            title={`${t('whiteboard.brushSize') || 'Kalınlık'}: ${Math.round(brushSize || 5)}px`}
                                        />
                                        <span className="text-[10px] sm:text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md min-w-[32px] text-center shrink-0">
                                            {Math.round(brushSize || 5)}px
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Ayrıcı Çizgi */}
                            <div className="w-px h-5 bg-border mx-0.5 sm:mx-1 shrink-0"></div>

                            {/* 6. Genel Eylemler & Araçlar */}
                            <div className="flex items-center gap-0.5 shrink-0">
                                {isHost && (
                                    <button 
                                        onClick={handleClear} 
                                        className="p-1.5 sm:p-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer shrink-0" 
                                        title={t('whiteboard.controls.clear')}
                                    >
                                        <FaTrash className="text-xs sm:text-base" />
                                    </button>
                                )}

                                <div className="hidden sm:flex relative group items-center justify-center">
                                    <button 
                                        onClick={() => setShowShortcutsHelp(true)} 
                                        aria-label="Klavye Kısayolları Yardımı" 
                                        aria-keyshortcuts="?" 
                                        className="p-2 sm:p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shrink-0" 
                                        title="Klavye Kısayolları"
                                    >
                                        <span className="text-sm sm:text-base font-bold">?</span>
                                    </button>
                                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                        Kısayollar <span className="text-gray-400 border border-gray-600 rounded px-1 ml-1">?</span>
                                    </div>
                                </div>

                                {/* Simge Durumuna Küçült Butonu */}
                                <button
                                    onClick={() => setIsDockCollapsed(true)}
                                    className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
                                    title="Araç Çubuğunu Simge Durumuna Küçült"
                                >
                                    <FaChevronDown className="text-xs" />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Klavye Kısayolları Yardım Paneli */}
            <AnimatePresence>
                {showShortcutsHelp && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`absolute bottom-24 right-4 sm:right-8 w-80 p-5 rounded-2xl shadow-2xl border backdrop-blur-xl z-[100] ${darkMode ? 'bg-slate-900/90 border-slate-700 text-slate-200' : 'bg-white/90 border-gray-200 text-gray-800'}`}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                ⌨️ Klavye Kısayolları
                            </h3>
                            <button onClick={() => setShowShortcutsHelp(false)} className="text-gray-400 hover:text-white transition-colors cursor-pointer" title="Kapat">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2 border-b border-white/10 pb-2">
                                <span className="opacity-70">Kalem Aracı</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">P / 1</kbd>
                                <span className="opacity-70">Silgi Aracı</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">E / 2</kbd>
                                <span className="opacity-70">Çizgi Aracı</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">L / 3</kbd>
                                <span className="opacity-70">Dikdörtgen</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">R / 4</kbd>
                                <span className="opacity-70">Daire</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">C / 5</kbd>
                                <span className="opacity-70">Metin Aracı</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">T / 6</kbd>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <span className="opacity-70">Geri Al</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">Ctrl+Z</kbd>
                                <span className="opacity-70">Yinele</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">Ctrl+Y</kbd>
                                <span className="opacity-70">Seçileni Sil</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">Del/Bksp</kbd>
                                <span className="opacity-70">İptal / Seçimi Kaldır</span><kbd className="justify-self-end bg-black/30 px-2 py-1 rounded text-xs border border-white/20">Esc</kbd>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Leave Room Confirmation Modal */}
            <AnimatePresence>
                {showLeaveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLeaveModal(false)}
                            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                        />

                        {/* Modal Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 16 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            className="relative w-full max-w-sm sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-6 text-center text-foreground z-10 overflow-hidden"
                        >
                            {/* Subtle Ambient Glow */}
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-destructive/15 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Animated Glowing Icon Badge */}
                            <motion.div
                                initial={{ scale: 0, rotate: -15 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", damping: 12, stiffness: 220, delay: 0.05 }}
                                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive text-2xl shadow-lg shadow-destructive/10"
                            >
                                <FaSignOutAlt className="text-2xl" />
                            </motion.div>

                            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
                                {t('whiteboard.confirmLeaveTitle', 'Dersten Ayrıl')}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                                {t('whiteboard.confirmLeave', 'Dersten çıkıp kontrol paneline dönmek istediğinize emin misiniz? Tahtadaki tüm çizim ve notlarınız kaydedildi.')}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowLeaveModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-border/70 text-foreground font-medium text-xs sm:text-sm hover:bg-muted/70 transition-all cursor-pointer active:scale-95"
                                >
                                    {t('common.cancel', 'Vazgeç')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLeaveModal(false);
                                        navigate('/dashboard');
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-semibold text-xs sm:text-sm shadow-md shadow-destructive/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                                >
                                    <FaSignOutAlt className="text-xs" />
                                    <span>{t('whiteboard.leaveRoom', 'Dersten Çık')}</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Room QR Code Modal */}
            <RoomQRModal 
                isOpen={showQRModal} 
                onClose={() => setShowQRModal(false)} 
                roomId={roomId} 
            />

            {/* Katmanlar (Layers) Panel Drawer */}
            <LayersPanel
                isOpen={showLayersPanel}
                onClose={() => setShowLayersPanel(false)}
                elements={elements}
                selectedElements={selectedElements}
                onSelectElement={(id) => {
                    if (!id) {
                        setSelectedElements([]);
                    } else {
                        const el = elements.find(e => e.id === id);
                        if (el) {
                            setSelectedElements([createSelectionItem(el, -1, elements)]);
                        }
                    }
                }}
                onSelectMultiple={(id) => {
                    const el = elements.find(e => e.id === id);
                    if (!el) return;
                    const isAlreadySelected = selectedElements.some(s => s.id === id);
                    if (isAlreadySelected) {
                        setSelectedElements(prev => prev.filter(s => s.id !== id));
                    } else {
                        setSelectedElements(prev => [...prev, createSelectionItem(el, -1, elements)]);
                    }
                }}
                onReorderElements={handleReorderLayers}
                onToggleLock={handleToggleLock}
                onToggleVisibility={handleToggleVisibility}
                onDeleteElements={(ids) => {
                    const idSet = new Set(ids);
                    const unlockable = elements.filter(el => idSet.has(el.id) && !el.locked);
                    if (unlockable.length === 0) return;
                    const delIds = new Set(unlockable.map(el => el.id));
                    setElements(prev => prev.filter(el => !delIds.has(el.id)));
                    setSelectedElements(prev => prev.filter(s => !delIds.has(s.id)));
                    if (socket) {
                        unlockable.forEach(el => socket.emit('delete-element', { roomId, elementId: el.id }));
                    }
                    setTimeout(() => renderCanvas(), 10);
                }}
                onConvertToImage={(selectedList) => convertDrawingToImage(selectedList)}
                onMergeLayers={handleMergeLayers}
                darkMode={darkMode}
                readOnly={!isHost && user?.role !== 'teacher' && !hasEditPermission}
            />

            {/* İlkokul 1 Dakika Okuma Alanı (TTKB Dik Temel) */}
            {showReadingScreen && (
                <ReadingScreen
                    isOpen={showReadingScreen}
                    onClose={() => setShowReadingScreen(false)}
                    onAddToCanvas={({ text, title, fontFamily, fontSize }) => {
                        const canvas = canvasRef.current;
                        const cw = canvas ? canvas.width : 1200;
                        const ch = canvas ? canvas.height : 800;
                        const x = (-panOffset.x + (cw / (scale || 1)) / 2) - 250;
                        const y = (-panOffset.y + (ch / (scale || 1)) / 2) - 150;

                        const newElement = {
                            id: crypto.randomUUID(),
                            type: 'text',
                            text: `${title}\n\n${text}`,
                            x: Math.max(40, x),
                            y: Math.max(40, y),
                            fontFamily: fontFamily || 'TTKBDikTemel',
                            fontSize: fontSize || 28,
                            color: darkMode ? '#ffffff' : '#1e293b',
                            stroke: darkMode ? '#ffffff' : '#1e293b',
                            fontWeight: 'normal',
                            fontStyle: 'normal',
                            underline: false,
                            strikethrough: false,
                            size: 5
                        };

                        setElements(prev => [...prev, newElement]);
                        if (socket) {
                            socket.emit('draw-element', { roomId, socketId: socket.id, userId: (userRef.current || user)?.id, ...newElement });
                        }
                        setTimeout(() => renderCanvas(), 20);
                    }}
                />
            )}

            {/* 1. Sınıf Harf Çizgi & Yazılış Yönü Atölyesi Modalı */}
            {showLetterWritingScreen && (
                <LetterWritingScreen
                    isOpen={showLetterWritingScreen}
                    onClose={() => setShowLetterWritingScreen(false)}
                    onAddToCanvas={(dataUrl) => {
                        const canvas = canvasRef.current;
                        const cw = canvas ? canvas.width : 1200;
                        const ch = canvas ? canvas.height : 800;
                        const x = (-panOffset.x + (cw / (scale || 1)) / 2) - 300;
                        const y = (-panOffset.y + (ch / (scale || 1)) / 2) - 200;

                        const newElement = {
                            id: crypto.randomUUID(),
                            type: 'image',
                            dataURL: dataUrl,
                            src: dataUrl,
                            x: Math.max(40, x),
                            y: Math.max(40, y),
                            width: 600,
                            height: 380,
                            timestamp: Date.now()
                        };

                        setElements(prev => [...prev, newElement]);
                        if (socket) {
                            socket.emit('draw-element', { roomId, socketId: socket.id, userId: (userRef.current || user)?.id, ...newElement });
                        }
                        setTimeout(() => renderCanvas(), 20);
                    }}
                />
            )}

            {/* Emoji & İşaret Kütüphanesi Modalı */}
            <EmojiPickerModal
                isOpen={showEmojiModal}
                onClose={() => setShowEmojiModal(false)}
                onSelectEmoji={handleInsertEmoji}
            />

            {/* Custom Virtual Cursors for Pen and Eraser */}
            {cursorPos.visible && (tool === 'pen' || tool === 'highlighter') && (
                <div 
                    className="pointer-events-none fixed z-[9999] rounded-full transition-transform duration-75 ease-out select-none"
                    style={{
                        left: cursorPos.x,
                        top: cursorPos.y,
                        transform: 'translate(-50%, -50%)',
                        width: Math.max(4, Math.round(brushSize || 5)),
                        height: Math.max(4, Math.round(brushSize || 5)),
                        backgroundColor: color,
                        opacity: tool === 'highlighter' ? 0.65 : 1,
                        boxShadow: '0 0 0 1.5px rgba(255, 255, 255, 0.9), 0 0 3px 1px rgba(0, 0, 0, 0.7)'
                    }}
                />
            )}

            {cursorPos.visible && tool === 'eraser' && (() => {
                const bSize = Math.max(1, Math.round(brushSize || 5));
                const ew = Math.max(20, Math.round(bSize * 2.2));
                const eh = Math.max(16, Math.round(bSize * 1.8));
                return (
                    <div 
                        className="pointer-events-none fixed z-[9999] rounded-md transition-transform duration-75 ease-out flex items-center justify-center select-none"
                        style={{
                            left: cursorPos.x,
                            top: cursorPos.y,
                            transform: 'translate(-50%, -50%)',
                            width: ew,
                            height: eh,
                            backgroundColor: 'rgba(255, 255, 255, 0.65)',
                            border: '1.5px solid rgba(255, 255, 255, 0.95)',
                            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(1px)'
                        }}
                    >
                        <div className="w-1.5 h-1 bg-white/70 rounded-full" />
                    </div>
                );
            })()}
        </div >
    );
};

export default Whiteboard;
