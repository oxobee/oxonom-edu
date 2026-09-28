import React, { useState, useEffect, useRef } from 'react';
import {
    User,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Shield,
    FileText,
    Upload,
    CheckCircle,
    Clock,
    AlertCircle,
    Edit3,
    Save,
    X,
    ExternalLink,
    Briefcase,
    Hash,
    Trash2,
    Image as ImageIcon,
    FileCheck,
    Plus,
    Blocks,
    Check,
    Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import {
    PageHeader,
    Badge,
    Card,
    Button
} from '../components/ui';
import { validateTCKN, maskTC } from '../utils/tckn';

const TeacherProfilePage = () => {
    const [profile, setProfile] = useState(null);
    const [verification, setVerification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState(null);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    // Modules State
    const [modulesData, setModulesData] = useState([]);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [modulesLoading, setModulesLoading] = useState(false);
    const [moduleAssigning, setModuleAssigning] = useState(null);
    const [moduleMessage, setModuleMessage] = useState(null);

    // Multi-file drag & drop queue
    const [queuedFiles, setQueuedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Edit form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        nationalId: '',
        birthDate: '',
        startDate: '',
        address: ''
    });

    useEffect(() => {
        fetchProfile();
        fetchModules();
    }, []);

    const fetchModules = async () => {
        setModulesLoading(true);
        try {
            const res = await api.get('/api/modules');
            if (res.data) {
                setModulesData(res.data.modules || []);
                setTeacherClasses(res.data.teacherClasses || []);
            }
        } catch (err) {
            console.error('Error fetching modules for teacher profile:', err);
        } finally {
            setModulesLoading(false);
        }
    };

    const handleToggleClassModule = async (moduleKey, classId) => {
        const mod = modulesData.find(m => m.key === moduleKey);
        if (!mod) return;
        const currentAssigned = (mod.assignedClasses || []).map(c => (c._id ? c._id.toString() : c.toString()));
        const strClassId = classId.toString();
        const exists = currentAssigned.includes(strClassId);
        const newClassIds = exists
            ? currentAssigned.filter(id => id !== strClassId)
            : [...currentAssigned, strClassId];

        // Optimistic UI update
        setModulesData(prev => prev.map(m => {
            if (m.key !== moduleKey) return m;
            const matchingClass = teacherClasses.find(c => c._id.toString() === strClassId);
            const updated = exists
                ? (m.assignedClasses || []).filter(c => (c._id ? c._id.toString() : c.toString()) !== strClassId)
                : [...(m.assignedClasses || []), matchingClass].filter(Boolean);
            return { ...m, assignedClasses: updated };
        }));

        try {
            setModuleAssigning(moduleKey);
            await api.post('/api/modules/assign-classes', {
                moduleKey,
                classIds: newClassIds
            });
            setModuleMessage({ type: 'success', text: `"${mod.title}" modülü sınıf izinleri güncellendi.` });
            setTimeout(() => setModuleMessage(null), 3000);
        } catch (err) {
            console.error('Error updating module assignments:', err);
            setModuleMessage({ type: 'error', text: 'Modül yetkisi güncellenirken hata oluştu.' });
            fetchModules(); // revert
        } finally {
            setModuleAssigning(null);
        }
    };

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/teachers/profile');
            setProfile(res.data.user);
            setVerification(res.data.verification);
            setFormData({
                firstName: res.data.user.firstName || '',
                lastName: res.data.user.lastName || '',
                phone: res.data.user.phone || '',
                nationalId: res.data.user.nationalId || '',
                birthDate: res.data.user.birthDate || '',
                startDate: res.data.user.startDate || '',
                address: res.data.user.address || ''
            });
        } catch (err) {
            console.error('Error fetching teacher profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setStatusMessage({ type: '', text: '' });

        if (formData.nationalId && formData.nationalId.length === 11 && !validateTCKN(formData.nationalId)) {
            setStatusMessage({ type: 'error', text: 'Geçersiz T.C. Kimlik Numarası.' });
            return;
        }

        setSaving(true);
        try {
            const res = await api.put('/api/teachers/profile', formData);
            setProfile(res.data.user);
            setIsEditing(false);
            setStatusMessage({ type: 'success', text: 'Profil bilgileriniz başarıyla güncellendi.' });
            setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
        } catch (err) {
            console.error('Error saving teacher profile:', err);
            setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Bilgiler kaydedilemedi.' });
        } finally {
            setSaving(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleFilesAdded = (files) => {
        if (!files || files.length === 0) return;
        const newItems = Array.from(files).map(file => {
            const isImage = file.type.startsWith('image/');
            return {
                id: Math.random().toString(36).substring(2, 9),
                file,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                docType: 'degree',
                previewUrl: isImage ? URL.createObjectURL(file) : null,
                isImage
            };
        });
        setQueuedFiles(prev => [...prev, ...newItems]);
    };

    const handleRemoveQueuedFile = (id) => {
        setQueuedFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleUpdateQueuedType = (id, newType) => {
        setQueuedFiles(prev => prev.map(f => f.id === id ? { ...f, docType: newType } : f));
    };

    const handleUploadQueuedFiles = async () => {
        if (queuedFiles.length === 0) {
            setStatusMessage({ type: 'error', text: 'Lütfen yüklenecek en az bir dosya ekleyin.' });
            return;
        }

        setUploading(true);
        setStatusMessage({ type: '', text: '' });

        const uploadData = new FormData();
        queuedFiles.forEach(item => {
            uploadData.append('documents', item.file);
            uploadData.append(`type_${item.file.name}`, item.docType);
            uploadData.append(`title_${item.file.name}`, item.fileName);
        });

        try {
            const res = await api.post('/api/teachers/upload-document', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setVerification((prev) => ({
                ...prev,
                documents: res.data.documents
            }));
            setQueuedFiles([]);
            setStatusMessage({ type: 'success', text: res.data.message || 'Dosyalar başarıyla yüklendi.' });
            setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
        } catch (err) {
            console.error('Error uploading documents:', err);
            setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Dosyalar yüklenirken hata oluştu.' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (docId) => {
        if (!window.confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;
        setDeletingDocId(docId);
        try {
            const res = await api.delete(`/api/teachers/documents/${docId}`);
            setVerification((prev) => ({
                ...prev,
                documents: res.data.documents
            }));
            setStatusMessage({ type: 'success', text: 'Belge başarıyla silindi.' });
            setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error('Error deleting document:', err);
            setStatusMessage({ type: 'error', text: 'Belge silinemedi.' });
        } finally {
            setDeletingDocId(null);
        }
    };

    const displayName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName}`
        : profile?.username || 'Öğretmen';

    const avatarInitial = profile?.firstName
        ? profile.firstName.charAt(0).toUpperCase()
        : profile?.username?.charAt(0).toUpperCase() || 'Ö';

    const getDocTypeName = (type) => {
        switch (type) {
            case 'id_proof': return 'Kimlik Belgesi (Nüfus Cüzdanı / Pasaport)';
            case 'teaching_certificate': return 'Öğretmenlik / Görev Belgesi / MEB Kartı';
            case 'degree': return 'Diploma / Mezuniyet Belgesi';
            case 'certificate': return 'Sertifika / Başarı Belgesi';
            case 'other': return 'Diğer Destekleyici Belge / Görsel';
            default: return type || 'Doğrulama Belgesi';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Panelim', to: '/dashboard' },
                        { label: 'Öğretmen Profilim' }
                    ]}
                    badge="Öğretmen Kimliği"
                    badgeVariant="primary"
                    title="Öğretmen Profilim & Belgelerim"
                    description="Kişisel bilgileriniz, T.C. kimlik numaranız, işe başlama tarihiniz ve mesleki doğrulama belgeleriniz."
                />

                {statusMessage.text && (
                    <div className={`p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 ${
                        statusMessage.type === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-destructive/10 border border-destructive/20 text-destructive'
                    }`}>
                        {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}

                {/* Profile Hero Card with Chrome Pattern */}
                <Card className="border-border shadow-sm chrome-pattern">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 p-2 sm:p-3">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-3xl shadow-sm shrink-0">
                                {avatarInitial}
                            </div>

                            <div className="space-y-2 text-center sm:text-left">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <h2 className="text-2xl font-bold text-foreground tracking-tight">
                                        {displayName}
                                    </h2>
                                    <Badge variant="primary" size="xs">
                                        Öğretmen
                                    </Badge>
                                    {profile?.isVerified ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                                            <CheckCircle className="w-3 h-3" /> Onaylı Hesap
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                                            <Clock className="w-3 h-3" /> Onay Bekleniyor
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span>Kullanıcı Adı: <strong className="text-foreground">@{profile?.username}</strong></span>
                                    </span>
                                    {profile?.email && (
                                        <span className="flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>{profile.email}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!isEditing && (
                            <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={Edit3}
                                onClick={() => setIsEditing(true)}
                                className="shrink-0"
                            >
                                Bilgileri Düzenle
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Section 1: Kişisel Bilgiler & Görev Detayları */}
                <Card className="border-border shadow-sm p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-border/70 pb-3">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-primary" />
                            <h3 className="font-bold text-base text-foreground">Kişisel Bilgiler & Görev Bilgisi</h3>
                        </div>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" /> İptal
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">Ad</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">Soyad</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">T.C. Kimlik No</label>
                                    <input
                                        type="text"
                                        value={formData.nationalId}
                                        maxLength={11}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                            setFormData(prev => ({ ...prev, nationalId: val }));
                                        }}
                                        placeholder="11 haneli TCKN"
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">Doğum Tarihi</label>
                                    <input
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">İşe Başlama Tarihi</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">Telefon Numarası</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="05XX XXX XX XX"
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">İkametgâh / Adres</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="İl, İlçe, Mahalle, Sokak..."
                                        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsEditing(false)}
                                >
                                    Vazgeç
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    leftIcon={Save}
                                    isLoading={saving}
                                >
                                    Değişiklikleri Kaydet
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                                <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> T.C. Kimlik No
                                </span>
                                <span className="text-sm font-semibold font-mono text-foreground">
                                    {profile?.nationalId ? maskTC(profile.nationalId) : 'Belirtilmedi'}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                                <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Doğum Tarihi
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                    {profile?.birthDate || 'Belirtilmedi'}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                                <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" /> İşe Başlama Tarihi
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                    {profile?.startDate || 'Belirtilmedi'}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                                <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Telefon Numarası
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                    {profile?.phone || 'Belirtilmedi'}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1 sm:col-span-2">
                                <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> İkametgâh / Adres
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                    {profile?.address || 'Belirtilmedi'}
                                </span>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Section 2: Öğretmenlik Belgeleri ve Yükleme Alanı */}
                <Card className="border-border shadow-sm p-5 sm:p-6 space-y-5">
                    <div className="flex items-center gap-2 border-b border-border/70 pb-3">
                        <Shield className="w-4 h-4 text-primary" />
                        <div>
                            <h3 className="font-bold text-base text-foreground">Öğretmenlik Doğrulama Belgeleri</h3>
                            <p className="text-xs text-muted-foreground">Sisteme yüklediğiniz belgeler ve onay durumları aşağıda listelenmiştir.</p>
                        </div>
                    </div>

                    {/* Yüklü Belgeler Listesi */}
                    <div className="space-y-3">
                        {verification?.documents && verification.documents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {verification.documents.map((doc, idx) => (
                                    <div
                                        key={doc._id || idx}
                                        className="p-4 rounded-xl bg-muted/40 border border-border/70 flex items-start justify-between gap-3 shadow-xs hover:border-border transition-colors"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                                {doc.fileType?.startsWith('image/') || doc.url?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                                    <ImageIcon className="w-5 h-5" />
                                                ) : (
                                                    <FileText className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate" title={doc.fileName || doc.title}>
                                                    {doc.fileName || doc.title || getDocTypeName(doc.type)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {getDocTypeName(doc.type)}
                                                    {doc.fileSize ? ` • ${formatBytes(doc.fileSize)}` : ''}
                                                </p>
                                                <div className="pt-0.5 flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                                                        <CheckCircle className="w-3 h-3" /> Yüklendi
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(doc.uploadedAt).toLocaleDateString('tr-TR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
                                                title="Belgeyi Görüntüle"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Aç</span>
                                            </a>

                                            <button
                                                type="button"
                                                disabled={deletingDocId === (doc._id || doc.publicId)}
                                                onClick={() => handleDeleteDocument(doc._id || doc.publicId)}
                                                className="p-2 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs flex items-center transition-colors cursor-pointer disabled:opacity-50"
                                                title="Belgeyi Sil"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center rounded-xl bg-muted/20 border border-dashed border-border/80 text-muted-foreground text-xs">
                                Henüz yüklenmiş bir belge bulunamadı. Lütfen aşağıdaki sürükle-bırak alanından belgelerinizi yükleyiniz.
                            </div>
                        )}
                    </div>

                    {/* Drag & Drop Çoklu Belge Yükleme Alanı */}
                    <div className="pt-4 border-t border-border/70 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5 text-primary" />
                                <span>Belge & Görsel Yükle (Sürükle - Bırak)</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">Birden fazla dosya seçilebilir</span>
                        </div>

                        {/* Dropzone Container */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                if (e.dataTransfer.files) {
                                    handleFilesAdded(e.dataTransfer.files);
                                }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                                isDragging
                                    ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.25)] scale-[1.01]'
                                    : 'border-border/80 hover:border-primary/50 bg-muted/15 hover:bg-muted/30'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.odt,.txt,image/jpeg,image/png,image/webp,image/jpg"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        handleFilesAdded(e.target.files);
                                    }
                                }}
                            />

                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                isDragging ? 'bg-primary text-primary-foreground scale-110' : 'bg-primary/10 text-primary'
                            }`}>
                                <Upload className="w-6 h-6" />
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                    Dosyaları buraya sürükleyip bırakın
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    ya da cihazınızdan seçmek için <span className="text-primary font-medium underline underline-offset-2">tıklayın</span>
                                </p>
                            </div>

                            <p className="text-[11px] text-muted-foreground/80 max-w-md">
                                PDF, Word belgeleri (.pdf, .doc, .docx) ve Görseller (PNG, JPG, JPEG, WebP) desteklenir.
                            </p>
                        </div>

                        {/* Yüklenmeye Hazır Seçilmiş Dosyalar Kuyruğu */}
                        {queuedFiles.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                        <FileCheck className="w-3.5 h-3.5 text-primary" />
                                        Yüklenmeyi Bekleyen Dosyalar ({queuedFiles.length})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setQueuedFiles([])}
                                        className="text-muted-foreground hover:text-destructive text-[11px] transition-colors cursor-pointer"
                                    >
                                        Listeyi Temizle
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {queuedFiles.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {item.previewUrl ? (
                                                    <img
                                                        src={item.previewUrl}
                                                        alt={item.fileName}
                                                        className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0 border border-border">
                                                        <FileText className="w-5 h-5 text-primary" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-foreground truncate">
                                                        {item.fileName}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {formatBytes(item.fileSize)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <select
                                                    value={item.docType}
                                                    onChange={(e) => handleUpdateQueuedType(item.id, e.target.value)}
                                                    className="px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="id_proof">Kimlik Belgesi</option>
                                                    <option value="teaching_certificate">Öğretmenlik / Görev Belgesi</option>
                                                    <option value="degree">Diploma / Mezuniyet Belgesi</option>
                                                    <option value="certificate">Sertifika / Belge</option>
                                                    <option value="other">Diğer Destekleyici Belge</option>
                                                </select>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveQueuedFile(item.id)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                                    title="Listeden Kaldır"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        leftIcon={Upload}
                                        isLoading={uploading}
                                        onClick={handleUploadQueuedFiles}
                                    >
                                        Seçilenleri Yükle ({queuedFiles.length} Dosya)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Section 3: Sınıf Modül Yetkileri & Eklentiler */}
                <Card className="border-border shadow-sm p-5 sm:p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                    <Blocks className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                        Sınıf Modül Yetkileri & Eklentiler
                                        <Badge variant="primary" size="xs">
                                            {modulesData.length} Modül
                                        </Badge>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Hangi eklenti modüllerinin hangi sınıflarınızda aktif olacağını belirleyin.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link
                            to="/modules"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary hover:text-primary-focus bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20 shrink-0 self-start sm:self-auto"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Tüm Modülleri İncele
                        </Link>
                    </div>

                    {moduleMessage && (
                        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                            moduleMessage.type === 'success' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-destructive/10 text-destructive border border-destructive/20'
                        }`}>
                            {moduleMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                            <span>{moduleMessage.text}</span>
                        </div>
                    )}

                    {modulesLoading ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            Modüller yükleniyor...
                        </div>
                    ) : modulesData.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            Sistemde tanımlı aktif modül bulunmuyor.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {modulesData.map((module) => {
                                const assignedIds = (module.assignedClasses || []).map(c => (c._id ? c._id.toString() : c.toString()));

                                return (
                                    <div
                                        key={module._id}
                                        className="p-4 rounded-2xl bg-card/60 border border-border hover:border-primary/30 transition-all space-y-3"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                {module.coverImage ? (
                                                    <img
                                                        src={module.coverImage}
                                                        alt={module.title}
                                                        className="w-16 h-10 rounded-lg object-cover border border-border shrink-0 aspect-video"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                                                        <Blocks className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm font-semibold text-foreground">
                                                            {module.title}
                                                        </h4>
                                                        {module.badgeText && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                                {module.badgeText}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                        {module.shortDescription}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="text-[11px] font-medium text-muted-foreground shrink-0 self-start">
                                                {assignedIds.length} / {teacherClasses.length} Sınıfta Aktif
                                            </span>
                                        </div>

                                        <div className="pt-2 border-t border-border/50">
                                            <p className="text-[11px] font-semibold text-foreground/80 mb-2">
                                                Bu modülün çalışacağı sınıfları seçin:
                                            </p>

                                            {teacherClasses.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">
                                                    Hesabınıza tanımlı aktif sınıf bulunmuyor.
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {teacherClasses.map((cls) => {
                                                        const isAssigned = assignedIds.includes(cls._id.toString());
                                                        const isBusy = moduleAssigning === module.key;

                                                        return (
                                                            <button
                                                                key={cls._id}
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() => handleToggleClassModule(module.key, cls._id)}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                    isAssigned
                                                                        ? 'bg-primary/20 text-primary border-primary/50 shadow-xs'
                                                                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground'
                                                                } ${isBusy ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
                                                                title={isAssigned ? 'Modülü bu sınıftan kaldır' : 'Modülü bu sınıfa ekle'}
                                                            >
                                                                {isAssigned ? (
                                                                    <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                                                                ) : (
                                                                    <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                                                )}
                                                                <span>{cls.name || `${cls.grade}/${cls.section} Sınıfı`}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default TeacherProfilePage;
