import React from 'react';
import { motion } from 'framer-motion';
import Card, { CardContent } from './Card';
import Badge from './Badge';
import AnimatedNumber from './AnimatedNumber';
import { cn } from '../../lib/utils';

const renderIcon = (Icon, className = 'w-5 h-5') => {
  if (!Icon) return null;
  if (React.isValidElement(Icon)) {
    return React.cloneElement(Icon, {
      className: `${Icon.props.className || ''} ${className}`.trim(),
    });
  }
  const Component = Icon;
  return <Component className={className} />;
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  iconColor,
  color = 'indigo',
  description,
  trend,
  badgeText,
  onClick,
  className = '',
}) => {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className="h-full"
    >
      <Card
        hover={Boolean(onClick)}
        className={cn(
          'group relative h-full transition-all duration-200 shadow-xs border border-border bg-card text-card-foreground',
          onClick && 'cursor-pointer hover:border-foreground/20',
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground truncate mb-1">
                {title}
              </p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  <AnimatedNumber value={value} />
                </h4>
                {badgeText && (
                  <Badge variant="secondary" size="xs">
                    {badgeText}
                  </Badge>
                )}
              </div>
            </div>

            {Icon && (
              <div className="p-2.5 rounded-lg border border-border bg-muted/40 text-foreground shrink-0 transition-colors group-hover:bg-muted/80">
                {renderIcon(Icon, 'w-5 h-5 transition-transform duration-200 group-hover:scale-105')}
              </div>
            )}
          </div>

          {(description || trend) && (
            <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
              {description && (
                <span className="text-muted-foreground truncate">{description}</span>
              )}
              {trend && (
                <span
                  className={cn(
                    'font-medium shrink-0 ml-auto',
                    trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                  )}
                >
                  {trend.value}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatCard;
