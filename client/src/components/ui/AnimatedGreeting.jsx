import React from 'react';
import { motion } from 'framer-motion';

/**
 * AnimatedGreeting Component
 * Displays a modern SaaS greeting with animated flowing gradient text,
 * interactive waving hand emoji, and smooth entrance animation.
 */
export const AnimatedGreeting = ({
  prefix = 'Merhaba,',
  name = 'Öğrenci',
  className = '',
  size = 'lg'
}) => {
  const sizeClasses = {
    md: 'text-xl sm:text-2xl lg:text-3xl',
    lg: 'text-2xl sm:text-3xl lg:text-4xl',
    xl: 'text-3xl sm:text-4xl lg:text-5xl'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 font-extrabold tracking-tight ${sizeClasses[size] || sizeClasses.lg} ${className}`}
    >
      {/* Prefix (e.g. "Merhaba," / "Hoş Geldiniz,") */}
      <span className="text-foreground transition-colors duration-200">
        {prefix}
      </span>

      {/* Name with Shimmering Gradient Flow */}
      <span className="relative inline-block">
        <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 dark:from-indigo-300 dark:via-purple-300 dark:to-cyan-300 bg-clip-text text-transparent animate-text-gradient font-black drop-shadow-xs">
          {name}
        </span>
        {/* Subtle Ambient Underglow */}
        <span
          aria-hidden="true"
          className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/30 via-purple-500/40 to-sky-400/20 blur-xs rounded-full pointer-events-none opacity-80"
        />
      </span>

      {/* Animated Waving Hand */}
      <motion.span
        whileHover={{ scale: 1.25, rotate: 20 }}
        whileTap={{ scale: 0.95 }}
        className="inline-block animate-wave select-none cursor-pointer"
        title="Selam!"
      >
        👋
      </motion.span>
    </motion.div>
  );
};

export default AnimatedGreeting;
