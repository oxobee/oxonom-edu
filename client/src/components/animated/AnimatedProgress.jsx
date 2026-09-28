import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedProgress = ({
  value = 0,
  max = 100,
  color = 'indigo',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const gradientMap = {
    indigo: 'from-indigo-500 to-purple-600',
    cyan: 'from-cyan-500 to-blue-600',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-600',
  };

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className={`w-full space-y-1 ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-300">
          <span>İlerleme</span>
          <span className="font-bold text-white font-mono">%{Math.round(percentage)}</span>
        </div>
      )}
      <div className={`w-full ${heightClass} rounded-full bg-slate-800/80 overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full bg-gradient-to-r ${gradientMap[color] || gradientMap.indigo}`}
        />
      </div>
    </div>
  );
};

export default AnimatedProgress;
