import React, { useState, useEffect, useRef } from 'react';
import api, { resolveMediaUrl } from '../lib/api';
import { cropImageTo16by9 } from '../utils/image169';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Mail,
    Calendar,
    FileText,
    RefreshCw,
    LogOut,
    Trash2,
    ExternalLink,
    AlertTriangle,
    Users,
    Blocks,
    Plus,
    Edit3,
    Video,
    Upload,
    Play,
    Check,
    X,
    Image as ImageIcon,
    ToggleLeft,
    ToggleRight,
    Power,
    RotateCcw,
    Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import {
    PageHeader,
    Button,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    StatCard,
    EmptyState,
    AnimatedItem,
    AnimatedTableWrapper,
    AnimatedTableBody,
    AnimatedTableRow
} from '../components/ui';

const AdminPanel = () => {
    const { t } = useTranslation();
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [adminModules, setAdminModules] = useState([]);
    const [demoSettings, setDemoSettings] = useState(null);
    const [togglingDemo, setTogglingDemo] = useState(false);
    const [resettingDemo, setResettingDemo] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [processingId, setProcessingId] = useState(null);

    // Module management state
    const [moduleModalOpen, setModuleModalOpen] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [savingModule, setSavingModule] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [toastMessage, setToastMessage] = useState(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const dropzoneInputRef = useRef(null);

    const showToast = (text, type = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3000);
    };
    const [moduleFormData, setModuleFormData] = useState({
        key: '',
        title: '',
        shortDescription: '',
        longDescription: '',
        coverImage: '',
        images: [],
        videoUrl: '',
        videoEmbedCode: '',
        badgeText: 'İlkokul',
        category: 'Tahta Araçları',
        targetGrades: ['1', '2'],
        isActive: true,
        order: 1
    });

    useEffect(() => {
        fetchTeachers();
    }, []);

    async function fetchTeachers() {
        setLoading(true);
        try {
            const [pendingRes, allRes, studentsRes, modulesRes, demoRes] = await Promise.all([
                api.get('/api/admin/pending-teachers'),
                api.get('/api/admin/all-teachers'),
                api.get('/api/admin/all-students'),
                api.get('/api/modules/admin/all').catch(() => ({ data: [] })),
                api.get('/api/admin/demo-settings').catch(() => ({ data: null }))
            ]);
            setPendingTeachers(pendingRes.data || []);
            setAllTeachers(allRes.data || []);
            setAllStudents(studentsRes.data || []);
            setAdminModules(modulesRes.data || []);
            setDemoSettings(demoRes?.data || null);
        } catch (err) {
            console.error('❌ Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleToggleDemoAutoReset = async (newVal) => {
        setTogglingDemo(true);
        try {
            const res = await api.post('/api/admin/demo-settings', { autoResetEnabled: newVal });
            setDemoSettings(res.data);
            showToast(
                newVal 
                    ? 'Otomatik sıfırlama açıldı ve sistem en güncel modüllerle sıfırlandı.' 
                    : 'Otomatik sıfırlama kapatıldı. Modül düzenlemeleriniz korunacak.', 
                'success'
            );
            // Refresh module list and stats
            const [modsRes, demoStatusRes] = await Promise.all([
                api.get('/api/modules/admin/all').catch(() => ({ data: [] })),
                api.get('/api/admin/demo-settings').catch(() => ({ data: null }))
            ]);
            setAdminModules(modsRes.data || []);
            if (demoStatusRes?.data) setDemoSettings(demoStatusRes.data);
        } catch (err) {
            showToast('Ayar güncellenirken hata oluştu: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setTogglingDemo(false);
        }
    };

    const handleManualResetDemo = async () => {
        if (!confirm('Demo ortamını en güncel modüller ve ayarlar ile şimdi sıfırlamak istiyor musunuz?')) return;
        setResettingDemo(true);
        try {
            const res = await api.post('/api/admin/demo-reset-now');
            setDemoSettings(res.data);
            showToast('Demo ortamı en güncel modüllerle başarıyla sıfırlandı.', 'success');
            const [modsRes, demoStatusRes] = await Promise.all([
                api.get('/api/modules/admin/all').catch(() => ({ data: [] })),
                api.get('/api/admin/demo-settings').catch(() => ({ data: null }))
            ]);
            setAdminModules(modsRes.data || []);
            if (demoStatusRes?.data) setDemoSettings(demoStatusRes.data);
        } catch (err) {
            showToast('Sıfırlama sırasında hata oluştu: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setResettingDemo(false);
        }
    };

    const handleApprove = async (userId, username) => {
        if (!confirm(`Approve ${username} as a teacher?`)) return;

        setProcessingId(userId);
        try {
            await api.post(
                `/api/verification/approve/${userId}`,
                { adminNotes: 'Approved via admin panel' }
            );
            alert(`${username} has been approved! They will receive an email notification.`);
            fetchTeachers();
        } catch (err) {
            alert('Failed to approve teacher: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (userId, username) => {
        const reason = prompt(`Reject ${username}?\n\nEnter rejection reason:`);
        if (!reason) return;

        setProcessingId(userId);
        try {
            await api.post(
                `/api/verification/reject/${userId}`,
                { reason, adminNotes: 'Rejected via admin panel' }
            );
            alert(`${username} has been rejected. They will receive an email notification.`);
            fetchTeachers();
        } catch (err) {
            alert('Failed to reject teacher: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessingId(null);
        }
    };

    const handleRemoveTeacher = async (userId, username) => {
        if (!confirm(`Are you sure you want to permanently remove ${username} from the platform? This action cannot be undone.`)) {
            return;
        }

        setProcessingId(userId);
        try {
            await api.delete(`/api/admin/teacher/${userId}`);
            alert(`${username} has been removed from the platform.`);
            fetchTeachers();
        } catch (err) {
            alert('Failed to remove teacher: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessingId(null);
        }
    };

    const handleRemoveStudent = async (userId, username) => {
        if (!confirm(`Are you sure you want to permanently remove ${username} from the platform? This action cannot be undone.`)) {
            return;
        }

        setProcessingId(userId);
        try {
            await api.delete(`/api/admin/user/${userId}`);
            alert(`${username} has been removed from the platform.`);
            fetchTeachers();
        } catch (err) {
            alert('Failed to remove student: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessingId(null);
        }
    };

    const handleToggleModule = async (id) => {
        try {
            const res = await api.patch(`/api/modules/admin/${id}/toggle`);
            setAdminModules(prev => prev.map(m => m._id === id ? { ...m, isActive: res.data.isActive } : m));
        } catch (err) {
            alert('Modül durumu güncellenemedi: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteModule = async (id, title) => {
        if (!confirm(`"${title}" modülünü kalıcı olarak silmek istediğinizden emin misiniz?`)) return;
        try {
            await api.delete(`/api/modules/admin/${id}`);
            setAdminModules(prev => prev.filter(m => m._id !== id));
        } catch (err) {
            alert('Modül silinemedi: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleOpenModuleModal = (mod = null) => {
        if (mod) {
            setEditingModule(mod);
            const initialImages = Array.isArray(mod.images) && mod.images.length > 0
                ? mod.images.filter(Boolean)
                : (mod.coverImage ? [mod.coverImage] : []);

            let initialCover = mod.coverImage || '';
            if (initialImages.length > 0 && (!initialCover || !initialImages.includes(initialCover))) {
                initialCover = initialImages[0];
            }

            setModuleFormData({
                key: mod.key || '',
                title: mod.title || '',
                shortDescription: mod.shortDescription || '',
                longDescription: mod.longDescription || '',
                coverImage: initialCover,
                images: initialImages,
                videoUrl: mod.videoUrl || '',
                videoEmbedCode: mod.videoEmbedCode || '',
                badgeText: mod.badgeText || 'Eklenti',
                category: mod.category || 'Tahta Araçları',
                targetGrades: mod.targetGrades || ['1', '2'],
                isActive: mod.isActive !== false,
                order: mod.order || 1
            });
        } else {
            setEditingModule(null);
            setModuleFormData({
                key: '',
                title: '',
                shortDescription: '',
                longDescription: '',
                coverImage: '',
                images: [],
                videoUrl: '',
                videoEmbedCode: '',
                badgeText: 'İlkokul',
                category: 'Tahta Araçları',
                targetGrades: ['1', '2'],
                isActive: true,
                order: adminModules.length + 1
            });
        }
        setModuleModalOpen(true);
    };

    const processAndUploadFiles = async (files) => {
        if (!files || files.length === 0) return;
        setUploadingImage(true);
        try {
            const processedFiles = [];
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                if (f.type.startsWith('image/')) {
                    const c169 = await cropImageTo16by9(f);
                    processedFiles.push(c169);
                }
            }

            if (processedFiles.length === 0) {
                showToast('Lütfen geçerli bir görsel dosyası seçiniz.', 'error');
                return;
            }

            const formData = new FormData();
            for (let i = 0; i < processedFiles.length; i++) {
                formData.append('images', processedFiles[i]);
            }

            const res = await api.post('/api/modules/upload-images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newUrls = (res.data.imageUrls || []).map(resolveMediaUrl);
            setModuleFormData(prev => {
                const currentImages = Array.isArray(prev.images) ? prev.images : [];
                const updated = [...currentImages, ...newUrls.filter(u => !currentImages.includes(u))];
                const coverImg = updated.includes(prev.coverImage) ? prev.coverImage : (updated[0] || '');
                return {
                    ...prev,
                    images: updated,
                    coverImage: coverImg
                };
            });
            showToast(`${processedFiles.length} adet görsel 16:9 formatına optimize edilerek eklendi.`);
        } catch (err) {
            showToast('Görsel(ler) yüklenemedi: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleImageUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        await processAndUploadFiles(files);
        if (e.target) e.target.value = '';
    };

    const handleRemoveImage = (indexToRemove) => {
        setModuleFormData(prev => {
            const currentImages = Array.isArray(prev.images) ? prev.images : [];
            const updated = currentImages.filter((_, idx) => idx !== indexToRemove);
            const coverImg = updated.includes(prev.coverImage) ? prev.coverImage : (updated[0] || '');
            return {
                ...prev,
                images: updated,
                coverImage: coverImg
            };
        });
    };

    const handleSetCoverImage = (imgUrl) => {
        setModuleFormData(prev => ({
            ...prev,
            coverImage: imgUrl
        }));
    };

    const handleAddImageUrl = (urlToAdd) => {
        if (!urlToAdd || !urlToAdd.trim()) return;
        const trimmed = urlToAdd.trim();
        setModuleFormData(prev => {
            const currentImages = Array.isArray(prev.images) ? prev.images : [];
            if (currentImages.includes(trimmed)) return prev;
            const updated = [...currentImages, trimmed];
            const coverImg = updated.includes(prev.coverImage) ? prev.coverImage : (updated[0] || trimmed);
            return {
                ...prev,
                images: updated,
                coverImage: coverImg
            };
        });
    };

    const handleSaveModule = async (e) => {
        e.preventDefault();
        setSavingModule(true);
        try {
            const finalImages = Array.isArray(moduleFormData.images) ? moduleFormData.images.filter(Boolean) : [];
            let finalCover = moduleFormData.coverImage;
            if (!finalCover || (finalImages.length > 0 && !finalImages.includes(finalCover))) {
                finalCover = finalImages[0] || '';
            }

            const payload = {
                ...moduleFormData,
                images: finalImages,
                coverImage: finalCover
            };
            if (editingModule) {
                const res = await api.put(`/api/modules/admin/${editingModule._id}`, payload);
                setAdminModules(prev => prev.map(m => m._id === editingModule._id ? res.data : m));
                showToast('Modül başarıyla güncellendi.', 'success');
            } else {
                const res = await api.post('/api/modules/admin', payload);
                setAdminModules(prev => [res.data, ...prev]);
                showToast('Yeni modül başarıyla oluşturuldu.', 'success');
            }
            setModuleModalOpen(false);
        } catch (err) {
            showToast('Modül kaydedilemedi: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setSavingModule(false);
        }
    };

    return (
        <DashboardLayout paddingClass="p-4 sm:p-6 lg:p-8">
            <div className="space-y-6 max-w-7xl mx-auto">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Yönetim', to: '/admin' },
                        { label: 'Admin Paneli' }
                    ]}
                    badge="Sistem Yönetimi"
                    badgeVariant="purple"
                    title={t('admin.title')}
                    description={t('admin.subtitle')}
                    actions={
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={RefreshCw}
                            onClick={fetchTeachers}
                            disabled={loading}
                        >
                            Yenile
                        </Button>
                    }
                />

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <AnimatedItem index={0}>
                        <StatCard
                            title={t('admin.statPending')}
                            value={pendingTeachers.length}
                            description="Onay bekleyen öğretmenler"
                            icon={Clock}
                            color="amber"
                        />
                    </AnimatedItem>
                    <AnimatedItem index={1}>
                        <StatCard
                            title={t('admin.statTotalTeachers')}
                            value={allTeachers.length}
                            description="Kayıtlı toplam eğitimci"
                            icon={User}
                            color="indigo"
                        />
                    </AnimatedItem>
                    <AnimatedItem index={2}>
                        <StatCard
                            title={t('admin.statusApproved')}
                            value={allTeachers.filter(t => t.verificationStatus === 'approved').length}
                            description="Aktif onaylı öğretmen"
                            icon={CheckCircle2}
                            color="emerald"
                        />
                    </AnimatedItem>
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap items-center gap-2 p-1 rounded-2xl bg-slate-900/60 border border-slate-800/80 w-fit text-xs font-semibold">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === 'pending'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('admin.tabPending')}</span>
                        <Badge variant={pendingTeachers.length > 0 ? 'warning' : 'neutral'} size="xs">
                            {pendingTeachers.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === 'all'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <User className="w-3.5 h-3.5" />
                        <span>{t('admin.tabTeachers')}</span>
                        <Badge variant="neutral" size="xs">
                            {allTeachers.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === 'students'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>{t('admin.tabStudents')}</span>
                        <Badge variant="neutral" size="xs">
                            {allStudents.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setActiveTab('modules')}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === 'modules'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <Blocks className="w-3.5 h-3.5" />
                        <span>Modül Yönetimi</span>
                        <Badge variant="primary" size="xs">
                            {adminModules.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setActiveTab('demo')}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === 'demo'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${demoSettings?.autoResetEnabled ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <span>Demo & Sıfırlama</span>
                        <span className={`w-2 h-2 rounded-full ${demoSettings?.autoResetEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    </button>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-slate-400 text-sm">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Kayıtlar yükleniyor...
                    </div>
                ) : (
                    <>
                        {/* Pending Teachers View */}
                        {activeTab === 'pending' && (
                            <div className="space-y-4">
                                {pendingTeachers.length === 0 ? (
                                    <Card>
                                        <EmptyState
                                            icon={CheckCircle2}
                                            title={t('admin.noPending')}
                                            description="Şu an için onay bekleyen yeni öğretmen başvurusu bulunmuyor."
                                        />
                                    </Card>
                                ) : (
                                    pendingTeachers.map((teacher, idx) => (
                                        <AnimatedItem key={teacher.id} index={idx}>
                                            <Card className="p-6 border-slate-800/90 shadow-xl">
                                                <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                                                    <div className="flex-1 w-full space-y-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-amber-500/10">
                                                                {teacher.username?.charAt(0).toUpperCase() || 'Ö'}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="text-lg font-bold text-white">{teacher.username}</h3>
                                                                    <Badge variant="warning" size="xs" icon={Clock}>
                                                                        Onay Bekliyor
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                                                                    <span>{teacher.email}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                                                                <Calendar className="w-4 h-4 text-indigo-400" />
                                                                <div>
                                                                    <p className="text-[10px] text-slate-500 uppercase font-semibold">{t('admin.colDate')}</p>
                                                                    <p className="text-white font-medium">{new Date(teacher.registeredAt).toLocaleDateString('tr-TR')}</p>
                                                                </div>
                                                            </div>
                                                            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                                                                <FileText className="w-4 h-4 text-indigo-400" />
                                                                <div>
                                                                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Yüklenen Belgeler</p>
                                                                    <p className="text-white font-medium">{teacher.documents?.length || 0} Belge</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Uploaded Documents List */}
                                                        {teacher.documents && teacher.documents.length > 0 && (
                                                            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    Doğrulama Belgeleri
                                                                </p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {teacher.documents.map((doc, idx) => (
                                                                        <a
                                                                            key={idx}
                                                                            href={doc.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-colors text-xs group"
                                                                        >
                                                                            <div className="flex items-center gap-2 text-slate-300 group-hover:text-white">
                                                                                <FileText className="w-4 h-4 text-indigo-400" />
                                                                                <span className="font-medium">{doc.type.replace('_', ' ').toUpperCase()}</span>
                                                                            </div>
                                                                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-44 shrink-0">
                                                        <Button
                                                            variant="success"
                                                            fullWidth
                                                            icon={CheckCircle2}
                                                            onClick={() => handleApprove(teacher.id, teacher.username)}
                                                            disabled={processingId === teacher.id}
                                                            loading={processingId === teacher.id}
                                                        >
                                                            {t('admin.approveBtn')}
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            fullWidth
                                                            icon={XCircle}
                                                            onClick={() => handleReject(teacher.id, teacher.username)}
                                                            disabled={processingId === teacher.id}
                                                        >
                                                            {t('admin.rejectBtn')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        </AnimatedItem>
                                    ))
                                )}
                            </div>
                        )}

                         {/* All Teachers Tab */}
                        {activeTab === 'all' && (
                            <Card className="p-0 overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto">
                                    <AnimatedTableWrapper className="w-full text-left text-xs">
                                        <thead className="bg-slate-950/60 border-b border-slate-800">
                                            <tr className="text-slate-400 font-semibold uppercase text-[10px]">
                                                <th className="px-6 py-4">{t('dashboard.roleTeacher')}</th>
                                                <th className="px-6 py-4">{t('admin.colEmail')}</th>
                                                <th className="px-6 py-4">{t('admin.colStatus')}</th>
                                                <th className="px-6 py-4">{t('admin.colDate')}</th>
                                                <th className="px-6 py-4 text-right">{t('admin.colActions')}</th>
                                            </tr>
                                        </thead>
                                        <AnimatedTableBody className="divide-y divide-slate-800/60">
                                            {allTeachers.map((teacher, idx) => (
                                                <AnimatedTableRow key={teacher._id} index={idx} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                                                                {teacher.username?.charAt(0).toUpperCase() || 'Ö'}
                                                            </div>
                                                            <span className="text-white font-semibold">{teacher.username}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300 font-mono text-[11px]">{teacher.email}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge
                                                            variant={
                                                                teacher.verificationStatus === 'approved'
                                                                    ? 'success'
                                                                    : teacher.verificationStatus === 'rejected'
                                                                    ? 'danger'
                                                                    : 'warning'
                                                            }
                                                            size="xs"
                                                            icon={
                                                                teacher.verificationStatus === 'approved'
                                                                    ? CheckCircle2
                                                                    : teacher.verificationStatus === 'rejected'
                                                                    ? XCircle
                                                                    : Clock
                                                            }
                                                        >
                                                            {teacher.verificationStatus === 'approved'
                                                                ? t('admin.statusApproved')
                                                                : teacher.verificationStatus === 'rejected'
                                                                ? t('admin.statusRejected')
                                                                : t('admin.statusPending')}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400">
                                                        {new Date(teacher.createdAt).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="danger"
                                                            size="xs"
                                                            icon={Trash2}
                                                            onClick={() => handleRemoveTeacher(teacher._id, teacher.username)}
                                                            disabled={processingId === teacher._id}
                                                        >
                                                            {t('admin.removeBtn')}
                                                        </Button>
                                                    </td>
                                                </AnimatedTableRow>
                                            ))}
                                        </AnimatedTableBody>
                                    </AnimatedTableWrapper>
                                </div>
                            </Card>
                        )}

                        {/* All Students Tab */}
                        {activeTab === 'students' && (
                            <Card className="p-0 overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto">
                                    <AnimatedTableWrapper className="w-full text-left text-xs">
                                        <thead className="bg-slate-950/60 border-b border-slate-800">
                                            <tr className="text-slate-400 font-semibold uppercase text-[10px]">
                                                <th className="px-6 py-4">Öğrenci</th>
                                                <th className="px-6 py-4">E-posta</th>
                                                <th className="px-6 py-4">Kayıt Tarihi</th>
                                                <th className="px-6 py-4 text-right">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <AnimatedTableBody className="divide-y divide-slate-800/60">
                                            {allStudents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                                        Henüz kayıtlı öğrenci bulunmuyor.
                                                    </td>
                                                </tr>
                                            ) : (
                                                allStudents.map((student, idx) => (
                                                    <AnimatedTableRow key={student._id} index={idx} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                                                                    {student.username?.charAt(0).toUpperCase() || 'Ö'}
                                                                </div>
                                                                <span className="text-white font-semibold">{student.username}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-300 font-mono text-[11px]">{student.email}</td>
                                                        <td className="px-6 py-4 text-slate-400">
                                                            {new Date(student.createdAt).toLocaleDateString('tr-TR')}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button
                                                                variant="danger"
                                                                size="xs"
                                                                icon={Trash2}
                                                                onClick={() => handleRemoveStudent(student._id, student.username)}
                                                                disabled={processingId === student._id}
                                                            >
                                                                Sil
                                                            </Button>
                                                        </td>
                                                    </AnimatedTableRow>
                                                ))
                                            )}
                                        </AnimatedTableBody>
                                    </AnimatedTableWrapper>
                                </div>
                            </Card>
                        )}

                        {/* Modules Management Tab */}
                        {activeTab === 'modules' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                                    <div>
                                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                                            <Blocks className="w-5 h-5 text-indigo-400" />
                                            <span>Sistem Modülleri & Eklentileri</span>
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Öğretmenlere sunulan ek tahta ve eğitim modüllerini buradan yönetebilir, 16:9 görsel ve YouTube embed kodlarını düzenleyebilirsiniz.
                                        </p>
                                    </div>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        icon={Plus}
                                        onClick={() => handleOpenModuleModal()}
                                    >
                                        Yeni Modül Ekle
                                    </Button>
                                </div>

                                {/* Demo Auto-Reset Notice Bar */}
                                <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
                                    demoSettings?.autoResetEnabled
                                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                        : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                                }`}>
                                    <div className="flex items-center gap-2.5">
                                        <RefreshCw className={`w-4 h-4 shrink-0 ${demoSettings?.autoResetEnabled ? 'text-amber-400' : 'text-emerald-400'}`} />
                                        <div>
                                            <span className="font-bold">
                                                {demoSettings?.autoResetEnabled
                                                    ? 'Demo Otomatik Sıfırlama Açık (30 Dk):'
                                                    : 'Demo Otomatik Sıfırlama Kapalı:'}
                                            </span>{' '}
                                            <span className="opacity-90">
                                                {demoSettings?.autoResetEnabled
                                                    ? 'Yeni modül eklerken veya düzenlerken sıfırlanmaması için ayarı kapatabilirsiniz. Düzenleme sonrası tekrar açtığınızda sistem en güncel modüllerinizle sıfırlanır.'
                                                    : 'Otomatik sıfırlama kapalı. Modülleri dilediğiniz gibi ekleyip güncelleyebilirsiniz. İşiniz bitince açarak sistemi en güncel haliyle sıfırlayabilirsiniz.'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleToggleDemoAutoReset(!demoSettings?.autoResetEnabled)}
                                            disabled={togglingDemo}
                                            className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                                                demoSettings?.autoResetEnabled
                                                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30'
                                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30'
                                            }`}
                                        >
                                            {togglingDemo ? 'İşleniyor...' : (demoSettings?.autoResetEnabled ? 'Sıfırlamayı Kapat' : 'Sıfırlamayı Aç')}
                                        </button>
                                    </div>
                                </div>

                                {adminModules.length === 0 ? (
                                    <Card className="p-12">
                                        <EmptyState
                                            icon={Blocks}
                                            title="Henüz Modül Eklenmedi"
                                            description="Sisteme yeni bir eğitim modülü eklemek için yukarıdaki 'Yeni Modül Ekle' butonunu kullanabilirsiniz."
                                        />
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {adminModules.map((mod) => (
                                            <Card
                                                key={mod._id}
                                                className={`overflow-hidden border transition-all flex flex-col justify-between ${
                                                    mod.isActive
                                                        ? 'border-slate-800 bg-slate-900/60'
                                                        : 'border-slate-800/40 bg-slate-950/40 opacity-70'
                                                }`}
                                            >
                                                <div>
                                                    {/* 16:9 Cover Thumbnail */}
                                                    <div className="relative aspect-video w-full overflow-hidden bg-slate-950 border-b border-slate-800/80">
                                                        {(() => {
                                                            const displayCover = (mod.images && mod.images.length > 0)
                                                                ? (mod.images.includes(mod.coverImage) ? mod.coverImage : mod.images[0])
                                                                : mod.coverImage;
                                                            return displayCover ? (
                                                                <img
                                                                    src={resolveMediaUrl(displayCover)}
                                                                    alt={mod.title}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                                                    <Blocks className="w-10 h-10 mb-1" />
                                                                    <span className="text-[11px]">16:9 Görsel Yok</span>
                                                                </div>
                                                            );
                                                        })()}
                                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white border border-white/10">
                                                                {mod.category || 'Tahta Araçları'}
                                                            </span>
                                                        </div>
                                                        <div className="absolute top-2.5 right-2.5">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                mod.isActive
                                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                            }`}>
                                                                {mod.isActive ? '● Aktif' : '○ Pasif'}
                                                            </span>
                                                        </div>
                                                        {mod.videoUrl && (
                                                            <div className="absolute bottom-2.5 right-2.5">
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-600/90 text-white px-1.5 py-0.5 rounded">
                                                                    <Play className="w-2.5 h-2.5 fill-current" />
                                                                    Video Var
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Details */}
                                                    <div className="p-4 space-y-2">
                                                        <h4 className="font-bold text-white text-sm line-clamp-1">
                                                            {mod.title}
                                                        </h4>
                                                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                                            {mod.shortDescription}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                                                            <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300">
                                                                anahtar: {mod.key}
                                                            </span>
                                                            {mod.targetGrades && mod.targetGrades.length > 0 && (
                                                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                                                                    Kademeler: {mod.targetGrades.join(', ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Actions */}
                                                <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleModule(mod._id)}
                                                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                                                            mod.isActive
                                                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                        }`}
                                                    >
                                                        {mod.isActive ? 'Pasife Al' : 'Aktifleştir'}
                                                    </button>

                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="xs"
                                                            icon={Edit3}
                                                            onClick={() => handleOpenModuleModal(mod)}
                                                        >
                                                            Düzenle
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="xs"
                                                            icon={Trash2}
                                                            onClick={() => handleDeleteModule(mod._id, mod.title)}
                                                        >
                                                            Sil
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Demo Mode & Auto-Reset Management Tab */}
                        {activeTab === 'demo' && (
                            <div className="space-y-6">
                                {/* Main Status & Control Card */}
                                <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden">
                                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                                    
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                                        <div className="space-y-3 max-w-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-2xl ${
                                                    demoSettings?.autoResetEnabled 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                    <RefreshCw className={`w-6 h-6 ${demoSettings?.autoResetEnabled ? 'animate-spin-slow' : ''}`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xl font-bold text-white">Demo Modu Otomatik Sıfırlama</h3>
                                                        <Badge 
                                                            variant={demoSettings?.autoResetEnabled ? 'success' : 'warning'} 
                                                            size="sm"
                                                            className="font-bold"
                                                        >
                                                            {demoSettings?.autoResetEnabled ? 'AÇIK (Aktif - 30 Dk)' : 'KAPALI (Durduruldu)'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        Oxonom EDU tanıtım ve demo ortamının periyodik sıfırlanma döngüsü
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                                                {demoSettings?.autoResetEnabled ? (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2 font-bold text-emerald-400">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            <span>Otomatik Sıfırlama Devrede (Her 30 Dakikada Bir)</span>
                                                        </div>
                                                        <p className="text-slate-300">
                                                            Sistem periyodik olarak demo ortamını sıfırlar. Modül eklerken veya güncellerken sıfırlamanın araya girmesini istemiyorsanız ayarı <strong>kapatabilirsiniz</strong>.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2 font-bold text-amber-400">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            <span>Otomatik Sıfırlama Durduruldu (Değişiklikleriniz Korunuyor)</span>
                                                        </div>
                                                        <p className="text-slate-300">
                                                            Otomatik sıfırlama kapalıyken modül ekleyebilir, mevcut modülleri güncelleyebilir veya silebilirsiniz. İşlemleriniz bitince ayarı <strong>tekrar açtığınızda</strong> demo ortamı tüm güncellemelerinizle birlikte <strong>en güncel haline</strong> sıfırlanacaktır.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Control Action Buttons */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                                            <button
                                                onClick={() => handleToggleDemoAutoReset(!demoSettings?.autoResetEnabled)}
                                                disabled={togglingDemo}
                                                className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
                                                    demoSettings?.autoResetEnabled
                                                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40'
                                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                                                }`}
                                            >
                                                {togglingDemo ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        <span>İşleniyor...</span>
                                                    </>
                                                ) : demoSettings?.autoResetEnabled ? (
                                                    <>
                                                        <Power className="w-4 h-4 text-amber-300" />
                                                        <span>Otomatik Sıfırlamayı Kapat</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        <span>Otomatik Sıfırlamayı Aç & En Güncele Sıfırla</span>
                                                    </>
                                                )}
                                            </button>

                                            <Button
                                                variant="secondary"
                                                size="md"
                                                icon={RotateCcw}
                                                onClick={handleManualResetDemo}
                                                disabled={resettingDemo}
                                                className="py-3 px-4 font-semibold text-xs border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white"
                                            >
                                                {resettingDemo ? 'Sıfırlanıyor...' : 'Şimdi Sıfırla'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Timing & Stats Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card className="p-4 bg-slate-900/50 border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-slate-400 font-medium">Son Sıfırlama</div>
                                                <div className="text-xs font-bold text-white mt-0.5">
                                                    {demoSettings?.lastResetAt 
                                                        ? new Date(demoSettings.lastResetAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                                                        : 'Bilinmiyor'}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-4 bg-slate-900/50 border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                demoSettings?.autoResetEnabled
                                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                                    : 'bg-slate-800/50 border border-slate-700 text-slate-500'
                                            }`}>
                                                <RefreshCw className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-slate-400 font-medium">Sonraki Sıfırlama</div>
                                                <div className="text-xs font-bold text-white mt-0.5">
                                                    {demoSettings?.autoResetEnabled && demoSettings?.nextResetAt
                                                        ? new Date(demoSettings.nextResetAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                                        : 'Durduruldu'}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-4 bg-slate-900/50 border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                                                <Blocks className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-slate-400 font-medium">Aktif Modüller</div>
                                                <div className="text-xs font-bold text-white mt-0.5">
                                                    {demoSettings?.activeModulesCount ?? adminModules.filter(m => m.isActive).length} Modül Devrede
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-4 bg-slate-900/50 border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-slate-400 font-medium">Demo Ortam Kapsamı</div>
                                                <div className="text-xs font-bold text-white mt-0.5">
                                                    6 Sınıf, 60 Öğrenci, 30 Tahta
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Demo Credentials & Details Table */}
                                <Card className="p-5 bg-slate-900/40 border-slate-800">
                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                        <span>Demo Kullanıcı Giriş Bilgileri</span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5" />
                                                    <span>Demo Öğretmen Hesabı</span>
                                                </div>
                                                <div className="mt-2 space-y-1 text-xs text-slate-300">
                                                    <div>Kullanıcı Adı: <code className="text-indigo-400 font-mono bg-indigo-950/50 px-1.5 py-0.5 rounded">demo_ogretmen</code></div>
                                                    <div>Şifre: <code className="text-indigo-400 font-mono bg-indigo-950/50 px-1.5 py-0.5 rounded">Demo1234!</code></div>
                                                </div>
                                            </div>
                                            <Badge variant="primary" size="xs">Öğretmen</Badge>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5" />
                                                    <span>Demo Öğrenci Hesabı</span>
                                                </div>
                                                <div className="mt-2 space-y-1 text-xs text-slate-300">
                                                    <div>Kullanıcı Adı: <code className="text-cyan-400 font-mono bg-cyan-950/50 px-1.5 py-0.5 rounded">demo_ogrenci</code></div>
                                                    <div>Şifre: <code className="text-cyan-400 font-mono bg-cyan-950/50 px-1.5 py-0.5 rounded">Demo1234!</code></div>
                                                </div>
                                            </div>
                                            <Badge variant="neutral" size="xs">8-B Öğrencisi</Badge>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- CREATE / EDIT MODULE MODAL --- */}
            {moduleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white my-8">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                            <div>
                                <h3 className="font-bold text-base text-white">
                                    {editingModule ? 'Modülü Düzenle' : 'Yeni Modül Ekle'}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Modül başlığı, 16:9 görseli ve YouTube embed kodunu belirleyin
                                </p>
                            </div>
                            <button
                                onClick={() => setModuleModalOpen(false)}
                                className="p-1 rounded-lg border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveModule} className="p-6 overflow-y-auto space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">
                                        Modül Başlığı *
                                    </label>
                                    <input
                                        type="text"
                                        value={moduleFormData.title}
                                        onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
                                        placeholder="örn: 1 Dk Okuma & Hızlı Okuma"
                                        required
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">
                                        Benzersiz Anahtar (Key) *
                                    </label>
                                    <input
                                        type="text"
                                        value={moduleFormData.key}
                                        onChange={(e) => setModuleFormData({ ...moduleFormData, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                        placeholder="örn: 1-dk-okuma"
                                        disabled={!!editingModule}
                                        required
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Kategori</label>
                                    <input
                                        type="text"
                                        value={moduleFormData.category}
                                        onChange={(e) => setModuleFormData({ ...moduleFormData, category: e.target.value })}
                                        placeholder="örn: Tahta Araçları"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Rozet Metni</label>
                                    <input
                                        type="text"
                                        value={moduleFormData.badgeText}
                                        onChange={(e) => setModuleFormData({ ...moduleFormData, badgeText: e.target.value })}
                                        placeholder="örn: İlkokul & Temel"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Sıralama (Order)</label>
                                    <input
                                        type="number"
                                        value={moduleFormData.order}
                                        onChange={(e) => setModuleFormData({ ...moduleFormData, order: Number(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Önerilen Sınıf Kademeleri */}
                            <div>
                                <label className="block text-slate-300 font-semibold mb-1.5">
                                    Önerilen Sınıf Kademeleri (Hedef Kitle)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['1', '2', '3', '4', '5', '6', '7', '8'].map((grade) => {
                                        const isChecked = (moduleFormData.targetGrades || []).includes(grade);
                                        return (
                                            <button
                                                type="button"
                                                key={grade}
                                                onClick={() => {
                                                    const cur = moduleFormData.targetGrades || [];
                                                    const updated = cur.includes(grade)
                                                        ? cur.filter(g => g !== grade)
                                                        : [...cur, grade];
                                                    setModuleFormData({ ...moduleFormData, targetGrades: updated });
                                                }}
                                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                    isChecked
                                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                                }`}
                                            >
                                                {grade}. Sınıf
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Kısa Açıklama */}
                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">
                                    Kısa Açıklama (Kartta Görünecek Metin) *
                                </label>
                                <textarea
                                    value={moduleFormData.shortDescription}
                                    onChange={(e) => setModuleFormData({ ...moduleFormData, shortDescription: e.target.value })}
                                    rows={2}
                                    placeholder="Modülün amacını özetleyen 1-2 cümle..."
                                    required
                                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs leading-relaxed"
                                />
                            </div>

                            {/* Detaylı Açıklama */}
                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">
                                    Detaylı Açıklama & Tanıtım Rehberi (Tıklandığında Görünecek) *
                                </label>
                                <textarea
                                    value={moduleFormData.longDescription}
                                    onChange={(e) => setModuleFormData({ ...moduleFormData, longDescription: e.target.value })}
                                    rows={5}
                                    placeholder="Modülün ne olduğunu anlatan kapsamlı açıklama, öğretmen kullanım yönergeleri ve pedagojik faydaları..."
                                    required
                                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs leading-relaxed whitespace-pre-line"
                                />
                            </div>

                            {/* Medya Yönetimi: Video & Görseller (Slider) */}
                            <div className="space-y-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                                <div className="border-b border-slate-800 pb-2">
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Video className="w-4 h-4 text-indigo-400" />
                                        Modül Medya & Slider Yönetimi
                                    </h4>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        📌 <strong>Kural:</strong> Eğer YouTube videosu eklenirse otomatik olarak <strong>Kapak (1. Slayt)</strong> yapılır. Eklenen görsellerle birlikte kartta ve detayda interaktif 16:9 slider olarak sunulur.
                                    </p>
                                </div>

                                {/* 16:9 YouTube Video */}
                                <div className="space-y-1.5">
                                    <label className="block text-slate-200 font-semibold text-xs">
                                        📹 16:9 YouTube Tanıtım Videosu (Kapak Olarak Kullanılır)
                                    </label>
                                    <textarea
                                        value={moduleFormData.videoEmbedCode || moduleFormData.videoUrl}
                                        onChange={(e) => setModuleFormData({
                                            ...moduleFormData,
                                            videoEmbedCode: e.target.value,
                                            videoUrl: e.target.value
                                        })}
                                        rows={2}
                                        placeholder='<iframe width="560" height="315" src="https://www.youtube.com/embed/..." ...></iframe> veya https://youtube.com/watch?v=...'
                                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                                    />
                                    {moduleFormData.videoUrl && (
                                        <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> YouTube videosu tanımlandı. Modülün 1. slaytı (Kapak) bu video olacaktır.
                                        </p>
                                    )}
                                </div>

                                {/* 16:9 Çoklu Görsel Yükleme */}
                                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-slate-200 font-semibold text-xs">
                                            📸 16:9 Modül Görselleri (Slider İçin Birden Fazla Seçebilirsiniz)
                                        </label>
                                        {uploadingImage && <span className="text-indigo-400 text-[11px] animate-pulse">Yükleniyor...</span>}
                                    </div>

                                    {/* Drag & Drop Multi-Image Zone */}
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsDraggingOver(true);
                                        }}
                                        onDragEnter={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsDraggingOver(true);
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsDraggingOver(false);
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsDraggingOver(false);
                                            const files = e.dataTransfer.files;
                                            if (files && files.length > 0) {
                                                await processAndUploadFiles(files);
                                            }
                                        }}
                                        onClick={() => dropzoneInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                                            isDraggingOver
                                                ? 'border-indigo-400 bg-indigo-500/15 scale-[1.01]'
                                                : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/80'
                                        }`}
                                    >
                                        <input
                                            ref={dropzoneInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                            {uploadingImage ? (
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Upload className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-200">
                                                {uploadingImage
                                                    ? 'Görseller işleniyor ve 16:9 formatına uyarlanıyor...'
                                                    : 'Görselleri buraya sürükleyip bırakın veya seçmek için tıklayın'}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Birden fazla görsel seçebilirsiniz • Sistem otomatik 16:9 formatında kırpar ve optimize eder
                                            </p>
                                        </div>
                                    </div>

                                    {/* Add by URL */}
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <span className="text-[11px] text-slate-400 font-medium shrink-0">veya Link ile:</span>
                                        <input
                                            type="text"
                                            value={imageUrlInput}
                                            onChange={(e) => setImageUrlInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddImageUrl(imageUrlInput);
                                                    setImageUrlInput('');
                                                }
                                            }}
                                            placeholder="https://... görsel web linki yapıştırın"
                                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleAddImageUrl(imageUrlInput);
                                                setImageUrlInput('');
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                                        >
                                            Ekle
                                        </button>
                                    </div>

                                    {/* Gallery of Uploaded Images */}
                                    {moduleFormData.images && moduleFormData.images.length > 0 ? (
                                        <div className="space-y-1.5 pt-2">
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Yüklü Görseller ({moduleFormData.images.length}):
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                                {moduleFormData.images.map((imgUrl, imgIdx) => {
                                                    const isCover = moduleFormData.coverImage === imgUrl;
                                                    return (
                                                        <div
                                                            key={imgIdx}
                                                            className={`relative aspect-video rounded-lg overflow-hidden border group bg-slate-900 ${
                                                                isCover ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-800'
                                                            }`}
                                                        >
                                                            <img
                                                                src={resolveMediaUrl(imgUrl)}
                                                                alt={`Modül Görsel ${imgIdx + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-slate-200">
                                                                #{imgIdx + 1}
                                                            </span>
                                                            {isCover && (
                                                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white">
                                                                    Varsayılan Kapak
                                                                </span>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                                                {!isCover && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSetCoverImage(imgUrl)}
                                                                        className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold cursor-pointer"
                                                                        title="Bu görseli varsayılan görsel kapak yap"
                                                                    >
                                                                        Kapak Yap
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveImage(imgIdx)}
                                                                    className="p-1 rounded bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
                                                                    title="Görseli kaldır"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-slate-500 italic pt-1">
                                            Henüz görsel eklenmedi. Cihazınızdan sürükleyip bırakabilir veya link ekleyebilirsiniz.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Aktiflik Switch'i */}
                            <div className="flex items-center gap-3 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs font-semibold">
                                    <input
                                        type="checkbox"
                                        checked={moduleFormData.isActive}
                                        onChange={(e) => setModuleFormData({ ...moduleFormData, isActive: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span>Modülü Tüm Öğretmenler İçin Aktif Hale Getir</span>
                                </label>
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setModuleModalOpen(false)}
                                >
                                    İptal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    loading={savingModule}
                                >
                                    {editingModule ? 'Güncellemeleri Kaydet' : 'Modülü Oluştur'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Non-intrusive floating toast notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`fixed top-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold select-none ${
                            toastMessage.type === 'error'
                                ? 'bg-red-950/90 border-red-500/40 text-red-200'
                                : 'bg-slate-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/30'
                        }`}
                    >
                        {toastMessage.type === 'error' ? (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span>{toastMessage.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default AdminPanel;
