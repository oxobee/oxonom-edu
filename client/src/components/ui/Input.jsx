import React from 'react';
import { cn } from '../../lib/utils';

const renderIcon = (Icon, className = 'w-4 h-4') => {
  if (!Icon) return null;
  if (React.isValidElement(Icon)) {
    return React.cloneElement(Icon, {
      className: `${Icon.props.className || ''} ${className}`.trim()
    });
  }
  const Component = Icon;
  return <Component className={className} />;
};

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  icon,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const effectiveLeftIcon = LeftIcon || icon;
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={generatedId} className="text-xs font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {effectiveLeftIcon && (
          <div className="absolute left-3 text-muted-foreground pointer-events-none flex items-center justify-center">
            {renderIcon(effectiveLeftIcon, 'w-4 h-4')}
          </div>
        )}

        <input
          ref={ref}
          id={generatedId}
          type={type}
          data-slot="input"
          className={cn(
            'w-full h-9 rounded-lg border border-input bg-transparent text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground py-2 px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50',
            effectiveLeftIcon && 'pl-9',
            RightIcon && 'pr-9',
            error && 'border-destructive focus-visible:ring-destructive focus-visible:border-destructive',
            className
          )}
          {...props}
        />

        {RightIcon && (
          <div className="absolute right-3 text-muted-foreground flex items-center justify-center">
            {renderIcon(RightIcon, 'w-4 h-4')}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-destructive font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
