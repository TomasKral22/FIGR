import { useMemo, useState } from 'react';
import { Building2, Edit3, HandCoins, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CREDIT_INVESTMENT_KIND_LABELS,
  CREDIT_INVESTMENT_STATUS_LABELS,
  CreditInvestment,
  CreditInvestmentRepayment,
  INVESTMENT_PROVIDER_LABELS,
} from '@/types/investment';
import { formatCurrencySafe } from '@/utils/currency';
import { CreditInvestmentForm } from './CreditInvestmentForm';
import { CreditRepaymentForm } from './CreditRepaymentForm';
import { useIsMobile } from '@/hooks/use-mobile';

interface CreditInvestmentsPanelProps {
  creditInvestments: CreditInvestment[];
  creditRepayments: CreditInvestmentRepayment[];
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
  onAddCreditRepayment: (payload: {
    credit_investment_id: string;
    payment_date: string;
    principal_paid: number;
    interest_paid: number;
    fee_paid?: number;
    note?: string;
  }) => Promise<void>;
  onDeleteCreditRepayment: (id: string) => Promise<void>;
}

const STATUS_BADGE_STYLES: Record<CreditInvestment['status'], string> = {
  repaying: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  recovery: 'bg-destructive/10 text-destructive border-destructive/20',
  repaid: 'bg-muted text-muted-foreground border-border',
};

