import React, { useState, useEffect } from 'react';
import {
    GraduationCap,
    School,
    User,
    Phone,
    Users,
    Mail,
    Calendar,
    Shield,
    BookOpen,
    Hash,
    AlertCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import {
    PageHeader,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    EmptyState,
    Button
} from '../components/ui';

const StudentProfilePage = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pairingCode, setPairingCode] = useState('');
    const [pairingLoading, setPairingLoading] = useState(false);
    const [pairingMessage, setPairingMessage] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        api.get('/api/students/me')
            .then(res => setProfile(res.data))
            .catch(err => console.error('Error fetching profile:', err))
            .finally(() => setLoading(false));
    }, []);

    const handlePairClass = async (e) => {
        e.preventDefault();
        if (!pairingCode.trim()) return;

        setPairingLoading(true);
        setPairingMessage(null);
        try {
            const res = await api.post('/api/students/pair', {
                matchingCode: pairingCode.trim().toUpperCase()
            });
            setPairingMessage({
                type: res.data.pending ? 'pending' : 'success',
                text: res.data.message || (res.data.pending ? 'Eşleşme talebi öğretmene iletildi. Onaylandıktan sonra sınıfa dahil edileceksiniz' : 'Sınıf eşleşmesi başarıyla yapıldı!')
            });
            const profRes = await api.get('/api/students/me');
            setProfile(profRes.data);
            setPairingCode('');
        } catch (err) {
            setPairingMessage({
                type: 'error',
                text: err.response?.data?.message || 'Eşleştirme kodu geçersiz. Lütfen kontrol ediniz.'
            });
        } finally {
            setPairingLoading(false);
        }
    };

    const displayName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName}`
        : user?.username || 'Öğrenci';

    const avatarInitial = profile?.firstName
        ? profile.firstName.charAt(0).toUpperCase()
        : user?.username?.charAt(0).toUpperCase() || 'Ö';

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Panelim', to: '/dashboard' },
                        { label: 'Öğrenci Profilim' }
                    ]}
                    badge="Öğrenci Kimliği"
                    badgeVariant="primary"
                    title="Profil & Bilgilerim"
                    description="Kayıtlı okul, sınıf, öğrenci numarası ve veli irtibat detaylarınız."
                />

                {/* Profile Hero Card with Chrome Pattern */}
                <Card className="border-border shadow-sm chrome-pattern">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-2">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-3xl shadow-sm shrink-0">
                            {avatarInitial}
                        </div>

                        <div className="space-y-2 text-center sm:text-left flex-1">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                                    {displayName}
                                </h2>
                                <Badge variant="primary" size="xs">
                                    Öğrenci
                                </Badge>
                                {profile?.studentNumber && (
                                    <Badge variant="neutral" size="xs">
                                        No: {profile.studentNumber}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Kullanıcı Adı: <strong className="text-foreground">@{user?.username}</strong></span>
                                </span>
                                {user?.email && (
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span>{user.email}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sınıf Eşleşme Talebi Beklemede */}
                    {profile && (profile.status === 'pending' || profile.pendingClassId) && (
                        <div className="mt-4 pt-4 border-t border-border/80 p-2">
                            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2.5">
                                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                                    <Clock className="w-4 h-4 animate-spin-slow shrink-0" />
                                    <span>Eşleşme Talebi Beklemede</span>
                                </div>
                                <p className="text-xs text-foreground font-medium">
                                    Eşleşme talebi öğretmene iletildi. Onaylandıktan sonra sınıfa dahil edileceksiniz.
                                </p>
                                {profile.pendingClassId && (
                                    <div className="text-[11px] text-muted-foreground bg-background/60 border border-border/60 rounded-lg p-2.5 flex items-center justify-between">
                                        <span>Talep Edilen Sınıf:</span>
                                        <strong className="text-foreground font-semibold">
                                            {profile.pendingClassId.name || `${profile.pendingClassId.grade}/${profile.pendingClassId.section}`} {profile.pendingClassId.schoolName ? `(${profile.pendingClassId.schoolName})` : ''}
                                        </strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sınıf Eşleştirme Alanı (Sınıf silinmişse veya atanmamışsa ve talep beklemede değilse) */}
                    {profile && (!profile?.classId || profile?.status === 'unassigned') && profile?.status !== 'pending' && !profile?.pendingClassId && (
                        <div className="mt-4 pt-4 border-t border-border/80 p-2">
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>Sınıf Eşleştirmesi Gerekli</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Kayıtlı olduğunuz bir sınıf bulunmuyor veya önceki sınıfınız silindi. Yeni sınıfınıza dahil olmak için sınıf eşleştirme kodunuzu giriniz.
                                </p>
                                <form onSubmit={handlePairClass} className="flex flex-col sm:flex-row gap-2 max-w-md">
                                    <input
                                        type="text"
                                        value={pairingCode}
                                        onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                                        placeholder="Sınıf Kodu (örn: EDU-4A-8X2Y)"
                                        className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-xs font-mono tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        loading={pairingLoading}
                                        disabled={!pairingCode.trim()}
                                    >
                                        Eşleş
                                    </Button>
                                </form>
                                <p className="text-xs font-medium text-amber-500 flex items-center gap-1.5">
                                    <span>⚠️</span> Öğretmeninizden sınıf eşleştirme kodunuzu talep ediniz.
                                </p>
                                {pairingMessage && (
                                    <div className={`p-2.5 rounded-lg border text-xs font-medium ${
                                        pairingMessage.type === 'pending'
                                            ? 'bg-primary/10 border-primary/20 text-primary'
                                            : pairingMessage.type === 'success'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                            : 'bg-destructive/10 border-destructive/20 text-destructive'
                                    }`}>
                                        {pairingMessage.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                {loading ? (
                    <div className="p-16 text-center text-muted-foreground text-xs space-y-2">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Profil bilgileri yükleniyor...
                    </div>
                ) : !profile ? (
                    <Card className="chrome-pattern">
                        <EmptyState
                            icon={GraduationCap}
                            title="Öğrenci Kaydı Bulunamadı"
                            description="Hesabınıza atanmış resmi bir öğrenci profili kaydı bulunmuyor."
                        />
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Okul ve Sınıf Bilgileri */}
                        <Card className="chrome-pattern">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                        <School className="w-4 h-4" />
                                    </div>
                                    <CardTitle>Okul & Sınıf Bilgileri</CardTitle>
                                </div>
                                <CardDescription>Kayıtlı olduğunuz eğitim kurumu ve sınıf şubesi</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3.5 text-xs divide-y divide-border/60">
                                    <div className="pt-2 flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Okul Adı:</span>
                                        <span className="font-semibold text-foreground">{profile.classId?.schoolName || '—'}</span>
                                    </div>
                                    <div className="pt-3 flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Sınıf / Şube:</span>
                                        <Badge variant="primary" size="sm">
                                            {profile.classId?.name || `${profile.classId?.grade}/${profile.classId?.section}` || '—'}
                                        </Badge>
                                    </div>
                                    <div className="pt-3 flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Öğrenci Numarası:</span>
                                        <span className="font-semibold text-foreground font-mono">{profile.studentNumber || '—'}</span>
                                    </div>
                                    <div className="pt-3 flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Sınıf Öğretmeni:</span>
                                        <span className="font-semibold text-foreground">
                                            {profile.classId?.teacherName || profile.teacherId?.username || '—'}
                                        </span>
                                    </div>
                                    <div className="pt-3 flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Eğitim Öğretim Yılı:</span>
                                        <span className="font-semibold text-foreground">{profile.classId?.academicYear || '2026-2027'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Veli Bilgileri */}
                        <Card className="chrome-pattern">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <CardTitle>Kayıtlı Veli Bilgileri</CardTitle>
                                </div>
                                <CardDescription>Acil durumlar ve bildirimler için kayıtlı veli irtibatları</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {profile.guardians && profile.guardians.length > 0 ? (
                                    <div className="space-y-3">
                                        {profile.guardians.map((g, idx) => (
                                            <div key={idx} className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-foreground text-sm">{g.fullName}</span>
                                                    <Badge variant="secondary" size="xs">
                                                        {g.relationship || `${idx + 1}. Veli`}
                                                    </Badge>
                                                </div>
                                                <p className="text-muted-foreground flex items-center gap-2 pt-1 font-mono">
                                                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span>{g.phonePrimary || '—'}</span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-muted-foreground text-xs">
                                        Kayıtlı veli bilgisi bulunmuyor.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default StudentProfilePage;
