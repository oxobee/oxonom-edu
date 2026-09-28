import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';
import PWAInstallPrompt from './PWAInstallPrompt';
import NotificationBell from './NotificationBell';

const Navbar = () => {
    const { t } = useTranslation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const publicRoutes = ['/', '/features', '/about', '/contact', '/faq', '/terms', '/terms-of-service', '/privacy-policy'];
    const isPublicMarketingRoute = publicRoutes.includes(location.pathname);

    // Only render the marketing Navbar on public marketing pages
    if (!isPublicMarketingRoute) {
        return null;
    }

    // Different nav links based on authentication status
    const navLinks = !token 
        ? [
            { name: t('nav.home'), path: '/' },
            { name: t('nav.features'), path: '/features' },
            { name: t('nav.about'), path: '/about' },
            { name: t('nav.contact'), path: '/contact' },
            { name: t('nav.faq'), path: '/faq' }
        ]
        : [];

    return (
        <nav
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isMobileMenuOpen
                    ? 'bottom-0 bg-slate-950'
                    : (isScrolled
                        ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-lg overflow-hidden'
                        : 'bg-slate-950/70 backdrop-blur-md '
                      )
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <Link to={!token ? "/" : "/dashboard"} className="flex items-center space-x-2 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
                            <svg
                                className="w-5 h-5 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-white">Oxonom Edu</span>
                    </Link>

                    {/* Desktop Navigation - Only show Home/Features/About when NOT logged in */}
                    <div className="hidden md:flex items-center space-x-8">
                       {navLinks.map((link) => (
  <Link
    key={link.path}
    to={link.path}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
      location.pathname === link.path
        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
        : "text-slate-300 hover:text-white hover:bg-white/5"
    }`}
  >
    {link.name}
  </Link>
))}
                    </div>

                    {/* Auth & Language Buttons */}
                    <div className="hidden md:flex items-center space-x-3">
                        <PWAInstallPrompt variant="button" />
                        <LanguageToggle />
                        {token && <NotificationBell />}
                        {token ? (
                            <>
                                {user?.role === 'admin' ? (
                                    <Link
                                        to="/admin"
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                                            location.pathname === "/admin"
                                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/10"
                                                : "text-white bg-purple-600/20 hover:bg-purple-600/30"
                                        }`}
                                    >
                                        {t('nav.admin')}
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            to="/dashboard"
                                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                                                location.pathname === "/dashboard"
                                                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                                                    : "text-white bg-indigo-600/20 hover:bg-indigo-600/30"
                                            }`}
                                        >
                                            {t('nav.dashboard')}
                                        </Link>
                                        {user?.role === 'teacher' && (
                                            <Link
                                                to="/classes"
                                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                                                    location.pathname.startsWith("/classes")
                                                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/10"
                                                        : "text-slate-300 hover:text-white hover:bg-white/5"
                                                }`}
                                            >
                                                Sınıflarım
                                            </Link>
                                        )}
                                    </>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                >
                                    {t('nav.logout')}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-medium text-white hover:text-indigo-300 transition-colors"
                                >
                                    {t('nav.login')}
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/30"
                                >
                                    {t('nav.signup')}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button & Notification */}
                    <div className="md:hidden flex items-center gap-2">
                        {token && <NotificationBell />}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 text-white hover:text-indigo-300 transition-colors"
                        >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {isMobileMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 top-16 z-40 bg-slate-950 px-6 py-4 border-t border-white/10 overflow-y-auto">
                        <div className="flex flex-col space-y-4">
                            {/* Only show Home/Features/About when NOT logged in */}
                            {!token && navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
  location.pathname === link.path
    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
    : "text-slate-300 hover:text-white hover:bg-white/5"
}`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-white/10 flex flex-col space-y-3">
                                <div className="flex items-center justify-between px-2 pb-2">
                                    <LanguageToggle />
                                    <PWAInstallPrompt variant="button" />
                                </div>
                                {token ? (
                                    <>
                                        {user?.role === 'admin' ? (
                                            <Link
                                                to="/admin"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 text-center ${
                                                    location.pathname === "/admin"
                                                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                                        : "text-white bg-purple-600/20 hover:bg-purple-600/30"
                                                }`}
                                            >
                                                {t('nav.admin')}
                                            </Link>
                                        ) : (
                                            <>
                                                <Link
                                                    to="/dashboard"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 text-center ${
                                                        location.pathname === "/dashboard"
                                                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                                            : "text-white bg-indigo-600/20 hover:bg-indigo-600/30"
                                                    }`}
                                                >
                                                    {t('nav.dashboard')}
                                                </Link>
                                                {user?.role === 'teacher' && (
                                                    <Link
                                                        to="/classes"
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 text-center ${
                                                            location.pathname.startsWith("/classes")
                                                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                                                : "text-slate-300 hover:text-white hover:bg-white/5"
                                                        }`}
                                                    >
                                                        Sınıflarım
                                                    </Link>
                                                )}
                                            </>
                                        )}
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors text-center"
                                        >
                                            {t('nav.logout')}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to="/login"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="px-4 py-2 text-sm font-medium text-white hover:text-indigo-300 transition-colors text-center"
                                        >
                                            {t('nav.login')}
                                        </Link>
                                        <Link
                                            to="/signup"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/30 text-center"
                                        >
                                            {t('nav.signup')}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;