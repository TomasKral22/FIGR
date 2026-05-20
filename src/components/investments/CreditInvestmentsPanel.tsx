import { useMemo, useState } from 'react';
import { Building2, Edit3, HandCoins, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CREDIT_INVESTMENT_KIND_LABELS,
  CREDIT_INVESTMENT_STATUS_LABELS,
  CreditInvestment,
  INVESTMENT_PROVIDER_LABELS,
} from '@/types/investment';
import { formatCurrencySafe } from '@/utils/currency';
import { CreditInvestmentForm } from './CreditInvestmentForm';

interface CreditInvestmentsPanelProps {
  creditInvestments: CreditInvestment[];
  reportingCurrency: string;
  creditCurrentValue: number;
  onAddCreditInvestment: (payload: {
    name: string;
    kind: CreditInvestment['kind'];
    provider: CreditInvestment['provider'];
    current_value: number;
    interest_rate: number;
    status: CreditInvestment['status'];
    currency: string;
    note?: string;
  }) => Promise<void>;
  onUpdateCreditInvestment: (
    id: string,
    updates: Partial<Omit<CreditInvestment, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  onDeleteCreditInvestment: (id: string) => Promise<void>;
}

const STATUS_BADGE_STYLES: Record<CreditInvestment['status'], string> = {
  repaying: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  recovery: 'bg-destructive/10 text-destructive border-destructive/20',
  repaid: 'bg-muted text-muted-foreground border-border',
};

export const CreditInvestmentsPanel = ({
  creditInvestments,
  reportingCurrency,
  creditCurrentValue,
  onAddCreditInvestment,
  onUpdateCreditInvestment,
  onDeleteCreditInvestment,
}: CreditInvestmentsPanelProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<CreditInvestment | null>(null);

  const activeInvestments = useMemo(
    () => creditInvestments.filter((investment) => investment.status !== 'repaid'),
    [creditInvestments]
  );

  const averageRate = useMemo(() => {
    if (activeInvestments.length === 0) return 0;
    return (
      activeInvestments.reduce((sum, investment) => sum + investment.interest_rate, 0) / activeInvestments.length
    );
  }, [activeInvestments]);

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <HandCoins className="h-4 w-4 text-primary" />
            Úvěrové investice
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            P2P a B2B půjčky držíme odděleně od tržních aktiv. Stav `splaceno` se už nepočítá do hodnoty portfolia.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Přidat půjčku
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nová úvěrová investice</DialogTitle>
            </DialogHeader>
            <CreditInvestmentForm
              onSave={async (payload) => {
                await onAddCreditInvestment(payload);
                setIsCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktivní hodnota</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrencySafe(creditCurrentValue, reportingCurrency)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktivní půjčky</p>
            <p className="mt-2 text-lg font-semibold">{activeInvestments.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Průměrný úrok</p>
            <p className="mt-2 text-lg font-semibold">{averageRate.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} %</p>
          </div>
        </div>

        {creditInvestments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Poskytovatel</TableHead>
                <TableHead className="text-right">Hodnota</TableHead>
                <TableHead className="text-right">Úrok</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditInvestments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{investment.name}</p>
                      {investment.note ? (
                        <p className="text-xs text-muted-foreground">{investment.note}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{CREDIT_INVESTMENT_KIND_LABELS[investment.kind]}</TableCell>
                  <TableCell>{INVESTMENT_PROVIDER_LABELS[investment.provider] || investment.provider}</TableCell>
                  <TableCell className="text-right">{formatCurrencySafe(investment.current_value, investment.currency)}</TableCell>
                  <TableCell className="text-right">
                    {investment.interest_rate.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} %
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${STATUS_BADGE_STYLES[investment.status]}`}>
                      {CREDIT_INVESTMENT_STATUS_LABELS[investment.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => setEditingInvestment(investment)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => void onDeleteCreditInvestment(investment.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
            <Building2 className="mx-auto mb-3 h-5 w-5" />
            Zatím tu nejsou žádné P2P ani B2B půjčky.
          </div>
        )}

        <Dialog open={Boolean(editingInvestment)} onOpenChange={(open) => !open && setEditingInvestment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upravit úvěrovou investici</DialogTitle>
            </DialogHeader>
            {editingInvestment ? (
              <CreditInvestmentForm
                initialValue={editingInvestment}
                onSave={async (payload) => {
                  await onUpdateCreditInvestment(editingInvestment.id, payload);
                  setEditingInvestment(null);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
