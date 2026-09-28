import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const variantClasses = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs border border-transparent focus-visible:ring-ring active:bg-primary/95',
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs border border-transparent focus-visible:ring-ring active:bg-primary/95',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40 shadow-xs focus-visible:ring-ring active:bg-secondary/90',
  outline: 'border border-border bg-background hover:bg-muted hover:text-foreground text-foreground shadow-xs focus-visible:ring-ring active:bg-muted/70',
  ghost: 'bg-transparent hover:bg-muted hover:text-foreground text-foreground/80 focus-visible:ring-ring active:bg-muted/60',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs border border-transparent focus-visible:ring-destructive active:bg-destructive/95',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs border border-transparent focus-visible:ring-destructive active:bg-destructive/95',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs border border-transparent focus-visible:ring-emerald-500 active:bg-emerald-700',
  subtle: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60 focus-visible:ring-ring',
  link: 'text-primary underline-offset-4 hover:underline bg-transparent border-transparent p-0 h-auto focus-visible:ring-0',
};

const sizeClasses = {
  xs: 'h-7 px-2.5 text-xs rounded-md gap-1',
  sm: 'h-8 px-3.5 text-xs font-medium rounded-md gap-1.5',
  md: 'h-9 px-4 py-2 text-sm font-medium rounded-lg gap-2',
  default: 'h-9 px-4 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'h-10 px-5 text-base font-medium rounded-lg gap-2.5',
  icon: 'h-9 w-9 rounded-lg p-0 flex items-center justify-center shrink-0',
  'icon-sm': 'h-8 w-8 rounded-md p-0 flex items-center justify-center shrink-0',
  'icon-xs': 'h-6 w-6 rounded-md p-0 flex items-center justify-center shrink-0',
};

const renderIcon = (Icon, className = 'shrink-0 text-current text-sm') => {
  if (!Icon) return null;
  if (React.isValidElement(Icon)) {
    return React.cloneElement(Icon, {
      className: `${Icon.props.className || ''} ${className}`.trim(),
    });
  }
  const Component = Icon;
  return <Component className={className} />;
};

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading,
  disabled = false,
  leftIcon,
  rightIcon,
  icon,
  fullWidth = false,
  className = '',
  type = 'button',
  disableAnimation = false,
  ...props
}, ref) => {
  const isBusy = isLoading || loading;
  const base = 'inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none whitespace-nowrap leading-none';
  const variantStyle = variantClasses[variant] || variantClasses.primary;
  const sizeStyle = sizeClasses[size] || sizeClasses.md;
  const widthStyle = fullWidth ? 'w-full flex-1 min-w-0' : '';

  const effectiveLeftIcon = leftIcon || icon;

  const motionProps = !disabled && !isBusy && !disableAnimation ? {
    whileHover: { scale: 1.015 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 450, damping: 25 },
  } : {};

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || isBusy}
      data-slot="button"
      className={cn(base, variantStyle, sizeStyle, widthStyle, className)}
      {...motionProps}
      {...props}
    >
      {isBusy ? (
        <svg
          className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : effectiveLeftIcon ? (
        renderIcon(effectiveLeftIcon, size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4')
      ) : null}

      {children && <span>{children}</span>}

      {!isBusy && rightIcon ? (
        renderIcon(rightIcon, size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4')
      ) : null}
    </motion.button>
  );
});

Button.displayName = 'Button';
export default Button;
