import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExchangeRate, COMMON_CURRENCIES } from '@/types/investment';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ExchangeRateManagementProps {
  exchangeRates: ExchangeRate[];
  reportingCurrency: string;
  onAddRate: (rate: { from_currency: string; to_currency: string; rate: number; rate_date: string }) => Promise<any>;
}

export const ExchangeRateManagement = ({
  exchangeRates,
  reportingCurrency,
  onAddRate,
}: ExchangeRateManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState(reportingCurrency);
  const [rate, setRate] = useState('');
  const [rateDate, setRateDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Get latest rates grouped by currency pair
  const latestRates = new Map<string, ExchangeRate>();
  for (const r of exchangeRates) {
    const key = `${r.from_currency}-${r.to_currency}`;
    const existing = latestRates.get(key);
    if (!existing || r.rate_date > existing.rate_date) {
      latestRates.set(key, r);
    }
  }

  const handleSubmit = async () => {
    if (!fromCurrency || !toCurrency || !rate) return;

    setSubmitting(true);
    try {
      await onAddRate({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: parseFloat(rate),
        rate_date: rateDate,
      });
      setIsDialogOpen(false);
      setRate('');
      setRateDate(new Date().toISOString().split('T')[0]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Směnné kurzy</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Přidat kurz
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Přidat směnný kurz</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Z měny</Label>
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
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
                <div className="space-y-2">
                  <Label>Na měnu</Label>
                  <Select value={toCurrency} onValueChange={setToCurrency}>
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
              </div>
              <div className="space-y-2">
                <Label>Kurz (1 {fromCurrency} = X {toCurrency})</Label>
                <Input
                  type="number"
                  step="any"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  placeholder="23.50"
                />
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={rateDate}
                  onChange={e => setRateDate(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !rate || fromCurrency === toCurrency}
                className="w-full"
              >
                {submitting ? 'Ukládám...' : 'Přidat kurz'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {latestRates.size > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Z měny</TableHead>
                <TableHead>Na měnu</TableHead>
                <TableHead className="text-right">Kurz</TableHead>
                <TableHead>Datum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(latestRates.values())
                .sort((a, b) => a.from_currency.localeCompare(b.from_currency))
                .map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.from_currency}</TableCell>
                    <TableCell>{r.to_currency}</TableCell>
                    <TableCell className="text-right">
                      {r.rate.toLocaleString('cs-CZ', { maximumFractionDigits: 6 })}
                    </TableCell>
                    <TableCell>
                      {new Date(r.rate_date).toLocaleDateString('cs-CZ')}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Zatím žádné směnné kurzy. Přidejte kurzy pro správný přepočet hodnot.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
