import { Check, PaintBucket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const visualThemes = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Čistý neutrální základ pro běžné používání.',
    swatches: ['#cfd5df', '#e5e7eb', '#91a4c8', '#46536b'],
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Měkčí šedo-modrý vzhled podobný pracovním nástrojům.',
    swatches: ['#d6d9e3', '#c6ccd9', '#7c90b8', '#394761'],
  },
  {
    id: 'metal',
    name: 'Metal',
    description: 'Kovově šedý styl s technickým dojmem.',
    swatches: ['#d5d8db', '#bcc3ca', '#8c96a3', '#3b4552'],
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Futuristické pozadí s výraznějším glow efektem.',
    swatches: ['#d8e0ea', '#a9c5ff', '#4fd8ff', '#101827'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Teplejší varianta se zemitějším kontrastem.',
    swatches: ['#e4d7cf', '#ddb8a8', '#ba6f58', '#4b2f2a'],
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vizuální styly pozadí</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visualThemes.map((theme) => {
            const isActive = currentTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectTheme(theme.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PaintBucket className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{theme.name}</span>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </div>

                <div className="mb-3 flex h-20 overflow-hidden rounded-lg border border-border/60">
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
          <Button variant="ghost" onClick={onClose}>
            Zavřít
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
