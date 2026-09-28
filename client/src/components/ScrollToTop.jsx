import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaArrowUp } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

const SCROLL_THRESHOLD = 300;
const EXCLUDED_PATHS = [
    '/login',
    '/signup',
    '/forgot-password',
    '/verify-otp',
    '/reset-password',
];

const getScrollTop = target => {
    const pageScrollTop = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
    );

    if (target instanceof Element) {
        return Math.max(pageScrollTop, target.scrollTop || 0);
    }

    return pageScrollTop;
};

const scrollElementToTop = (element, behavior = 'auto') => {
    if (!element || element.scrollTop <= 0) {
        return;
    }

    if (typeof element.scrollTo === 'function') {
        element.scrollTo({ top: 0, behavior });
        return;
    }

    element.scrollTop = 0;
};

const scrollEverythingToTop = (behavior = 'auto') => {
    window.scrollTo({ top: 0, behavior });
    scrollElementToTop(document.documentElement, behavior);
    scrollElementToTop(document.body, behavior);

    document.querySelectorAll('*').forEach(element => {
        scrollElementToTop(element, behavior);
    });
};

export default function ScrollToTop() {
    const { pathname } = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const isExcludedPath = EXCLUDED_PATHS.includes(pathname);

    useEffect(() => {
        // Scroll immediately
        scrollEverythingToTop();
        setIsVisible(false);

        // Scroll multiple times with delays
        const delays = [10, 50, 100, 200, 300];
        const timeouts = delays.map(delay =>
            setTimeout(() => scrollEverythingToTop(), delay)
        );

        return () => {
            timeouts.forEach(clearTimeout);
        };
    }, [pathname]);

    useEffect(() => {
        let animationFrameId = null;

        const updateVisibility = target => {
            const shouldShow = getScrollTop(target) > SCROLL_THRESHOLD;
            setIsVisible(current => (current === shouldShow ? current : shouldShow));
        };

        const handleScroll = event => {
            if (animationFrameId) {
                return;
            }

            animationFrameId = window.requestAnimationFrame(() => {
                updateVisibility(event.target);
                animationFrameId = null;
            });
        };

        updateVisibility();
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

        return () => {
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
            }

            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, []);

    // ScrollToTop button removed as requested by user ("yukarı çık butonu olmasın").
    // Page scroll reset on navigation is preserved above.
    return null;
}

