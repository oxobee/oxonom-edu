import React, { useState, useEffect } from "react";
import { X, Check, Copy, School, User, Key, ArrowRight, Presentation } from "lucide-react";
import api from "../lib/api";
import { Button } from "./ui/Button";

const CLASS_COLOR_PALETTE = [
    { id: 'indigo', name: 'İndigo', hex: '#6366f1' },
    { id: 'blue', name: 'Mavi', hex: '#3b82f6' },
    { id: 'cyan', name: 'Turkuaz', hex: '#06b6d4' },
    { id: 'emerald', name: 'Zümrüt', hex: '#10b981' },
    { id: 'amber', name: 'Kehribar', hex: '#f59e0b' },
    { id: 'rose', name: 'Gül', hex: '#f43f5e' },
    { id: 'purple', name: 'Menekşe', hex: '#a855f7' },
];

const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    if (currentMonth >= 7) {
        return `${currentYear}-${currentYear + 1}`;
    } else {
        return `${currentYear - 1}-${currentYear}`;
    }
};

const CreateClassModal = ({ isOpen, onClose, onSuccess, onCreateClass, initialData = null }) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isEdit = !!(initialData && (initialData._id || initialData.id));

    const [schoolName, setSchoolName] = useState("");
    const [grade, setGrade] = useState("2");
    const [section, setSection] = useState("C");
    const [teacherName, setTeacherName] = useState(user?.username || "");
    const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
    const [name, setName] = useState("2-C");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState("#6366f1");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isCustomName, setIsCustomName] = useState(false);

    // Success Screen State
    const [createdClass, setCreatedClass] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (initialData) {
            const initGrade = initialData.grade || "2";
            const initSection = initialData.section || "C";
            const initName = initialData.name || `${initGrade}-${initSection}`;
            setSchoolName(initialData.schoolName || "");
            setGrade(initGrade);
            setSection(initSection);
            setTeacherName(initialData.teacherName || user?.username || "");
            setAcademicYear(initialData.academicYear || getCurrentAcademicYear());
            setName(initName);
            setDescription(initialData.description || "");
            setColor(initialData.color || "#6366f1");
            setCreatedClass(null);

            const cleanName = String(initName).trim().toLowerCase();
            const std = `${initGrade}-${initSection}`.toLowerCase();
            const stdSlash = `${initGrade}/${initSection}`.toLowerCase();
            setIsCustomName(cleanName !== std && cleanName !== stdSlash);
        } else {
            setSchoolName("");
            setGrade("2");
            setSection("C");
            setTeacherName(user?.username || "");
            setAcademicYear(getCurrentAcademicYear());
            setName("2-C");
            setDescription("");
            setColor("#6366f1");
            setCreatedClass(null);
            setIsCustomName(false);
        }
        setError("");
        setCopied(false);
    }, [isOpen, initialData]);

    const handleGradeChange = (newGrade) => {
        setGrade(newGrade);
        if (!isCustomName) {
            const trimmedGrade = newGrade.trim();
            const trimmedSection = section.trim().toUpperCase();
            if (trimmedGrade || trimmedSection) {
                setName(`${trimmedGrade}-${trimmedSection}`);
            }
        }
    };

    const handleSectionChange = (newSection) => {
        const upper = newSection.toUpperCase();
        setSection(upper);
        if (!isCustomName) {
            const trimmedGrade = grade.trim();
            const trimmedSection = upper.trim();
            if (trimmedGrade || trimmedSection) {
                setName(`${trimmedGrade}-${trimmedSection}`);
            }
        }
    };

    const handleNameChange = (newName) => {
        setName(newName);
        if (!newName.trim()) {
            setIsCustomName(false);
            const trimmedGrade = grade.trim();
            const trimmedSection = section.trim().toUpperCase();
            setName(`${trimmedGrade}-${trimmedSection}`);
        } else {
            setIsCustomName(true);
        }
    };

    if (!isOpen) return null;

    const handleCopyCode = () => {
        if (!createdClass?.matchingCode) return;
        navigator.clipboard.writeText(createdClass.matchingCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    const handleFinish = () => {
        if (createdClass) {
            if (onSuccess) onSuccess(createdClass);
            else if (onCreateClass) onCreateClass(createdClass);
        }
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const trimmedGrade = grade.trim();
            const trimmedSection = section.trim().toUpperCase();
            const defaultName = `${trimmedGrade}-${trimmedSection}`;
            const payload = {
                schoolName: schoolName.trim(),
                grade: trimmedGrade,
                section: trimmedSection,
                teacherName: teacherName.trim(),
                academicYear: academicYear.trim(),
                name: name.trim() || defaultName,
                description: description.trim(),
                color,
            };

            let savedData;
            const classId = initialData?._id || initialData?.id;
            if (isEdit && classId) {
                const res = await api.patch(`/api/classes/${classId}`, payload);
                savedData = res.data;
                if (onSuccess) onSuccess(savedData);
                else if (onCreateClass) onCreateClass(savedData);
                onClose();
            } else {
                const res = await api.post('/api/classes', payload);
                savedData = res.data;
                setCreatedClass(savedData);
            }
        } catch (err) {
            console.error("Error submitting class form:", err);
            setError(err.response?.data?.message || err.message || "Sınıf kaydedilirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <div className="bg-card text-card-foreground border border-border rounded-xl max-w-lg w-full p-6 shadow-xl relative overflow-hidden">
                {/* Header Accent Line */}
                <div 
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: color }}
                />

                {/* Close Button */}
                <button
                    onClick={handleFinish}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-muted"
                    aria-label="Kapat"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* SUCCESS SCREEN */}
                {createdClass ? (
                    <div className="py-2 text-center space-y-4">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 flex items-center justify-center text-xl shadow-xs">
                            <Check className="w-6 h-6" />
                        </div>

                        <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-500">
                                Sınıf Başarıyla Oluşturuldu
                            </span>
                            <h3 className="text-xl font-bold text-foreground mt-1">
                                {createdClass.name}
                            </h3>
                            <p className="text-sm text-muted-foreground font-medium">
                                {createdClass.schoolName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Sınıf Öğretmeni: {createdClass.teacherName}
                            </p>
                        </div>

                        {/* Matching Code Display Box */}
                        <div className="p-4 rounded-xl bg-muted/40 border border-border text-center space-y-2">
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-foreground" />
                                Sınıf Eşleşme Kodu
                            </div>
                            <div className="font-mono text-3xl font-extrabold tracking-wider text-foreground">
                                {createdClass.matchingCode}
                            </div>
                            <p className="text-xs text-muted-foreground pt-1">
                                Öğrencileriniz kayıt olurken bu kodu girerek doğrudan sınıfınıza bağlanacaktır.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2.5 pt-2">
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleCopyCode}
                                leftIcon={copied ? Check : Copy}
                                className="w-full"
                            >
                                {copied ? 'Kopyalandı!' : 'Kodu Kopyala'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleFinish}
                                className="w-full"
                            >
                                Sınıfa Git
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* FORM SCREEN */
                    <div>
                        {/* Modal Title */}
                        <div className="flex items-center gap-3 mb-5 pr-8">
                            <div 
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                                style={{ backgroundColor: color }}
                            >
                                <School className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground tracking-tight">
                                    {initialData ? "Sınıfı Düzenle" : "Yeni Sınıf Oluştur"}
                                </h3>
                                <p className="text-muted-foreground text-xs">
                                    Okul ve sınıf bilgilerinizi girerek eşleşme kodunuzu oluşturun.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* Okul Adı */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-foreground flex items-center gap-1.5">
                                    <School className="w-3.5 h-3.5 text-muted-foreground" />
                                    Okul Adı <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    placeholder="Örn: Atatürk İlkokulu"
                                    required
                                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors shadow-2xs"
                                />
                            </div>

                            {/* Sınıf Düzeyi ve Şube Yan Yana */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-foreground">
                                        Sınıf <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={grade}
                                        onChange={(e) => handleGradeChange(e.target.value)}
                                        placeholder="Örn: 2"
                                        required
                                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors shadow-2xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-foreground">
                                        Şube <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={section}
                                        onChange={(e) => handleSectionChange(e.target.value)}
                                        placeholder="Örn: C"
                                        maxLength={10}
                                        required
                                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm uppercase font-semibold focus:outline-none focus:ring-1 focus:ring-ring transition-colors shadow-2xs"
                                    />
                                </div>
                            </div>

                            {/* Sınıf Öğretmeni */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-foreground flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                    Sınıf Öğretmeni <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={teacherName}
                                    onChange={(e) => setTeacherName(e.target.value)}
                                    placeholder="Örn: Ayşe Yılmaz"
                                    required
                                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors shadow-2xs"
                                />
                            </div>

                            {/* Sınıf Görünen Adı & Renk */}
                            <div className="grid grid-cols-2 gap-3 items-center">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-foreground">
                                        Sınıf Kodu / Adı
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        placeholder="2-C"
                                        className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-foreground text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-foreground">
                                        Renk Teması
                                    </label>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                        {CLASS_COLOR_PALETTE.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setColor(c.hex)}
                                                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                                                    color === c.hex ? 'scale-125 ring-2 ring-foreground/40 shadow-xs' : 'opacity-70 hover:opacity-100'
                                                }`}
                                                style={{ backgroundColor: c.hex }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={loading}
                                    rightIcon={ArrowRight}
                                    fullWidth
                                >
                                    {isEdit ? "Değişiklikleri Kaydet" : "Sınıfı Oluştur"}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateClassModal;
