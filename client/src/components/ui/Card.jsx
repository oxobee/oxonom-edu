import React from 'react';
import { cn } from '../../lib/utils';

export const Card = React.forwardRef(({
  children,
  className = '',
  hover = false,
  glass = false,
  chrome = true,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-all duration-200 overflow-hidden relative',
        chrome && 'chrome-pattern',
        hover && 'hover:border-foreground/20 hover:shadow-md cursor-pointer',
        glass && 'backdrop-blur-md bg-card/85',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = 'Card';

export const CardHeader = ({ children, className = '', ...props }) => (
  <div
    data-slot="card-header"
    className={cn('p-5 sm:p-6 border-b border-border/60 flex flex-col gap-1.5 relative z-1', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', as: Component = 'h3', ...props }) => (
  <Component
    data-slot="card-title"
    className={cn('text-base sm:text-lg font-semibold text-card-foreground tracking-tight leading-none', className)}
    {...props}
  >
    {children}
  </Component>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p
    data-slot="card-description"
    className={cn('text-xs sm:text-sm text-muted-foreground', className)}
    {...props}
  >
    {children}
  </p>
);

export const CardAction = ({ children, className = '', ...props }) => (
  <div
    data-slot="card-action"
    className={cn('self-start shrink-0 relative z-1', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardContent = ({ children, className = '', noPadding = false, ...props }) => (
  <div
    data-slot="card-content"
    className={cn(noPadding ? '' : 'p-5 sm:p-6', 'relative z-1', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div
    data-slot="card-footer"
    className={cn('p-4 sm:p-6 pt-0 sm:pt-0 flex items-center gap-3 border-t border-border/40 bg-muted/20 relative z-1', className)}
    {...props}
  >
    {children}
  </div>
);

export default Card;
