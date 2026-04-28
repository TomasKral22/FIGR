import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMMON_CURRENCIES } from '@/types/investment';

interface SettingsPanelProps {
  currentCurrency: string;
  onSave: (currency: string) => Promise<void>;
}

export const SettingsPanel = ({ currentCurrency, onSave }: SettingsPanelProps) => {
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Reportovací měna</Label>
        <p className="text-sm text-muted-foreground">
          Všechny hodnoty portfolia budou přepočítány na tuto měnu.
        </p>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_CURRENCIES.map(c => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Ukládám...' : 'Uložit nastavení'}
      </Button>
    </div>
  );
};
