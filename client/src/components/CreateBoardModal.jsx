import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, Lock, Presentation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Button } from './ui/Button';

const CreateBoardModal = ({ isOpen, onClose, onCreateBoard, initialClassId = null, classes: propClasses = null }) => {
    const { t } = useTranslation();
    const todayStr = new Date().toISOString().split('T')[0];

    const [boardName, setBoardName] = useState('');
    const [boardDate, setBoardDate] = useState(todayStr);
    const [classId, setClassId] = useState(initialClassId || '');
    const [isPasswordProtected, setIsPasswordProtected] = useState(false);
    const [password, setPassword] = useState('');
    const [classes, setClasses] = useState(propClasses || []);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setBoardName('');
            setBoardDate(new Date().toISOString().split('T')[0]);
            setClassId(initialClassId || '');
            setIsPasswordProtected(false);
            setPassword('');
            setError('');

            if (!propClasses) {
                api.get('/api/classes')
                    .then(res => {
                        setClasses(res.data || []);
                        if (!initialClassId && res.data && res.data.length > 0) {
                            setClassId(res.data[0]._id);
                        }
                    })
                    .catch(() => {});
            } else {
                setClasses(propClasses);
                if (!initialClassId && propClasses.length > 0) {
                    setClassId(propClasses[0]._id);
                }
            }
        }
    }, [isOpen, initialClassId, propClasses]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!boardName.trim()) {
            setError('Tahta adı zorunludur');
            return;
        }

        if (isPasswordProtected && !password.trim()) {
            setError('Şifre koruması açık olduğunda tahta şifresi belirlenmelidir');
            return;
        }

        onCreateBoard({
            name: boardName.trim(),
            boardDate: boardDate || todayStr,
            classId: classId || null,
            isPasswordProtected,
            password: isPasswordProtected ? password.trim() : null
        });

        handleClose();
    };

    const handleClose = () => {
        setBoardName('');
        setPassword('');
        setError('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card text-card-foreground border border-border rounded-xl p-6 sm:p-7 max-w-lg w-full relative shadow-xl space-y-5 overflow-hidden"
                        >
                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-5 right-5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                aria-label="Kapat"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Header */}
                            <div className="border-b border-border/60 pb-3.5 pr-8">
                                <h2 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
                                    <Presentation className="text-primary w-5 h-5" /> Yeni Akıllı Tahta Oluştur
                                </h2>
                                <p className="text-muted-foreground text-xs mt-1">
                                    Sınıfınız için etkileşimli yeni bir ders tahtası başlatın.
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Tahta Adı */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-foreground">
                                        Tahta Adı *
                                    </label>
                                    <input
                                        type="text"
                                        value={boardName}
                                        onChange={(e) => {
                                            setBoardName(e.target.value);
                                            setError('');
                                        }}
                                        placeholder="Örn: Matematik - Kesirler"
                                        className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors shadow-2xs"
                                        autoFocus
                                    />
                                </div>

                                {/* Tarih & Sınıf */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-foreground">
                                            Tarih *
                                        </label>
                                        <input
                                            type="date"
                                            value={boardDate}
                                            onChange={(e) => setBoardDate(e.target.value)}
                                            className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors shadow-2xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-foreground">
                                            Sınıf Seçimi
                                        </label>
                                        <select
                                            value={classId}
                                            onChange={(e) => setClassId(e.target.value)}
                                            className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors shadow-2xs"
                                        >
                                            <option value="">(Sınıfsız Tahta)</option>
                                            {classes.map((c) => (
                                                <option key={c._id} value={c._id}>
                                                    {c.name || `${c.grade}/${c.section}`} {c.schoolName ? `(${c.schoolName})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Şifre Koruması Toggle */}
                                <div className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-foreground">Şifre Koruması</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {isPasswordProtected ? 'Yalnızca şifreyi bilen öğrenciler açabilir' : 'Şifresiz (Herkes doğrudan açabilir)'}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsPasswordProtected(!isPasswordProtected)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                isPasswordProtected ? 'bg-primary' : 'bg-muted'
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                    isPasswordProtected ? 'translate-x-4' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Password Input (If Enabled) */}
                                    {isPasswordProtected && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="pt-1.5"
                                        >
                                            <input
                                                type="text"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Tahta şifresi belirleyin (Örn: 1234)"
                                                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                {error && (
                                    <p className="text-destructive text-xs font-medium">{error}</p>
                                )}

                                {/* Buttons */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClose}
                                        className="w-full"
                                    >
                                        İptal
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        leftIcon={Rocket}
                                        className="w-full"
                                    >
                                        Tahtayı Başlat
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CreateBoardModal;