export const CreditInvestmentsPanel = ({
  creditInvestments,
  creditRepayments,
  reportingCurrency,
  creditCurrentValue,
  onAddCreditInvestment,
  onUpdateCreditInvestment,
  onDeleteCreditInvestment,
  onAddCreditRepayment,
  onDeleteCreditRepayment,
}: CreditInvestmentsPanelProps) => {
  const isMobile = useIsMobile();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<CreditInvestment | null>(null);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | CreditInvestment['status']>('all');
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);

  const filteredInvestments = useMemo(
    () => creditInvestments.filter((investment) => (filter === 'all' ? true : investment.status === filter)),
    [creditInvestments, filter]
  );

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

  const problematicCount = useMemo(
    () => creditInvestments.filter((investment) => investment.status === 'recovery').length,
    [creditInvestments]
  );

  const selectedInvestment = useMemo(
    () => creditInvestments.find((investment) => investment.id === selectedInvestmentId) || null,
    [creditInvestments, selectedInvestmentId]
  );

  const selectedRepayments = useMemo(
    () =>
      creditRepayments
        .filter((repayment) => repayment.credit_investment_id === selectedInvestmentId)
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
    [creditRepayments, selectedInvestmentId]
  );

  const selectedRepaymentSummary = useMemo(() => {
    const totalPrincipal = selectedRepayments.reduce((sum, repayment) => sum + repayment.principal_paid, 0);
    const totalInterest = selectedRepayments.reduce((sum, repayment) => sum + repayment.interest_paid, 0);
    const totalFees = selectedRepayments.reduce((sum, repayment) => sum + repayment.fee_paid, 0);
    return {
      totalPrincipal,
      totalInterest,
      totalFees,
    };
  }, [selectedRepayments]);

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <HandCoins className="h-4 w-4 text-primary" />
            Uverove investice
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            P2P a B2B pujcky drzime oddelene od trznich aktiv. Stav `splaceno` se nezapocitava do aktivni hodnoty portfolia.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Pridat pujcku
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
            <DialogHeader>
              <DialogTitle>Nova uverova investice</DialogTitle>
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
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktivni hodnota</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrencySafe(creditCurrentValue, reportingCurrency)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktivni pujcky</p>
            <p className="mt-2 text-lg font-semibold">{activeInvestments.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Prumerny urok</p>
            <p className="mt-2 text-lg font-semibold">{averageRate.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} %</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Problematicke pujcky</p>
            <p className="mt-2 text-lg font-semibold">{problematicCount}</p>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="all">Vse</TabsTrigger>
            <TabsTrigger value="repaying">Splaci se</TabsTrigger>
            <TabsTrigger value="pending">Ceka se</TabsTrigger>
            <TabsTrigger value="recovery">Vymahani</TabsTrigger>
            <TabsTrigger value="repaid">Splaceno</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredInvestments.length > 0 ? (
          isMobile ? (
            <div className="space-y-3">
              {filteredInvestments.map((investment) => (
                <div key={investment.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{investment.name}</p>
                      <p className="text-sm text-muted-foreground">{CREDIT_INVESTMENT_KIND_LABELS[investment.kind]}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${STATUS_BADGE_STYLES[investment.status]}`}>
                      {CREDIT_INVESTMENT_STATUS_LABELS[investment.status]}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Poskytovatel</p>
                      <p>{INVESTMENT_PROVIDER_LABELS[investment.provider] || investment.provider}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hodnota</p>
                      <p>{formatCurrencySafe(investment.current_value, investment.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Úrok</p>
                      <p>{investment.interest_rate.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} %</p>
                    </div>
                  </div>

                  {investment.note ? <p className="mt-3 text-sm text-muted-foreground">{investment.note}</p> : null}

                  <div className="mt-4 flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedInvestmentId(investment.id)}>
                      <Building2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setEditingInvestment(investment)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => void onDeleteCreditInvestment(investment.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazev</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Poskytovatel</TableHead>
                <TableHead className="text-right">Hodnota</TableHead>
                <TableHead className="text-right">Urok</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvestments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{investment.name}</p>
                      {investment.note ? <p className="text-xs text-muted-foreground">{investment.note}</p> : null}
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedInvestmentId(investment.id)}>
                        <Building2 className="h-4 w-4" />
                      </Button>
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
          )
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
            <Building2 className="mx-auto mb-3 h-5 w-5" />
            Zatim tu nejsou zadne P2P ani B2B pujcky pro tento filtr.
          </div>
        )}

        <Dialog open={Boolean(editingInvestment)} onOpenChange={(open) => !open && setEditingInvestment(null)}>
          <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
            <DialogHeader>
              <DialogTitle>Upravit uverovou investici</DialogTitle>
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

        <Dialog open={Boolean(selectedInvestment)} onOpenChange={(open) => !open && setSelectedInvestmentId(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detail uverove investice</DialogTitle>
            </DialogHeader>
            {selectedInvestment ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Nazev</p>
                    <p className="mt-2 font-semibold">{selectedInvestment.name}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktualni hodnota</p>
                    <p className="mt-2 font-semibold">{formatCurrencySafe(selectedInvestment.current_value, selectedInvestment.currency)}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Splacena jistina</p>
                    <p className="mt-2 font-semibold">{formatCurrencySafe(selectedRepaymentSummary.totalPrincipal, selectedInvestment.currency)}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Prijaty urok</p>
                    <p className="mt-2 font-semibold">{formatCurrencySafe(selectedRepaymentSummary.totalInterest, selectedInvestment.currency)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Historie splatek</p>
                    <p className="text-sm text-muted-foreground">
                      Poplatky celkem {formatCurrencySafe(selectedRepaymentSummary.totalFees, selectedInvestment.currency)}
                    </p>
                  </div>
                  <Dialog open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Pridat splatku
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
                      <DialogHeader>
                        <DialogTitle>Nova splatka</DialogTitle>
                      </DialogHeader>
                      <CreditRepaymentForm
                        onSave={async (payload) => {
                          await onAddCreditRepayment({
                            ...payload,
                            credit_investment_id: selectedInvestment.id,
                          });
                          setIsRepaymentOpen(false);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                {selectedRepayments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Jistina</TableHead>
                        <TableHead className="text-right">Urok</TableHead>
                        <TableHead className="text-right">Poplatek</TableHead>
                        <TableHead>Poznamka</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRepayments.map((repayment) => (
                        <TableRow key={repayment.id}>
                          <TableCell>{repayment.payment_date}</TableCell>
                          <TableCell className="text-right">{formatCurrencySafe(repayment.principal_paid, selectedInvestment.currency)}</TableCell>
                          <TableCell className="text-right">{formatCurrencySafe(repayment.interest_paid, selectedInvestment.currency)}</TableCell>
                          <TableCell className="text-right">{formatCurrencySafe(repayment.fee_paid, selectedInvestment.currency)}</TableCell>
                          <TableCell>{repayment.note || '—'}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => void onDeleteCreditRepayment(repayment.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
                    Zatim tu nejsou zadne splatky.
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
