import { Check, PaintBucket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const visualThemes = [
  {
    id: 'dark-blue',
    name: 'Tmavě modrá',
    description: 'Tmavé modré plochy s chladnějšími akcenty.',
    swatches: ['#0f172f', '#16203c', '#1e88e5', '#ecf3ff'],
  },
  {
    id: 'warm-orange',
    name: 'Teplá oranžová',
    description: 'Tmavší teplé plochy s oranžovým hlavním akcentem.',
    swatches: ['#1d140f', '#2a1b14', '#f38b34', '#fff1e8'],
  },
  {
    id: 'light',
    name: 'Světlá',
    description: 'Klidný světlý režim se stejným layoutem i rozestupy.',
    swatches: ['#eef3fb', '#ffffff', '#2563eb', '#1f2937'],
  },
];

interface VisualThemePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelectTheme: (theme: string) => void;
}

export const VisualThemePanel = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}: VisualThemePanelProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl rounded-[var(--radius-card)] border border-border bg-card/96">
        <DialogHeader>
          <DialogTitle>Vizuální styly</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3">
          {visualThemes.map((theme) => {
            const isActive = currentTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectTheme(theme.id)}
                className={`action-card ${isActive ? 'border-primary/45 bg-primary/5' : ''}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PaintBucket className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{theme.name}</span>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </div>

                <div className="mb-3 flex h-16 overflow-hidden rounded-[var(--radius-control)] border border-border/60">
                  {theme.swatches.map((swatch) => (
                    <div key={swatch} className="flex-1" style={{ backgroundColor: swatch }} />
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">{theme.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Zavřít
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
