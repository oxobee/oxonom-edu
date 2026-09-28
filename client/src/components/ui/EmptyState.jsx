import React from 'react';
import Card, { CardContent } from './Card';
import Button from './Button';
import { cn } from '../../lib/utils';

const renderIcon = (Icon, className = 'w-7 h-7 sm:w-8 sm:h-8') => {
  if (!Icon) return null;
  if (React.isValidElement(Icon)) {
    return React.cloneElement(Icon, {
      className: `${Icon.props.className || ''} ${className}`.trim()
    });
  }
  const Component = Icon;
  return <Component className={className} />;
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) => {
  return (
    <Card className={cn('border-dashed border-border bg-muted/20', className)}>
      <CardContent className="py-12 sm:py-16 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        {Icon && (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground mb-4 shadow-2xs">
            {renderIcon(Icon, 'w-6 h-6 sm:w-7 sm:h-7')}
          </div>
        )}

        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
          {title}
        </h3>

        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
            {description}
          </p>
        )}

        {actionLabel && onAction && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAction}
            leftIcon={actionIcon}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
