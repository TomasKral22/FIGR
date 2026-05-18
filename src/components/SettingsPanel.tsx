import { ArrowDown, ArrowUp, Check, PaintBucket, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SidebarItemId } from '@/components/Sidebar';

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

const sidebarLabels: Record<SidebarItemId, string> = {
  overview: 'Přehled',
  accounts: 'Účty',
  monthWorkflow: 'Měsíční workflow',
  investments: 'Investice',
  goals: 'Cíle',
  transactionAreas: 'Oblasti transakcí',
  recurring: 'Trvalé příkazy',
  analytics: 'Reporty a grafy',
  settings: 'Nastavení',
};

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onSelectTheme: (theme: string) => void;
  sidebarOrder: SidebarItemId[];
  onMoveSidebarItem: (itemId: SidebarItemId, direction: 'up' | 'down') => void;
}

export const SettingsPanel = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  sidebarOrder,
  onMoveSidebarItem,
}: SettingsPanelProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto rounded-[var(--radius-card)] border border-border bg-card/96">
        <DialogHeader>
          <DialogTitle>Nastavení</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">Panel aplikace</h3>
                <p className="text-sm text-muted-foreground">
                  Pořadí položek v levém panelu si můžeš upravit přesunem nahoru a dolů.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {sidebarOrder.map((itemId, index) => (
                <div key={itemId} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/50 p-3">
                  <div>
                    <p className="font-medium">{sidebarLabels[itemId]}</p>
                    <p className="text-xs text-muted-foreground">Pozice {index + 1}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onMoveSidebarItem(itemId, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onMoveSidebarItem(itemId, 'down')}
                      disabled={index === sidebarOrder.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <PaintBucket className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">Styly</h3>
                <p className="text-sm text-muted-foreground">
                  Rozložení zůstává stejné. Mění se pouze vizuální téma a barvy aplikace.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {visualThemes.map((theme) => {
                const isActive = currentTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onSelectTheme(theme.id)}
                    className={`action-card text-left ${isActive ? 'border-primary/45 bg-primary/5' : ''}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium">{theme.name}</span>
                      {isActive ? <Check className="h-4 w-4 text-primary" /> : null}
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
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
