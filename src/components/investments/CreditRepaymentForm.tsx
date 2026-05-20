import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreditRepaymentFormProps {
  onSave: (payload: {
    payment_date: string;
    principal_paid: number;
    interest_paid: number;
    fee_paid?: number;
    note?: string;
  }) => Promise<void>;
}

export const CreditRepaymentForm = ({ onSave }: CreditRepaymentFormProps) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [principalPaid, setPrincipalPaid] = useState('');
  const [interestPaid, setInterestPaid] = useState('');
  const [feePaid, setFeePaid] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        payment_date: paymentDate,
        principal_paid: Number.parseFloat(principalPaid || '0'),
        interest_paid: Number.parseFloat(interestPaid || '0'),
        fee_paid: feePaid ? Number.parseFloat(feePaid) : 0,
        note: note.trim() || undefined,
      });
      setPrincipalPaid('');
      setInterestPaid('');
      setFeePaid('');
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="repayment-date">Datum splatky</Label>
        <Input id="repayment-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="principal-paid">Jistina</Label>
          <Input id="principal-paid" type="number" step="any" value={principalPaid} onChange={(event) => setPrincipalPaid(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="interest-paid">Urok</Label>
          <Input id="interest-paid" type="number" step="any" value={interestPaid} onChange={(event) => setInterestPaid(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee-paid">Poplatek</Label>
          <Input id="fee-paid" type="number" step="any" value={feePaid} onChange={(event) => setFeePaid(event.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="repayment-note">Poznamka</Label>
        <Textarea id="repayment-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Ukladam...' : 'Pridat splatku'}
      </Button>
    </form>
  );
};
