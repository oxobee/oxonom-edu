import React from 'react';
import { cn } from '../../lib/utils';

const badgeColors = {
  neutral: {
    subtle: 'bg-secondary text-secondary-foreground border-border/70',
    solid: 'bg-foreground text-background border-transparent',
    dot: 'bg-muted-foreground',
  },
  secondary: {
    subtle: 'bg-secondary text-secondary-foreground border-border/70',
    solid: 'bg-foreground text-background border-transparent',
    dot: 'bg-muted-foreground',
  },
  primary: {
    subtle: 'bg-primary/10 text-primary border-primary/20',
    solid: 'bg-primary text-primary-foreground border-transparent',
    dot: 'bg-primary',
  },
  indigo: {
    subtle: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    solid: 'bg-indigo-600 text-white border-transparent',
    dot: 'bg-indigo-500',
  },
  success: {
    subtle: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    solid: 'bg-emerald-600 text-white border-transparent',
    dot: 'bg-emerald-500',
  },
  emerald: {
    subtle: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    solid: 'bg-emerald-600 text-white border-transparent',
    dot: 'bg-emerald-500',
  },
  warning: {
    subtle: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    solid: 'bg-amber-600 text-white border-transparent',
    dot: 'bg-amber-500',
  },
  amber: {
    subtle: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    solid: 'bg-amber-600 text-white border-transparent',
    dot: 'bg-amber-500',
  },
  danger: {
    subtle: 'bg-destructive/15 text-destructive border-destructive/25',
    solid: 'bg-destructive text-destructive-foreground border-transparent',
    dot: 'bg-destructive',
  },
  destructive: {
    subtle: 'bg-destructive/15 text-destructive border-destructive/25',
    solid: 'bg-destructive text-destructive-foreground border-transparent',
    dot: 'bg-destructive',
  },
  rose: {
    subtle: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
    solid: 'bg-rose-600 text-white border-transparent',
    dot: 'bg-rose-500',
  },
  info: {
    subtle: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25',
    solid: 'bg-sky-600 text-white border-transparent',
    dot: 'bg-sky-500',
  },
  sky: {
    subtle: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25',
    solid: 'bg-sky-600 text-white border-transparent',
    dot: 'bg-sky-500',
  },
  cyan: {
    subtle: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
    solid: 'bg-cyan-600 text-white border-transparent',
    dot: 'bg-cyan-500',
  },
  purple: {
    subtle: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25',
    solid: 'bg-purple-600 text-white border-transparent',
    dot: 'bg-purple-500',
  },
  outline: {
    subtle: 'bg-transparent text-foreground border-border',
    solid: 'bg-transparent text-foreground border-border',
    dot: 'bg-foreground',
  },
};

const renderIcon = (Icon, className = 'w-3 h-3') => {
  if (!Icon) return null;
  if (React.isValidElement(Icon)) {
    return React.cloneElement(Icon, {
      className: `${Icon.props.className || ''} ${className}`.trim()
    });
  }
  const Component = Icon;
  return <Component className={className} />;
};

export const Badge = ({
  children,
  variant = 'secondary',
  color,
  size = 'sm',
  dot = false,
  pill = false,
  icon: Icon,
  className = '',
}) => {
  const themeKey = color || (variant && badgeColors[variant] ? variant : 'neutral');
  const isSolid = variant === 'solid' || variant === 'default';
  const colorConfig = badgeColors[themeKey] || badgeColors.neutral;

  const sizeClasses = size === 'xs'
    ? 'px-2 py-0.5 text-[10px]'
    : size === 'sm'
    ? 'px-2.5 py-0.5 text-xs'
    : 'px-3 py-1 text-xs';

  const baseClasses = cn(
    'inline-flex items-center gap-1.5 font-medium border transition-colors select-none shrink-0',
    pill ? 'rounded-full' : 'rounded-md'
  );
  const styleClasses = isSolid ? colorConfig.solid : colorConfig.subtle;

  return (
    <span data-slot="badge" className={cn(baseClasses, sizeClasses, styleClasses, className)}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colorConfig.dot)} />
      )}
      {Icon && renderIcon(Icon, 'w-3 h-3 shrink-0')}
      {children}
    </span>
  );
};

export default Badge;
