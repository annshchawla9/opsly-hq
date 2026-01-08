import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

const variants = {
  default: 'bg-card border-border',
  primary: 'bg-primary/5 border-primary/20',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
  error: 'bg-destructive/5 border-destructive/20',
};

const iconColors = {
  default: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'stats-card animate-fade-in',
        variants[variant]
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && (
          <div className={cn('p-2 rounded-lg bg-muted/50', iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-bold text-foreground">{value}</div>
        
        {(subtitle || trend) && (
          <div className="flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && (
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
