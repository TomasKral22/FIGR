import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  COMMON_CURRENCIES,
  CREDIT_INVESTMENT_KIND_LABELS,
  CREDIT_INVESTMENT_STATUS_LABELS,
  CreditInvestment,
  CreditInvestmentKind,
  CreditInvestmentStatus,
  INVESTMENT_PROVIDER_LABELS,
  InvestmentProvider,
} from '@/types/investment';

interface CreditInvestmentFormProps {
  initialValue?: CreditInvestment | null;
  onSave: (payload: {
    name: string;
    kind: CreditInvestmentKind;
    provider: InvestmentProvider;
    current_value: number;
    interest_rate: number;
    status: CreditInvestmentStatus;
    currency: string;
    note?: string;
  }) => Promise<void>;
}

export const CreditInvestmentForm = ({ initialValue = null, onSave }: CreditInvestmentFormProps) => {
  const [name, setName] = useState(initialValue?.name || '');
  const [kind, setKind] = useState<CreditInvestmentKind>(initialValue?.kind || 'p2p');
  const [provider, setProvider] = useState<InvestmentProvider>(initialValue?.provider || 'investown');
  const [currentValue, setCurrentValue] = useState(initialValue ? String(initialValue.current_value) : '');
  const [interestRate, setInterestRate] = useState(initialValue ? String(initialValue.interest_rate) : '');
  const [status, setStatus] = useState<CreditInvestmentStatus>(initialValue?.status || 'repaying');
  const [currency, setCurrency] = useState(initialValue?.currency || 'CZK');
  const [note, setNote] = useState(initialValue?.note || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        kind,
        provider,
        current_value: Number.parseFloat(currentValue || '0'),
        interest_rate: Number.parseFloat(interestRate || '0'),
        status,
        currency,
        note: note.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="credit-name">Název</Label>
        <Input id="credit-name" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as CreditInvestmentKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CREDIT_INVESTMENT_KIND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Poskytovatel</Label>
          <Select value={provider} onValueChange={(value) => setProvider(value as InvestmentProvider)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(INVESTMENT_PROVIDER_LABELS)
                .filter(([value]) => value !== 'broker')
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Aktuální hodnota</Label>
          <Input type="number" step="any" value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Úrok (%)</Label>
          <Input type="number" step="any" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Stav</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as CreditInvestmentStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CREDIT_INVESTMENT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Měna</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COMMON_CURRENCIES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Poznámka</Label>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Ukládám...' : initialValue ? 'Uložit změny' : 'Přidat úvěrovou investici'}
      </Button>
    </form>
  );
};
