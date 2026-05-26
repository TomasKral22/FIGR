import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReorderablePanelProps {
  editable?: boolean;
  title: string;
  description?: string;
  isMobile?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isDragOver?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onHide: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  children: React.ReactNode;
}

export const ReorderablePanel = ({
  editable = true,
  title,
  description,
  isMobile = false,
  isFirst = false,
  isLast = false,
  isDragOver = false,
  onMoveUp,
  onMoveDown,
  onHide,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDragEnd,
  onDrop,
  children,
}: ReorderablePanelProps) => {
  if (!editable) {
    return <section>{children}</section>;
  }

  return (
    <section
      className={cn(
        'relative rounded-2xl transition-all',
        isDragOver && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
      )}
      onDragOver={(event) => {
        event.preventDefault();
        onDragEnter();
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className={cn(
              'rounded-md border border-border/60 bg-background/60 p-1 text-muted-foreground transition-colors hover:text-foreground',
              !isMobile && 'cursor-grab active:cursor-grabbing'
            )}
            aria-label={`Přesunout panel ${title}`}
            draggable={!isMobile}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} aria-label={`Posunout panel ${title} nahoru`}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} aria-label={`Posunout panel ${title} dolů`}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onHide} aria-label={`Zavřít panel ${title}`}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>{children}</div>
    </section>
  );
};

interface HiddenPanelsBarProps<T extends string> {
  visible?: boolean;
  hiddenPanels: T[];
  labels: Record<T, string>;
  onShow: (panelId: T) => void;
}

export const HiddenPanelsBar = <T extends string>({
  visible = true,
  hiddenPanels,
  labels,
  onShow,
}: HiddenPanelsBarProps<T>) => {
  if (!visible || hiddenPanels.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Skryté panely:</p>
        {hiddenPanels.map((panelId) => (
          <button
            key={panelId}
            type="button"
            className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-sm transition-colors hover:bg-background"
            onClick={() => onShow(panelId)}
          >
            Zobrazit {labels[panelId]}
          </button>
        ))}
      </div>
    </section>
  );
};
