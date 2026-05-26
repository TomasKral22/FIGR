import { LayoutGrid, Save, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMMON_CURRENCIES } from '@/types/investment';

interface SettingsPanelProps {
  currentCurrency: string;
  onSave: (currency: string) => Promise<void>;
  isLayoutEditing: boolean;
  onToggleLayoutEditing: () => void;
}

export const SettingsPanel = ({
  currentCurrency,
  onSave,
  isLayoutEditing,
  onToggleLayoutEditing,
}: SettingsPanelProps) => {
  const [currency, setCurrency] = useState(currentCurrency);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(currency);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card/60 p-4">
        <div className="mb-4 flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-semibold">Rozlozeni investic</h3>
            <p className="text-sm text-muted-foreground">
              Rezim uprav zapni jen tehdy, kdyz chces presouvat nebo skryvat panely v investicich.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant={isLayoutEditing ? 'default' : 'outline'}
          onClick={onToggleLayoutEditing}
          className="w-full"
        >
          {isLayoutEditing ? 'Ukoncit upravy rozlozeni' : 'Upravit rozlozeni investic'}
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-card/60 p-4">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-semibold">Reportovaci mena</h3>
            <p className="text-sm text-muted-foreground">
              Vsechny hodnoty portfolia budou prepocitany na tuto menu.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mena</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_CURRENCIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-4 w-full gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Ukladam nastaveni...' : 'Ulozit nastaveni'}
        </Button>
      </section>
    </div>
  );
};
