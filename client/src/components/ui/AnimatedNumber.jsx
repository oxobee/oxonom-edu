import React, { useEffect, useState } from 'react';

/**
 * AnimatedNumber
 * Smoothly animates numbers from 0 to the target value when mounted or updated.
 * Handles strings like "714k", "12 Gün", "%95", "4/5", etc.
 */
export const AnimatedNumber = ({ value, duration = 800, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(() => {
    // If not a number or contains no digits, return raw
    if (value === null || value === undefined) return '';
    const str = String(value);
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return str;
    return '0';
  });

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplayValue('');
      return;
    }

    const str = String(value);
    const numMatch = str.match(/[-+]?[0-9]*\.?[0-9]+/);
    if (!numMatch) {
      setDisplayValue(str);
      return;
    }

    const targetNum = parseFloat(numMatch[0]);
    const isFloat = numMatch[0].includes('.');
    const prefix = str.slice(0, numMatch.index);
    const suffix = str.slice(numMatch.index + numMatch[0].length);

    let start = 0;
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + (targetNum - start) * ease;

      const formatted = isFloat ? current.toFixed(1) : Math.round(current);
      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(str);
      }
    };

    const frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{displayValue}</span>;
};

export default AnimatedNumber;
