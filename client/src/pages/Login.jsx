import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    Lock,
    Mail,
    Eye,
    EyeOff,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    PenTool,
    Users,
    Radio,
    Layers,
    Presentation,
    Check,
    GraduationCap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || '/dashboard';
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
    const [detectedRole, setDetectedRole] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (e.target.name === 'email' && !e.target.value.trim()) {
            setDetectedRole(null);
        }
    };

    const handleEmailBlur = async () => {
        const trimmedEmail = formData.email.trim();
        if (!trimmedEmail) {
            setDetectedRole(null);
            return;
        }

        try {
            const res = await api.post('/api/auth/check-role', {
                email: trimmedEmail
            });
            if (formData.email.trim() === trimmedEmail) {
                if (res.data && res.data.role) {
                    setDetectedRole(res.data.role);
                } else {
                    setDetectedRole(null);
                }
            }
        } catch (err) {
            if (formData.email.trim() === trimmedEmail) {
                setDetectedRole(null);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/api/auth/login', formData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            sessionStorage.setItem('oxonom_just_logged_in', 'true');

            if (res.data.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate(from);
            }
        } catch (err) {
            const errorData = err.response?.data;

            if (errorData?.error === 'EMAIL_NOT_VERIFIED') {
                setError(
                    <span>
                        {errorData.message || 'E-posta adresiniz henüz doğrulanmamış.'}{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/verify-email', { state: { email: errorData.email, autoSend: true } })}
                            className="underline cursor-pointer text-primary hover:text-primary/80 font-semibold bg-transparent border-none p-0 inline"
                        >
                            Şimdi Doğrula
                        </button>
                    </span>
                );
            } else if (errorData?.error === 'ACCOUNT_NOT_VERIFIED') {
                if (err.response?.data?.token) {
                    localStorage.setItem('token', err.response.data.token);
                }
                setError(errorData.message || 'Öğretmen hesabınız yönetici onayı bekliyor.');
                setTimeout(() => {
                    navigate('/verification-pending');
                }, 2000);
            } else {
                const msg = errorData?.message || '';
                if (errorData?.error === 'INVALID_CREDENTIALS' || msg.toLowerCase().includes('invalid credential')) {
                    setError('Geçersiz kullanıcı adı, e-posta veya şifre.');
                } else if (msg.toLowerCase().includes('email and password are required') || errorData?.error === 'MISSING_CREDENTIALS') {
                    setError('Lütfen e-posta/kullanıcı adı ve şifrenizi giriniz.');
                } else {
                    setError(msg || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol ediniz.');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/api/auth/login', {
                email: 'demo_ogretmen',
                password: 'Demo1234!'
            });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            sessionStorage.setItem('oxonom_just_logged_in', 'true');
            navigate('/dashboard');
        } catch (err) {
            console.error('Demo teacher login error:', err);
            setError('Demo öğretmen hesabına giriş yapılamadı. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoStudentLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/api/auth/login', {
                email: 'demo_ogrenci',
                password: 'Demo1234!'
            });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            sessionStorage.setItem('oxonom_just_logged_in', 'true');
            navigate('/dashboard');
        } catch (err) {
            console.error('Demo student login error:', err);
            setError('Demo öğrenci hesabına giriş yapılamadı. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen lg:h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden relative bg-background text-foreground">
            {/* Left: Form Area */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="auth-panel-bg flex flex-col justify-center px-6 sm:px-10 lg:px-20 py-8 relative z-10 bg-card/60 backdrop-blur-xs border-r border-border"
            >
                <div className="max-w-md w-full mx-auto space-y-6">
                    {/* Header bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-xl text-foreground tracking-tight">EduBoard</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                ← {t('common.back')}
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                            {t('auth.loginTitle')}
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            {t('auth.loginSubtitle')}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && !error && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-foreground">
                                {t('auth.email')}
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute top-3 left-3 text-muted-foreground pointer-events-none" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleEmailBlur}
                                    className="w-full bg-background border border-input rounded-lg pl-9 pr-4 py-2 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring shadow-xs transition-colors"
                                    placeholder="name@example.com"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-medium text-foreground">
                                    {t('auth.password')}
                                </label>
                                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                    {t('auth.forgotPassword')}
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute top-3 left-3 text-muted-foreground pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-background border border-input rounded-lg pl-9 pr-10 py-2 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring shadow-xs transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                    <span>{t('auth.signingIn')}</span>
                                </>
                            ) : (
                                <>
                                    <span>{t('auth.loginBtn')}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Demo Access Buttons */}
                    <div className="space-y-2 mt-4 pt-3 border-t border-border">
                        <button
                            type="button"
                            onClick={handleDemoLogin}
                            disabled={loading}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-600/15 to-blue-600/15 hover:from-amber-500/25 hover:via-purple-600/25 hover:to-blue-600/25 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                        >
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>⚡ Demo Öğretmen Hesabı ile Keşfet</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDemoStudentLogin}
                            disabled={loading}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-600/15 to-cyan-600/15 hover:from-emerald-500/25 hover:via-teal-600/25 hover:to-cyan-600/25 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                        >
                            <GraduationCap className="w-4 h-4 text-emerald-400" />
                            <span>🎓 Demo Öğrenci Hesabı ile Keşfet</span>
                        </button>
                    </div>

                    <div className="pt-3 border-t border-border text-center space-y-1.5 text-xs">
                        <p className="text-muted-foreground">
                            Öğrenci misiniz?{' '}
                            <Link to="/signup" className="text-foreground font-semibold hover:underline">
                                Öğrenci Kaydı →
                            </Link>
                        </p>
                        <p className="text-muted-foreground">
                            Öğretmen misiniz?{' '}
                            <Link to="/signup-teacher" className="text-foreground font-semibold hover:underline">
                                Öğretmen Kaydı →
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Right: Dynamic Theme Animated Digital Board */}
            <div className="hidden lg:flex relative items-center justify-center overflow-hidden bg-slate-950 p-8">
                {/* Background Glows */}
                <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
                    {/* Interactive Animated Board Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-5 backdrop-blur-xl relative overflow-hidden"
                    >
                        {/* Chrome pattern subtle overlay */}
                        <div className="absolute inset-0 chrome-pattern opacity-30 pointer-events-none" />

                        {/* Board Window Bar */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 relative z-10">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                                <span className="text-[11px] font-mono text-slate-400 ml-2 font-medium">EduBoard Live Canvas</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Canlı Ders
                                </span>
                            </div>
                        </div>

                        {/* Interactive Canvas Simulation Area */}
                        <div 
                            className="w-full h-52 rounded-xl bg-slate-950/80 border border-slate-800 relative overflow-hidden flex flex-col justify-between p-3 select-none"
                            style={{
                                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                                backgroundSize: '18px 18px'
                            }}
                        >
                            {/* Animated SVG Vector Drawing (Sine Wave & Geometric Curve) */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#06b6d4" />
                                        <stop offset="50%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                                <motion.path
                                    d="M 20 120 Q 80 40, 160 110 T 300 70 T 420 120"
                                    fill="none"
                                    stroke="url(#neonGradient)"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                                />
                                <motion.circle
                                    cx="160"
                                    cy="110"
                                    r="5"
                                    fill="#06b6d4"
                                    animate={{ scale: [1, 1.4, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <motion.circle
                                    cx="300"
                                    cy="70"
                                    r="5"
                                    fill="#a855f7"
                                    animate={{ scale: [1, 1.4, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                                />
                            </svg>

                            {/* Floating Glass Chips on Canvas */}
                            <div className="flex items-center justify-between relative z-10">
                                <motion.div 
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 backdrop-blur-md text-[11px] text-slate-200 flex items-center gap-1.5 shadow-md"
                                >
                                    <PenTool className="w-3 h-3 text-cyan-400" />
                                    <span>Akıllı Kalem Modu</span>
                                </motion.div>

                                <motion.div
                                    animate={{ y: [0, 3, 0] }}
                                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-md text-[11px] text-indigo-300 font-mono flex items-center gap-1 shadow-md"
                                >
                                    <span>y = 2x² + 5</span>
                                </motion.div>
                            </div>

                            {/* Bottom Canvas Tools & Online Users Bar */}
                            <div className="flex items-center justify-between relative z-10 pt-2 border-t border-slate-800/60">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                    <Users className="w-3.5 h-3.5 text-primary" />
                                    <span>28 Öğrenci Katıldı</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] text-slate-400 font-mono">
                                    <span>Oda: EDU-LIVE-8X</span>
                                </div>
                            </div>
                        </div>

                        {/* Feature Badges under Canvas */}
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-2 text-center text-[10px] text-slate-400">
                            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-center gap-1 text-slate-300">
                                <Presentation className="w-3 h-3 text-primary" />
                                <span>Canlı Tahta</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-center gap-1 text-slate-300">
                                <Layers className="w-3 h-3 text-cyan-400" />
                                <span>İnteraktif Araçlar</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-center gap-1 text-slate-300">
                                <Radio className="w-3 h-3 text-emerald-400" />
                                <span>Anlık Senkron</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Text below animation */}
                    <div className="mt-6 text-center space-y-1.5">
                        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            {detectedRole === 'student' 
                                ? 'Sınıfına Bağlan, Tahtanı Canlı Takip Et!'
                                : detectedRole === 'teacher' || detectedRole === 'admin'
                                ? 'Öğretmen Paneli & İnteraktif Sınıf Yönetimi'
                                : 'EduBoard İnteraktif Dijital Tahta'}
                        </h3>
                        <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                            Gerçek zamanlı iş birliği, akıllı çizim araçları ve ders materyalleriyle yeni nesil eğitim deneyimi.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
