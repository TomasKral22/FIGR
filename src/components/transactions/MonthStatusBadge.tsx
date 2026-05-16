import { cn } from '@/lib/utils';

interface MonthStatusBadgeProps {
  status: 'open' | 'closed' | 'adjusted' | 'warning';
}

const badgeMap: Record<MonthStatusBadgeProps['status'], { label: string; className: string }> = {
  open: {
    label: 'Otevřený',
    className: 'bg-muted text-muted-foreground',
  },
  closed: {
    label: 'Uzavřený',
    className: 'bg-primary/15 text-primary',
  },
  adjusted: {
    label: 'Ručně upravený',
    className: 'bg-warning/15 text-warning',
  },
  warning: {
    label: 'Vyžaduje kontrolu',
    className: 'bg-destructive/15 text-destructive',
  },
};

export const MonthStatusBadge = ({ status }: MonthStatusBadgeProps) => {
  const badge = badgeMap[status];
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', badge.className)}>
      {badge.label}
    </span>
  );
};
