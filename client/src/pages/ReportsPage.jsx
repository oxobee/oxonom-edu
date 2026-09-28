import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3,
    FileText,
    FileSpreadsheet,
    Users,
    CheckCircle2,
    GraduationCap,
    Search,
    Award,
    Calendar,
    X,
    TrendingUp,
    AlertCircle,
    ChevronRight,
    ChevronDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import api from '../lib/api';
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
    Input,
    AnimatedItem,
    AnimatedTableWrapper,
    AnimatedTableBody,
    AnimatedTableRow,
    AnimatedProgress,
    AnimatedNumber
} from '../components/ui';

const ReportsPage = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [examTypeFilter, setExamTypeFilter] = useState('all'); // 'all', 'oral', 'midterm', 'final'
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    // Student detail drilldown modal
    const [selectedStudentDrilldown, setSelectedStudentDrilldown] = useState(null);
    const [drilldownLoading, setDrilldownLoading] = useState(false);

    useEffect(() => {
        api.get('/api/classes')
            .then(res => {
                const list = res.data || [];
                setClasses(list);
                if (list.length > 0) {
                    setSelectedClassId(list[0]._id);
                }
            })
            .catch(err => console.error('Error fetching classes:', err));
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchClassReport();
        }
    }, [selectedClassId, examTypeFilter]);

    const fetchClassReport = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (examTypeFilter !== 'all') {
                queryParams.append('examType', examTypeFilter);
            }
            const res = await api.get(`/api/reports/class/${selectedClassId}?${queryParams.toString()}`);
            setReportData(res.data);
        } catch (err) {
            console.error('Error fetching report:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStudentClick = async (studentId) => {
        setDrilldownLoading(true);
        try {
            const res = await api.get(`/api/reports/class/${selectedClassId}/student/${studentId}`);
            setSelectedStudentDrilldown(res.data);
        } catch (err) {
            console.error('Error fetching student drilldown:', err);
        } finally {
            setDrilldownLoading(false);
        }
    };

    // PDF Export Generation
    const handleExportPDF = () => {
        if (!reportData) return;

        const doc = new jsPDF();
        const className = reportData.classInfo?.name || 'Sınıf';
        const dateStr = new Date().toLocaleDateString('tr-TR');

        doc.setFontSize(18);
        doc.text(`EduBoard - ${className} Başarı ve Devam Raporu`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Tarih: ${dateStr} | Okul: ${reportData.classInfo?.schoolName || '—'}`, 14, 28);
        doc.line(14, 32, 196, 32);

        doc.setFontSize(12);
        doc.text('Sınıf Genel Özeti', 14, 40);
        doc.setFontSize(9);
        doc.text(`Toplam Öğrenci: ${reportData.summary?.totalStudents || 0}`, 14, 48);
        doc.text(`Ortalama Devam Oranı: %${reportData.summary?.overallAttendanceRate || 100}`, 70, 48);
        doc.text(`Genel Sınav Ortalaması: ${reportData.summary?.overallExamAverage || 0}`, 140, 48);
        doc.text(`Toplam Yoklama Oturumu: ${reportData.summary?.totalSessions || 0}`, 14, 55);
        doc.text(`En Yüksek Puan: ${reportData.summary?.highestExamScore || '—'}`, 70, 55);
        doc.text(`En Düşük Puan: ${reportData.summary?.lowestExamScore || '—'}`, 140, 55);
        doc.line(14, 60, 196, 60);

        doc.setFontSize(11);
        doc.text('Öğrenci Performans Listesi', 14, 68);

        let y = 76;
        doc.setFontSize(8);
        doc.text('Öğrenci Ad Soyad', 14, y);
        doc.text('Devam %', 80, y);
        doc.text('Gelmedi', 105, y);
        doc.text('Geç', 125, y);
        doc.text('Sözlü', 145, y);
        doc.text('Ara Sınav', 165, y);
        doc.text('Genel Ort', 185, y);
        y += 4;
        doc.line(14, y, 196, y);
        y += 5;

        (reportData.studentPerformance || []).forEach((s) => {
            if (y > 275) {
                doc.addPage();
                y = 20;
            }
            doc.text(s.fullName.substring(0, 24), 14, y);
            doc.text(`%${s.attendance?.rate || 100}`, 80, y);
            doc.text(`${s.attendance?.absent || 0}`, 105, y);
            doc.text(`${s.attendance?.late || 0}`, 125, y);
            doc.text(`${s.exams?.oralAvg || '—'}`, 145, y);
            doc.text(`${s.exams?.midtermAvg || '—'}`, 165, y);
            doc.text(`${s.exams?.overallAvg || '—'}`, 185, y);
            y += 6;
        });

        doc.save(`${className}_Raporu_${dateStr.replace(/\./g, '_')}.pdf`);
    };

    // XLSX Multi-Sheet Export Generation
    const handleExportXLSX = () => {
        if (!reportData) return;

        const wb = XLSX.utils.book_new();

        // 1. Özet Sheet
        const summaryData = [
            ['Rapor Başlığı', 'EduBoard Sınıf Raporu'],
            ['Sınıf', reportData.classInfo?.name || ''],
            ['Okul', reportData.classInfo?.schoolName || ''],
            ['Tarih', new Date().toLocaleDateString('tr-TR')],
            ['Toplam Öğrenci', reportData.summary?.totalStudents || 0],
            ['Toplam Yoklama Sayısı', reportData.summary?.totalSessions || 0],
            ['Genel Devam Oranı (%)', reportData.summary?.overallAttendanceRate || 100],
            ['Sınıf Sınav Ortalaması', reportData.summary?.overallExamAverage || 0],
            ['En Yüksek Puan', reportData.summary?.highestExamScore || 0],
            ['En Düşük Puan', reportData.summary?.lowestExamScore || 0]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet');

        // 2. Devamsızlık Sheet
        const attendanceData = [
            ['Ad Soyad', 'Öğrenci No', 'Geldi', 'Gelmedi', 'Geç', 'İzinli', 'Devam Oranı (%)']
        ];
        (reportData.studentPerformance || []).forEach(s => {
            attendanceData.push([
                s.fullName,
                s.studentNumber || '—',
                s.attendance?.present || 0,
                s.attendance?.absent || 0,
                s.attendance?.late || 0,
                s.attendance?.excused || 0,
                `%${s.attendance?.rate || 100}`
            ]);
        });
        const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceData);
        XLSX.utils.book_append_sheet(wb, wsAttendance, 'Devamsızlık');

        // 3. Sınavlar Sheet
        const examsData = [
            ['Ad Soyad', 'Öğrenci No', 'Sözlü Ort.', 'Ara Sınav Ort.', 'Genel Sınav Ort.', 'Genel Ortalama', 'Sınav Sayısı']
        ];
        (reportData.studentPerformance || []).forEach(s => {
            examsData.push([
                s.fullName,
                s.studentNumber || '—',
                s.exams?.oralAvg || '—',
                s.exams?.midtermAvg || '—',
                s.exams?.finalAvg || '—',
                s.exams?.overallAvg || '—',
                s.exams?.totalExamsTaken || 0
            ]);
        });
        const wsExams = XLSX.utils.aoa_to_sheet(examsData);
        XLSX.utils.book_append_sheet(wb, wsExams, 'Sınavlar');

        // 4. Öğrenciler Master Sheet
        const masterData = [
            ['Ad Soyad', 'Öğrenci No', 'Devam Oranı (%)', 'Devamsızlık (Gün)', 'Geç Kalma', 'Not Ortalaması']
        ];
        (reportData.studentPerformance || []).forEach(s => {
            masterData.push([
                s.fullName,
                s.studentNumber || '—',
                `%${s.attendance?.rate || 100}`,
                s.attendance?.absent || 0,
                s.attendance?.late || 0,
                s.exams?.overallAvg || '—'
            ]);
        });
        const wsStudents = XLSX.utils.aoa_to_sheet(masterData);
        XLSX.utils.book_append_sheet(wb, wsStudents, 'Öğrenciler');

        const className = reportData.classInfo?.name || 'Sinif';
        XLSX.writeFile(wb, `${className}_Raporu.xlsx`);
    };

    const filteredStudents = (reportData?.studentPerformance || []).filter(s =>
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.studentNumber && s.studentNumber.includes(studentSearch))
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Panelim', to: '/teacher-dashboard' },
                        { label: 'Raporlar & Analitik' }
                    ]}
                    badge="Performans Takibi"
                    badgeVariant="cyan"
                    title="Raporlar & İstatistikler"
                    description="Sınıf başarısını, devamsızlık durumlarını ve sınav ortalamalarını inceleyin; resmi PDF veya Excel çıktısı alın."
                    actions={
                        <div className="flex flex-wrap items-center gap-2.5">
                            {classes.length > 0 && (
                                <div className="relative">
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="px-3.5 py-2 pr-9 rounded-lg bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring appearance-none shadow-2xs cursor-pointer"
                                    >
                                        {classes.map(c => (
                                            <option key={c._id} value={c._id}>
                                                {c.name || `${c.grade}/${c.section}`} {c.schoolName ? `(${c.schoolName})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={FileText}
                                onClick={handleExportPDF}
                                disabled={!reportData}
                                className="shadow-2xs"
                            >
                                PDF İndir
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                leftIcon={FileSpreadsheet}
                                onClick={handleExportXLSX}
                                disabled={!reportData}
                                className="shadow-xs font-semibold"
                            >
                                Excel İndir
                            </Button>
                        </div>
                    }
                />

                {/* Sınav Kategori Filtresi */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/80 w-fit text-xs font-medium">
                    <span className="text-muted-foreground px-2 text-[11px] uppercase font-bold tracking-wider">Kategori:</span>
                    {[
                        { id: 'all', label: 'Tümü' },
                        { id: 'oral', label: 'Sözlü' },
                        { id: 'midterm', label: 'Ara Sınav' },
                        { id: 'final', label: 'Genel Sınav' }
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => setExamTypeFilter(type.id)}
                            className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                                examTypeFilter === type.id
                                    ? 'bg-background text-foreground shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="p-16 text-center text-muted-foreground text-xs space-y-2">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Rapor verileri hesaplanıyor...
                    </div>
                ) : !reportData ? (
                    <Card>
                        <EmptyState
                            icon={BarChart3}
                            title="Rapor Verisi Bulunamadı"
                            description="Seçilen sınıf için henüz yeterli yoklama veya sınav kaydı bulunmuyor."
                        />
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Metrics Cards with AnimatedNumber */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <AnimatedItem index={0} stagger={0.04}>
                                <StatCard
                                    title="Toplam Öğrenci"
                                    value={reportData.summary?.totalStudents || 0}
                                    description="Aktif kayıtlı sınıf mevcudu"
                                    icon={Users}
                                    color="indigo"
                                />
                            </AnimatedItem>
                            <AnimatedItem index={1} stagger={0.04}>
                                <StatCard
                                    title="Ortalama Devam"
                                    value={reportData.summary?.overallAttendanceRate || 100}
                                    prefix="%"
                                    description={`${reportData.summary?.totalSessions || 0} yoklama oturumu`}
                                    icon={CheckCircle2}
                                    color="cyan"
                                />
                            </AnimatedItem>
                            <AnimatedItem index={2} stagger={0.04}>
                                <StatCard
                                    title="Sınav Ortalaması"
                                    value={typeof reportData.summary?.overallExamAverage === 'number' ? reportData.summary.overallExamAverage : 0}
                                    description={`${reportData.summary?.totalExams || 0} sınav üzerinden`}
                                    icon={GraduationCap}
                                    color="amber"
                                />
                            </AnimatedItem>
                            <AnimatedItem index={3} stagger={0.04}>
                                <StatCard
                                    title="En Yüksek Puan"
                                    value={typeof reportData.summary?.highestExamScore === 'number' ? reportData.summary.highestExamScore : 0}
                                    description={`En düşük not: ${reportData.summary?.lowestExamScore || '—'}`}
                                    icon={Award}
                                    color="emerald"
                                />
                            </AnimatedItem>
                        </div>

                        {/* Derslere Göre Başarı ve Sınav Türü Grafikleri */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Derslere Göre Başarı */}
                            <Card className="chrome-pattern">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                                        Derslere Göre Başarı Ortalamaları
                                    </CardTitle>
                                    <CardDescription>
                                        Müfredat derslerinin sınıf bazındaki genel başarı yüzdeleri
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {reportData.subjectAverages?.length === 0 ? (
                                        <p className="text-muted-foreground text-xs py-6 text-center">Henüz notlandırılmış sınav yok.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {reportData.subjectAverages.map(sub => (
                                                <div key={sub.subject} className="space-y-1.5">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="font-semibold text-foreground">{sub.subject}</span>
                                                        <span className="font-bold text-primary">{sub.average} Puan</span>
                                                    </div>
                                                    <AnimatedProgress
                                                        value={sub.average}
                                                        max={100}
                                                        color="cyan"
                                                        size="md"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Sınav Türlerine Göre Ortalama */}
                            <Card className="chrome-pattern">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                                        Sınav Türlerine Göre Ortalamalar
                                    </CardTitle>
                                    <CardDescription>
                                        Sözlü, ara sınav ve genel sınav kategorilerinin başarı dağılımı
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-3 text-center pt-2">
                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                                            <div className="text-xs text-muted-foreground mb-1 font-medium">Sözlü</div>
                                            <div className="text-2xl font-bold text-primary">{reportData.typeAverages?.oral || '—'}</div>
                                            <p className="text-[10px] text-muted-foreground mt-1">Katılım & Ödev</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                                            <div className="text-xs text-muted-foreground mb-1 font-medium">Ara Sınav</div>
                                            <div className="text-2xl font-bold text-primary">{reportData.typeAverages?.midterm || '—'}</div>
                                            <p className="text-[10px] text-muted-foreground mt-1">Dönem İçi</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                                            <div className="text-xs text-muted-foreground mb-1 font-medium">Genel Sınav</div>
                                            <div className="text-2xl font-bold text-amber-500">{reportData.typeAverages?.final || '—'}</div>
                                            <p className="text-[10px] text-muted-foreground mt-1">Final Değerlendirme</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Master Student Performance Table */}
                        <Card className="chrome-pattern">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                                <div>
                                    <CardTitle>Öğrenci Başarı ve Devamsızlık Karnesi</CardTitle>
                                    <CardDescription>Detaylı geçmiş karnesini görmek için bir öğrenci satırına tıklayın.</CardDescription>
                                </div>
                                <div className="w-full sm:w-64">
                                    <Input
                                        placeholder="Öğrenci ara..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        icon={Search}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <AnimatedTableWrapper className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-border text-muted-foreground font-semibold uppercase text-[10px] bg-muted/40">
                                                <th className="py-3.5 px-4">Öğrenci</th>
                                                <th className="py-3.5 px-4 text-center">Devam Oranı</th>
                                                <th className="py-3.5 px-4 text-center">Gelmedi</th>
                                                <th className="py-3.5 px-4 text-center">Geç</th>
                                                <th className="py-3.5 px-4 text-center">Sözlü Ort.</th>
                                                <th className="py-3.5 px-4 text-center">Ara Sınav Ort.</th>
                                                <th className="py-3.5 px-4 text-center">Genel Ort.</th>
                                                <th className="py-3.5 px-4 text-right">Detay</th>
                                            </tr>
                                        </thead>
                                        <AnimatedTableBody className="divide-y divide-border/60">
                                            {filteredStudents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="py-8 text-center text-muted-foreground">
                                                        Arama kriterine uygun öğrenci bulunamadı.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredStudents.map((s, idx) => (
                                                    <AnimatedTableRow
                                                        key={s.studentId}
                                                        index={idx}
                                                        onClick={() => handleStudentClick(s.studentId)}
                                                        className="hover:bg-muted/40 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="py-3.5 px-4">
                                                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                                {s.fullName}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground">No: {s.studentNumber || '—'}</div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <Badge
                                                                variant={
                                                                    s.attendance.rate >= 90
                                                                        ? 'success'
                                                                        : s.attendance.rate >= 80
                                                                        ? 'warning'
                                                                        : 'danger'
                                                                }
                                                                size="xs"
                                                            >
                                                                %{s.attendance.rate}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-semibold text-destructive">
                                                            {s.attendance.absent} gün
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center text-foreground/80">
                                                            {s.attendance.late}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center text-foreground/80">
                                                            {s.exams.oralAvg || '—'}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center text-foreground/80">
                                                            {s.exams.midtermAvg || '—'}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center font-bold text-primary text-sm">
                                                            {s.exams.overallAvg || '—'}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors inline" />
                                                        </td>
                                                    </AnimatedTableRow>
                                                ))
                                            )}
                                        </AnimatedTableBody>
                                    </AnimatedTableWrapper>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Student Drilldown Modal */}
            <AnimatePresence>
                {selectedStudentDrilldown && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedStudentDrilldown(null)}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-lg space-y-6 my-6 chrome-pattern"
                        >
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">
                                        {selectedStudentDrilldown.student?.fullName}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Öğrenci No: {selectedStudentDrilldown.student?.studentNumber || '—'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedStudentDrilldown(null)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Devamsızlık Detayları */}
                            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Devamsızlık Karnesi
                                </h4>
                                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                    <div className="p-2.5 rounded-xl bg-card border border-border">
                                        <div className="text-[10px] text-muted-foreground">Toplam</div>
                                        <div className="font-bold text-foreground">{selectedStudentDrilldown.attendance?.total}</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-card border border-border">
                                        <div className="text-[10px] text-muted-foreground">Geldi</div>
                                        <div className="font-bold text-emerald-500">{selectedStudentDrilldown.attendance?.present}</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-card border border-border">
                                        <div className="text-[10px] text-muted-foreground">Gelmedi</div>
                                        <div className="font-bold text-destructive">{selectedStudentDrilldown.attendance?.absent}</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-card border border-border">
                                        <div className="text-[10px] text-muted-foreground">Devam %</div>
                                        <div className="font-bold text-primary">%{selectedStudentDrilldown.attendance?.attendanceRate}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Sınav Detayları */}
                            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-amber-500" /> Sınav Geçmişi
                                </h4>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                                    <div className="p-2.5 rounded-xl bg-card border border-border">
                                        <div className="text-[10px] text-muted-foreground">Sözlü Ort.</div>
                                        <div className="font-bold text-foreground">{selectedStudentDrilldown.exams?.oralAvg || '—'}</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-card border border-border">
                                        <div className="text-[10px] text-muted-foreground">Ara Sınav Ort.</div>
                                        <div className="font-bold text-foreground">{selectedStudentDrilldown.exams?.midtermAvg || '—'}</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-card border border-border">
                                        <div className="text-[10px] text-muted-foreground">Genel Ort.</div>
                                        <div className="font-bold text-amber-500">{selectedStudentDrilldown.exams?.overallAvg || '—'}</div>
                                    </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto divide-y divide-border/60 text-xs pr-1">
                                    {selectedStudentDrilldown.exams?.history?.length === 0 ? (
                                        <p className="text-muted-foreground text-xs py-4 text-center">Girilen sınav kaydı bulunmuyor.</p>
                                    ) : (
                                        selectedStudentDrilldown.exams?.history?.map((h, i) => (
                                            <div key={i} className="py-2.5 flex items-center justify-between">
                                                <div>
                                                    <div className="font-semibold text-foreground">{h.name}</div>
                                                    <div className="text-[10px] text-muted-foreground">{h.subject} • {new Date(h.date).toLocaleDateString('tr-TR')}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-primary">{h.score} / {h.maxScore}</div>
                                                    {h.teacherNote && <div className="text-[10px] text-muted-foreground italic">"{h.teacherNote}"</div>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default ReportsPage;
